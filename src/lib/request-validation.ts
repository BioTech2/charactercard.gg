import type { CardMode, Region } from "@/types/player-card";

export const validRegions: Region[] = ["us", "eu", "kr", "tw", "cn"];
export const validModes: CardMode[] = ["mythic-plus", "raid"];

const characterNamePattern = /^[\p{L}' -]+$/u;
const realmNamePattern = /^[\p{L}0-9.' -]+$/u;

export function validateCharacterLookupInput({
  region,
  mode,
  realm,
  name
}: {
  region: Region;
  mode?: CardMode;
  realm: string;
  name: string;
}): string | null {
  if (!validRegions.includes(region)) return "Invalid region.";
  if (mode && !validModes.includes(mode)) return "Invalid card mode.";
  if (!realm.trim() || !name.trim()) return "Missing character name or realm.";
  if (name.trim().length > 32) return "Character name is too long.";
  if (realm.trim().length > 64) return "Realm name is too long.";
  if (!characterNamePattern.test(name.trim())) return "Character name contains unsupported characters.";
  if (!realmNamePattern.test(realm.trim())) return "Realm name contains unsupported characters.";

  return null;
}
