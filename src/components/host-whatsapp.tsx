"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { BellRing, Copy, MessageCircle, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useHostBonus, type HostBonus } from "@/hooks/use-host-bonus";
import { formatBonusTime } from "@/lib/bonus";
import { cn } from "@/lib/utils";

type Notice = "open" | "close";

/** The closing reminder goes out this long before the window closes (3:45 for a 4:00 close). */
const CLOSE_NOTICE_LEAD_MS = 15 * 60_000;

/**
 * Prearmados. They never name the bonus challenges ("nuevas consignas" only): the group may include
 * people who aren't playing, and the texts are a surprise until the app opens them.
 */
const DEFAULT_MESSAGES: Record<Notice, string> = {
  open: "bonus track abierto 🕯️ nuevas consignas + puntos x2, solo hasta las 4 am. entrá y sacá tus fotos 👇 {link}",
  close:
    "quedan 15 min ⏳ a las 4 se cierra el juego y se define el ganador. última chance de sumar puntos x2 👇 {link}",
};

const NOTICES: { notice: Notice; title: string }[] = [
  { notice: "open", title: "Apertura" },
  { notice: "close", title: "Cierre inminente" },
];

// Edited texts and "already sent" marks live on the host's device: the card is a helper, not a record.
const MESSAGE_KEY = "reelio_wa_message:";
const SENT_KEY = "reelio_wa_sent:";

const listeners = new Set<() => void>();

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode: it just won't be remembered across reloads.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useStored(key: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => (key ? read(key) : null),
    () => null
  );
}

/**
 * Which opening or closing a notice is for, so sending one during a test (forced open at 22:00)
 * doesn't hide the reminder for the real one at 3:00.
 */
function sentKey(notice: Notice, bonus: HostBonus) {
  if (notice === "close") return bonus.closesAt ? `${SENT_KEY}close:${bonus.closesAt}` : null;
  return `${SENT_KEY}open:${bonus.override === "OPEN" ? bonus.overrideAt : bonus.startsAt}`;
}

/** Server time on the host's device, ticking every few seconds (null until mounted). */
function useHostNow(offset: number | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (offset === undefined) return;
    const tick = () => setNow(Date.now() + offset);
    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [offset]);
  return now;
}

/** Which notice is due right now, if any (and not sent yet). */
function useDueNotice(hostKey: string) {
  const { data } = useHostBonus(hostKey);
  const now = useHostNow(data?.offset);
  const openSent = useStored(data ? sentKey("open", data) : null);
  const closeSent = useStored(data ? sentKey("close", data) : null);
  if (!data || now === null || data.phase !== "open") return null;

  const closesAt = data.closesAt ? new Date(data.closesAt).getTime() : null;
  if (closesAt !== null && now >= closesAt - CLOSE_NOTICE_LEAD_MS) {
    return closeSent ? null : { notice: "close" as const, at: formatBonusTime(closesAt - CLOSE_NOTICE_LEAD_MS) };
  }
  if (openSent) return null;
  // On schedule it says the scheduled time ("Son las 3:00"); forced open, when the host opened it.
  const openedAt = data.override === "OPEN" && data.overrideAt ? data.overrideAt : data.startsAt;
  return { notice: "open" as const, at: formatBonusTime(new Date(openedAt)) };
}

/** Host-only, top of the panel: "Son las 3:00: mandá el aviso de apertura", and the 3:45 one. */
export function HostWhatsAppReminder({ hostKey }: { hostKey: string }) {
  const due = useDueNotice(hostKey);
  if (!due) return null;
  return (
    <a
      href="#avisos-whatsapp"
      className="flex items-center gap-3 rounded-lg bg-bonus px-4 py-3 text-white shadow-lg shadow-bonus/20 outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <BellRing className="size-5 shrink-0 animate-pulse" />
      <span className="min-w-0 flex-1 font-semibold">
        Son las {due.at}: mandá el aviso de {due.notice === "open" ? "apertura" : "cierre"}
      </span>
      <span className="shrink-0 text-sm text-white/85 underline underline-offset-2">Ir al aviso</span>
    </a>
  );
}

