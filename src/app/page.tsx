"use client";

import { useState } from "react";
import { CharacterForm } from "@/components/CharacterForm";
import { CardPreview } from "@/components/CardPreview";
import { PlayerCardProfile } from "@/types/player-card";

export default function HomePage() {
  const [profile, setProfile] = useState<PlayerCardProfile | null>(null);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
      <section className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">
              CharacterCard.gg
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
              Build a Mythic+ or raid trading card from your WoW character.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Choose a realm, look up a character, and export a collectible card
              with live profile art, progression, rankings, and parse stats.
            </p>
          </div>

          <CharacterForm onProfile={setProfile} />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Built from live sources</p>
            <p className="mt-2">
              CharacterCard.gg combines public Raider.IO data with Blizzard and
              Warcraft Logs integrations when available. If one source is private
              or unavailable, the card still renders from the data it can safely
              access.
            </p>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <CardPreview profile={profile} />
        </div>
      </section>
    </main>
  );
}
