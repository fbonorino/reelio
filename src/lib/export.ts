import { getChallengeLabel } from "@/lib/challenges";

export type ExportKind = "image" | "video";

/**
 * Files per ZIP. A ZIP is streamed while each original is downloaded, so it has to finish
 * within the function's max duration or the download ends up truncated. Videos are much
 * bigger, hence smaller batches.
 */
export const EXPORT_PART_SIZE: Record<ExportKind, number> = { image: 60, video: 8 };

/** Lowercase ASCII, words joined by "-": safe in file names on any OS. */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "Foto acostado en el piso del boliche" → "acostado-en-el-piso-del-boliche". */
export function challengeSlug(challengeId: string) {
  const label = getChallengeLabel(challengeId)?.replace(/^foto\s+/i, "");
  return slugify(label ?? challengeId) || "consigna";
}

/** e.g. fran_bonorino_acostado-en-el-piso-del-boliche_01.jpg — `n` counts each guest's uploads in order. */
export function exportFileName(instagram: string, challengeId: string, n: number, format: string) {
  const handle = instagram.replace(/[^a-z0-9._]/g, "") || "anonimo";
  const ext = format.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${handle}_${challengeSlug(challengeId)}_${String(n).padStart(2, "0")}.${ext}`;
}
