import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AmbientScene } from "@/components/AmbientScene";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  applicationName: "Gatherly",
  openGraph: {
    type: "website",
    siteName: "Gatherly",
    title: "Gatherly: plan events everyone will love",
    description: "Find where your group's tastes overlap, then plan the venue, playlist and activity, with a reason behind every pick.",
  },
  twitter: { card: "summary", title: "Gatherly: plan events everyone will love" },
  title: { default: "Gatherly: plan events everyone will love", template: "%s · Gatherly" },
  description:
    "Gatherly uses Qloo's Taste AI to find where your group's tastes overlap, then plans the venue, playlist and activity everyone will enjoy.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d14" },
  ],
};

// Runs before paint so the saved or system theme is applied without a flash.
const themeScript = `try{var t=localStorage.getItem('gatherly-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-fg">
          Skip to content
        </a>
        <AmbientScene />
        <Navbar />
        <main id="main" className="relative z-10 flex-1">{children}</main>
        <div className="relative z-10"><Footer /></div>
      </body>
    </html>
  );
}
