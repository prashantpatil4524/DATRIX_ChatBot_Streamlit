export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sql?: string;
  df?: any[];
  error?: string;
}

export type ThemeName = "RISO CHERRY" | "MINT SAGE" | "MUSTARD SUN" | "SABOTAGE INK";

export interface ThemeConfig {
  void: string;
  abyss: string;
  depth: string;
  surface: string;
  primary: string;
  accent: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  glowPrimary: string;
  glowSecondary: string;
  glowWarm: string;
  glassBg: string;
  glassBorder: string;
  chatBotBg: string;
  chatUserBg: string;
  neuBg: string;
  neuLight: string;
  neuDark: string;
}
