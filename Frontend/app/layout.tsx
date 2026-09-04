import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kairo.bond'),
  title: 'Kairo — Advanced Security & AI Research Assistant',
  description:
    'Find and fix vulnerabilities by working with Kairo, the autonomous cybersecurity AI copilot.',
  openGraph: {
    title: 'Kairo — Cybersecurity AI Copilot',
    description: 'Autonomous vulnerability scanning & security reconnaissance.',
    url: 'https://kairo.bond',
    siteName: 'Kairo',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#141414] text-white selection:bg-neutral-700 selection:text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
