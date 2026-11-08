export const PREFIX = "sobriview:v1:";
export type Preferences = {
  version: 1;
  theme: "dark" | "light";
  language: "en" | "id";
  selected: string;
  opacity: number;
  quality: "normal" | "low";
};
export const defaults: Preferences = {
  version: 1,
  theme: "dark",
  language: "en",
  selected: "liver",
  opacity: 0.85,
  quality: "normal",
};
export function parsePreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object") return { ...defaults };
  const v = value as Record<string, unknown>;
  return {
    version: 1,
    theme: v.theme === "light" ? "light" : "dark",
    language: v.language === "id" ? "id" : "en",
    selected: typeof v.selected === "string" ? v.selected : defaults.selected,
    opacity:
      typeof v.opacity === "number" && Number.isFinite(v.opacity)
        ? Math.max(0.05, Math.min(1, v.opacity))
        : defaults.opacity,
    quality: v.quality === "low" ? "low" : "normal",
  };
}
export function read<T>(
  key: string,
  validate: (x: unknown) => T,
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? validate(JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function resetStorage() {
  for (const key of Object.keys(localStorage))
    if (key.startsWith(PREFIX)) localStorage.removeItem(key);
}
export function loadPreferences() {
  return read("preferences", parsePreferences, defaults);
}
