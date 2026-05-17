import type { Region } from "@/types/player-card";
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

let cachedToken: { token: string; expiresAt: number } | null = null;

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
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  };

  return cachedToken.token;
}

function validItemLevel(itemLevel?: number): number | undefined {
  return typeof itemLevel === "number" && itemLevel > 0 ? itemLevel : undefined;
}
