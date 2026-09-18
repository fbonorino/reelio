"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadToCloudinary } from "@/lib/cloudinary-client";

export function UploadFlow({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setName("");
    setProgress(0);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file, setProgress);
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...uploaded, uploaderName: name }),
      });
      if (!res.ok) throw new Error("Failed to save photo");

      toast.success("Shared to the party feed!");
      onUploaded();
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        size="lg"
        onClick={() => inputRef.current?.click()}
        className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-indigo-600 px-6 py-6 text-base font-semibold text-white shadow-lg shadow-indigo-950/50 hover:bg-indigo-500"
      >
        <Camera className="mr-2 size-5" />
        Share a moment
      </Button>

      <Dialog
        open={!!file}
        onOpenChange={(open) => {
          if (!open && !uploading) reset();
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Share to the feed</DialogTitle>
          </DialogHeader>

          {previewUrl && (
            <div className="relative overflow-hidden rounded-lg bg-zinc-950">
              {file?.type.startsWith("video") ? (
                <video src={previewUrl} className="max-h-72 w-full object-contain" controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="max-h-72 w-full object-contain" />
              )}
              {!uploading && (
                <button
                  onClick={reset}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                  aria-label="Remove"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          )}

          <Input
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={uploading}
            className="border-zinc-700 bg-zinc-950"
            maxLength={40}
          />

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
              disabled={uploading || !file}
              className="w-full bg-indigo-600 hover:bg-indigo-500"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Uploading {progress}%
                </>
              ) : (
                "Post to feed"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
