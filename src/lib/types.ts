export type MediaType = "IMAGE" | "VIDEO";

export type Photo = {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: MediaType;
  instagram: string;
  challengeId: string;
  /** The challenge's current label ("Foto libre" for free photos). */
  challengeLabel: string;
  challengePoints: number;
  invalidated: boolean;
  /** Uploaded after the game closed: a keepsake worth no points, left out of the ranking. */
  postDeadline: boolean;
  likeCount: number;
  createdAt: string;
  likedByMe: boolean;
};

/** A player's highest-scoring photo (challenge points + likes, same as the ranking). */
export type TopPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: MediaType;
  points: number;
};

export type LeaderboardEntry = {
  rank: number;
  instagram: string;
  score: number;
  photoCount: number;
  /** Likes received on game photos (they're already part of `score`); breaks prize ties. */
  likes: number;
  topPhoto: TopPhoto | null;
  /** ISO time of the last upload, like received or host adjustment that changed the score. */
  lastScoredAt: string | null;
};
