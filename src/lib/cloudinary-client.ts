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

export async function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const resourceType = file.type.startsWith("video") ? "video" : "image";
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error("Falló la subida de la foto"));
      }
    };

    xhr.onerror = () => reject(new Error("Falló la subida: revisá tu conexión"));

    xhr.send(formData);
  });

  return {
    url: result.secure_url,
    thumbnailUrl: buildThumbnailUrl(result.secure_url, resourceType),
    type: resourceType === "video" ? "VIDEO" : "IMAGE",
  };
}
