"use client";

import { useState } from "react";
import useSWR from "swr";
import { AtSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { cleanInstagramInput, normalizeInstagram } from "@/lib/instagram";

const MIN_QUERY_LENGTH = 2;

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json() as Promise<{ handles: string[] }>);

/**
 * Guest-list search: the guest types part of their handle and must pick a match. The server
 * only returns a few matches per query, so the full list never reaches the browser.
 */
export function GuestPicker({
  value,
  onChange,
  onRequestAccess,
}: {
  value: string | null;
  onChange: (handle: string | null) => void;
  /** Offered when nothing matches what they typed. */
  onRequestAccess: (handle: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [requesting, setRequesting] = useState(false);
  // Same cleanup as the server's, so a pasted profile link searches by its handle.
  const q = cleanInstagramInput(query);
  const requestable = normalizeInstagram(q);
  const searching = q.length >= MIN_QUERY_LENGTH;

  const { data, isValidating } = useSWR(
    searching ? `/api/handles?q=${encodeURIComponent(q)}` : null,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false }
  );
  const handles = searching ? (data?.handles ?? []) : [];

  function pick(handle: string | null) {
    onChange(handle);
    if (handle) setQuery(handle);
  }

  return (
    <div className="grid gap-2">
      {/* Inline (no popup portal) so it works inside the onboarding dialog's focus trap on mobile. */}
      <Combobox
        inline
        open
        items={handles}
        filter={null}
        autoHighlight
        value={value}
        onValueChange={pick}
        inputValue={query}
        onInputValueChange={(next) => {
          setQuery(next);
          // Editing the text after picking means they haven't picked anything anymore.
          if (value && next !== value) onChange(null);
        }}
      >
        <ComboboxInput
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Buscá tu usuario"
          showTrigger={false}
          className="h-11 w-full border-zinc-700 bg-zinc-950"
        >
          <InputGroupAddon align="inline-start">
            <AtSign className="text-zinc-500" />
          </InputGroupAddon>
        </ComboboxInput>
        {handles.length > 0 && (
          <ComboboxList className="max-h-72 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
            {(handle: string) => (
              <ComboboxItem
                key={handle}
                value={handle}
                // Base UI selects on `click` after preventing `pointerdown`; some touch browsers
                // may drop that click. Picking on touch release too is harmless: the value is controlled.
                onPointerUp={(e) => {
                  if (e.pointerType === "touch") pick(handle);
                }}
                className="py-2.5 text-base text-zinc-100 data-highlighted:bg-zinc-800"
              >
                @{handle}
              </ComboboxItem>
            )}
          </ComboboxList>
        )}
      </Combobox>

      {!searching ? (
        <p className="text-sm text-zinc-400">Escribí al menos 2 letras de tu usuario.</p>
      ) : handles.length === 0 && isValidating ? (
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" />
          Buscando…
        </p>
      ) : handles.length === 0 && data ? (
        <div className="grid gap-3">
          <p className="text-sm text-rose-400">
            no encontramos ese usuario 🕯️ fijate que esté bien escrito (sin @). si seguís sin
            entrar, avisale a franco y te suma.
          </p>
          {requestable && (
            <Button
              type="button"
              variant="secondary"
              disabled={requesting}
              onClick={async () => {
                setRequesting(true);
                try {
                  await onRequestAccess(requestable);
                } finally {
                  setRequesting(false);
                }
              }}
              className="h-11 text-base"
            >
              {requesting && <Loader2 className="size-4 animate-spin" />}
              pedir acceso
            </Button>
          )}
        </div>
      ) : !value ? (
        <p className="text-sm text-zinc-400">Tocá tu usuario en la lista.</p>
      ) : null}
    </div>
  );
}
