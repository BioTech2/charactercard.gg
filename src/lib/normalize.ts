export function normalizeRealm(realm: string): string {
  return realm
    .trim()
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/\s+/g, "-");
}

export function normalizeCharacterName(name: string): string {
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function formatDisplayName(name: string): string {
  return name
    .trim()
    .split(/([\s-]+)/)
    .map((part) => {
      if (/^[\s-]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

export function formatFaction(faction?: string): string | undefined {
  if (!faction) return undefined;
  return faction.charAt(0).toUpperCase() + faction.slice(1).toLowerCase();
}

export function formatScore(score?: number): string {
  if (typeof score !== "number") return "N/A";
  return Math.round(score).toLocaleString();
}

export function buildProgressBadge(bestKeys: { level: number }[]): string {
  if (bestKeys.length < 8) return "";

  const minimumBestKey = Math.min(...bestKeys.map((key) => key.level));
  if (minimumBestKey >= 12) return `Resil ${minimumBestKey}`;
  return "";
}

export function buildHighestKeyBadge(bestKeys: { level: number; timed?: boolean }[]): string {
  if (!bestKeys.length) return "No Timed Keys";

  const highestLevel = Math.max(...bestKeys.map((key) => key.level));
  const highestTimedCount = bestKeys.filter((key) => key.level === highestLevel && key.timed !== false).length;
  const highestCount = highestTimedCount || bestKeys.filter((key) => key.level === highestLevel).length;

  return `${highestCount}x ${highestLevel}s Timed`;
}
