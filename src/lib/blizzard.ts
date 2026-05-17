import type { RealmOption, Region } from "@/types/player-card";
import { normalizeCharacterName, normalizeRealm } from "./normalize";

type BlizzardCharacterSummary = {
  name?: string;
  equipped_item_level?: number;
  average_item_level?: number;
  faction?: {
    type?: string;
    name?: string;
  };
  guild?: {
    name?: string;
  };
};

type BlizzardCharacterMedia = {
  assets?: Array<{
    key?: string;
    value?: string;
  }>;
};

type BlizzardRealmIndex = {
  realms?: Array<{
    name?: string;
    slug?: string;
  }>;
};

export type BlizzardCharacterProfile = {
  itemLevelEquipped?: number;
  itemLevelTotal?: number;
  faction?: string;
  guild?: string;
  renderUrl?: string;
};

const localeByRegion: Record<Region, string> = {
  us: "en_US",
  eu: "en_GB",
  kr: "ko_KR",
  tw: "zh_TW",
  cn: "zh_CN"
};

const oauthHostByRegion: Record<Region, string> = {
  us: "us.battle.net",
  eu: "eu.battle.net",
  kr: "kr.battle.net",
  tw: "tw.battle.net",
  cn: "www.battlenet.com.cn"
};

const apiHostByRegion: Record<Region, string> = {
  us: "us.api.blizzard.com",
  eu: "eu.api.blizzard.com",
  kr: "kr.api.blizzard.com",
  tw: "tw.api.blizzard.com",
  cn: "gateway.battlenet.com.cn"
};

const cachedTokens = new Map<Region, { token: string; expiresAt: number }>();
const cachedRealms = new Map<Region, { realms: RealmOption[]; expiresAt: number }>();

export async function fetchBlizzardCharacterProfile(params: {
  region: Region;
  realm: string;
  name: string;
}): Promise<BlizzardCharacterProfile | null> {
  if (!process.env.BLIZZARD_CLIENT_ID || !process.env.BLIZZARD_CLIENT_SECRET) {
    return null;
  }

  try {
    const token = await getBlizzardAccessToken(params.region);
    const realmSlug = normalizeRealm(params.realm);
    const characterName = normalizeCharacterName(params.name).toLowerCase();
    const searchParams = new URLSearchParams({
      namespace: `profile-${params.region}`,
      locale: localeByRegion[params.region]
    });

    const profileUrl = `https://${apiHostByRegion[params.region]}/profile/wow/character/${realmSlug}/${characterName}`;
    const response = await fetch(
      `${profileUrl}?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        next: {
          revalidate: 300
        }
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as BlizzardCharacterSummary;
    const renderUrl = await fetchCharacterRender({
      token,
      profileUrl,
      searchParams
    });

    return {
      itemLevelEquipped: validItemLevel(data.equipped_item_level),
      itemLevelTotal: validItemLevel(data.average_item_level),
      faction: data.faction?.type?.toLowerCase() ?? data.faction?.name?.toLowerCase(),
      guild: data.guild?.name,
      renderUrl
    };
  } catch {
    return null;
  }
}

export async function fetchBlizzardRealms(region: Region): Promise<RealmOption[]> {
  if (!process.env.BLIZZARD_CLIENT_ID || !process.env.BLIZZARD_CLIENT_SECRET) {
    return [];
  }

  const cached = cachedRealms.get(region);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.realms;
  }

  try {
    const token = await getBlizzardAccessToken(region);
    const searchParams = new URLSearchParams({
      namespace: `dynamic-${region}`,
      locale: localeByRegion[region]
    });

    const response = await fetch(
      `https://${apiHostByRegion[region]}/data/wow/realm/index?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        next: {
          revalidate: 86_400
        }
      }
    );

    if (!response.ok) return [];

    const data = (await response.json()) as BlizzardRealmIndex;
    const realms = dedupeRealms(
      (data.realms ?? [])
        .filter((realm): realm is { name: string; slug: string } => Boolean(realm.name && realm.slug))
        .filter((realm) => isPublicRealmName(realm.name))
        .map((realm) => ({
          name: realm.name,
          slug: realm.slug
        }))
    );

    cachedRealms.set(region, {
      realms,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });

    return realms;
  } catch {
    return [];
  }
}

async function fetchCharacterRender({
  token,
  profileUrl,
  searchParams
}: {
  token: string;
  profileUrl: string;
  searchParams: URLSearchParams;
}): Promise<string | undefined> {
  const response = await fetch(`${profileUrl}/character-media?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    next: {
      revalidate: 300
    }
  });

  if (!response.ok) return undefined;

  const data = (await response.json()) as BlizzardCharacterMedia;
  const assets = data.assets ?? [];
  return (
    assets.find((asset) => asset.key === "main-raw")?.value ??
    assets.find((asset) => asset.key === "main")?.value ??
    assets.find((asset) => asset.key === "inset")?.value ??
    assets.find((asset) => asset.key === "avatar")?.value
  );
}

async function getBlizzardAccessToken(region: Region): Promise<string> {
  const cachedToken = cachedTokens.get(region);
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(
    `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`https://${oauthHostByRegion[region]}/oauth/token`, {
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
    throw new Error(`Blizzard OAuth failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  const nextToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  };
  cachedTokens.set(region, nextToken);

  return nextToken.token;
}

function validItemLevel(itemLevel?: number): number | undefined {
  return typeof itemLevel === "number" && itemLevel > 0 ? itemLevel : undefined;
}

function dedupeRealms(realms: RealmOption[]): RealmOption[] {
  const seen = new Set<string>();

  return realms
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((realm) => {
      if (seen.has(realm.slug)) return false;
      seen.add(realm.slug);
      return true;
    });
}

function isPublicRealmName(name: string): boolean {
  const normalizedName = name.toLowerCase();

  return (
    !normalizedName.startsWith("zzz_") &&
    !normalizedName.includes("account realm") &&
    !normalizedName.includes("-inst") &&
    !normalizedName.includes("보조")
  );
}
