import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Public id and format of an untransformed delivery URL like `.../upload/v123/folder/abc.jpg`. */
export function parseCloudinaryUrl(url: string): { publicId: string; format: string } | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.(\w+)$/);
  return match ? { publicId: match[1], format: match[2] } : null;
}

export default cloudinary;
