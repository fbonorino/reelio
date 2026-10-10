import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sendUpload, type UploadXhr } from "./cloudinary-client.ts";
import {
  cloudinaryError,
  fetchWithTimeout,
  fileSizeError,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  toUploadError,
  UPLOAD_MESSAGES,
  UploadError,
} from "./upload-rules.ts";
import { isOwnCloudinaryUrl } from "./asset-url.ts";
import { withSerializableRetry } from "./serializable-retry.ts";
import { existingUpload, quotaError } from "./quota.ts";
import { beginUploadActivity, FEED_REFRESH_MS, feedRefreshInterval, isUploadActive, subscribeUploadActivity } from "./upload-activity.ts";

/** Manual clock: timers only fire when the test advances it. */
function fakeTimers() {
  let now = 0;
  let nextId = 1;
  const pending = new Map<number, { at: number; fn: () => void }>();
  return {
    setTimeout: ((fn: () => void, ms: number) => {
      const id = nextId++;
      pending.set(id, { at: now + ms, fn });
      return id;
    }) as unknown as typeof setTimeout,
    clearTimeout: ((id: number) => {
      pending.delete(id);
    }) as unknown as typeof clearTimeout,
    advance(ms: number) {
      const until = now + ms;
      for (;;) {
        const due = [...pending].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        pending.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = until;
    },
    get count() {
      return pending.size;
    },
  };
}

/** XHR the test drives by hand. */
function fakeXhr() {
  const xhr = {
    status: 0,
    responseText: "",
    aborted: false,
    sent: false,
    upload: { onprogress: null, onload: null },
    onload: null,
    onerror: null,
    open() {},
    send() {
      xhr.sent = true;
    },
    abort() {
      xhr.aborted = true;
    },
    progress(loaded: number, total = 100) {
      xhr.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent);
    },
    respond(status: number, body: string) {
      Object.assign(xhr, { status, responseText: body });
      xhr.onload?.();
    },
  } as unknown as UploadXhr & {
    aborted: boolean;
    sent: boolean;
    progress: (loaded: number, total?: number) => void;
    respond: (status: number, body: string) => void;
  };
  return xhr;
}

function start(opts: { signal?: AbortSignal; stallMs?: number; responseMs?: number } = {}) {
  const timers = fakeTimers();
  const xhr = fakeXhr();
  const progress: number[] = [];
  const outcome: { value?: unknown; error?: UploadError } = {};
  const promise = sendUpload("https://api.cloudinary.com/v1_1/x/image/upload", "body", {
    onProgress: (p) => progress.push(p),
    stallMs: 30_000,
    responseMs: 90_000,
    ...opts,
    createXhr: () => xhr,
    timers,
  }).then(
    (v) => (outcome.value = v),
    (e) => (outcome.error = e)
  );
  const settle = () => new Promise((r) => setImmediate(r)).then(() => outcome);
  return { timers, xhr, progress, outcome, promise, settle };
}

const OK = JSON.stringify({ secure_url: "https://res.cloudinary.com/x/image/upload/v1/a.jpg" });

