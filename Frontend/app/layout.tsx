import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kairo.bond'),
  title: 'Kairo | Autonomous AI Cybersecurity Copilot & Pentesting Workstation',
  description:
    'Find vulnerabilities. Fix them faster. Autonomous AI copilot for penetration testing, vulnerability research, and secure development.',
  openGraph: {
    title: 'Kairo | Autonomous AI Cybersecurity Copilot',
    description: 'Find vulnerabilities. Fix them faster. Autonomous AI copilot for offensive security and code auditing.',
    url: 'https://kairo.bond',
    siteName: 'Kairo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kairo | Autonomous AI Cybersecurity Copilot',
    description: 'Find vulnerabilities. Fix them faster. Autonomous AI copilot for offensive security.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased bg-[#090909] text-[#F4F4F0] selection:bg-[#F4F4F0] selection:text-[#090909] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
