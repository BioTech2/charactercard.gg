"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toPng } from "html-to-image";
import {
  Crown,
  Download,
  Flag,
  HeartPulse,
  Shield,
  Sparkles,
  Swords,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatFaction, formatScore } from "@/lib/normalize";
import { PlayerCardProfile } from "@/types/player-card";

const WOW_ICON_BASE = "https://render.worldofwarcraft.com/us/icons/56";
const CARD_WIDTH = 720;
const CARD_HEIGHT = 1008;

const classIconNames: Record<string, string> = {
  "Death Knight": "classicon_deathknight",
  "Demon Hunter": "classicon_demonhunter",
  Druid: "classicon_druid",
  Evoker: "classicon_evoker",
  Hunter: "classicon_hunter",
  Mage: "classicon_mage",
  Monk: "classicon_monk",
  Paladin: "classicon_paladin",
  Priest: "classicon_priest",
  Rogue: "classicon_rogue",
  Shaman: "classicon_shaman",
  Warlock: "classicon_warlock",
  Warrior: "classicon_warrior"
};

const specIconNames: Record<string, string> = {
  "death knight:blood": "spell_deathknight_bloodpresence",
  "death knight:frost": "spell_deathknight_frostpresence",
  "death knight:unholy": "spell_deathknight_unholypresence",
  "demon hunter:havoc": "ability_demonhunter_specdps",
  "demon hunter:vengeance": "ability_demonhunter_spectank",
  "druid:balance": "spell_nature_starfall",
  "druid:feral": "ability_druid_catform",
  "druid:guardian": "ability_racial_bearform",
  "druid:restoration": "spell_nature_healingtouch",
  "evoker:devastation": "classicon_evoker_devastation",
  "evoker:preservation": "classicon_evoker_preservation",
  "evoker:augmentation": "classicon_evoker_augmentation",
  "hunter:beast mastery": "ability_hunter_bestialdiscipline",
  "hunter:marksmanship": "ability_hunter_focusedaim",
  "hunter:survival": "ability_hunter_camouflage",
  "mage:arcane": "spell_holy_magicalsentry",
  "mage:fire": "spell_fire_firebolt02",
  "mage:frost": "spell_frost_frostbolt02",
  "monk:brewmaster": "spell_monk_brewmaster_spec",
  "monk:mistweaver": "spell_monk_mistweaver_spec",
  "monk:windwalker": "spell_monk_windwalker_spec",
  "paladin:holy": "spell_holy_holybolt",
  "paladin:protection": "ability_paladin_shieldofthetemplar",
  "paladin:retribution": "spell_holy_auraoflight",
  "priest:discipline": "spell_holy_powerwordshield",
  "priest:holy": "spell_holy_guardianspirit",
  "priest:shadow": "spell_shadow_shadowwordpain",
  "rogue:assassination": "ability_rogue_eviscerate",
  "rogue:outlaw": "ability_rogue_waylay",
  "rogue:subtlety": "ability_stealth",
  "shaman:elemental": "spell_nature_lightning",
  "shaman:enhancement": "spell_shaman_improvedstormstrike",
  "shaman:restoration": "spell_nature_magicimmunity",
  "warlock:affliction": "spell_shadow_deathcoil",
  "warlock:demonology": "spell_shadow_metamorphosis",
  "warlock:destruction": "spell_shadow_rainoffire",
  "warrior:arms": "ability_warrior_savageblow",
  "warrior:fury": "ability_warrior_innerrage",
  "warrior:protection": "ability_warrior_defensivestance"
};

