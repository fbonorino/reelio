/**
 * What can go wrong uploading a photo, and what the guest reads when it does. Pure, so the tests can
 * run it without a browser: cloudinary-client.ts and the upload flow both go through here.
 */

/** Cloudinary Free plan caps, checked on the phone before sending anything over the club's signal. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/** No upload progress for this long while sending: the connection is stuck, give up so the guest can retry. */
export const UPLOAD_STALL_MS = 30_000;
/** Everything sent, still no answer from Cloudinary after this long (videos take a while to process). */
export const UPLOAD_RESPONSE_MS = 90_000;
/** Our own API calls around the upload (quota check, saving the photo). */
export const API_TIMEOUT_MS = 20_000;

/**
 * - "offline": no connection, or it dropped. Retry.
 * - "stalled": the upload or a request stopped moving. Retry.
 * - "cancelled": the guest tapped Cancelar. Retry.
 * - "tooLarge": over the plan's size limit. Retrying the same file won't help.
 * - "failed": anything else from Cloudinary. Retry.
 */
export type UploadErrorKind = "offline" | "stalled" | "cancelled" | "tooLarge" | "failed";

export const UPLOAD_MESSAGES: Record<UploadErrorKind, string> = {
  offline: "Sin conexión: acercate a donde haya señal y tocá Reintentar",
  stalled: "La subida se trabó por la señal: tocá Reintentar",
  cancelled: "Subida cancelada",
  tooLarge: "El archivo es demasiado pesado: elegí otro",
  failed: "Falló la subida de la foto",
};

export class UploadError extends Error {
  kind: UploadErrorKind;
  constructor(kind: UploadErrorKind, message: string = UPLOAD_MESSAGES[kind]) {
    super(message);
    this.name = "UploadError";
    this.kind = kind;
  }
  /** Whether trying again with the same file can work. */
  get retryable() {
    return this.kind !== "tooLarge";
  }
}

function megabytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toLocaleString("es-AR", { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
}

export function isVideoFile(file: { type: string }) {
  return file.type.startsWith("video");
}

/** Why `file` can't be uploaded at all, before trying: null when it fits. */
export function fileSizeError(file: { size: number; type: string }): string | null {
  const video = isVideoFile(file);
  const max = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= max) return null;
  return video
    ? `Este video pesa ${megabytes(file.size)} y el máximo es ${megabytes(max)}: grabá uno más corto o elegí otro.`
    : `Esta foto pesa ${megabytes(file.size)} y el máximo es ${megabytes(max)}: elegí otra o mandá una captura de pantalla de la foto.`;
}

/** A failed Cloudinary response, by its HTTP status and `{ error: { message } }` body. */
export function cloudinaryError(status: number, responseText: string): UploadError {
  let message = "";
  try {
    message = String(JSON.parse(responseText)?.error?.message ?? "");
  } catch {
    // Not JSON (a proxy's error page): treat as a generic failure.
  }
  // e.g. "File size too large. Got 12582912. Maximum is 10485760." / "Resource has too many pixels…"
  if (status === 400 && /too large|too big|maximum is|too many pixels|megapixels/i.test(message)) {
    return new UploadError("tooLarge", "La foto o el video supera el máximo permitido (10 MB o 25 megapíxeles para fotos, 100 MB para videos): elegí otro archivo.");
  }
  return new UploadError("failed");
}

/**
 * Any error from the upload flow, as something to show: our UploadErrors as they are, a fetch that
 * couldn't reach the server ("Load failed" in Safari, "Failed to fetch" in Chrome) as "offline", and an
 * aborted request as cancelled or stalled.
 */
export function toUploadError(err: unknown, { cancelled = false }: { cancelled?: boolean } = {}): UploadError {
  if (err instanceof UploadError) return err;
  if (cancelled) return new UploadError("cancelled");
  const name = (err as { name?: unknown } | null)?.name;
  if (name === "AbortError" || name === "TimeoutError") return new UploadError("stalled");
  if (err instanceof TypeError) return new UploadError("offline");
  // Errors our own code throws with a Spanish message from the server (e.g. "No se pudo verificar tu cupo").
  if (err instanceof Error && err.message) return new UploadError("failed", err.message);
  return new UploadError("failed");
}

type TimerApi = { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };

/**
 * `fetch` that gives up after `ms` or when `signal` aborts, whichever comes first. Doesn't use
 * AbortSignal.any/timeout, which older iPhones (iOS < 17.4) don't have.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { signal?: AbortSignal },
  ms: number,
  { fetchImpl = fetch, timers = globalThis as TimerApi }: { fetchImpl?: typeof fetch; timers?: TimerApi } = {}
): Promise<Response> {
  const controller = new AbortController();
  const outer = init.signal;
  const onOuterAbort = () => controller.abort();
  if (outer?.aborted) controller.abort();
  outer?.addEventListener("abort", onOuterAbort);
  const timer = timers.setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    timers.clearTimeout(timer);
    outer?.removeEventListener("abort", onOuterAbort);
  }
}
