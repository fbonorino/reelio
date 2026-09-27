"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Feed } from "@/components/feed";
import { UploadFlow } from "@/components/upload-flow";
import { Leaderboard } from "@/components/leaderboard";
import { Countdown } from "@/components/countdown";
import { Onboarding } from "@/components/onboarding";
import { usePhotos } from "@/hooks/use-photos";
import { getDeviceId } from "@/lib/device-id";
import { useInstagram } from "@/lib/profile";

const eventName = process.env.NEXT_PUBLIC_EVENT_NAME || "The Party";

type Tab = "new" | "top" | "ranking";

export default function Home() {
  const [tab, setTab] = useState<Tab>("new");
  const { mutate } = useSWRConfig();
  const instagram = useInstagram();
  const [deviceId] = useState(() => getDeviceId());
  // Same SWR key as the "new" feed, so this doesn't add a second poll.
  const { photos } = usePhotos("new", deviceId);
  const photosUsed = instagram ? photos.filter((p) => p.instagram === instagram).length : 0;

  function refreshFeeds() {
    mutate(
      (key) =>
        typeof key === "string" &&
        (key.startsWith("/api/photos") || key.startsWith("/api/leaderboard"))
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="mb-1 text-center font-display text-2xl uppercase tracking-wide text-zinc-50">
          {eventName}
        </h1>
        <Countdown />
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
            <TabsTrigger value="new">En vivo</TabsTrigger>
            <TabsTrigger value="top">Más likeadas</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="flex flex-1 flex-col">
        {tab === "ranking" ? <Leaderboard /> : <Feed sort={tab} />}
      </main>

      <UploadFlow instagram={instagram} photosUsed={photosUsed} onUploaded={refreshFeeds} />
      <Onboarding open={instagram === null} />
    </div>
  );
}
