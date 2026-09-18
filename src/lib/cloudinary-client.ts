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
        reject(new Error("Upload failed. Please try again."));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed. Please check your connection."));

    xhr.send(formData);
  });

  return {
    url: result.secure_url,
    thumbnailUrl: buildThumbnailUrl(result.secure_url, resourceType),
    type: resourceType === "video" ? "VIDEO" : "IMAGE",
  };
}