describe("F1 · upload watchdog: the upload never hangs", () => {
  it("resolves with Cloudinary's answer", async () => {
    const t = start();
    t.xhr.progress(50);
    t.xhr.progress(100);
    t.xhr.upload.onload?.();
    t.xhr.respond(200, OK);
    const o = await t.settle();
    assert.equal((o.value as { secure_url: string }).secure_url, "https://res.cloudinary.com/x/image/upload/v1/a.jpg");
    assert.deepEqual(t.progress, [50, 100]);
    assert.equal(t.timers.count, 0, "watchdog cleared");
  });

  it("no progress at all for 30 s: aborts and fails as 'stalled' (retryable)", async () => {
    const t = start();
    t.timers.advance(29_999);
    assert.equal((await t.settle()).error, undefined);
    t.timers.advance(1);
    const o = await t.settle();
    assert.equal(o.error?.kind, "stalled");
    assert.equal(o.error?.retryable, true);
    assert.equal(o.error?.message, UPLOAD_MESSAGES.stalled);
    assert.equal(t.xhr.aborted, true);
  });

  it("progress keeps it alive; it fails 30 s after the last progress event", async () => {
    const t = start();
    for (let i = 1; i <= 10; i++) {
      t.timers.advance(20_000);
      t.xhr.progress(i * 5);
    }
    assert.equal((await t.settle()).error, undefined, "a slow but moving upload (200 s) is not cut");
    t.timers.advance(30_000);
    assert.equal((await t.settle()).error?.kind, "stalled");
  });

  it("everything sent: waits up to 90 s for the answer, not 30", async () => {
    const t = start();
    t.xhr.progress(100);
    t.xhr.upload.onload?.();
    t.timers.advance(60_000);
    assert.equal((await t.settle()).error, undefined);
    t.timers.advance(30_000);
    assert.equal((await t.settle()).error?.kind, "stalled");
  });

  it("Cancelar aborts the request and fails as 'cancelled'", async () => {
    const ctrl = new AbortController();
    const t = start({ signal: ctrl.signal });
    t.xhr.progress(10);
    ctrl.abort();
    const o = await t.settle();
    assert.equal(o.error?.kind, "cancelled");
    assert.equal(o.error?.message, "Subida cancelada");
    assert.equal(t.xhr.aborted, true);
    assert.equal(t.timers.count, 0);
  });

  it("an already-cancelled signal never sends", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const t = start({ signal: ctrl.signal });
    assert.equal((await t.settle()).error?.kind, "cancelled");
    assert.equal(t.xhr.sent, false);
  });

  it("network error → 'offline' with a Spanish message", async () => {
    const t = start();
    t.xhr.onerror?.();
    const o = await t.settle();
    assert.equal(o.error?.kind, "offline");
    assert.match(o.error!.message, /Sin conexión/);
  });

  it("settles once: a late answer after the watchdog fired is ignored", async () => {
    const t = start();
    t.timers.advance(30_000);
    t.xhr.respond(200, OK);
    const o = await t.settle();
    assert.equal(o.error?.kind, "stalled");
    assert.equal(o.value, undefined);
  });

  it("a 2xx that isn't Cloudinary's JSON fails instead of hanging", async () => {
    const t = start();
    t.xhr.respond(200, "<html>proxy</html>");
    assert.equal((await t.settle()).error?.kind, "failed");
  });
});

describe("F5a · file size, before uploading", () => {
  it("photos up to 10 MB and videos up to 100 MB pass", () => {
    assert.equal(fileSizeError({ size: MAX_IMAGE_BYTES, type: "image/jpeg" }), null);
    assert.equal(fileSizeError({ size: 3_000_000, type: "image/heic" }), null);
    assert.equal(fileSizeError({ size: MAX_VIDEO_BYTES, type: "video/quicktime" }), null);
    // A 50 MB video is fine even though it's over the photo limit.
    assert.equal(fileSizeError({ size: 50 * 1024 * 1024, type: "video/mp4" }), null);
  });

  it("a photo over 10 MB is rejected with its size and the limit", () => {
    const msg = fileSizeError({ size: 12.4 * 1024 * 1024, type: "image/jpeg" });
    assert.match(msg!, /Esta foto pesa 12 MB y el máximo es 10 MB/);
  });

  it("a video over 100 MB is rejected", () => {
    const msg = fileSizeError({ size: 180 * 1024 * 1024, type: "video/quicktime" });
    assert.match(msg!, /Este video pesa 180 MB y el máximo es 100 MB/);
  });

  it("no type (some Android pickers) counts as a photo", () => {
    assert.ok(fileSizeError({ size: 11 * 1024 * 1024, type: "" }));
  });

  it("Cloudinary's own size rejection is not retryable, and says why", async () => {
    const err = cloudinaryError(400, JSON.stringify({ error: { message: "File size too large. Got 12582912. Maximum is 10485760." } }));
    assert.equal(err.kind, "tooLarge");
    assert.equal(err.retryable, false);
    assert.match(err.message, /10 MB/);
    const px = cloudinaryError(400, JSON.stringify({ error: { message: "Resource has too many pixels: 48000000. Maximum is 25000000" } }));
    assert.equal(px.kind, "tooLarge");
    const t = start();
    t.xhr.respond(400, JSON.stringify({ error: { message: "File size too large. Got 12582912. Maximum is 10485760." } }));
    assert.equal((await t.settle()).error?.kind, "tooLarge");
  });

  it("other Cloudinary errors stay generic and retryable", () => {
    assert.equal(cloudinaryError(500, "oops").kind, "failed");
    assert.equal(cloudinaryError(400, JSON.stringify({ error: { message: "Upload preset not found" } })).retryable, true);
  });
});

