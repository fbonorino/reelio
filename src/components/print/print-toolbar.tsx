"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { PosterThemeName } from "@/lib/poster";

/** Screen-only: switch poster or theme and print. Hidden on paper. */
const POSTERS = [
  { path: "/print/afiche", label: "Afiche" },
  { path: "/print/afiche-v2", label: "Afiche v2" },
  { path: "/print/qr", label: "Solo QR" },
];

/** `theme` is what this page resolved to (posters have different defaults), so links keep it explicit. */
export function PrintToolbar({ theme }: { theme: PosterThemeName }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const light = theme === "light";

  function href(path: string, next: PosterThemeName) {
    const query = new URLSearchParams(params);
    query.set("theme", next);
    return `${path}?${query}`;
  }

  return (
    <nav className="poster-toolbar" aria-label="Opciones de impresión">
      {POSTERS.map((poster) => (
        <Link
          key={poster.path}
          href={href(poster.path, theme)}
          aria-current={pathname === poster.path ? "page" : undefined}
        >
          {poster.label}
        </Link>
      ))}
      <Link href={href(pathname, light ? "dark" : "light")}>{light ? "Oscuro" : "Claro (ahorra tinta)"}</Link>
      <button type="button" onClick={() => window.print()}>
        Imprimir A3
      </button>
    </nav>
  );
}
