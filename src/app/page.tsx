"use client";

import { useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Feed } from "@/components/feed";
import { UploadFlow, type UploadFlowHandle } from "@/components/upload-flow";
import { Leaderboard } from "@/components/leaderboard";
import { Countdown } from "@/components/countdown";
import { Onboarding } from "@/components/onboarding";
import { InfoRail } from "@/components/info-rail";
import { MAX_FREE_PHOTOS_PER_USER, MAX_PHOTOS_PER_USER } from "@/lib/challenges";
import { GameOver } from "@/components/winner-announcement";
import { useEventEnded } from "@/hooks/use-event-ended";
import { useWinnerPreview } from "@/hooks/use-winner-preview";
import { useQuota } from "@/hooks/use-quota";
import { useInstagram } from "@/lib/profile";

const eventName = process.env.NEXT_PUBLIC_EVENT_NAME || "The Party";

type Tab = "new" | "top" | "ranking";

export default function Home() {
  const [tab, setTab] = useState<Tab>("new");
  const { mutate } = useSWRConfig();
  const instagram = useInstagram();
  const ended = useEventEnded();
  const preview = useWinnerPreview();
  // Also revalidates the saved handle against the guest list; onboarding reopens if it was removed.
  const quota = useQuota(instagram);
  const photosUsed = quota?.used ?? 0;
  const freeUsed = quota?.free?.used ?? 0;
  // Uploads stay open after the game closes; those photos just don't score.
  // Challenge photos and "Foto libre" are capped separately.
  const pickable = {
    challenges: photosUsed < MAX_PHOTOS_PER_USER,
    free: freeUsed < MAX_FREE_PHOTOS_PER_USER,
  };
  const uploadRef = useRef<UploadFlowHandle>(null);

  function refreshFeeds() {
    mutate(
      (key) =>
        typeof key === "string" &&
        (key.startsWith("/api/photos") ||
          key.startsWith("/api/leaderboard") ||
          key.startsWith("/api/quota"))
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <h1 className="mb-1 text-center font-display text-2xl uppercase tracking-wide text-zinc-50">
          {eventName}
        </h1>
        <Countdown />
        <GameOver ended={ended} instagram={instagram} preview={preview} />
      </header>
      {/* Only the tabs stick: with the winner banner, the whole header would cover a third of a small phone.
          51px leaves each tab 44px tall inside the list's padding. */}
      <div className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900 group-data-horizontal/tabs:h-[51px]">
            <TabsTrigger value="new">En vivo</TabsTrigger>
            <TabsTrigger value="top">Más likeadas</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <main className="flex flex-1 flex-col">
        {tab === "ranking" ? <Leaderboard /> : <Feed sort={tab} />}
      </main>

      <UploadFlow
        ref={uploadRef}
        instagram={instagram}
        photosUsed={photosUsed}
        freeUsed={freeUsed}
        ended={ended}
        onUploaded={refreshFeeds}
      />
      <InfoRail
        // The list itself disables or hides what's out of room, and says why.
        onPickChallenge={instagram ? (id) => uploadRef.current?.start(id) : undefined}
        pickable={pickable}
      />
      {/* Remount when it reopens (handle removed from the guest list) so it starts from a clean search.
          Held back during a winner preview, which may run on a device that never onboarded. */}
      <Onboarding key={instagram === null ? "open" : "closed"} open={instagram === null && !preview} />
    </div>
  );
}
