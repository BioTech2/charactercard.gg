import { NextRequest, NextResponse } from "next/server";
import { fetchRaiderIoProfile, RaiderIoError } from "@/lib/raiderio";
import { CardMode, Region } from "@/types/player-card";
import { isRateLimited } from "@/lib/rate-limit";
import { validateCharacterLookupInput } from "@/lib/request-validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const region = (searchParams.get("region")?.toLowerCase() || "us") as Region;
  const mode = (searchParams.get("mode") || "mythic-plus") as CardMode;
  const realm = searchParams.get("realm") || "";
  const name = searchParams.get("name") || "";

  if (isRateLimited(request, "character", 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many lookup requests. Try again shortly." },
      { status: 429 }
    );
  }

  const validationError = validateCharacterLookupInput({ region, mode, realm, name });
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  try {
    const profile = await fetchRaiderIoProfile({ region, realm, name, mode });
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof RaiderIoError) {
      const message =
        error.status === 404
          ? "Character not found. Check the realm and character name."
          : "External profile lookup failed. Try again shortly.";
      const status = error.status >= 500 ? 502 : error.status;

      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      { error: "Lookup failed. Try again shortly." },
      { status: 500 }
    );
  }
}
