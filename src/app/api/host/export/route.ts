import { NextRequest, NextResponse } from "next/server";
import { downloadZip } from "client-zip";
import { prisma } from "@/lib/prisma";
import cloudinary, { parseCloudinaryUrl } from "@/lib/cloudinary";
import { isHost } from "@/lib/host";
import { EXPORT_PART_SIZE, exportFileName, slugify, type ExportKind } from "@/lib/export";

// Streams originals straight from Cloudinary into the ZIP; big batches take a while.
export const maxDuration = 300;

type Entry = { name: string; url: string; resourceType: ExportKind; createdAt: Date };

/**
 * Every photo in the DB (invalidated included; deleted ones are gone from the DB), numbered
 * per guest in upload order across photos and videos so names are stable between parts.
 */
async function listEntries(): Promise<Entry[]> {
  const photos = await prisma.photo.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { url: true, type: true, instagram: true, challengeId: true, createdAt: true },
  });

  const counters = new Map<string, number>();
  return photos.map((photo) => {
    const n = (counters.get(photo.instagram) ?? 0) + 1;
    counters.set(photo.instagram, n);
    const format = parseCloudinaryUrl(photo.url)?.format ?? (photo.type === "VIDEO" ? "mp4" : "jpg");
    return {
      name: exportFileName(photo.instagram, photo.challengeId, n, format),
      url: photo.url,
      resourceType: photo.type === "VIDEO" ? "video" : "image",
      createdAt: photo.createdAt,
    };
  });
}

/**
 * The original file as stored, via a signed Admin download URL (API secret) so nothing in
 * delivery can transform it. Falls back to the plain delivery URL, which has no transformations either.
 */
async function fetchOriginal(entry: Entry): Promise<Response | null> {
  const parsed = parseCloudinaryUrl(entry.url);
  if (parsed) {
    try {
      const signed = cloudinary.utils.private_download_url(parsed.publicId, parsed.format, {
        resource_type: entry.resourceType,
        type: "upload",
      });
      const res = await fetch(signed);
      if (res.ok) return res;
      console.error(`export: signed download failed (${res.status}) for ${entry.url}`);
    } catch (err) {
      console.error("export: signed download failed", err);
    }
  }
  const res = await fetch(entry.url).catch(() => null);
  return res?.ok ? res : null;
}

/** Host-only. `?kind=image|video&part=N` (1-based) → ZIP. Without `part`: how many parts each kind has. */
export async function GET(request: NextRequest) {
  if (!isHost(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await listEntries();
  const byKind = (kind: ExportKind) => entries.filter((e) => e.resourceType === kind);

  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "image" && kind !== "video") {
    const summary = (["image", "video"] as const).map((k) => {
      const count = byKind(k).length;
      return { kind: k, count, parts: Math.ceil(count / EXPORT_PART_SIZE[k]) };
    });
    return NextResponse.json({ summary }, { headers: { "Cache-Control": "no-store" } });
  }

  const size = EXPORT_PART_SIZE[kind];
  const all = byKind(kind);
  const parts = Math.max(1, Math.ceil(all.length / size));
  const part = Number(request.nextUrl.searchParams.get("part") ?? "1");
  if (!Number.isInteger(part) || part < 1 || part > parts || all.length === 0) {
    return NextResponse.json({ error: "No hay nada para descargar en esa parte" }, { status: 404 });
  }
  const batch = all.slice((part - 1) * size, part * size);

  const missing: string[] = [];
  async function* files() {
    for (const entry of batch) {
      const res = await fetchOriginal(entry);
      if (res) {
        // Upload time as the file date, so the folder sorts in party order.
        yield { name: entry.name, input: res, lastModified: entry.createdAt };
      } else {
        missing.push(entry.name);
      }
    }
    // Only present if something couldn't be downloaded, so a silent gap is impossible.
    if (missing.length > 0) {
      yield {
        name: "_no_se_pudieron_descargar.txt",
        input: `No se pudieron bajar de Cloudinary:\n${missing.join("\n")}\n`,
      };
    }
  }

  const event = slugify(process.env.NEXT_PUBLIC_EVENT_NAME || "reelio") || "reelio";
  const label = kind === "image" ? "fotos" : "videos";
  const fileName = parts > 1 ? `${event}-${label}-${part}-de-${parts}.zip` : `${event}-${label}.zip`;

  const zip = downloadZip(files());
  return new Response(zip.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