const fallbackProfile: PlayerCardProfile = {
  mode: "mythic-plus",
  name: "Gonuhreeuh",
  realm: "Bonechewer",
  region: "us",
  race: "Dwarf",
  className: "Paladin",
  specName: "Retribution",
  role: "DPS",
  faction: "alliance",
  guild: "Going Dry",
  renderUrl: undefined,
  itemLevel: 285,
  itemLevelEquipped: 285,
  itemLevelTotal: 285,
  mythicPlusScore: 3451,
  bestKeys: [
    { dungeon: "Algeth'ar Academy", level: 16 },
    { dungeon: "Magisters' Terrace", level: 17 },
    { dungeon: "Maisara Caverns", level: 17 },
    { dungeon: "Nexus-Point Xenas", level: 16 },
    { dungeon: "Pit of Saron", level: 16 },
    { dungeon: "Seat of the Triumvirate", level: 16 },
    { dungeon: "Skyreach", level: 16 },
    { dungeon: "Windrunner Spire", level: 16 }
  ],
  raid: {
    zoneName: "Manaforge Omega",
    bossesKilled: 6,
    totalBosses: 8,
    mythicBossesKilled: 6,
    mythicTotalBosses: 8,
    heroicBossesKilled: 8,
    heroicTotalBosses: 8,
    normalBossesKilled: 8,
    normalTotalBosses: 8,
    bossKills: [
      { boss: "Plexus Sentinel", kills: 3, bestParse: 72, medianParse: 61 },
      { boss: "Loom'ithar", kills: 2, bestParse: 64, medianParse: 58 },
      { boss: "Soulbinder Naazindhri", kills: 1, bestParse: 48, medianParse: 48 }
    ]
  },
  badges: ["Resil 16", "2x 17s Timed", "Role: DPS"],
  signaturePlays: [
    "Blessing of Sacrifice",
    "Blessing of Protection",
    "Blessing of Freedom",
    "Lay on Hands",
    "Intercession"
  ],
  classQuote: "Damage gets you invited. Utility times the key.",
  logs: {
    metric: "dps",
    bestThroughputAvg: 309842,
    medianParseAvg: 88.1,
    bestDpsAvg: 34.3,
    medianDpsAvg: 26.9,
    runs: 118,
    specRank: 8288
  },
  lastUpdated: new Date().toISOString()
};

type Props = {
  profile: PlayerCardProfile | null;
};

