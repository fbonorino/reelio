"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Feed } from "@/components/feed";
import { UploadFlow } from "@/components/upload-flow";

const eventName = process.env.NEXT_PUBLIC_EVENT_NAME || "The Party";

export default function Home() {
  const [tab, setTab] = useState<"new" | "top">("new");
  const { mutate } = useSWRConfig();

  function refreshFeeds() {
    mutate((key) => typeof key === "string" && key.startsWith("/api/photos"));
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="mb-3 text-center text-lg font-bold tracking-tight text-zinc-50">
          {eventName}
        </h1>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "top")}>
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
            <TabsTrigger value="new">Live feed</TabsTrigger>
            <TabsTrigger value="top">Top photos</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="flex flex-1 flex-col">
        <Feed sort={tab} />
      </main>

      <UploadFlow onUploaded={refreshFeeds} />
    </div>
  );
}
