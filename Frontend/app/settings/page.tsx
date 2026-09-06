'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/chat?settings=true');
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-[#090909] flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border border-[#2A2A28] border-t-[#F4F4F0] animate-spin" />
    </div>
  );
}
