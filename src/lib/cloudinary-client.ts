import {
  cloudinaryError,
  fileSizeError,
  isVideoFile,
  UPLOAD_RESPONSE_MS,
  UPLOAD_STALL_MS,
  UploadError,
} from "./upload-rules.ts";

export type CloudinaryUploadResult = {
  url: string;
  thumbnailUrl: string;
  type: "IMAGE" | "VIDEO";
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function buildThumbnailUrl(secureUrl: string, resourceType: "image" | "video") {
  if (resourceType === "video") {
    const withTransform = secureUrl.replace(
      "/upload/",
      "/upload/w_500,h_500,c_fill,q_auto,so_0/"
    );
    return withTransform.replace(/\.\w+$/, ".jpg");
  }
  return secureUrl.replace("/upload/", "/upload/w_500,h_500,c_fill,q_auto,f_auto/");
}

const FULL_SCREEN = "w_1600,h_1600,c_limit,q_auto";

/**
 * Full-screen image, sized for phones (sharp at 3x on the widest ones) and in a format every
 * browser decodes, instead of the multi-MB original (or a HEIC Android can't show).
 * URLs that aren't plain Cloudinary uploads come back unchanged.
 */
export function fullScreenImageUrl(url: string) {
  if (!url.startsWith("https://res.cloudinary.com/")) return url;
  return url.replace("/image/upload/", `/image/upload/${FULL_SCREEN},f_auto/`);
}

/** First frame of a video at full-screen size, uncropped (the thumbnail is a square crop). */
export function videoPosterUrl(url: string) {
  if (!url.startsWith("https://res.cloudinary.com/")) return undefined;
  return url.replace("/video/upload/", `/video/upload/${FULL_SCREEN},so_0/`).replace(/\.\w+$/, ".jpg");
}

/** The slice of XMLHttpRequest the upload uses, so the tests can drive a fake one. */
export type UploadXhr = Pick<XMLHttpRequest, "open" | "send" | "abort" | "status" | "responseText"> & {
  upload: { onprogress: ((e: ProgressEvent) => void) | null; onload: (() => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
};

type TimerApi = { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };

/**
 * POSTs `body` to Cloudinary and resolves with its JSON. Never hangs: a watchdog aborts it when the
 * upload stops making progress for `stallMs` while sending, or when the answer doesn't come within
 * `responseMs` once everything was sent. `signal` cancels it (the guest's Cancelar). Every failure
 * is an UploadError the flow can show and retry.
 */
export function sendUpload(
  endpoint: string,
  body: XMLHttpRequestBodyInit,
  {
    onProgress,
    signal,
    stallMs = UPLOAD_STALL_MS,
    responseMs = UPLOAD_RESPONSE_MS,
    createXhr = () => new XMLHttpRequest() as unknown as UploadXhr,
    timers = globalThis as TimerApi,
  }: {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
    stallMs?: number;
    responseMs?: number;
    createXhr?: () => UploadXhr;
    timers?: TimerApi;
  } = {}
): Promise<{ secure_url: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new UploadError("cancelled"));
    const xhr = createXhr();
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      timers.clearTimeout(watchdog);
      signal?.removeEventListener("abort", onCancel);
      fn();
    };
    // (Re)arms the watchdog: any sign of life pushes the deadline back.
    const arm = (ms: number) => {
      timers.clearTimeout(watchdog);
      watchdog = timers.setTimeout(() => {
        finish(() => reject(new UploadError("stalled")));
        xhr.abort();
      }, ms);
    };
    function onCancel() {
      finish(() => reject(new UploadError("cancelled")));
      xhr.abort();
    }

    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (event) => {
      arm(stallMs);
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    // The whole file is out; now Cloudinary processes it.
    xhr.upload.onload = () => arm(responseMs);
    xhr.onload = () =>
      finish(() => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            if (typeof json?.secure_url !== "string") throw new Error("no secure_url");
            resolve(json);
          } catch {
            reject(new UploadError("failed"));
          }
        } else if (xhr.status === 0) {
          reject(new UploadError("offline"));
        } else {
          reject(cloudinaryError(xhr.status, xhr.responseText));
        }
      });
    xhr.onerror = () => finish(() => reject(new UploadError("offline")));
    signal?.addEventListener("abort", onCancel);

    arm(stallMs);
    xhr.send(body);
  });
}

export async function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
  { signal }: { signal?: AbortSignal } = {}
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  }
  // Checked again here so nothing over the plan's limit ever goes out over the club's signal.
  const tooBig = fileSizeError(file);
  if (tooBig) throw new UploadError("tooLarge", tooBig);

  const resourceType = isVideoFile(file) ? "video" : "image";
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const result = await sendUpload(endpoint, formData, { onProgress, signal });

  return {
    url: result.secure_url,
    thumbnailUrl: buildThumbnailUrl(result.secure_url, resourceType),
    type: resourceType === "video" ? "VIDEO" : "IMAGE",
  };
}
