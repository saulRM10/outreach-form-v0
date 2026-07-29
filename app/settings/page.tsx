"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ListData } from "@/lib/types";
import { loadDefaults, saveDefaults, clearDefaults } from "@/lib/defaults";

export default function SettingsPage() {
  const [lists, setLists] = useState<ListData | null>(null);
  const [listError, setListError] = useState(false);
  const [outreachGoal, setOutreachGoal] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [outreachLead, setOutreachLead] = useState("");
  const [methodButtons, setMethodButtons] = useState<string[]>([]);
  const [saferAvailable, setSaferAvailable] = useState<string[]>([]);
  const [saferDefault, setSaferDefault] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const loadLists = useCallback(async () => {
    setListError(false);
    try {
      const res = await fetch("/api/lists", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      setLists((await res.json()) as ListData);
    } catch {
      setListError(true);
    }
  }, []);

  useEffect(() => {
    loadLists();
    const d = loadDefaults();
    setOutreachGoal(d.outreachGoal);
    setCampaignName(d.campaignName);
    setOutreachLead(d.outreachLead);
    setMethodButtons(d.methodButtons);
    setSaferAvailable(d.saferAvailable ?? []);
    setSaferDefault(d.saferDefault ?? []);
  }, [loadLists]);

  const loading = !lists && !listError;

  function toggleMethod(m: string) {
    setMethodButtons((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function toggleSaferAvailable(c: string) {
    setSaferAvailable((prev) => {
      if (prev.includes(c)) {
        setSaferDefault((d) => d.filter((x) => x !== c));
        return prev.filter((x) => x !== c);
      }
      return [...prev, c];
    });
  }

  // Starring a category as a default implies including it.
  function toggleSaferDefault(c: string) {
    setSaferDefault((prev) => {
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      setSaferAvailable((a) => (a.includes(c) ? a : [...a, c]));
      return [...prev, c];
    });
  }

  function save() {
    const now = new Date().toISOString();
    saveDefaults({
      outreachGoal,
      campaignName,
      outreachLead,
      methodButtons,
      saferAvailable,
      saferDefault,
      setAt: now,
      confirmedAt: now,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function clearAll() {
    clearDefaults();
    setOutreachGoal("");
    setCampaignName("");
    setOutreachLead("");
    setMethodButtons([]);
    setSaferAvailable([]);
    setSaferDefault([]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-16 pt-6 sm:pt-10">
      <header className="mb-5">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-secondary hover:underline"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to form
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-7 w-1.5 rounded-full bg-brand-primary" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Defaults
          </h1>
        </div>
        <p className="mt-1.5 pl-4 text-sm text-muted">
          Pre-set the values you pick most. The form opens with these filled in.
          Saved on this device.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm shadow-ink/5 sm:p-5">
        {listError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <span>Couldn’t load options from the sheet.</span>
            <button
              type="button"
              onClick={loadLists}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="d-outreach-goal"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Default outreach goal
          </label>
          <p className="mb-2.5 text-xs text-muted">
            Set this before you head out. Every entry saves it into the note.
          </p>
          <input
            id="d-outreach-goal"
            type="text"
            value={outreachGoal}
            maxLength={140}
            onChange={(e) => setOutreachGoal(e.target.value)}
            placeholder="Drop off flyer for community Plática, July 25"
            className="min-h-[48px] w-full rounded-xl border border-line bg-field px-3.5 text-ink placeholder:text-muted/70"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="d-campaign"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Default campaign
          </label>
          <Select
            id="d-campaign"
            value={campaignName}
            onChange={setCampaignName}
            options={lists?.campaigns}
            loading={loading}
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="d-lead"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Default outreach lead
          </label>
          <Select
            id="d-lead"
            value={outreachLead}
            onChange={setOutreachLead}
            options={lists?.leads}
            loading={loading}
          />
        </div>

        {/* Quick method buttons */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Quick method buttons
          </label>
          <p className="mb-2.5 text-xs text-muted">
            Pick the methods you use most. They appear as one-tap buttons.
          </p>

          {loading ? (
            <div className="h-[48px] animate-pulse rounded-xl border border-line bg-field" />
          ) : (lists?.methods?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">No methods found in the sheet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(lists?.methods ?? []).map((m) => {
                const checked = methodButtons.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleMethod(m)}
                    className={[
                      "flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-sm font-medium transition-colors",
                      checked
                        ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                        : "border-line bg-field text-muted hover:bg-white",
                    ].join(" ")}
                  >
                    <span className="leading-tight">{m}</span>
                    {checked && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <path
                          d="M3 8.5l3.5 3.5L13 5"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SAFER Compliance */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-ink">
            SAFER Compliance
          </label>
          <p className="mb-2.5 text-xs text-muted">
            Choose which categories staff can tag on an entry. Tap the star to
            pre-select one so it’s already checked on every new form. Categories
            come from column G of the sheet.
          </p>

          {loading ? (
            <div className="h-[48px] animate-pulse rounded-xl border border-line bg-field" />
          ) : (lists?.saferCategories?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">
              No SAFER categories found in column G of the sheet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {(lists?.saferCategories ?? []).map((c) => {
                const included = saferAvailable.includes(c);
                const isDefault = saferDefault.includes(c);
                return (
                  <div
                    key={c}
                    className={[
                      "flex items-stretch gap-2 rounded-xl border transition-colors",
                      included
                        ? "border-brand-primary bg-brand-primary/10"
                        : "border-line bg-field",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      aria-pressed={included}
                      onClick={() => toggleSaferAvailable(c)}
                      className="flex min-h-[48px] flex-1 items-center gap-2 px-3.5 text-left text-sm font-medium"
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          included
                            ? "border-brand-primary bg-brand-primary text-white"
                            : "border-line bg-white",
                        ].join(" ")}
                      >
                        {included && (
                          <svg width="11" height="11" viewBox="0 0 16 16">
                            <path
                              d="M3 8.5l3.5 3.5L13 5"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className={
                          included ? "text-brand-secondary" : "text-muted"
                        }
                      >
                        {c}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={isDefault}
                      aria-label={
                        isDefault
                          ? `Remove ${c} from defaults`
                          : `Pre-select ${c} by default`
                      }
                      onClick={() => toggleSaferDefault(c)}
                      className="flex min-h-[48px] w-12 shrink-0 items-center justify-center border-l border-line/60"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={isDefault ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={
                          isDefault ? "text-brand-primary" : "text-muted"
                        }
                        aria-hidden="true"
                      >
                        <path d="M12 17.3l-5.4 3.1 1.4-6.1-4.7-4.1 6.2-.5L12 4l2.5 5.7 6.2.5-4.7 4.1 1.4 6.1z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={loading}
            className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-brand-primary text-[17px] font-semibold text-white transition-opacity disabled:opacity-60"
          >
            Save defaults
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="min-h-[52px] shrink-0 rounded-xl border border-line bg-white px-4 font-medium text-muted hover:bg-field"
          >
            Clear
          </button>
        </div>

        {saved && (
          <p className="mt-3 text-center text-sm font-medium text-brand-success">
            Saved on this device.
          </p>
        )}
      </div>
    </main>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
  loading,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  loading?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={loading}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-[48px] w-full appearance-none rounded-xl border border-line bg-field px-3.5 text-ink disabled:opacity-60"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><path d='M4 6l4 4 4-4' stroke='%235b6478' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
      }}
    >
      <option value="">{loading ? "Loading…" : "No default"}</option>
      {(options ?? []).map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
