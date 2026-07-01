import type { Metadata } from "next";
import { DM_Sans, Libre_Baskerville } from "next/font/google";

import { DatasetProvider } from "@/lib/context/dataset-provider";
import { ProductSelectionProvider } from "@/lib/context/product-selection-provider";

import "./globals.css";

const timesSerif = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const uiSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SP Dashboard | Anand Rathi Wealth",
  description:
    "Anand Rathi Wealth structured products desk — Primary valuation, payoff, and portfolio analytics.",
  icons: { icon: "/brand/arwl-logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${timesSerif.variable} ${uiSans.variable} font-serif bg-background text-ink antialiased`}
        style={{ fontFamily: "var(--font-serif), 'Times New Roman', Times, Georgia, serif" }}
      >
        <DatasetProvider>
          <ProductSelectionProvider>{children}</ProductSelectionProvider>
        </DatasetProvider>
      </body>
    </html>
  );
}