import type { Metadata } from "next";
import { Libre_Baskerville } from "next/font/google";

import { DatasetProvider } from "@/lib/context/dataset-provider";
import { ProductSelectionProvider } from "@/lib/context/product-selection-provider";

import "./globals.css";

const timesSerif = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "SP Dashboard",
  description: "Structured Products Dashboard — Primary valuation, payoff, and portfolio analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${timesSerif.variable} font-serif bg-background text-ink antialiased`}
        style={{ fontFamily: "var(--font-serif), 'Times New Roman', Times, Georgia, serif" }}
      >
        <DatasetProvider>
          <ProductSelectionProvider>{children}</ProductSelectionProvider>
        </DatasetProvider>
      </body>
    </html>
  );
}