/** Host-only: the two WhatsApp messages, editable, each sent with one tap or copied. No WhatsApp API. */
export function HostWhatsApp({ hostKey }: { hostKey: string }) {
  const { data } = useHostBonus(hostKey);
  const due = useDueNotice(hostKey);

  return (
    <section
      id="avisos-whatsapp"
      className="grid min-w-0 scroll-mt-4 gap-3 rounded-lg bg-zinc-900 p-4 ring-1 ring-zinc-800"
    >
      <h2 className="flex items-center gap-2 font-semibold text-zinc-50">
        <MessageCircle className="size-4" />
        Avisos por WhatsApp
      </h2>
      <p className="text-sm text-zinc-400">
        “Enviar” abre WhatsApp con el mensaje listo: elegís el grupo y lo mandás. <code>{"{link}"}</code> se
        reemplaza por la URL pública.
      </p>
      {data?.publicUrlError && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-500/40">
          {data.publicUrlError}
        </p>
      )}
      {NOTICES.map(({ notice, title }) => (
        <NoticeEditor
          key={notice}
          notice={notice}
          title={title}
          link={data?.publicUrl ?? null}
          sentKey={data ? sentKey(notice, data) : null}
          due={due?.notice === notice}
        />
      ))}
    </section>
  );
}

function NoticeEditor({
  notice,
  title,
  link,
  sentKey,
  due,
}: {
  notice: Notice;
  title: string;
  link: string | null;
  sentKey: string | null;
  due: boolean;
}) {
  const stored = useStored(MESSAGE_KEY + notice);
  const template = stored ?? DEFAULT_MESSAGES[notice];
  const sent = useStored(sentKey) !== null;
  const text = link ? template.replaceAll("{link}", link) : null;

  function markSent() {
    if (sentKey) write(sentKey, new Date().toISOString());
  }

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensaje copiado");
      markSent();
    } catch {
      toast.error("No se pudo copiar: seleccioná el texto a mano");
    }
  }

  return (
    <div
      className={cn(
        "grid gap-2 rounded-md bg-zinc-950 p-3 ring-1 ring-zinc-800",
        due && "ring-2 ring-bonus"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {sent && <span className="text-xs text-emerald-400">Enviado</span>}
      </div>
      <Textarea
        value={template}
        onChange={(e) => write(MESSAGE_KEY + notice, e.target.value)}
        rows={3}
        aria-label={`Mensaje de ${title.toLowerCase()}`}
        className="border-zinc-700 bg-zinc-900 text-base sm:text-sm"
      />
      {!template.includes("{link}") && (
        <p className="text-xs text-amber-300">Le falta {"{link}"}: el mensaje saldría sin el link.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {/* A real link, so the phone hands it to the WhatsApp app. */}
        <Button
          asChild
          className={cn(
            "h-11 flex-1 bg-emerald-600 text-white hover:bg-emerald-500 sm:pointer-fine:h-8",
            !text && "pointer-events-none opacity-50"
          )}
        >
          <a
            href={text ? `https://wa.me/?text=${encodeURIComponent(text)}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markSent}
            aria-disabled={!text}
          >
            <Send className="size-4" />
            Enviar por WhatsApp
          </a>
        </Button>
        <Button
          variant="secondary"
          onClick={copy}
          disabled={!text}
          className="h-11 sm:pointer-fine:h-8"
        >
          <Copy className="size-4" />
          Copiar
        </Button>
        {stored !== null && stored !== DEFAULT_MESSAGES[notice] && (
          <Button
            variant="ghost"
            onClick={() => write(MESSAGE_KEY + notice, null)}
            className="h-11 text-zinc-400 sm:pointer-fine:h-8"
          >
            <RotateCcw className="size-4" />
            Original
          </Button>
        )}
      </div>
    </div>
  );
}
