import React, { useEffect } from 'react';
import { ThemeName, ThemeConfig } from '../types';

export const THEMES: Record<ThemeName, ThemeConfig> = {
  "RISO CHERRY": { // Cosmic Deep Ocean (Default)
    void: "#12141F",
    abyss: "#151722",
    depth: "#1A1D2B",
    surface: "#1E202B",
    primary: "#00D4FF", // Electric Cyan
    accent: "#aaff00",  // Cyber Lime
    secondary: "#FF5E7E", // Neon Pink
    textPrimary: "#E2E8F0",
    textSecondary: "#7E869C",
    borderColor: "rgba(0, 212, 255, 0.15)",
    glowPrimary: "#00D4FF",
    glowSecondary: "#aaff00",
    glowWarm: "#FF5E7E",
    glassBg: "rgba(26, 29, 43, 0.75)",
    glassBorder: "rgba(0, 212, 255, 0.15)",
    chatBotBg: "#151722",
    chatUserBg: "rgba(123, 94, 167, 0.15)",
    neuBg: "#161824",
    neuLight: "#212436",
    neuDark: "#0b0c12"
  },
  "MINT SAGE": { // Solar Flare Orange
    void: "#0a0500",
    abyss: "#120902",
    depth: "#1d1209",
    surface: "#2d1b0d",
    primary: "#ff9500", // Solar Orange
    accent: "#ffdd00",  // Solar Yellow
    secondary: "#ff3300", // Flare Red
    textPrimary: "#ffe8d6",
    textSecondary: "#b08560",
    borderColor: "rgba(255, 149, 0, 0.2)",
    glowPrimary: "#ff9500",
    glowSecondary: "#ffdd00",
    glowWarm: "#ff3300",
    glassBg: "rgba(29, 18, 9, 0.75)",
    glassBorder: "rgba(255, 149, 0, 0.15)",
    chatBotBg: "rgba(45, 27, 13, 0.75)",
    chatUserBg: "rgba(255, 51, 0, 0.15)",
    neuBg: "#140a04",
    neuLight: "#211106",
    neuDark: "#070301"
  },
  "MUSTARD SUN": { // Arctic Aurora Green
    void: "#070c0b",
    abyss: "#0d1413",
    depth: "#161f1e",
    surface: "#1c2927",
    primary: "#00FFCC", // Aurora Teal
    accent: "#00ddaa",  // Ice Blue
    secondary: "#aa00ff", // Purple Glow
    textPrimary: "#eaf5f2",
    textSecondary: "#5a8c82",
    borderColor: "rgba(0, 255, 204, 0.15)",
    glowPrimary: "#00FFCC",
    glowSecondary: "#00ddaa",
    glowWarm: "#aa00ff",
    glassBg: "rgba(22, 31, 30, 0.8)",
    glassBorder: "rgba(0, 255, 204, 0.15)",
    chatBotBg: "rgba(28, 41, 39, 0.75)",
    chatUserBg: "rgba(170, 0, 255, 0.15)",
    neuBg: "#0b1210",
    neuLight: "#14211d",
    neuDark: "#040706"
  },
  "SABOTAGE INK": { // Neon Tokyo Pink
    void: "#07000c",
    abyss: "#0f0119",
    depth: "#1b022b",
    surface: "#2a0442",
    primary: "#ff00aa", // Hot Pink
    accent: "#00ffff",  // Cyan Neon
    secondary: "#ffff00", // Yellow Accent
    textPrimary: "#fff0fc",
    textSecondary: "#aa7db8",
    borderColor: "rgba(255, 0, 170, 0.2)",
    glowPrimary: "#ff00aa",
    glowSecondary: "#00ffff",
    glowWarm: "#ffff00",
    glassBg: "rgba(27, 2, 43, 0.75)",
    glassBorder: "rgba(255, 0, 170, 0.15)",
    chatBotBg: "rgba(42, 4, 66, 0.75)",
    chatUserBg: "rgba(0, 255, 255, 0.15)",
    neuBg: "#110319",
    neuLight: "#1d052b",
    neuDark: "#05010b"
  }
};

interface ThemeProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export default function ThemeSwitcher({ currentTheme, onThemeChange }: ThemeProps) {
  
  const applyThemeVariables = (themeName: ThemeName) => {
    const t = THEMES[themeName] || THEMES["RISO CHERRY"];
    const root = document.documentElement;
    
    root.style.setProperty('--void', t.void);
    root.style.setProperty('--abyss', t.abyss);
    root.style.setProperty('--depth', t.depth);
    root.style.setProperty('--surface', t.surface);
    root.style.setProperty('--bio-teal', t.primary);
    root.style.setProperty('--bio-lime', t.accent);
    root.style.setProperty('--bio-coral', t.secondary);
    root.style.setProperty('--bio-ghost', t.textPrimary);
    root.style.setProperty('--bio-dim', t.textSecondary);
    root.style.setProperty('--bio-deep', t.borderColor);
    
    root.style.setProperty('--glow-teal', `0 0 15px ${t.glowPrimary}, 0 0 40px ${t.glowPrimary}, 0 0 80px rgba(0,0,0,0.2)`);
    root.style.setProperty('--glow-lime', `0 0 15px ${t.glowSecondary}, 0 0 30px rgba(0,0,0,0.1)`);
    root.style.setProperty('--glow-coral', `0 0 15px ${t.glowWarm}, 0 0 30px rgba(0,0,0,0.1)`);
    root.style.setProperty('--glow-soft', `0 0 35px rgba(0,0,0,0.3)`);
    
    root.style.setProperty('--glass-bg', t.glassBg);
    root.style.setProperty('--glass-border', t.glassBorder);
    root.style.setProperty('--chat-bot-bg', t.chatBotBg);
    root.style.setProperty('--chat-user-bg', t.chatUserBg);

    // Neumorphism Variables
    root.style.setProperty('--neu-bg', t.neuBg);
    root.style.setProperty('--neu-light', t.neuLight);
    root.style.setProperty('--neu-dark', t.neuDark);
  };

  useEffect(() => {
    applyThemeVariables(currentTheme);
  }, [currentTheme]);

  return (
    <div className="flex flex-col items-center mt-4 w-full select-none">
      <div className="text-[10px] text-zinc-400 tracking-[2px] font-bold mb-3 uppercase" style={{ fontFamily: "'Orbitron', sans-serif" }}>
        SELECT ACCENT COGNITION
      </div>
      
      <div className="grid grid-cols-4 gap-2 w-full max-w-[240px]">
        {(Object.keys(THEMES) as ThemeName[]).map((themeName) => {
          const t = THEMES[themeName];
          const isActive = currentTheme === themeName;
          
          return (
            <button
              key={themeName}
              onClick={() => onThemeChange(themeName)}
              title={`Switch to ${themeName}`}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border border-transparent transition-all hover:bg-zinc-800/10 cursor-pointer ${
                isActive ? 'bg-[#151722] border-[#00D4FF]/25 shadow-[0_0_12px_rgba(0,212,255,0.12)]' : ''
              }`}
            >
              {/* Colored swatch */}
              <div 
                className="w-6 h-6 rounded-full border border-zinc-800 shadow-inner transition-transform active:scale-95" 
                style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}
              />
              <span className="font-mono text-[7px] text-zinc-500 tracking-[0.2px]">
                {themeName === "RISO CHERRY" ? "OCEAN" : themeName === "MINT SAGE" ? "SOLAR" : themeName === "MUSTARD SUN" ? "AURORA" : "TOKYO"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
