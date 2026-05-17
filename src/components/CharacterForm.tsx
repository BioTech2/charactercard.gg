"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react";
import { REALMS_BY_REGION } from "@/data/realms";
import { formatDisplayName } from "@/lib/normalize";
import { CardMode, CharacterSearchSuggestion, PlayerCardProfile, Region } from "@/types/player-card";

type Props = {
  onProfile: (profile: PlayerCardProfile) => void;
};

type SearchStatus = "idle" | "searching" | "suggestions" | "selected" | "missing";

export function CharacterForm({ onProfile }: Props) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<CardMode>("mythic-plus");
  const [realm, setRealm] = useState("");
  const [region, setRegion] = useState<Region>("us");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolvedProfile, setResolvedProfile] = useState<PlayerCardProfile | null>(null);
  const [suggestions, setSuggestions] = useState<CharacterSearchSuggestion[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const realms = useMemo(() => REALMS_BY_REGION[region], [region]);

  function changeRegion(nextRegion: Region) {
    setRegion(nextRegion);
    setRealm("");
    resetCharacterSearch();
  }

  function changeRealm(nextRealm: string) {
    setRealm(nextRealm);
    resetCharacterSearch();
  }

  function resetCharacterSearch() {
    setResolvedProfile(null);
    setSuggestions([]);
    setSearchStatus(name.trim().length < 2 ? "idle" : "searching");
  }

  function changeMode(nextMode: CardMode) {
    setMode(nextMode);
    setResolvedProfile(null);
    setSearchStatus(name.trim().length < 2 ? "idle" : "searching");
  }

  useEffect(() => {
    const characterName = formatDisplayName(name);

    if (!realm.trim() || characterName.length < 2) {
      return;
    }

    if (
      resolvedProfile &&
      resolvedProfile.name === characterName &&
      resolvedProfile.realm === realm &&
      resolvedProfile.region === region
    ) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchStatus("searching");

      try {
        const nextSuggestions = await searchCharacters({
          region,
          realm,
          name: characterName,
          signal: controller.signal
        });

        setSuggestions(nextSuggestions);
        setSearchStatus(nextSuggestions.length ? "suggestions" : "missing");
      } catch {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSearchStatus("missing");
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [name, realm, region, resolvedProfile]);

  async function selectSuggestion(suggestion: CharacterSearchSuggestion) {
    setName(suggestion.name);
    setSuggestions([]);
    setSearchStatus("searching");
    setError("");

    try {
      const profile = await lookupCharacter({
        region: suggestion.region,
        realm: suggestion.realm,
        name: suggestion.name,
        mode
      });

      setResolvedProfile(profile);
      setSearchStatus("selected");
      onProfile(profile);
    } catch (err) {
      setResolvedProfile(null);
      setSearchStatus("missing");
      setError(err instanceof Error ? err.message : "Lookup failed.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!realm.trim() || !name.trim()) {
        setError("Choose a realm and enter a character name.");
        return;
      }

      if (resolvedProfile) {
        onProfile(resolvedProfile);
        return;
      }

      const profile = await lookupCharacter({
        region,
        realm,
        name: formatDisplayName(name),
        mode
      });

      setResolvedProfile(profile);
      setSearchStatus("selected");
      onProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl"
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-slate-200">Card Type</span>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => changeMode("mythic-plus")}
              className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                mode === "mythic-plus" ? "bg-amber-300 text-slate-950" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Mythic+
            </button>
            <button
              type="button"
              onClick={() => changeMode("raid")}
              className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                mode === "raid" ? "bg-amber-300 text-slate-950" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Raid
            </button>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-200">Region</span>
          <select
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-amber-300 transition focus:ring-2"
            value={region}
            onChange={(event) => changeRegion(event.target.value as Region)}
          >
            <option value="us">US</option>
            <option value="eu">EU</option>
            <option value="kr">KR</option>
            <option value="tw">TW</option>
            <option value="cn">CN</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-200">Realm</span>
          <select
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-amber-300 transition focus:ring-2"
            value={realm}
            onChange={(event) => changeRealm(event.target.value)}
          >
            <option value="" disabled>
              Choose Realm
            </option>
            {realms.map((realmName) => (
              <option key={realmName} value={realmName}>
                {realmName}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2">
          <label htmlFor="character-name" className="text-sm font-semibold text-slate-200">
            Character
          </label>
          <input
            id="character-name"
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-amber-300 transition focus:ring-2"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setResolvedProfile(null);
              setSearchStatus(event.target.value.trim().length < 2 ? "idle" : "searching");
            }}
            placeholder="Enter character name"
            autoComplete="off"
          />
        </div>

        <CharacterSuggestions
          status={searchStatus}
          suggestions={suggestions}
          selectedProfile={resolvedProfile}
          onSelect={selectSuggestion}
        />

        <button
          type="submit"
          disabled={loading || searchStatus === "searching"}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          Generate Card
        </button>

        {error ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>
    </form>
  );
}

async function searchCharacters({
  region,
  realm,
  name,
  signal
}: {
  region: Region;
  realm: string;
  name: string;
  signal?: AbortSignal;
}): Promise<CharacterSearchSuggestion[]> {
  const params = new URLSearchParams({ region, realm, name });
  const response = await fetch(`/api/character/search?${params.toString()}`, { signal });
  const data = await response.json().catch(() => null);

  if (!response.ok) return [];

  return (data?.suggestions ?? []) as CharacterSearchSuggestion[];
}

async function lookupCharacter({
  region,
  realm,
  name,
  mode,
  signal
}: {
  region: Region;
  realm: string;
  name: string;
  mode: CardMode;
  signal?: AbortSignal;
}): Promise<PlayerCardProfile> {
  const params = new URLSearchParams({ region, realm, name, mode });
  const response = await fetch(`/api/character?${params.toString()}`, { signal });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Lookup failed.");
  }

  return data as PlayerCardProfile;
}

function CharacterSuggestions({
  status,
  suggestions,
  selectedProfile,
  onSelect
}: {
  status: SearchStatus;
  suggestions: CharacterSearchSuggestion[];
  selectedProfile: PlayerCardProfile | null;
  onSelect: (suggestion: CharacterSearchSuggestion) => void;
}) {
  if (status === "idle") {
    return <div className="min-h-6 text-sm text-slate-400">Choose a realm, then start typing a character name.</div>;
  }

  if (status === "searching") {
    return (
      <div className="flex min-h-6 items-center gap-2 text-sm text-amber-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        Searching characters...
      </div>
    );
  }

  if (status === "selected" && selectedProfile) {
    return (
      <div className="flex min-h-6 items-center gap-2 text-sm text-emerald-200">
        <CheckCircle2 className="h-4 w-4" />
        Selected {selectedProfile.name}-{selectedProfile.realm}
      </div>
    );
  }

  if (status === "suggestions") {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/95">
        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.region}-${suggestion.realm}-${suggestion.name}`}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="grid w-full grid-cols-[1fr_auto] gap-3 border-b border-white/10 px-4 py-3 text-left last:border-b-0 hover:bg-white/5"
          >
            <span>
              <span className="block font-bold text-slate-100">{suggestion.name}</span>
              <span className="block text-xs text-slate-400">
                {suggestion.realm} - {suggestion.region.toUpperCase()}
              </span>
            </span>
            <span className="text-right text-xs font-semibold text-amber-200">
              {suggestion.className ?? "Character"}
              {suggestion.faction ? ` - ${suggestion.faction}` : ""}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-6 items-center gap-2 text-sm text-red-200">
      <XCircle className="h-4 w-4" />
      No matching character suggestions yet. Keep typing or try another realm.
    </div>
  );
}
