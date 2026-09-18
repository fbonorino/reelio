export type MediaType = "IMAGE" | "VIDEO";

export type Photo = {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: MediaType;
  uploaderName: string | null;
  likeCount: number;
  createdAt: string;
  likedByMe: boolean;
};
