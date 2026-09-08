import React from 'react';

export function HackerAILogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-[6px] ${className}`}>
      <img
        src="/logo.png"
        alt="Kairo Logo"
        className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
        loading="eager"
      />
    </div>
  );
}
