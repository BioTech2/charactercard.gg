import { NextRequest, NextResponse } from "next/server";
import { REALMS_BY_REGION } from "@/data/realms";
import { fetchBlizzardRealms } from "@/lib/blizzard";
import { normalizeRealm } from "@/lib/normalize";
import { isRateLimited } from "@/lib/rate-limit";
import { validRegions } from "@/lib/request-validation";
import type { RealmOption, Region } from "@/types/player-card";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = (searchParams.get("region")?.toLowerCase() || "us") as Region;

  if (isRateLimited(request, "realms", 60, 60_000)) {
    return NextResponse.json({ realms: fallbackRealms(region), source: "fallback" }, { status: 429 });
  }

  if (!validRegions.includes(region)) {
    return NextResponse.json({ error: "Invalid region." }, { status: 400 });
  }

  const blizzardRealms = await fetchBlizzardRealms(region);

  if (blizzardRealms.length) {
    return NextResponse.json(
      { realms: blizzardRealms, source: "blizzard" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
        }
      }
    );
  }

  return NextResponse.json(
    { realms: fallbackRealms(region), source: "fallback" },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
      }
    }
  );
}

function fallbackRealms(region: Region): RealmOption[] {
  return (REALMS_BY_REGION[region] ?? REALMS_BY_REGION.us).map((realm) => ({
    name: realm,
    slug: normalizeRealm(realm)
  }));
}
