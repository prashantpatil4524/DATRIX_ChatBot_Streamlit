import React from 'react';

// High-Fidelity Cyber-Brain Circuit Logo Vector matching user-uploaded branding
export function BrandLogoSvg({ className = "w-full h-full" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Datrix Logo" className={`${className} object-contain`} />
  );
}

interface AvatarProps {
  size?: 'full' | 'mini';
}

export default function Avatar({ size = 'full' }: AvatarProps) {
  if (size === 'mini') {
    return (
      <div className="relative w-11 h-11 flex items-center justify-center select-none shrink-0 rounded-full bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] p-0.5 hover:scale-105 transition-transform">
        <div className="w-9 h-9 flex items-center justify-center p-0.5">
          <BrandLogoSvg className="w-full h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center relative py-3 w-full select-none">
      {/* 3D Neumorphic Framed Container holding the Brand Logo */}
      <div className="relative w-[140px] h-[140px] flex items-center justify-center rounded-3xl bg-[var(--neu-bg)] [box-shadow:10px_10px_22px_var(--neu-dark),-10px_-10px_22px_var(--neu-light)] border border-white/[0.02] p-4 group">
        
        {/* Subtle accent shadow rings */}
        <div className="absolute inset-2.5 rounded-2xl bg-[var(--neu-bg)] [box-shadow:inset_4px_4px_10px_var(--neu-dark),inset_-4px_-4px_10px_var(--neu-light)] opacity-90" />
        
        {/* Recreated Logo core rotating gently */}
        <div className="relative z-10 w-[100px] h-[100px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <BrandLogoSvg className="w-full h-full filter drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]" />
        </div>
      </div>

      <div className="text-center mt-5">
        <h3 className="font-hero text-[24px] tracking-[4px] text-white leading-none select-none uppercase font-extrabold inline-block relative" style={{ letterSpacing: '6px' }}>
          DATRIX
          <span className="block h-[3px] w-14 bg-gradient-to-r from-[#00D4FF] to-[#8A5CF5] mx-auto mt-2 rounded-full" />
        </h3>
        <p className="text-[9px] text-[#7E869C] tracking-[3px] mt-2 font-bold select-none uppercase">
          DATA INSIGHT COREDUMP
        </p>
      </div>
    </div>
  );
}
