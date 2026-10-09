import type { Metadata, Viewport } from "next";
import { Anton, Bricolage_Grotesque, JetBrains_Mono, Permanent_Marker, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
});

const permanentMarker = Permanent_Marker({
  weight: "400",
  variable: "--font-permanent-marker",
  subsets: ["latin"],
});

// The posters' type, used by the bonus track so it reads as the same event as the printed board.
const bricolage = Bricolage_Grotesque({
  weight: ["700", "800"],
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["500", "700"],
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const eventName = process.env.NEXT_PUBLIC_EVENT_NAME || "The Party";

export const metadata: Metadata = {
  title: `${eventName} — Consignas en vivo`,
  description: "Cumplí consignas, subí tus fotos y sumá puntos en vivo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale: pinch zoom stays available. Inputs are 16px on phones, so iOS doesn't auto-zoom on focus.
  // Edge to edge, so env(safe-area-inset-*) reports the notch and home indicator.
  viewportFit: "cover",
  // Android Chrome shrinks the layout with the keyboard open, so centered dialogs stay above it.
  interactiveWidget: "resizes-content",
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${anton.variable} ${permanentMarker.variable} ${bricolage.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <div className="app-grain pointer-events-none fixed inset-0 z-50 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
