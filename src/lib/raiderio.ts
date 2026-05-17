import { CardMode, PlayerCardProfile, Region } from "@/types/player-card";
import { fetchBlizzardCharacterProfile } from "./blizzard";
import { fetchWarcraftLogsProfile } from "./warcraftlogs";
import {
  buildHighestKeyBadge,
  buildProgressBadge,
  formatDisplayName,
  normalizeCharacterName,
  normalizeRealm
} from "./normalize";

export class RaiderIoError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "RaiderIoError";
  }
}

type RaiderIoBestRun = {
  dungeon: string;
  short_name?: string;
  mythic_level: number;
  score?: number;
  num_keystone_upgrades?: number;
  url?: string;
};

type RaiderIoProfile = {
  name: string;
  race?: string;
  class?: string;
  active_spec_name?: string;
  active_spec_role?: string;
  faction?: string;
  thumbnail_url?: string;
  profile_url?: string;
  realm: string;
  region: Region;
  guild?: {
    name?: string;
  };
  gear?: {
    item_level_equipped?: number;
    item_level_total?: number;
  };
  mythic_plus_scores_by_season?: Array<{
    season?: string;
    scores?: {
      all?: number;
      dps?: number;
      healer?: number;
      tank?: number;
      spec_0?: number;
      spec_1?: number;
      spec_2?: number;
      spec_3?: number;
    };
  }>;
  mythic_plus_best_runs?: RaiderIoBestRun[];
  raid_progression?: Record<
    string,
    {
      summary?: string;
      expansion_id?: number;
      total_bosses?: number;
      normal_bosses_killed?: number;
      heroic_bosses_killed?: number;
      mythic_bosses_killed?: number;
    }
  >;
};

