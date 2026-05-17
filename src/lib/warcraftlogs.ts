import type { CardMode, PlayerCardProfile, RaidBossProgress, RaidParseSummary, Region } from "@/types/player-card";
import { normalizeCharacterName, normalizeRealm } from "./normalize";

type WarcraftLogsToken = {
  token: string;
  expiresAt: number;
};

type WarcraftLogsZone = {
  id: number;
  name: string;
  frozen: boolean;
  partitions?: Array<{
    id: number;
    default?: boolean;
  }>;
};

type WarcraftLogsZoneRankings = {
  bestPerformanceAverage?: number;
  medianPerformanceAverage?: number;
  metric?: "dps" | "hps" | "points_and_damage" | "points_and_healing";
  allStars?: Array<{
    rank?: number;
  }>;
  rankings?: Array<{
    encounter?: {
      name?: string;
    };
    bestAmount?: number;
    rankPercent?: number;
    medianPercent?: number;
    totalKills?: number;
  }>;
  throughputRankings?: Record<
    string,
    {
      best_per_second_amount?: number;
      best_historical_percentile?: number;
      median_historical_percentile?: number;
    }
  >;
};

type WarcraftLogsCharacterResponse = {
  data?: {
    characterData?: {
      character?: {
        mythicRankings?: WarcraftLogsZoneRankings;
        heroicRankings?: WarcraftLogsZoneRankings;
        normalRankings?: WarcraftLogsZoneRankings;
        zoneRankings?: WarcraftLogsZoneRankings;
      };
    };
  };
};

type WarcraftLogsZonesResponse = {
  data?: {
    worldData?: {
      zones?: WarcraftLogsZone[];
    };
  };
};

let cachedToken: WarcraftLogsToken | null = null;
let cachedMythicPlusZone: { zoneID: number; partition?: number } | null = null;
let cachedRaidZone: { zoneID: number; partition?: number; name: string } | null = null;

export async function fetchWarcraftLogsProfile(params: {
  region: Region;
  realm: string;
  name: string;
  mode?: CardMode;
  specName?: string;
  role?: string;
}): Promise<PlayerCardProfile["logs"] | undefined> {
  if (!process.env.WARCRAFTLOGS_CLIENT_ID || !process.env.WARCRAFTLOGS_CLIENT_SECRET) {
    return undefined;
  }

  try {
    const mode = params.mode ?? "mythic-plus";
    const zone = mode === "raid" ? await getCurrentRaidZone() : await getCurrentMythicPlusZone();
    if (!zone) return undefined;

    const isHealer = params.role?.toLowerCase().includes("heal");
    const rankingMetric =
      mode === "raid" ? (isHealer ? "hps" : "dps") : isHealer ? "points_and_healing" : "points_and_damage";
    const displayMetric = isHealer ? "hps" : "dps";
    if (mode === "raid") {
      return buildRaidLogs({
        params,
        zone,
        metric: displayMetric,
        rankingMetric
      });
    }

    const byBracket = mode === "mythic-plus";
    const data = await warcraftLogsQuery<WarcraftLogsCharacterResponse>(
      `query(
        $name: String!
        $serverSlug: String!
        $serverRegion: String!
        $zoneID: Int!
        $partition: Int
        $metric: CharacterPageRankingMetricType
        $specName: String
        $byBracket: Boolean
      ) {
        characterData {
          character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
            zoneRankings(zoneID: $zoneID, partition: $partition, metric: $metric, specName: $specName, byBracket: $byBracket)
          }
        }
      }`,
      {
        name: normalizeCharacterName(params.name),
        serverSlug: normalizeRealm(params.realm),
        serverRegion: params.region.toUpperCase(),
        zoneID: zone.zoneID,
        partition: zone.partition,
        metric: rankingMetric,
        specName: params.specName,
        byBracket
      }
    );

    const rankings = data.data?.characterData?.character?.zoneRankings;
    if (!rankings) return undefined;
    const throughputRankings = Object.values(rankings.throughputRankings ?? {});

    return {
      metric: displayMetric,
      bestThroughputAvg: average(
        throughputRankings
          .map((ranking) => validNumber(ranking.best_per_second_amount))
          .filter((value): value is number => typeof value === "number")
      ),
      medianParseAvg: average(
        throughputRankings
          .map((ranking) => validNumber(ranking.median_historical_percentile))
          .filter((value): value is number => typeof value === "number")
      ),
      bestDpsAvg: average(
        throughputRankings
          .map((ranking) => validNumber(ranking.best_historical_percentile))
          .filter((value): value is number => typeof value === "number")
      ),
      medianDpsAvg: average(
        throughputRankings
          .map((ranking) => validNumber(ranking.median_historical_percentile))
          .filter((value): value is number => typeof value === "number")
      ),
      runs: rankings.rankings?.reduce((total, ranking) => total + (ranking.totalKills ?? 0), 0),
      specRank: rankings.allStars?.[0]?.rank
    };
  } catch {
    return undefined;
  }
}

