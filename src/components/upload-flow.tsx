"use client";

import { useImperativeHandle, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadToCloudinary } from "@/lib/cloudinary-client";
import { fireConfetti } from "@/lib/confetti";
import { CHALLENGES, MAX_PHOTOS_PER_USER } from "@/lib/challenges";
import { hasEventEnded } from "@/lib/event";

export type UploadFlowHandle = {
  /** Opens the file picker with `challengeId` preselected. Call from a click handler. */
  start: (challengeId: string) => void;
};

export function UploadFlow({
  instagram,
  photosUsed,
  onUploaded,
  ref,
}: {
  instagram: string | null | undefined;
  photosUsed: number;
  onUploaded: () => void;
  ref?: React.Ref<UploadFlowHandle>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const remaining = Math.max(0, MAX_PHOTOS_PER_USER - photosUsed);
  const limitReached = remaining === 0;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function openPicker(preselectedId = "") {
    if (hasEventEnded()) {
      toast.error("El juego ya terminó, no se pueden subir más fotos");
      return;
    }
    setChallengeId(preselectedId);
    inputRef.current?.click();
  }

  useImperativeHandle(ref, () => ({ start: openPicker }));

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setChallengeId("");
    setProgress(0);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file || !challengeId || !instagram) return;
    setUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file, setProgress);
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...uploaded, instagram, challengeId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar la foto");

      const left: number = data.remaining;
      toast.success(
        left > 0
          ? `¡Foto subida! Te quedan ${left} de ${MAX_PHOTOS_PER_USER} fotos.`
          : `¡Foto subida! Ya usaste tus ${MAX_PHOTOS_PER_USER} fotos.`
      );
      fireConfetti();
      onUploaded();
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falló la subida");
      setUploading(false);
    }
  }

  return (
    <>
      {/* No `capture` attribute: on mobile this lets guests pick between camera and gallery. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <Button
          size="lg"
          onClick={() => openPicker()}
          disabled={!instagram || limitReached}
          className="rounded-full bg-indigo-600 px-6 py-6 text-base font-semibold text-white shadow-lg shadow-indigo-950/50 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-400 disabled:opacity-100"
        >
          <Camera className="mr-2 size-5" />
          {limitReached ? "Llegaste al límite de fotos" : "Subir consigna"}
        </Button>
        {instagram && (
          <span className="rounded-full bg-zinc-950/80 px-2.5 py-0.5 text-xs text-zinc-400 backdrop-blur">
            {limitReached
              ? `Usaste tus ${MAX_PHOTOS_PER_USER} fotos — ahora a juntar likes ❤️`
              : `Te quedan ${remaining} de ${MAX_PHOTOS_PER_USER} fotos`}
          </span>
        )}
      </div>

      <Dialog
        open={!!file}
        onOpenChange={(open) => {
          if (!open && !uploading) reset();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Qué consigna cumpliste?</DialogTitle>
          </DialogHeader>

          {previewUrl && (
            <div className="relative overflow-hidden rounded-lg bg-zinc-950">
              {file?.type.startsWith("video") ? (
                <video src={previewUrl} className="max-h-64 w-full object-contain" controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Vista previa" className="max-h-64 w-full object-contain" />
              )}
              {!uploading && (
                <button
                  onClick={reset}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                  aria-label="Quitar"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          )}

          <select
            value={challengeId}
            onChange={(e) => setChallengeId(e.target.value)}
            disabled={uploading}
            required
            aria-label="Consigna"
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
          >
            <option value="" disabled>
              Elegí una consigna…
            </option>
            {CHALLENGES.map((c) => (
              <option key={c.id} value={c.id}>
                +{c.points} · {c.label}
                {c.menOnly ? " (SOLO HOMBRES)" : ""}
              </option>
            ))}
          </select>

          {uploading && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={uploading || !file || !challengeId}
              className="w-full bg-indigo-600 hover:bg-indigo-500"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Subiendo {progress}%
                </>
              ) : !challengeId ? (
                "Elegí una consigna para subir"
              ) : (
                "Subir foto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
