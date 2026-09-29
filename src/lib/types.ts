export type MediaType = "IMAGE" | "VIDEO";

export type Photo = {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: MediaType;
  instagram: string;
  challengeId: string;
  challengePoints: number;
  invalidated: boolean;
  /** Uploaded after the game closed: a keepsake worth no points, left out of the ranking. */
  postDeadline: boolean;
  likeCount: number;
  createdAt: string;
  likedByMe: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  instagram: string;
  score: number;
  photoCount: number;
};
