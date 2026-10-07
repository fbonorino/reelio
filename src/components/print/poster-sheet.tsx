import { Suspense } from "react";
import { PrintToolbar } from "@/components/print/print-toolbar";

/** One A3 portrait page. Theme and accent are CSS variables, so `?theme=light` is a single attribute. */
export function PosterSheet({
  theme,
  accent,
  className,
  children,
}: {
  theme: "light" | "dark";
  accent?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="poster-root" data-theme={theme} style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}>
      <Suspense fallback={null}>
        <PrintToolbar theme={theme} />
      </Suspense>
      <article className={`poster-sheet ${className ?? ""}`}>{children}</article>
    </div>
  );
}
