"use client";

import { Fragment, useState } from "react";
import { AtSign, SearchX, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cleanInstagramInput, instagramProfileUrl } from "@/lib/instagram";

/** Stable per handle, so each guest keeps their color across refreshes and phones. */
function avatarColor(handle: string) {
  let hash = 0;
  for (const ch of handle) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  // Dark enough for white text on every hue.
  return `hsl(${Math.abs(hash) % 360} 55% 36%)`;
}

/** Line-break opportunities after "." and "_", so a long handle wraps at its own word breaks. */
function breakable(handle: string) {
  return handle.split(/(?<=[._])/).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ));
}

/** First letter or digit: "_juan" → "J". */
function initial(handle: string) {
  return (handle.match(/[a-z0-9]/)?.[0] ?? handle[0] ?? "?").toUpperCase();
}

function GuestRow({ handle }: { handle: string }) {
  // The API only sends valid handles; this is the last guard before it becomes a link.
  const href = instagramProfileUrl(handle);
  if (!href) return null;
  return (
    <li className="flex items-center gap-2.5 py-2">
      <span
        aria-hidden
        style={{ backgroundColor: avatarColor(handle) }}
        className="flex size-9 shrink-0 items-center justify-center rounded-full font-display text-base text-white"
      >
        {initial(handle)}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        // Wraps instead of truncating: on a narrow phone the whole handle is what tells two guests apart.
        // Mid-word only as a last resort, for a handle with no "." or "_".
        className="min-w-0 flex-1 py-1 text-[0.95rem] font-medium leading-snug text-indigo-300 [overflow-wrap:anywhere] hover:underline"
      >
        @{breakable(handle)}
      </a>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ver perfil de @${handle} en Instagram`}
        className="inline-flex h-11 shrink-0 items-center rounded-lg border border-zinc-700 px-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 active:scale-95 active:bg-zinc-800"
      >
        Ver perfil
      </a>
    </li>
  );
}

/**
 * Body of the "Invitados" panel: a search box over the guests who already got in, newest first.
 * `handles` refreshes in place while open, so the search text and scroll position stay put.
 */
export function GuestList({ handles, error }: { handles: string[] | undefined; error?: boolean }) {
  const [query, setQuery] = useState("");
  const q = cleanInstagramInput(query);
  const visible = handles && q ? handles.filter((h) => h.includes(q)) : handles;

  return (
    <div>
      {/* Sticks to the top of the panel's scroll area; pt-1 keeps the focus ring from being clipped. */}
      <div className="sticky top-0 z-10 -mx-4 bg-zinc-900 px-4 pb-3 pt-1">
        <div className="relative">
          <AtSign
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por usuario"
            aria-label="Buscar invitado por usuario de Instagram"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-11 border-zinc-700 bg-zinc-950 pl-9"
          />
        </div>
      </div>

      {!handles ? (
        error ? (
          <p className="py-10 text-center text-sm text-zinc-400">
            No se pudo cargar la lista. Probá de nuevo en un rato.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Cargando invitados">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <Skeleton className="h-14 rounded-lg bg-zinc-800" />
              </li>
            ))}
          </ul>
        )
      ) : handles.length === 0 ? (
        <EmptyState icon={Users} title="Todavía no entró nadie" text="Apenas alguien suba o likee una foto, aparece acá." />
      ) : visible!.length === 0 ? (
        <EmptyState icon={SearchX} title="Sin resultados" text={`Nadie que haya entrado tiene "${q}" en su usuario.`} />
      ) : (
        <ul className="divide-y divide-zinc-800">
          {visible!.map((h) => (
            <GuestRow key={h} handle={h} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <Icon className="mb-3 size-8 text-zinc-600" aria-hidden />
      <p className="font-medium text-zinc-200">{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{text}</p>
    </div>
  );
}
