import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Office Trading Monitor",
  description: "Monitoring paper trading 6 agen (Bitget) - gratis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
