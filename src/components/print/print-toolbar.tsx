"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Screen-only: switch poster or theme and print. Hidden on paper. */
export function PrintToolbar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const light = params.get("theme") === "light";

  function href(path: string, theme: "light" | "dark") {
    const next = new URLSearchParams(params);
    if (theme === "light") next.set("theme", "light");
    else next.delete("theme");
    const qs = next.toString();
    return qs ? `${path}?${qs}` : path;
  }

  return (
    <nav className="poster-toolbar" aria-label="Opciones de impresión">
      <Link href={href("/print/afiche", light ? "light" : "dark")} aria-current={pathname === "/print/afiche" ? "page" : undefined}>
        Afiche
      </Link>
      <Link href={href("/print/qr", light ? "light" : "dark")} aria-current={pathname === "/print/qr" ? "page" : undefined}>
        Solo QR
      </Link>
      <Link href={href(pathname, light ? "dark" : "light")}>{light ? "Oscuro" : "Claro (ahorra tinta)"}</Link>
      <button type="button" onClick={() => window.print()}>
        Imprimir A3
      </button>
    </nav>
  );
}