export function CardPreview({ profile }: Props) {
  const card = profile ?? fallbackProfile;
  const previewShellRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [exportError, setExportError] = useState("");
  const [previewScale, setPreviewScale] = useState(1);
  const itemLevelNote =
    card.itemLevelEquipped && card.itemLevelTotal && card.itemLevelEquipped !== card.itemLevelTotal
      ? `Eq ${card.itemLevelEquipped} / Bag ${card.itemLevelTotal}`
      : "Equipped";
  const isRaid = card.mode === "raid";
  const statusBadges = card.badges.filter((badge) => !badge.startsWith("Role:")).slice(0, 2);

  useEffect(() => {
    const previewShell = previewShellRef.current;
    if (!previewShell) return;

    function updatePreviewScale() {
      const availableWidth = previewShell?.clientWidth ?? CARD_WIDTH;
      setPreviewScale(Math.min(1, availableWidth / CARD_WIDTH));
    }

    updatePreviewScale();
    const resizeObserver = new ResizeObserver(updatePreviewScale);
    resizeObserver.observe(previewShell);
    window.addEventListener("resize", updatePreviewScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePreviewScale);
    };
  }, []);

  async function downloadCard() {
    if (!cardRef.current) return;

    setExportError("");

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#020617",
        imagePlaceholder:
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
      });

      const link = document.createElement("a");
      link.download = `${card.name}-${card.realm}-keycard.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error(error);
      setExportError("PNG export failed. Try again, or use the fallback preview before exporting.");
    }
  }

  return (
    <div ref={previewShellRef} className="w-full max-w-[720px] overflow-visible">
      <div className="mb-4 flex justify-end">
        <button
          onClick={downloadCard}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20"
        >
          <Download className="h-4 w-4" />
          Export PNG
        </button>
      </div>
      {exportError ? (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {exportError}
        </div>
      ) : null}

      <div
        className="relative mx-auto overflow-visible"
        style={{
          height: CARD_HEIGHT * previewScale,
          width: CARD_WIDTH * previewScale
        }}
      >
        <div
          className="absolute left-1/2 top-0"
          style={{
            height: CARD_HEIGHT,
            width: CARD_WIDTH,
            transform: `translateX(-50%) scale(${previewScale})`,
            transformOrigin: "top center"
          }}
        >
          <div
            ref={cardRef}
            className="card-holo relative overflow-hidden rounded-[2rem] border-[10px] border-amber-200/70 p-4 shadow-cardGlow"
            style={{ height: CARD_HEIGHT, width: CARD_WIDTH }}
          >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(250,204,21,0.35),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.15),rgba(2,6,23,0.96))]" />
          <ClassEmblem className={card.className} specName={card.specName} />
          <FactionEmblem faction={card.faction} />

          <div className="relative flex h-full flex-col rounded-[1.35rem] border border-amber-200/60 bg-slate-950/72 p-4">
            <header className="rounded-2xl border border-amber-200/60 bg-slate-950/80 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="h-6 w-6 text-amber-200" />
                <h2 className="font-display text-3xl font-black uppercase tracking-[0.12em] text-gold">
                  {isRaid ? "Raid All-Star" : "Mythic+ All-Star"}
                </h2>
                <Sparkles className="h-6 w-6 text-amber-200" />
              </div>
            </header>

            <section className="mt-4 grid flex-1 grid-cols-[0.9fr_1.72fr_1.03fr] gap-3">
              <aside className="space-y-3">
                <StatBadge label="iLvl" value={card.itemLevel ?? "N/A"} note={card.itemLevel ? itemLevelNote : undefined} />
                {!isRaid ? (
                  <StatBadge label="IO" value={formatScore(card.mythicPlusScore)} />
                ) : null}

                {isRaid ? (
                  <RaidAffiliationPanel card={card} />
                ) : (
                  <div className="rounded-2xl border border-amber-200/50 bg-slate-950/85 p-3 text-sm font-bold text-slate-100">
                    {statusBadges.map((badge) => (
                      <BadgeLine key={badge} icon={<Timer className="h-4 w-4" />} text={badge} />
                    ))}
                    <BadgeLine icon={<Users className="h-4 w-4" />} text={card.guild ? `Guild: ${card.guild}` : "Guild TBD"} />
                    <BadgeLine icon={<Flag className="h-4 w-4" />} text={formatFaction(card.faction) ?? "Faction TBD"} />
                  </div>
                )}

                <PerformancePanel logs={card.logs} role={card.role} mode={card.mode} />
              </aside>

              <main className="flex min-w-0 flex-col overflow-visible rounded-2xl border border-amber-200/40 bg-[radial-gradient(circle_at_50%_28%,rgba(250,204,21,0.28),transparent_35%),linear-gradient(180deg,rgba(30,41,59,0.75),rgba(2,6,23,0.9))] p-3">
                <div className="relative mt-1 min-h-[18rem] flex-1 overflow-hidden rounded-2xl border border-amber-200/25 bg-[radial-gradient(circle_at_50%_28%,rgba(250,204,21,0.32),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.22),rgba(2,6,23,0.72))]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(180deg,transparent_52%,rgba(2,6,23,0.96)_96%)]" />
                  <HeroCharacterImage card={card} />
                  <div className="absolute inset-x-0 bottom-7 flex justify-center">
                    <RoleMedallion role={card.role} />
                  </div>
                </div>

                <div className="mt-3 min-w-0 rounded-2xl border border-amber-200/40 bg-slate-950/80 px-1.5 py-3 text-center">
                  <h3
                    className="mx-auto block max-w-full overflow-visible whitespace-nowrap font-display font-black leading-none text-gold"
                    style={{
                      fontSize: getNameFontSize(card.name),
                      letterSpacing: 0
                    }}
                    title={card.name}
                  >
                    {card.name}
                  </h3>
                  <p className="mt-1 font-display text-2xl font-bold text-slate-200">
                    {card.realm}
                  </p>
                </div>
              </main>

              <aside className="space-y-3">
                {isRaid ? <RaidBossPanel raid={card.raid} /> : <BestKeysPanel bestKeys={card.bestKeys} />}

                <Panel title="Signature Plays">
                  <div className="space-y-2">
                    {card.signaturePlays.map((play) => (
                      <div key={play} className="flex items-center gap-2 text-[13px] font-semibold">
                        <Swords className="h-4 w-4 shrink-0 text-amber-200" />
                        <span>{play}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </aside>
            </section>

            <section className="relative mt-4 min-h-[6.15rem] rounded-2xl border border-amber-200/50 bg-stone-100 px-5 py-4 text-center text-slate-950">
              <div className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-slate-700">
                {card.race ?? "Dwarf"} {card.specName ?? "Retribution"} {card.className ?? "Paladin"}
              </div>
              <p className="mx-auto max-w-[92%] font-display text-[1.45rem] italic leading-tight">
                &quot;{isRaid ? getRaidQuote(card.role) : card.classQuote}&quot;
              </p>
            </section>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function HeroCharacterImage({ card }: { card: PlayerCardProfile }) {
  if (card.renderUrl) {
    return (
      <img
        src={card.renderUrl}
        alt={`${card.name} character render`}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-contain object-center opacity-95 drop-shadow-[0_0_48px_rgba(250,204,21,0.32)]"
        style={{
          transform: "translate3d(0, -8%, 0) scale(3.35)",
          transformOrigin: "50% 50%"
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="grid h-48 w-48 place-items-center rounded-full border border-amber-200/40 bg-amber-300/10 shadow-[0_0_70px_rgba(250,204,21,0.22)]">
        {card.thumbnailUrl ? (
          <img
            src={card.thumbnailUrl}
            alt={`${card.name} thumbnail`}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className="h-32 w-32 rounded-full border border-amber-200/40 object-cover"
          />
        ) : (
          <Crown className="h-28 w-28 text-amber-200" />
        )}
      </div>
    </div>
  );
}

function StatBadge({ value, label, note }: { value: string | number; label: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-amber-200/50 bg-slate-950/85 p-4 text-center">
      <div className="mx-auto flex h-16 items-center justify-center font-sans text-[3.45rem] font-bold leading-none text-gold tabular-nums tracking-normal">
        {value}
      </div>
      <div className="mt-1 text-[1.25rem] font-black leading-none text-slate-100">{label}</div>
      {note ? <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{note}</div> : null}
    </div>
  );
}

function BadgeLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-amber-200">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function RaidAffiliationPanel({ card }: { card: PlayerCardProfile }) {
  return (
    <div className="rounded-2xl border border-amber-200/50 bg-slate-950/85 p-3 text-slate-100">
      <div className="mb-3 text-center font-display text-base font-black uppercase tracking-wide text-amber-200">
        Affiliation
      </div>
      <div className="space-y-2">
        <AffiliationStat icon={<Users className="h-4 w-4" />} label="Guild" value={card.guild ?? "Guild TBD"} />
        <AffiliationStat icon={<Flag className="h-4 w-4" />} label="Faction" value={formatFaction(card.faction) ?? "Faction TBD"} />
        <AffiliationStat icon={<Sparkles className="h-4 w-4" />} label="Region" value={card.region.toUpperCase()} />
      </div>
    </div>
  );
}

function AffiliationStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2">
      <span className="text-amber-200">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[9px] font-black uppercase leading-none tracking-wide text-slate-500">{label}</span>
        <span className="mt-1 block min-w-0 text-[13px] font-black leading-tight text-slate-100">{value}</span>
      </span>
    </div>
  );
}

function BestKeysPanel({ bestKeys }: { bestKeys: PlayerCardProfile["bestKeys"] }) {
  return (
    <Panel title="Current Best Keys">
      <div className="space-y-1.5">
        {bestKeys.slice(0, 8).map((key) => (
          <div
            key={`${key.dungeon}-${key.level}`}
            className="grid grid-cols-[minmax(0,1fr)_1.55rem] items-center gap-1.5 border-b border-white/10 pb-1.5 text-[10px]"
          >
            <span
              className="min-w-0 whitespace-nowrap leading-none text-slate-100"
              title={key.dungeon}
            >
              {key.dungeon}
            </span>
            <span className="text-right text-[10px] font-bold leading-none text-amber-200 tabular-nums">{key.level}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RaidBossPanel({ raid }: { raid: PlayerCardProfile["raid"] }) {
  const bosses = raid?.bossKills ?? [];

  return (
    <Panel title="Raid Progress">
      <div className="mb-2 rounded-xl border border-amber-200/30 bg-amber-200/10 px-2 py-2 text-center">
        <div className="font-sans text-[2.05rem] font-bold leading-none text-amber-200 tabular-nums">
          {formatHighestRaidProgress(raid)}
        </div>
        <div className="mt-1 text-[10px] font-black uppercase leading-none tracking-wide text-slate-400">
          Highest Progress
        </div>
      </div>
      <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {raid?.zoneName ?? "Current Raid"}
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1 text-center">
        <RaidProgressPip label="M" value={formatRaidProgress(raid, "mythic")} primary />
        <RaidProgressPip label="H" value={formatRaidProgress(raid, "heroic")} />
        <RaidProgressPip label="N" value={formatRaidProgress(raid, "normal")} />
      </div>
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_2.55rem] gap-2 border-b border-white/10 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
        <span>Boss</span>
        <span className="text-right">Best</span>
      </div>
      <div className="space-y-1.5">
        {bosses.slice(0, 8).map((boss) => (
          <div
            key={boss.boss}
            className="grid grid-cols-[minmax(0,1fr)_2.55rem] items-center gap-2 border-b border-white/10 pb-1.5 text-[10px]"
          >
            <span className="min-w-0 whitespace-nowrap leading-none text-slate-100" title={boss.boss}>
              {formatBossName(boss.boss)}
            </span>
            <span className={`text-right font-bold leading-none tabular-nums ${boss.kills > 0 ? "text-emerald-200" : "text-amber-200"}`}>
              {formatBossProgress(boss)}
            </span>
          </div>
        ))}
        {!bosses.length ? <div className="text-center text-xs text-slate-400">No public raid logs found</div> : null}
      </div>
    </Panel>
  );
}

function RaidProgressPip({ value, label, primary = false }: { value: string; label: string; primary?: boolean }) {
  return (
    <div className={`min-w-0 rounded-lg border px-0.5 py-1.5 ${primary ? "border-amber-200/30 bg-amber-200/10" : "border-white/10 bg-white/5"}`}>
      <div className={`font-sans text-[0.88rem] font-bold leading-none tabular-nums ${primary ? "text-amber-200" : "text-slate-100"}`}>
        {value}
      </div>
      <div className="mt-1 text-[9px] font-black uppercase leading-none tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function PerformancePanel({
  logs,
  role,
  mode
}: {
  logs: PlayerCardProfile["logs"];
  role?: string;
  mode: PlayerCardProfile["mode"];
}) {
  const isHealer = role?.toLowerCase().includes("heal");
  const isTank = role?.toLowerCase().includes("tank");
  const bestLabel = isHealer ? "Avg Best HPS" : isTank ? "Avg Best Damage" : "Avg Best DPS";
  const medianLabel = "Median Parse";
  const raidParses = logs?.raidParses ?? [];

  return (
    <div className="rounded-2xl border border-cyan-200/40 bg-slate-950/85 p-3 text-slate-100">
      <div className="mb-3 flex items-center justify-center gap-2 font-display text-base font-black uppercase tracking-wide text-cyan-200">
        <TrendingUp className="h-4 w-4" />
        Parses
      </div>
      {mode === "raid" && raidParses.length ? (
        <RaidParseCards raidParses={raidParses.slice(0, 2)} />
      ) : (
        <div className="grid grid-cols-2 gap-2 text-center">
          <ParseMetric label={bestLabel} value={formatThroughput(logs?.bestThroughputAvg)} />
          <ParseMetric label={medianLabel} value={formatParsePercent(logs?.medianParseAvg)} />
          <ParseMetric label="Rank" value={formatRank(logs?.specRank)} className="col-span-2" />
        </div>
      )}
    </div>
  );
}

function RaidParseCards({ raidParses }: { raidParses: NonNullable<NonNullable<PlayerCardProfile["logs"]>["raidParses"]> }) {
  return (
    <div className="space-y-2">
      {raidParses.map((summary) => (
        <RaidParseCard key={summary.difficulty} summary={summary} />
      ))}
    </div>
  );
}

function RaidParseCard({ summary }: { summary: NonNullable<NonNullable<PlayerCardProfile["logs"]>["raidParses"]>[number] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase leading-none tracking-wide text-cyan-200">
          {summary.difficulty}
        </span>
        <span className="rounded-md border border-cyan-100/10 bg-slate-950/70 px-1.5 py-1 font-sans text-[0.68rem] font-bold leading-none text-cyan-100 tabular-nums">
          {formatRank(summary.specRank)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <RaidParseMetric label="Best" value={formatThroughput(summary.bestThroughputAvg)} />
        <RaidParseMetric label="Median" value={formatParsePercent(summary.medianParseAvg)} />
      </div>
    </div>
  );
}

function RaidParseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-slate-950/60 px-1 py-2 text-center">
      <div className="flex h-5 min-w-0 items-center justify-center whitespace-nowrap font-sans text-[0.88rem] font-bold leading-none text-cyan-100 tabular-nums tracking-normal">
        {value}
      </div>
      <div className="mt-1 text-[8px] font-black uppercase leading-none tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function ParseMetric({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 px-2 py-2 ${className}`}>
      <div className="flex h-8 items-center justify-center font-sans text-[1.24rem] font-bold leading-none text-cyan-100 tabular-nums tracking-normal">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function RoleMedallion({ role }: { role?: string }) {
  const displayRole = formatRole(role);

  return (
    <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-cyan-100/60 bg-slate-950/85 text-cyan-100 shadow-[0_0_38px_rgba(103,232,249,0.22)]">
      {getRoleIcon(role, "h-11 w-11")}
      <div className="-mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">{displayRole}</div>
    </div>
  );
}

