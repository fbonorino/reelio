import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./print.css";

const bricolage = Bricolage_Grotesque({
  weight: ["700", "800"],
  variable: "--font-poster-display",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  weight: "700",
  variable: "--font-poster-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Afiches para imprimir",
  robots: { index: false },
};

/** Printable A3 posters: no app chrome, just the sheet. */
export default function PrintLayout({ children }: LayoutProps<"/print">) {
  return <div className={`${bricolage.variable} ${jetbrainsMono.variable}`}>{children}</div>;
}
