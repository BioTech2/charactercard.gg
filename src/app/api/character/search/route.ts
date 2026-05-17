import { NextRequest, NextResponse } from "next/server";
import { normalizeRealm } from "@/lib/normalize";
import { isRateLimited } from "@/lib/rate-limit";
import { validateCharacterLookupInput, validRegions } from "@/lib/request-validation";
import { CharacterSearchSuggestion, Region } from "@/types/player-card";

type RaiderIoSearchMatch = {
  type: string;
  name: string;
  data?: {
    name?: string;
    faction?: string;
    region?: {
      slug?: string;
    };
    realm?: {
      name?: string;
      slug?: string;
    };
    class?: {
      name?: string;
    };
  };
};

type RaiderIoSearchResponse = {
  matches?: RaiderIoSearchMatch[];
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const region = (searchParams.get("region")?.toLowerCase() || "us") as Region;
  const realm = searchParams.get("realm") || "";
  const name = searchParams.get("name") || "";

  if (isRateLimited(request, "character-search", 90, 60_000)) {
    return NextResponse.json({ suggestions: [] }, { status: 429 });
  }

  if (!validRegions.includes(region)) {
    return NextResponse.json({ error: "Invalid region." }, { status: 400 });
  }

  if (!realm.trim() || name.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const validationError = validateCharacterLookupInput({ region, realm, name });
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const realmSlug = normalizeRealm(realm);
  const term = `${name.trim()} ${region}-${realmSlug}`;
  const rioParams = new URLSearchParams({
    type: "character",
    term
  });

  try {
    const response = await fetch(`https://raider.io/api/search?${rioParams.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CharacterCard.gg/1.0"
      },
      next: {
        revalidate: 60
      }
    });

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = (await response.json()) as RaiderIoSearchResponse;
    const suggestions = (data.matches ?? [])
      .filter((match) => match.type === "character")
      .filter((match) => match.data?.region?.slug === region)
      .filter((match) => match.data?.realm?.slug === realmSlug)
      .slice(0, 6)
      .map<CharacterSearchSuggestion>((match) => ({
        name: match.data?.name ?? match.name,
        realm: match.data?.realm?.name ?? realm,
        region,
        faction: match.data?.faction,
        className: match.data?.class?.name
      }));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