async function buildRaidLogs({
  params,
  zone,
  metric,
  rankingMetric
}: {
  params: {
    region: Region;
    realm: string;
    name: string;
    specName?: string;
  };
  zone: { zoneID: number; partition?: number; name?: string };
  metric: "dps" | "hps";
  rankingMetric: "dps" | "hps" | "points_and_damage" | "points_and_healing";
}): Promise<PlayerCardProfile["logs"] | undefined> {
  const data = await warcraftLogsQuery<WarcraftLogsCharacterResponse>(
    `query(
      $name: String!
      $serverSlug: String!
      $serverRegion: String!
      $zoneID: Int!
      $partition: Int
      $metric: CharacterPageRankingMetricType
      $specName: String
    ) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          mythicRankings: zoneRankings(zoneID: $zoneID, partition: $partition, metric: $metric, specName: $specName, difficulty: 5)
          heroicRankings: zoneRankings(zoneID: $zoneID, partition: $partition, metric: $metric, specName: $specName, difficulty: 4)
          normalRankings: zoneRankings(zoneID: $zoneID, partition: $partition, metric: $metric, specName: $specName, difficulty: 3)
        }
      }
    }`,
    {
      name: normalizeCharacterName(params.name),
      serverSlug: normalizeRealm(params.realm),
      serverRegion: params.region.toUpperCase(),
      zoneID: zone.zoneID,
      partition: zone.partition,
      metric: rankingMetric,
      specName: params.specName
    }
  );

  const mythicRankings = data.data?.characterData?.character?.mythicRankings;
  const heroicRankings = data.data?.characterData?.character?.heroicRankings;
  const normalRankings = data.data?.characterData?.character?.normalRankings;
  const mythicBosses = buildRaidBossProgress(mythicRankings?.rankings);
  const heroicBosses = buildRaidBossProgress(heroicRankings?.rankings);
  const normalBosses = buildRaidBossProgress(normalRankings?.rankings);
  if (!mythicBosses.length && !heroicBosses.length) return undefined;
  const parseBosses = mythicBosses.some((boss) => boss.kills > 0)
    ? mythicBosses
    : heroicBosses.some((boss) => boss.kills > 0)
      ? heroicBosses
      : normalBosses;
  const displayBosses = mythicBosses.length ? mythicBosses : heroicBosses.length ? heroicBosses : normalBosses;
  const totalBosses = Math.max(mythicBosses.length, heroicBosses.length, normalBosses.length);

  return {
    metric,
    bestThroughputAvg: average(
      parseBosses
        .map((boss) => validPositiveNumber(boss.bestThroughput))
        .filter((value): value is number => typeof value === "number")
    ),
    medianParseAvg: average(
      parseBosses
        .map((boss) => validNumber(boss.medianParse))
        .filter((value): value is number => typeof value === "number")
    ),
    bestDpsAvg: average(
      parseBosses
        .map((boss) => validNumber(boss.bestParse))
        .filter((value): value is number => typeof value === "number")
    ),
    medianDpsAvg: average(
      parseBosses
        .map((boss) => validNumber(boss.medianParse))
        .filter((value): value is number => typeof value === "number")
    ),
    runs: parseBosses.reduce((total, boss) => total + boss.kills, 0),
    specRank:
      mythicRankings?.allStars?.[0]?.rank ??
      heroicRankings?.allStars?.[0]?.rank ??
      normalRankings?.allStars?.[0]?.rank,
    raidParses: [
      buildRaidParseSummary("mythic", mythicBosses, mythicRankings),
      buildRaidParseSummary("heroic", heroicBosses, heroicRankings)
    ].filter((summary) => summary.runs || summary.bestThroughputAvg || summary.medianParseAvg || summary.specRank),
    raid: {
      zoneName: zone.name,
      bossKills: displayBosses,
      bossesKilled: mythicBosses.filter((boss) => boss.kills > 0).length,
      totalBosses,
      mythicBossesKilled: mythicBosses.filter((boss) => boss.kills > 0).length,
      mythicTotalBosses: mythicBosses.length || totalBosses,
      heroicBossesKilled: heroicBosses.filter((boss) => boss.kills > 0).length,
      heroicTotalBosses: heroicBosses.length || totalBosses,
      normalBossesKilled: normalBosses.filter((boss) => boss.kills > 0).length,
      normalTotalBosses: normalBosses.length || totalBosses
    }
  };
}

