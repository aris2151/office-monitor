import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BigGet — Trading Desk",
  description: "BigGet: dapat besar. Monitoring paper trading multi-agen (Bitget) - gratis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
