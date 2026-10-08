"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  AlertCircle,
  Ban,
  Camera,
  Check,
  ImageIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FreeBadge, KeepsakeBadge, PointsBadge } from "@/components/photo-meta";
import { ResponsiveModal } from "@/components/responsive-modal";
import { useBackToClose } from "@/hooks/use-back-to-close";
import { useMediaQuery } from "@/hooks/use-media-query";
import { uploadToCloudinary, type CloudinaryUploadResult } from "@/lib/cloudinary-client";
import { fireConfetti } from "@/lib/confetti";
import {
  FREE_PHOTO,
  isFreePhoto,
  MAX_FREE_PHOTOS_PER_USER,
  MAX_PHOTOS_PER_USER,
  type Challenge,
} from "@/lib/challenges";
import { useChallenges } from "@/hooks/use-challenges";
import { forgetIfNotInvited } from "@/lib/profile";
import { cn } from "@/lib/utils";

export type UploadFlowHandle = {
  /** Opens the flow with `challengeId` already picked, skipping straight to choosing the photo. */
  start: (challengeId: string) => void;
};

type Step = "challenge" | "media" | "review";

const STEPS: Record<Step, { number: number; title: string }> = {
  challenge: { number: 1, title: "Elegí la consigna" },
  media: { number: 2, title: "Sacá o elegí la foto" },
  review: { number: 3, title: "Revisá y subí" },
};

type UploadError = { message: string; retryable: boolean };

/** What the photo is for: a challenge, or "Foto libre" (`points: null`). */
type Pick = { id: string; label: string; points: number | null };

const FREE_PICK: Pick = { id: FREE_PHOTO.id, label: FREE_PHOTO.label, points: null };

function getPick(id: string | null, challenges: Challenge[] | undefined): Pick | undefined {
  if (!id) return undefined;
  if (isFreePhoto(id)) return FREE_PICK;
  return challenges?.find((c) => c.id === id);
}

