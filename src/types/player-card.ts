export type Region = "us" | "eu" | "kr" | "tw" | "cn";
export type CardMode = "mythic-plus" | "raid";

export type BestKey = {
  dungeon: string;
  shortName?: string;
  level: number;
  score?: number;
  timed?: boolean;
  url?: string;
};

export type PlayerCardProfile = {
  mode: CardMode;
  name: string;
  realm: string;
  region: Region;
  race?: string;
  className?: string;
  specName?: string;
  role?: string;
  faction?: string;
  guild?: string;
  profileUrl?: string;
  thumbnailUrl?: string;
  renderUrl?: string;
  itemLevel?: number;
  itemLevelEquipped?: number;
  itemLevelTotal?: number;
  mythicPlusScore?: number;
  bestKeys: BestKey[];
  raid?: {
    zoneName?: string;
    bossKills: RaidBossProgress[];
    bossesKilled?: number;
    totalBosses?: number;
    mythicBossesKilled?: number;
    mythicTotalBosses?: number;
    heroicBossesKilled?: number;
    heroicTotalBosses?: number;
    normalBossesKilled?: number;
    normalTotalBosses?: number;
  };
  badges: string[];
  signaturePlays: string[];
  classQuote: string;
  logs?: {
    metric?: "dps" | "hps";
    bestThroughputAvg?: number;
    medianParseAvg?: number;
    bestDpsAvg?: number;
    medianDpsAvg?: number;
    runs?: number;
    specRank?: number;
    raidParses?: RaidParseSummary[];
    raid?: PlayerCardProfile["raid"];
  };
  lastUpdated: string;
};

export type RaidParseSummary = {
  difficulty: "mythic" | "heroic" | "normal";
  bestThroughputAvg?: number;
  medianParseAvg?: number;
  specRank?: number;
  runs?: number;
};

export type RaidBossProgress = {
  boss: string;
  kills: number;
  bestParse?: number;
  medianParse?: number;
  bestThroughput?: number;
  bestProgressPercent?: number;
};

export type CharacterSearchSuggestion = {
  name: string;
  realm: string;
  region: Region;
  faction?: string;
  className?: string;
};