describe("F6 · offline errors read in Spanish", () => {
  it("Safari's 'Load failed' and Chrome's 'Failed to fetch' become the no-signal message", () => {
    for (const raw of ["Load failed", "Failed to fetch", "NetworkError when attempting to fetch resource."]) {
      const e = toUploadError(new TypeError(raw));
      assert.equal(e.kind, "offline");
      assert.equal(e.message, "Sin conexión: acercate a donde haya señal y tocá Reintentar");
      assert.equal(e.retryable, true);
    }
  });

  it("a timed-out request is 'stalled', a cancelled one is 'cancelled'", () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    assert.equal(toUploadError(abort).kind, "stalled");
    assert.equal(toUploadError(abort, { cancelled: true }).kind, "cancelled");
  });

  it("our own UploadErrors and server messages pass through", () => {
    const tooLarge = new UploadError("tooLarge", "x");
    assert.equal(toUploadError(tooLarge), tooLarge);
    assert.equal(toUploadError(new Error("No se pudo verificar tu cupo")).message, "No se pudo verificar tu cupo");
    assert.equal(toUploadError("??").message, UPLOAD_MESSAGES.failed);
  });

  it("fetchWithTimeout aborts a request that never answers", async () => {
    const timers = fakeTimers();
    let seen: AbortSignal | undefined;
    const hanging = ((_u: string, init: RequestInit) =>
      new Promise((_, reject) => {
        seen = init.signal!;
        init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })) as typeof fetch;
    const p = fetchWithTimeout("/api/quota", {}, 20_000, { fetchImpl: hanging, timers }).catch((e) => e);
    timers.advance(20_000);
    const err = await p;
    assert.equal(seen?.aborted, true);
    assert.equal(toUploadError(err).kind, "stalled");
  });

  it("fetchWithTimeout follows the caller's Cancelar and clears its timer on success", async () => {
    const timers = fakeTimers();
    const ctrl = new AbortController();
    let seen: AbortSignal | undefined;
    const ok = ((_u: string, init: RequestInit) => ((seen = init.signal!), Promise.resolve(new Response("{}")))) as typeof fetch;
    await fetchWithTimeout("/x", { signal: ctrl.signal }, 20_000, { fetchImpl: ok, timers });
    assert.equal(timers.count, 0);
    ctrl.abort();
    assert.equal(seen?.aborted, false, "listener removed after it finished");
  });
});

describe("F4 · only our own Cloudinary assets", () => {
  const cloud = "kyf6xqyy";
  const ok = (u: string, t: "IMAGE" | "VIDEO" = "IMAGE") => isOwnCloudinaryUrl(u, cloud, t);

  it("accepts what our upload produces (originals and thumbnails)", () => {
    assert.ok(ok("https://res.cloudinary.com/kyf6xqyy/image/upload/v1791640000/abc123.jpg"));
    assert.ok(ok("https://res.cloudinary.com/kyf6xqyy/image/upload/w_500,h_500,c_fill,q_auto,f_auto/v1/abc123.heic"));
    assert.ok(ok("https://res.cloudinary.com/kyf6xqyy/video/upload/v1/clip.mov", "VIDEO"));
    assert.ok(ok("https://res.cloudinary.com/kyf6xqyy/video/upload/w_500,h_500,c_fill,q_auto,so_0/v1/clip.jpg", "VIDEO"));
  });

  it("rejects anything else", () => {
    for (const u of [
      "https://example.com/evil.jpg",
      "http://res.cloudinary.com/kyf6xqyy/image/upload/v1/a.jpg",
      "https://res.cloudinary.com/otracuenta/image/upload/v1/a.jpg",
      "https://res.cloudinary.com.evil.com/kyf6xqyy/image/upload/v1/a.jpg",
      "https://user:pw@res.cloudinary.com/kyf6xqyy/image/upload/v1/a.jpg",
      "https://res.cloudinary.com:8443/kyf6xqyy/image/upload/v1/a.jpg",
      "https://res.cloudinary.com/kyf6xqyy/image/upload/../../otracuenta/image/upload/a.jpg",
      "https://res.cloudinary.com/kyf6xqyy/raw/upload/v1/a.exe",
      "https://res.cloudinary.com/kyf6xqyy/image/private/v1/a.jpg",
      "javascript:alert(1)",
      "https://res.cloudinary.com/kyf6xqyy/image/upload/" + "a".repeat(600),
      "",
    ]) {
      assert.equal(ok(u), false, u);
    }
    assert.equal(isOwnCloudinaryUrl(42, cloud, "IMAGE"), false);
    assert.equal(isOwnCloudinaryUrl(null, cloud, "IMAGE"), false);
  });

  it("the kind must match: a video URL can't be saved as a photo and vice versa", () => {
    assert.equal(ok("https://res.cloudinary.com/kyf6xqyy/video/upload/v1/clip.mov", "IMAGE"), false);
    assert.equal(ok("https://res.cloudinary.com/kyf6xqyy/image/upload/v1/a.jpg", "VIDEO"), false);
  });

  it("with no cloud configured, nothing passes", () => {
    assert.equal(isOwnCloudinaryUrl("https://res.cloudinary.com/kyf6xqyy/image/upload/v1/a.jpg", undefined, "IMAGE"), false);
  });
});

