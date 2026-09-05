import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers/query-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Neighborhood Sustainability Hub",
    template: "%s | NHS",
  },
  description:
    "Hyperlocal waste management for sustainable communities in India",
  keywords: [
    "waste management",
    "sustainability",
    "recycling",
    "community",
    "India",
  ],
  authors: [{ name: "NHS Team" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Neighborhood Sustainability Hub",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