export function UploadFlow({
  instagram,
  photosUsed,
  freeUsed,
  ended,
  onUploaded,
  ref,
}: {
  instagram: string | null | undefined;
  /** Challenge photos uploaded so far. */
  photosUsed: number;
  /** "Foto libre" uploads so far; capped separately. */
  freeUsed: number;
  /** The game has closed: uploads still work, but they're keepsakes worth no points. */
  ended: boolean;
  onUploaded: () => void;
  ref?: React.Ref<UploadFlowHandle>;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  // What to refocus on close. "Subir esta" lives in a sheet that's gone by then, so it falls back to the FAB.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // A retry after Cloudinary succeeded but saving failed reuses the upload instead of orphaning a copy.
  const uploadedRef = useRef<{ file: File; result: CloudinaryUploadResult } | null>(null);

  const [open, setOpen] = useState(false);
  const [currentStep, setStep] = useState<Step>("challenge");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);

  // `capture` only means something on phones; on desktop it would just open the same file picker.
  const hasCamera = useMediaQuery("(pointer: coarse)");

  const remaining = Math.max(0, MAX_PHOTOS_PER_USER - photosUsed);
  const freeRemaining = Math.max(0, MAX_FREE_PHOTOS_PER_USER - freeUsed);
  const limitReached = remaining === 0 && freeRemaining === 0;
  const challenges = useChallenges();
  const pick = getPick(challengeId, challenges);
  // The host took the picked challenge out of the game meanwhile: back to choosing one.
  const step: Step = currentStep !== "challenge" && challenges && !pick ? "challenge" : currentStep;
  const pickIsFree = pick?.points === null;

  // Android's Back closes the flow instead of leaving the app; mid-upload it does nothing.
  useBackToClose(open, () => setOpen(false), { dismissible: !uploading });

  // Move focus to the new step's title so keyboard and screen reader users follow along.
  useEffect(() => {
    if (open) titleRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  function begin(preselectedId?: string) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    uploadedRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
    setUploading(false);
    setError(null);
    setChallengeId(preselectedId ?? null);
    setStep(preselectedId ? "media" : "challenge");
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }

  function restoreFocus(e: Event) {
    e.preventDefault();
    const previous = returnFocusRef.current;
    const target = previous?.isConnected && previous !== document.body ? previous : fabRef.current;
    target?.focus({ preventScroll: true });
  }

  useImperativeHandle(ref, () => ({ start: begin }));

  function pickChallenge(id: string) {
    setChallengeId(id);
    setError(null);
    setStep(file ? "review" : "media");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    // Cleared so picking the same file again still fires `change`.
    e.target.value = "";
    if (!selected) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setError(null);
    setProgress(0);
    setStep("review");
  }

  async function handleSubmit() {
    if (!file || !challengeId || !instagram) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      // Check the guest list and quota first, so a rejected upload doesn't leave an orphan in Cloudinary.
      const quotaRes = await fetch(`/api/quota?instagram=${encodeURIComponent(instagram)}`);
      const quota = await quotaRes.json().catch(() => null);
      if (!quotaRes.ok) {
        if (forgetIfNotInvited(quota)) {
          setOpen(false);
          toast.error(quota.error);
          return;
        }
        throw new Error(quota?.error ?? "No se pudo verificar tu cupo");
      }
      const left = pickIsFree ? quota.free?.remaining : quota.remaining;
      if (left <= 0) {
        setError({
          message: pickIsFree
            ? `Ya subiste tus ${MAX_FREE_PHOTOS_PER_USER} fotos libres`
            : `Ya subiste tus ${MAX_PHOTOS_PER_USER} fotos de consignas`,
          retryable: false,
        });
        return;
      }

      let uploaded = uploadedRef.current?.file === file ? uploadedRef.current.result : null;
      if (uploaded) {
        setProgress(100);
      } else {
        uploaded = await uploadToCloudinary(file, setProgress);
        uploadedRef.current = { file, result: uploaded };
      }

      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...uploaded, instagram, challengeId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (forgetIfNotInvited(data)) {
          setOpen(false);
          toast.error(data.error);
          return;
        }
        if (data?.remaining === 0) {
          setError({ message: data.error, retryable: false });
          return;
        }
        throw new Error(data?.error ?? "No se pudo guardar la foto");
      }

      const leftAfter: number = data.remaining;
      if (pickIsFree) {
        toast.success(
          leftAfter > 0
            ? `¡Foto libre subida! Te quedan ${leftAfter} de ${MAX_FREE_PHOTOS_PER_USER} libres.`
            : `¡Foto libre subida! Ya usaste tus ${MAX_FREE_PHOTOS_PER_USER} libres.`
        );
      } else {
        // Trust the server: the game may have closed while this flow was open.
        const headline = data.photo?.postDeadline ? "¡Foto subida de recuerdo!" : "¡Foto subida!";
        toast.success(
          leftAfter > 0
            ? `${headline} Te quedan ${leftAfter} de ${MAX_PHOTOS_PER_USER} fotos.`
            : `${headline} Ya usaste tus ${MAX_PHOTOS_PER_USER} fotos.`
        );
      }
      fireConfetti();
      onUploaded();
      setOpen(false);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Falló la subida",
        retryable: true,
      });
    } finally {
      setUploading(false);
    }
  }

  const isVideo = file?.type.startsWith("video");

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={handleFileSelect}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={handleFileSelect}
      />

      <div className="fixed bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <Button
          ref={fabRef}
          size="lg"
          onClick={() => begin()}
          disabled={!instagram || limitReached}
          className="rounded-full bg-indigo-600 px-6 py-6 text-base font-semibold text-white shadow-lg shadow-indigo-950/50 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-400 disabled:opacity-100"
        >
          <Camera className="mr-2 size-5" />
          {limitReached
            ? "Llegaste al límite de fotos"
            : ended || remaining === 0
              ? "Subir foto"
              : "Subir consigna"}
        </Button>
        {instagram && (
          <span className="max-w-[calc(100vw-2rem)] text-balance rounded-full bg-zinc-950/80 px-2.5 py-0.5 text-center text-xs text-zinc-300 backdrop-blur">
            {limitReached
              ? ended
                ? `Usaste tus ${MAX_PHOTOS_PER_USER} fotos`
                : `Usaste tus ${MAX_PHOTOS_PER_USER} fotos — ahora a juntar likes ❤️`
              : remaining === 0
                ? `Usaste tus ${MAX_PHOTOS_PER_USER} fotos de consignas · te quedan ${freeRemaining} libres`
                : `Te quedan ${remaining} de ${MAX_PHOTOS_PER_USER} fotos`}
            {ended && !limitReached && " · no suman puntos"}
          </span>
        )}
      </div>

      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        dismissible={!uploading}
        title={step === "challenge" && ended ? "¿Qué consigna hiciste?" : STEPS[step].title}
        titleRef={titleRef}
        onCloseAutoFocus={restoreFocus}
        description={
          <>
            <StepDots current={STEPS[step].number} />
            <span>
              Paso {STEPS[step].number} de 3
            </span>
          </>
        }
        footer={
          step === "review" && (
            <Button
              onClick={handleSubmit}
              disabled={uploading || !file || !pick || (error !== null && !error.retryable)}
              className="h-12 w-full rounded-xl bg-indigo-600 text-base font-semibold text-white hover:bg-indigo-500"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  {progress < 100 ? `Subiendo ${progress}%` : "Guardando…"}
                </>
              ) : error?.retryable ? (
                <>
                  <RotateCcw className="size-5" />
                  Reintentar
                </>
              ) : (
                <>
                  <Upload className="size-5" />
                  Subir
                </>
              )}
            </Button>
          )
        }
      >
        {ended && step !== "media" && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-sky-500/10 px-3 py-2 text-sm text-sky-100 ring-1 ring-sky-500/50">
            <KeepsakeBadge label="No suma puntos" className="shrink-0" />
            <span>El juego ya terminó: esta foto es solo recuerdo.</span>
          </div>
        )}

        {step === "challenge" && (
          <ul className="space-y-2" aria-label="Consignas">
            {challenges?.map((c) => (
              <li key={c.id}>
                <ChallengeOption
                  pick={c}
                  showPoints={!ended}
                  selected={c.id === challengeId}
                  disabledReason={
                    remaining === 0
                      ? `Ya usaste tus ${MAX_PHOTOS_PER_USER} fotos de consignas`
                      : undefined
                  }
                  onSelect={() => pickChallenge(c.id)}
                />
              </li>
            ))}
            <li>
              <ChallengeOption
                pick={FREE_PICK}
                hint={FREE_PHOTO.hint}
                showPoints={!ended}
                selected={isFreePhoto(challengeId ?? "")}
                disabledReason={
                  freeRemaining === 0
                    ? `Ya subiste tus ${MAX_FREE_PHOTOS_PER_USER} fotos libres`
                    : undefined
                }
                onSelect={() => pickChallenge(FREE_PHOTO.id)}
              />
            </li>
          </ul>
        )}

        {step === "media" && pick && (
          <div className="space-y-4">
            <SelectedChallenge
              pick={pick}
              ended={ended}
              onChange={() => setStep("challenge")}
            />
            <div className="grid gap-3">
              {hasCamera && (
                <MediaSourceButton
                  icon={Camera}
                  label="Sacar foto"
                  hint="Foto o video con la cámara"
                  primary
                  onClick={() => cameraInputRef.current?.click()}
                />
              )}
              <MediaSourceButton
                icon={ImageIcon}
                label="Elegir de la galería"
                hint="Fotos y videos que ya tenés"
                primary={!hasCamera}
                onClick={() => galleryInputRef.current?.click()}
              />
            </div>
            {file && (
              <Button
                variant="ghost"
                onClick={() => setStep("review")}
                className="h-11 w-full text-zinc-300 hover:text-zinc-50"
              >
                Seguir con la que elegí antes
              </Button>
            )}
          </div>
        )}

        {step === "review" && pick && previewUrl && (
          <div className="space-y-3">
            <SelectedChallenge pick={pick} ended={ended} />

            <div className="overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-zinc-800">
              {isVideo ? (
                <video
                  src={previewUrl}
                  className="max-h-[40dvh] w-full object-contain"
                  controls
                  playsInline
                  aria-label="Vista previa del video"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Vista previa de la foto"
                  className="max-h-[40dvh] w-full object-contain"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("challenge")}
                disabled={uploading}
                aria-label="Cambiar consigna"
                className="h-11 rounded-xl border-zinc-700 bg-zinc-950 text-zinc-200"
              >
                <RefreshCw className="size-4" />
                Cambiar consigna
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep("media")}
                disabled={uploading}
                aria-label={isVideo ? "Cambiar video" : "Cambiar foto"}
                className="h-11 rounded-xl border-zinc-700 bg-zinc-950 text-zinc-200"
              >
                <ImageIcon className="size-4" />
                {isVideo ? "Cambiar video" : "Cambiar foto"}
              </Button>
            </div>

            {uploading && (
              <div
                role="progressbar"
                aria-label="Progreso de la subida"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
              >
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-rose-500/10 px-3 py-2.5 text-sm text-rose-100 ring-1 ring-rose-500/50"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />
                <div>
                  <p className="font-medium">{error.message}</p>
                  {error.retryable && (
                    <p className="text-rose-200/80">Tu foto y la consigna siguen acá: probá de nuevo.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </ResponsiveModal>
    </>
  );
}

function StepDots({ current }: { current: number }) {
  return (
    <span className="mr-2 inline-flex gap-1 align-middle" aria-hidden>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "h-1.5 rounded-full transition-all",
            n === current ? "w-5 bg-indigo-400" : n < current ? "w-1.5 bg-indigo-400/60" : "w-1.5 bg-zinc-700"
          )}
        />
      ))}
    </span>
  );
}

