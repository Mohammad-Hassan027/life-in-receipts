import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your Life, In Receipts",
  description: "Eleven years of songs, money and movement — itemised.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