export async function fetchRaiderIoProfile(params: {
  region: Region;
  realm: string;
  name: string;
  mode?: CardMode;
}): Promise<PlayerCardProfile> {
  const mode = params.mode ?? "mythic-plus";
  const searchParams = new URLSearchParams({
    region: params.region,
    realm: normalizeRealm(params.realm),
    name: normalizeCharacterName(params.name),
    fields: [
      "gear",
      "guild",
      "mythic_plus_scores_by_season:current",
      "mythic_plus_best_runs",
      "raid_progression"
    ].join(",")
  });

  const url = `https://raider.io/api/v1/characters/profile?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "CharacterCard.gg/1.0"
    },
    next: {
      revalidate: 300
    }
  });

  if (!response.ok) {
    throw new RaiderIoError(`Raider.IO lookup failed: ${response.status}`, response.status);
  }

  const data = (await response.json()) as RaiderIoProfile;
  const blizzardProfile = await fetchBlizzardCharacterProfile(params);
  const logs = await fetchWarcraftLogsProfile({
    ...params,
    mode,
    specName: data.active_spec_name,
    role: data.active_spec_role
  });

  const bestKeys =
    data.mythic_plus_best_runs?.map((run) => ({
      dungeon: run.dungeon,
      shortName: run.short_name,
      level: run.mythic_level,
      score: run.score,
      timed: typeof run.num_keystone_upgrades === "number" && run.num_keystone_upgrades >= 0,
      url: run.url
    })) ?? [];

  bestKeys.sort((a, b) => b.level - a.level || a.dungeon.localeCompare(b.dungeon));

  const score = data.mythic_plus_scores_by_season?.[0]?.scores?.all;
  const itemLevelEquipped =
    blizzardProfile?.itemLevelEquipped ?? validItemLevel(data.gear?.item_level_equipped);
  const itemLevelTotal =
    blizzardProfile?.itemLevelTotal ?? validItemLevel(data.gear?.item_level_total);
  const raid = mergeRaidProgress(logs?.raid, data.raid_progression);

  return {
    mode,
    name: formatDisplayName(data.name),
    realm: data.realm,
    region: data.region,
    race: data.race,
    className: data.class,
    specName: data.active_spec_name,
    role: data.active_spec_role,
    faction: blizzardProfile?.faction ?? data.faction,
    guild: blizzardProfile?.guild ?? data.guild?.name,
    profileUrl: data.profile_url,
    thumbnailUrl: data.thumbnail_url,
    renderUrl: blizzardProfile?.renderUrl,
    itemLevel: itemLevelEquipped ?? itemLevelTotal,
    itemLevelEquipped,
    itemLevelTotal,
    mythicPlusScore: score,
    bestKeys,
    raid,
    badges: buildBadges({
      mode,
      bestKeys,
      role: data.active_spec_role,
      raid
    }),
    signaturePlays: buildSignaturePlays(data.class),
    classQuote: buildClassQuote(data.class),
    logs: logs ?? {},
    lastUpdated: new Date().toISOString()
  };
}

function buildBadges({
  mode,
  bestKeys,
  role,
  raid
}: {
  mode: CardMode;
  bestKeys: { level: number; timed?: boolean }[];
  role?: string;
  raid?: PlayerCardProfile["raid"];
}): string[] {
  if (mode === "raid") {
    return [
      raid?.zoneName ?? "Current Raid",
      buildRaidProgressBadge(raid)
    ];
  }

  return [
    buildProgressBadge(bestKeys),
    buildHighestKeyBadge(bestKeys),
    `Role: ${formatRole(role)}`
  ].filter(Boolean);
}

function buildRaidProgressBadge(raid?: PlayerCardProfile["raid"]): string {
  if (!raid) return "Raid Logs Unavailable";
  const mythicKilled = raid.mythicBossesKilled ?? 0;
  const mythicTotal = raid.mythicTotalBosses ?? raid.totalBosses ?? 0;
  if (mythicKilled > 0 && mythicTotal > 0) return `${mythicKilled}/${mythicTotal} Mythic`;

  const heroicKilled = raid.heroicBossesKilled ?? 0;
  const heroicTotal = raid.heroicTotalBosses ?? 0;
  if (heroicKilled > 0 && heroicTotal > 0) return `${heroicKilled}/${heroicTotal} Heroic`;

  const normalKilled = raid.normalBossesKilled ?? 0;
  const normalTotal = raid.normalTotalBosses ?? 0;
  if (normalKilled > 0 && normalTotal > 0) return `${normalKilled}/${normalTotal} Normal`;

  return "Raid Logs Unavailable";
}

function mergeRaidProgress(
  raid: PlayerCardProfile["raid"] | undefined,
  progression: RaiderIoProfile["raid_progression"]
): PlayerCardProfile["raid"] | undefined {
  const currentProgression = getCurrentRaidProgression(progression);
  if (!currentProgression) return raid;

  const totalBosses = currentProgression.total_bosses ?? raid?.totalBosses ?? raid?.mythicTotalBosses ?? 0;

  return {
    zoneName: raid?.zoneName,
    bossKills: raid?.bossKills ?? [],
    bossesKilled: currentProgression.mythic_bosses_killed ?? raid?.bossesKilled,
    totalBosses,
    mythicBossesKilled: currentProgression.mythic_bosses_killed ?? raid?.mythicBossesKilled,
    mythicTotalBosses: totalBosses || raid?.mythicTotalBosses,
    heroicBossesKilled: currentProgression.heroic_bosses_killed ?? raid?.heroicBossesKilled,
    heroicTotalBosses: totalBosses || raid?.heroicTotalBosses,
    normalBossesKilled: currentProgression.normal_bosses_killed ?? raid?.normalBossesKilled,
    normalTotalBosses: totalBosses || raid?.normalTotalBosses
  };
}

function getCurrentRaidProgression(progression: RaiderIoProfile["raid_progression"]) {
  const entries = Object.values(progression ?? {});
  if (!entries.length) return undefined;

  return entries.sort((a, b) => {
    const expansionDifference = (b.expansion_id ?? 0) - (a.expansion_id ?? 0);
    if (expansionDifference) return expansionDifference;

    return (
      (b.mythic_bosses_killed ?? 0) - (a.mythic_bosses_killed ?? 0) ||
      (b.heroic_bosses_killed ?? 0) - (a.heroic_bosses_killed ?? 0) ||
      (b.normal_bosses_killed ?? 0) - (a.normal_bosses_killed ?? 0)
    );
  })[0];
}

function formatRole(role?: string): string {
  switch (role?.toUpperCase()) {
    case "DPS":
      return "DPS";
    case "HEALING":
    case "HEALER":
      return "Healer";
    case "TANK":
      return "Tank";
    default:
      return role ?? "Unknown";
  }
}

function validItemLevel(itemLevel?: number): number | undefined {
  return typeof itemLevel === "number" && itemLevel > 0 ? itemLevel : undefined;
}

function buildSignaturePlays(className?: string): string[] {
  switch (className) {
    case "Paladin":
      return [
        "Blessing of Sacrifice",
        "Blessing of Protection",
        "Blessing of Freedom",
        "Lay on Hands",
        "Intercession"
      ];
    case "Priest":
      return ["Power Infusion", "Mass Dispel", "Leap of Faith", "Pain Suppression", "Power Word: Barrier"];
    case "Druid":
      return ["Stampeding Roar", "Innervate", "Rebirth", "Typhoon", "Ursol's Vortex"];
    case "Monk":
      return ["Mystic Touch", "Leg Sweep", "Tiger's Lust", "Ring of Peace", "Revival"];
    case "Death Knight":
      return ["Death Grip", "Anti-Magic Zone", "Raise Ally", "Blinding Sleet", "Control Undead"];
    case "Demon Hunter":
      return ["Chaos Brand", "Darkness", "Sigil of Misery", "Imprison", "Consume Magic"];
    case "Evoker":
      return ["Bloodlust", "Rescue", "Zephyr", "Cauterizing Flame", "Oppressing Roar"];
    case "Hunter":
      return ["Bloodlust", "Misdirection", "Binding Shot", "Tranquilizing Shot", "Aspect of the Turtle"];
    case "Mage":
      return ["Bloodlust", "Arcane Intellect", "Remove Curse", "Spellsteal", "Mass Barrier"];
    case "Rogue":
      return ["Shroud of Concealment", "Sap", "Blind", "Feint", "Cloak of Shadows"];
    case "Shaman":
      return ["Bloodlust", "Wind Rush Totem", "Capacitor Totem", "Ancestral Guidance", "Reincarnation"];
    case "Warlock":
      return ["Healthstone", "Soulstone", "Demonic Gateway", "Banish", "Shadowfury"];
    case "Warrior":
      return ["Battle Shout", "Rallying Cry", "Shockwave", "Spell Reflection", "Intervene"];
    default:
      return ["Timed Routes", "Clean Interrupts", "Defensive Cooldowns", "Priority Damage", "Team Utility"];
  }
}

function buildClassQuote(className?: string): string {
  switch (className) {
    case "Paladin":
      return "Damage gets you invited. Utility times the key.";
    case "Priest":
      return "Keep the party standing, then make the pull disappear.";
    case "Druid":
      return "Every form has a job, and every key needs all of them.";
    case "Monk":
      return "Fast feet, clean control, no wasted globals.";
    case "Death Knight":
      return "If the pull moves, it moves because you allowed it.";
    case "Demon Hunter":
      return "Pressure first. Darkness when the key asks for courage.";
    case "Evoker":
      return "Save the group from impossible angles.";
    case "Hunter":
      return "Control the room before the room controls the run.";
    case "Mage":
      return "Bring the burst, steal the spell, reset the fight.";
    case "Rogue":
      return "The cleanest route is the one nobody sees coming.";
    case "Shaman":
      return "Totems down, storm up, party moving.";
    case "Warlock":
      return "Gateway planned, stones ready, damage inevitable.";
    case "Warrior":
      return "Rally the group and make the pull regret it.";
    default:
      return "Clean routes, sharp cooldowns, timed keys.";
  }
}