function buildRaidParseSummary(
  difficulty: "mythic" | "heroic" | "normal",
  bosses: RaidBossProgress[],
  rankings?: WarcraftLogsZoneRankings
): RaidParseSummary {
  return {
    difficulty,
    bestThroughputAvg: average(
      bosses
        .map((boss) => validPositiveNumber(boss.bestThroughput))
        .filter((value): value is number => typeof value === "number")
    ),
    medianParseAvg: average(
      bosses
        .map((boss) => validNumber(boss.medianParse))
        .filter((value): value is number => typeof value === "number")
    ),
    specRank: rankings?.allStars?.[0]?.rank,
    runs: bosses.reduce((total, boss) => total + boss.kills, 0)
  };
}

async function getCurrentRaidZone(): Promise<{ zoneID: number; partition?: number; name: string } | null> {
  if (cachedRaidZone) return cachedRaidZone;

  const data = await fetchWorldZones();
  const zones = data.data?.worldData?.zones ?? [];
  const raidZones = zones
    .filter((zone) => !zone.name.startsWith("Mythic+"))
    .filter((zone) => zone.name !== "Delves")
    .filter((zone) => !zone.name.toLowerCase().includes("ptr"))
    .sort((a, b) => b.id - a.id);
  const activeZone = raidZones.find((zone) => !zone.frozen) ?? raidZones[0];
  if (!activeZone) return null;

  cachedRaidZone = {
    zoneID: activeZone.id,
    partition: activeZone.partitions?.find((partition) => partition.default)?.id,
    name: activeZone.name
  };

  return cachedRaidZone;
}

async function getCurrentMythicPlusZone(): Promise<{ zoneID: number; partition?: number } | null> {
  if (cachedMythicPlusZone) return cachedMythicPlusZone;

  const data = await fetchWorldZones();
  const zones = data.data?.worldData?.zones ?? [];
  const mythicPlusZones = zones
    .filter((zone) => zone.name.startsWith("Mythic+"))
    .sort((a, b) => b.id - a.id);
  const activeZone = mythicPlusZones.find((zone) => !zone.frozen) ?? mythicPlusZones[0];
  if (!activeZone) return null;

  cachedMythicPlusZone = {
    zoneID: activeZone.id,
    partition: activeZone.partitions?.find((partition) => partition.default)?.id
  };

  return cachedMythicPlusZone;
}

async function fetchWorldZones(): Promise<WarcraftLogsZonesResponse> {
  return warcraftLogsQuery<WarcraftLogsZonesResponse>(
    `query {
      worldData {
        zones {
          id
          name
          frozen
          partitions {
            id
            default
          }
        }
      }
    }`
  );
}

async function warcraftLogsQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = await getWarcraftLogsAccessToken();
  const response = await fetch("https://www.warcraftlogs.com/api/v2/client", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables }),
    next: {
      revalidate: 300
    }
  });

  if (!response.ok) {
    throw new Error(`Warcraft Logs query failed: ${response.status}`);
  }

  const data = (await response.json()) as T & { errors?: unknown[] };
  if (data.errors?.length) {
    throw new Error("Warcraft Logs query returned errors.");
  }

  return data;
}

async function getWarcraftLogsAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(
    `${process.env.WARCRAFTLOGS_CLIENT_ID}:${process.env.WARCRAFTLOGS_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials"
    })
  });

  if (!response.ok) {
    throw new Error(`Warcraft Logs OAuth failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  };

  return cachedToken.token;
}

function validNumber(value?: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function validPositiveNumber(value?: number): number | undefined {
  const validValue = validNumber(value);
  return typeof validValue === "number" && validValue > 0 ? validValue : undefined;
}

function average(values?: number[]): number | undefined {
  if (!values?.length) return undefined;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function buildRaidBossProgress(rankings?: WarcraftLogsZoneRankings["rankings"]): RaidBossProgress[] {
  return (rankings ?? []).map((ranking) => ({
    boss: ranking.encounter?.name ?? "Unknown Boss",
    kills: ranking.totalKills ?? 0,
    bestParse: validNumber(ranking.rankPercent),
    medianParse: validNumber(ranking.medianPercent),
    bestThroughput: validPositiveNumber(ranking.bestAmount)
  }));
}