function ChallengeOption({
  pick,
  hint,
  showPoints,
  selected,
  disabledReason,
  onSelect,
}: {
  pick: Pick;
  hint?: string;
  showPoints: boolean;
  selected: boolean;
  /** Shown instead of hiding the option when the guest has no room left for it. */
  disabledReason?: string;
  onSelect: () => void;
}) {
  const free = pick.points === null;
  const disabled = disabledReason !== undefined;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={[
        pick.label,
        free ? "foto libre, no suma puntos" : showPoints && `${pick.points} puntos`,
        disabledReason,
      ]
        .filter(Boolean)
        .join(", ")}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-[box-shadow,background-color] outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 enabled:active:scale-[0.99]",
        free
          ? "border border-dashed border-zinc-700 bg-zinc-950/40 enabled:hover:border-zinc-500"
          : "bg-zinc-950 ring-1 ring-zinc-800 enabled:hover:bg-zinc-900 enabled:hover:ring-zinc-600",
        selected && "border-solid bg-indigo-500/10 ring-2 ring-indigo-500 enabled:hover:ring-indigo-500",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {free ? (
        <FreeBadge className="w-11 shrink-0 text-center" />
      ) : (
        showPoints &&
        pick.points !== null && <PointsBadge points={pick.points} className="w-11 shrink-0 text-center" />
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm leading-snug", free ? "text-zinc-300" : "text-zinc-200")}>
          {pick.label}
        </span>
        {(disabledReason ?? hint) && (
          <span className="flex items-center gap-1 text-xs leading-snug text-zinc-400">
            {disabled && <Ban className="size-3 shrink-0" aria-hidden />}
            {disabledReason ?? hint}
          </span>
        )}
      </span>
      {selected && <Check className="size-5 shrink-0 text-indigo-400" aria-hidden />}
    </button>
  );
}

function SelectedChallenge({
  pick,
  ended,
  onChange,
}: {
  pick: Pick;
  ended: boolean;
  onChange?: () => void;
}) {
  const free = pick.points === null;
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-lg bg-zinc-950 px-3 py-2.5 ring-1 ring-indigo-500/60">
      {free ? (
        <FreeBadge className="w-11 shrink-0 text-center" />
      ) : (
        !ended &&
        pick.points !== null && <PointsBadge points={pick.points} className="w-11 shrink-0 text-center" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[0.7rem] font-medium uppercase tracking-wider text-zinc-400">Consigna</p>
        <p className="text-sm leading-snug text-zinc-100">{pick.label}</p>
        {/* After the close the keepsake banner already says so. */}
        {free && !ended && <p className="text-xs text-zinc-400">No suma puntos</p>}
      </div>
      {onChange && (
        <Button
          variant="ghost"
          onClick={onChange}
          aria-label="Cambiar consigna"
          className="h-11 shrink-0 px-3 text-indigo-300 hover:text-indigo-200"
        >
          Cambiar
        </Button>
      )}
    </div>
  );
}

function MediaSourceButton({
  icon: Icon,
  label,
  hint,
  primary,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${hint}`}
      className={cn(
        "flex min-h-20 w-full items-center gap-4 rounded-xl px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 active:scale-[0.99]",
        primary
          ? "bg-indigo-600 text-white hover:bg-indigo-500"
          : "bg-zinc-950 text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-800"
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          primary ? "bg-white/15" : "bg-zinc-800"
        )}
      >
        <Icon className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold">{label}</span>
        <span className={cn("block text-sm", primary ? "text-indigo-100" : "text-zinc-400")}>
          {hint}
        </span>
      </span>
    </button>
  );
}
