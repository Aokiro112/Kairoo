import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL("https://kairo.bond"),
  title: {
    default: "Kairo | Autonomous AI Cybersecurity Copilot & Vulnerability Recon Workspace",
    template: "%s | Kairo",
  },
  description:
    "Find vulnerabilities. Fix them faster. Kairo is an autonomous AI cybersecurity copilot that executes real-time reconnaissance (Nmap, Subfinder, Wafw00f, Nuclei), attack surface mapping, and vulnerability research at 500+ tokens/sec.",
  applicationName: "Kairo",
  authors: [{ name: "Kairo Security Team", url: "https://kairo.bond" }],
  generator: "Next.js",
  keywords: [
    "Kairo",
    "cybersecurity AI",
    "autonomous AI copilot",
    "penetration testing AI",
    "vulnerability scanner",
    "bug bounty copilot",
    "Nmap AI automation",
    "Subfinder subdomain discovery",
    "Wafw00f WAF detection",
    "Nuclei vulnerability scan",
    "offensive security",
    "high-speed AI reasoning",
    "attack surface mapping",
    "reconnaissance workspace",
    "DevSecOps copilot",
  ],
  creator: "Kairo Security",
  publisher: "Kairo",
  alternates: {
    canonical: "https://kairo.bond",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Kairo | Autonomous AI Cybersecurity Copilot & Pentesting Workspace",
    description:
      "Find vulnerabilities. Fix them faster. Autonomous AI copilot that plans attack surfaces and executes real sandboxed Kali Linux tools in real time.",
    url: "https://kairo.bond",
    siteName: "Kairo",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kairo | Autonomous AI Cybersecurity Copilot",
    description:
      "Find vulnerabilities. Fix them faster. Autonomous AI agent executing real recon tools (Nmap, Subfinder, Nuclei) at 500+ tok/s.",
    creator: "@kairo_sec",
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLdSoftwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kairo",
    operatingSystem: "Web, Cloud, Linux",
    applicationCategory: "SecurityApplication",
    url: "https://kairo.bond",
    description:
      "Autonomous AI cybersecurity copilot that orchestrates real-time reconnaissance, port scanning, and vulnerability discovery.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "140",
    },
  };

  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kairo",
    url: "https://kairo.bond",
    logo: "https://kairo.bond/favicon.ico",
    sameAs: [
      "https://github.com",
      "https://x.com",
      "https://linkedin.com",
    ],
  };

  const jsonLdWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kairo",
    url: "https://kairo.bond",
  };

  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="icon" href="/icon.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftwareApp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
      </head>
      <body
        className="antialiased bg-[#090909] text-[#F4F4F0] selection:bg-[#F4F4F0] selection:text-[#090909] min-h-screen"
      >
        {children}
      </body>
    </html>
  );
}