function ClassEmblem({ className, specName }: { className?: string; specName?: string }) {
  const color = getClassColor(className);
  const iconUrl = getSpecIconUrl(className, specName);

  return (
    <div
      className="absolute bottom-24 left-7 z-20 grid h-[4.5rem] w-[4.5rem] place-items-center rounded-2xl border border-amber-100/75 bg-[linear-gradient(180deg,rgba(248,216,120,0.26),rgba(2,6,23,0.98)_44%,rgba(2,6,23,1))] p-1.5 shadow-[0_14px_35px_rgba(0,0,0,0.5)]"
      style={{ boxShadow: `0 0 28px ${color}55, 0 14px 35px rgba(0,0,0,0.5)` }}
      title={[specName, className].filter(Boolean).join(" ") || "Class"}
    >
      <div
        className="relative grid h-full w-full place-items-center overflow-hidden rounded-xl bg-slate-950"
        style={{
          background: `radial-gradient(circle at 50% 24%, ${color}44, transparent 42%), linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.98))`,
          color
        }}
      >
        <div className="grid h-[3.7rem] w-[3.7rem] place-items-center overflow-hidden rounded-xl shadow-[0_0_24px_rgba(248,216,120,0.2)]">
          <img
            src={iconUrl}
            alt={[specName, className].filter(Boolean).join(" ") || "Class icon"}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

function FactionEmblem({ faction }: { faction?: string }) {
  const normalizedFaction = faction?.toLowerCase();
  const isHorde = normalizedFaction === "horde";
  const color = isHorde ? "#dc2626" : "#2563eb";
  const accent = isHorde ? "#f97316" : "#60a5fa";
  const iconUrl = getFactionIconUrl(faction);

  return (
    <div
      className="absolute bottom-24 right-7 z-20 grid h-[4.5rem] w-[4.5rem] place-items-center rounded-2xl border border-amber-100/75 bg-[linear-gradient(180deg,rgba(248,216,120,0.26),rgba(2,6,23,0.98)_44%,rgba(2,6,23,1))] p-1.5 shadow-[0_14px_35px_rgba(0,0,0,0.5)]"
      style={{ boxShadow: `0 0 28px ${color}66, 0 14px 35px rgba(0,0,0,0.5)` }}
      title={formatFaction(faction) ?? "Faction"}
    >
      <div
        className="relative grid h-full w-full place-items-center overflow-hidden rounded-xl bg-slate-950"
        style={{
          background: `radial-gradient(circle at 50% 24%, ${color}66, transparent 45%), linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.98))`,
          color: accent
        }}
      >
        <div className="grid h-[3.7rem] w-[3.7rem] place-items-center overflow-hidden rounded-full shadow-[0_0_24px_rgba(248,216,120,0.2)]">
          <img
            src={iconUrl}
            alt={`${formatFaction(faction) ?? "Faction"} icon`}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

function getRoleIcon(role?: string, className?: string): ReactNode {
  switch (formatRole(role)) {
    case "Tank":
      return <Shield className={className} />;
    case "Healer":
      return <HeartPulse className={className} />;
    default:
      return <Swords className={className} />;
  }
}

function getFactionIconUrl(faction?: string): string {
  return getWowIconUrl(faction?.toLowerCase() === "horde" ? "ui_hordeicon-round" : "ui_allianceicon-round");
}

function getSpecIconUrl(className?: string, specName?: string): string {
  const key = `${className ?? ""}:${specName ?? ""}`.toLowerCase();
  const iconName = specIconNames[key] ?? classIconNames[className ?? ""] ?? "inv_misc_questionmark";
  return getWowIconUrl(iconName);
}

function getWowIconUrl(iconName: string): string {
  return `${WOW_ICON_BASE}/${iconName}.jpg`;
}

function getClassColor(className?: string): string {
  switch (className) {
    case "Death Knight":
      return "#c41e3a";
    case "Demon Hunter":
      return "#a330c9";
    case "Druid":
      return "#ff7c0a";
    case "Evoker":
      return "#33937f";
    case "Hunter":
      return "#aad372";
    case "Mage":
      return "#3fc7eb";
    case "Monk":
      return "#00ff98";
    case "Paladin":
      return "#f48cba";
    case "Priest":
      return "#f0ebe0";
    case "Rogue":
      return "#fff468";
    case "Shaman":
      return "#0070dd";
    case "Warlock":
      return "#8788ee";
    case "Warrior":
      return "#c69b6d";
    default:
      return "#f8d878";
  }
}

function formatParsePercent(value?: number): string {
  if (typeof value !== "number") return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatParseValue(value?: number): string {
  if (typeof value !== "number") return "N/A";
  return value.toFixed(1);
}

function formatRaidProgress(raid: PlayerCardProfile["raid"], difficulty: "mythic" | "heroic" | "normal"): string {
  if (!raid) return difficulty === "mythic" ? "0/0M" : difficulty === "heroic" ? "0/0H" : "0/0N";

  if (difficulty === "mythic") {
    const killed = raid.mythicBossesKilled ?? raid.bossesKilled ?? 0;
    const total = raid.mythicTotalBosses ?? raid.totalBosses ?? 0;
    return `${killed}/${total}M`;
  }

  if (difficulty === "heroic") {
    return `${raid.heroicBossesKilled ?? 0}/${raid.heroicTotalBosses ?? 0}H`;
  }

  return `${raid.normalBossesKilled ?? 0}/${raid.normalTotalBosses ?? 0}N`;
}

function formatHighestRaidProgress(raid: PlayerCardProfile["raid"]): string {
  if (!raid) return "0/0";
  const mythicKilled = raid.mythicBossesKilled ?? raid.bossesKilled ?? 0;
  const mythicTotal = raid.mythicTotalBosses ?? raid.totalBosses ?? 0;
  if (mythicKilled > 0) return `${mythicKilled}/${mythicTotal}M`;

  return formatRaidProgress(raid, "heroic");
}

function formatBossProgress(boss: NonNullable<PlayerCardProfile["raid"]>["bossKills"][number]): string {
  if (boss.kills > 0) return `${boss.kills}x`;
  if (typeof boss.bestProgressPercent === "number") return `${boss.bestProgressPercent.toFixed(1)}%`;
  return "-";
}

function formatBossName(name: string): string {
  return name
    .replace(", the Undreamt God", "")
    .replace(", Child of Al'ar", "")
    .replace("Fallen-King", "Fallen King");
}

function getRaidQuote(role?: string): string {
  switch (formatRole(role)) {
    case "Tank":
      return "Hold the line. Give the raid a clean pull.";
    case "Healer":
      return "Keep the raid alive when the script stops being polite.";
    default:
      return "Execute the mechanic. Win the pull.";
  }
}

function formatThroughput(value?: number): string {
  if (typeof value !== "number") return "N/A";
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return Math.round(value).toLocaleString();
}

function formatRank(value?: number): string {
  if (typeof value !== "number") return "N/A";
  return `#${formatScore(value)}`;
}

function formatRole(role?: string): "DPS" | "Healer" | "Tank" {
  switch (role?.toUpperCase()) {
    case "HEALING":
    case "HEALER":
      return "Healer";
    case "TANK":
      return "Tank";
    default:
      return "DPS";
  }
}

function getNameFontSize(name: string): string {
  const width = getNameVisualWidth(name);
  if (width <= 5.6) return "3rem";
  if (width <= 6.6) return "2.55rem";
  if (width <= 7.4) return "2.32rem";
  if (width <= 8.4) return "2.08rem";
  if (width <= 9.6) return "1.82rem";
  if (width <= 12) return "1.45rem";
  return "1.05rem";
}

function getNameVisualWidth(name: string): number {
  return Array.from(name).reduce((total, character) => {
    if (/[MW]/.test(character)) return total + 1.25;
    if (/[mw]/.test(character)) return total + 1.15;
    if (/[Iil1'.]/.test(character)) return total + 0.45;
    if (/[rtfj]/.test(character)) return total + 0.7;
    return total + 1;
  }, 0);
}

function Panel({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-amber-200/50 bg-slate-950/85 p-3 text-slate-100">
      <div className="mb-3 text-center font-display text-lg font-black uppercase tracking-wide text-amber-200">
        {title}
      </div>
      {children}
    </div>
  );
}
