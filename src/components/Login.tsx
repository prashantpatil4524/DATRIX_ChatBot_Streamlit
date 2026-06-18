import React, { useState } from 'react';
import { Lock, EyeOff } from 'lucide-react';
import { BrandLogoSvg } from './Avatar';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide administrative credentials.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok && data.authenticated) {
        onLoginSuccess();
      } else {
        setError(data.error || 'Identity decrypt mismatch error.');
      }
    } catch (err) {
      setError('Terminal credentials server unreachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--neu-bg)] select-none overflow-hidden font-sans">
      
      {/* Decorative subtle ambient lights */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[#00D4FF] opacity-[0.03] filter blur-[100px] top-[15%] left-[15%]" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[#8A5CF5] opacity-[0.03] filter blur-[100px] bottom-[15%] right-[15%]" />
      </div>

      {/* Neumorphic Extruded Card */}
      <div className="relative z-10 w-[460px] max-w-full p-10 bg-[var(--neu-bg)] [box-shadow:12px_12px_30px_var(--neu-dark),-12px_-12px_30px_var(--neu-light)] rounded-[28px] border border-white/[0.01] mx-4">
        
        {/* Animated Cyber Logo and Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-[110px] h-[110px] flex items-center justify-center rounded-2xl bg-[var(--neu-bg)] [box-shadow:inset_4px_4px_10px_var(--neu-dark),inset_-4px_-4px_10px_var(--neu-light)] p-2">
            <BrandLogoSvg className="w-[90px] h-[90px] filter drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]" />
          </div>
          
          <h1 className="mt-5 font-hero text-[3.2rem] font-extrabold tracking-[6px] text-white uppercase leading-none">
            Datrix
          </h1>
          <div className="text-[10px] text-[#7E869C] tracking-[4px] font-bold mt-2 uppercase">
            COGNITIVE DECODER HUB
          </div>
        </div>

        {/* Elegant Neumorphic Inset Divider Line */}
        <div className="h-[4px] w-full bg-[var(--neu-bg)] [box-shadow:inset_2px_2px_5px_var(--neu-dark),inset_-2px_-2px_5px_var(--neu-light)] rounded-full mb-8" />

        {/* Masked dual-fields Login form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Masked Administrative Username Identifier */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-[#7E869C] tracking-[2px] font-bold uppercase tracking-widest pl-1">
              Credential Code Identifier (Masked)
            </label>
            <div className="relative flex items-center">
              <EyeOff className="absolute left-4 w-4.5 h-4.5 text-[#00D4FF]" />
              <input 
                type="password"  // Masked secret input as requested
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter identity ID"
                className="w-full neumorphic-inp text-[14.5px] text-white py-3.5 pl-12 pr-4"
              />
            </div>
          </div>

          {/* Masked Cryptographic Access Password */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-[#7E869C] tracking-[2px] font-bold uppercase tracking-widest pl-1">
              Cryptographic Passphrase
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-4.5 h-4.5 text-[#00D4FF]" />
              <input 
                type="password"  // Masked secret input as requested
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passkey"
                className="w-full neumorphic-inp text-[14.5px] text-white py-3.5 pl-12 pr-4"
              />
            </div>
          </div>

          {/* System status error response */}
          {error && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-950/20 text-center text-xs text-red-400 font-mono font-medium tracking-[0.5px]">
              ⚠️ {error}
            </div>
          )}

          {/* Cybernetic submit button - Neumorphic Style */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-4 neumorphic-btn text-white text-[12px] tracking-[4px] font-bold select-none uppercase hover:text-[#00D4FF]"
          >
            {loading ? "TRANSMITTING SIGNATURE..." : "LAUNCH TERMINAL CONFIG"}
          </button>
        </form>

        {/* Secure connection watermark */}
        <div className="flex items-center justify-center gap-2 mt-8 text-[10px] text-zinc-500 tracking-[3px] select-none font-bold">
          <span className="w-2 h-2 bg-[#00FFCC] rounded-full animate-ping shrink-0" />
          <span>DECRYPTION SECURE PROTOCOL IN USE</span>
        </div>

      </div>
    </div>
  );
}