describe("F2 · serialization conflicts are retried on the server", () => {
  const conflict = () => Object.assign(new Error("write conflict"), { code: "P2034" });
  const noSleep = { sleep: async () => {}, random: () => 0.5 };

  it("retries a P2034 and returns the result", async () => {
    let calls = 0;
    const result = await withSerializableRetry(async () => {
      calls++;
      if (calls < 3) throw conflict();
      return "saved";
    }, noSleep);
    assert.equal(result, "saved");
    assert.equal(calls, 3);
  });

  it("gives up after the last attempt with the original error", async () => {
    let calls = 0;
    await assert.rejects(
      withSerializableRetry(async () => {
        calls++;
        throw conflict();
      }, { ...noSleep, attempts: 5 }),
      (e: { code?: string }) => e.code === "P2034"
    );
    assert.equal(calls, 5);
  });

  it("other errors (quota, missing data) are not retried", async () => {
    let calls = 0;
    await assert.rejects(
      withSerializableRetry(async () => {
        calls++;
        throw new Error("Ya subiste tus 5 fotos de consignas");
      }, noSleep),
      /5 fotos/
    );
    assert.equal(calls, 1);
  });

  it("waits a little longer each time (20–80 ms × attempt)", async () => {
    const waits: number[] = [];
    let calls = 0;
    await withSerializableRetry(
      async () => {
        if (++calls < 4) throw conflict();
        return 1;
      },
      { sleep: async (ms) => void waits.push(ms), random: () => 1 }
    );
    assert.deepEqual(waits, [80, 160, 240]);
  });
});

describe("F3 · retrying a save returns the first one", () => {
  const photos = [
    { id: "p1", url: "https://res.cloudinary.com/c/image/upload/v1/a.jpg", challengeId: "c1", isBonus: false },
    { id: "p2", url: "https://res.cloudinary.com/c/image/upload/v1/b.jpg", challengeId: "c2", isBonus: false },
  ];

  it("finds the guest's photo with the same Cloudinary URL", () => {
    assert.equal(existingUpload(photos, "https://res.cloudinary.com/c/image/upload/v1/b.jpg")?.id, "p2");
    assert.equal(existingUpload(photos, "https://res.cloudinary.com/c/image/upload/v1/new.jpg"), undefined);
  });

  it("is checked before the quota: the retried 5th photo comes back instead of 'ya subiste tus 5'", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, url: `u${i}`, challengeId: "c", isBonus: false }));
    assert.equal(quotaError("challenge", "c", five)?.limit, true);
    assert.equal(existingUpload(five, "u4")?.id, "p4");
  });
});

describe("F9 · polling pauses while uploading", () => {
  it("every 10 s normally, paused (0) during an upload", () => {
    assert.equal(FEED_REFRESH_MS, 10_000);
    assert.equal(feedRefreshInterval(false), 10_000);
    assert.equal(feedRefreshInterval(true), 0);
  });

  it("tracks uploads in flight and notifies, ending each one once", () => {
    let notified = 0;
    const off = subscribeUploadActivity(() => notified++);
    assert.equal(isUploadActive(), false);
    const endA = beginUploadActivity();
    const endB = beginUploadActivity();
    assert.equal(isUploadActive(), true);
    endA();
    endA();
    assert.equal(isUploadActive(), true, "B still uploading; a double end doesn't count twice");
    endB();
    assert.equal(isUploadActive(), false);
    assert.equal(notified, 4);
    off();
  });
});
