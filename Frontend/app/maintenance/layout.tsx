import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kairo is Now Open Source | GitHub Repository',
  description:
    'Kairo autonomous AI cybersecurity copilot is now fully open-source. Access the repository, self-host, and contribute at https://github.com/Aokiro112/Kairoo',
  openGraph: {
    title: 'Kairo is Now Open Source | GitHub Repository',
    description:
      'Kairo autonomous AI cybersecurity copilot is now open-source on GitHub. Access source code, inspect tools, and self-host.',
    url: 'https://github.com/Aokiro112/Kairoo',
    type: 'website',
  },
};

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
