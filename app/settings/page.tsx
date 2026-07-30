"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ListData } from "@/lib/types";
import { loadDefaults, saveDefaults, clearDefaults } from "@/lib/defaults";
import {
  MessageSquare,
  Phone,
  Users,
  Video,
  AtSign,
  Mailbox,
  HelpCircle,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";

const METHOD_ICONS: Record<string, LucideIcon> = {
  Text: MessageSquare,
  "Phone Call": Phone,
  "In-Person": Users,
  "Virtual Meeting": Video,
  Email: AtSign,
  Mailers: Mailbox,
};

export default function SettingsPage() {
  const router = useRouter();

  const [lists, setLists] = useState<ListData | null>(null);
  const [listError, setListError] = useState(false);
  const [outreachGoal, setOutreachGoal] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [outreachLead, setOutreachLead] = useState("");
  const [methodButtons, setMethodButtons] = useState<string[]>([]);
  const [saferEnabled, setSaferEnabled] = useState(false);
  const [saferAvailable, setSaferAvailable] = useState<string[]>([]);
  const [saferDefault, setSaferDefault] = useState<string[]>([]);
  const [staffDefault, setStaffDefault] = useState<string[]>([]);
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
    setSaferEnabled(d.saferEnabled ?? false);
    setSaferAvailable(d.saferAvailable ?? []);
    setSaferDefault(d.saferDefault ?? []);
    setStaffDefault(d.staffDefault ?? []);
  }, [loadLists]);

  const loading = !lists && !listError;

  // Toggles & Helpers
  function toggleMethod(m: string) {
    setMethodButtons((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function selectAllMethods() {
    if (lists?.methods) setMethodButtons([...lists.methods]);
  }

  function clearAllMethods() {
    setMethodButtons([]);
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

  function selectAllSafer() {
    if (lists?.saferCategories) setSaferAvailable([...lists.saferCategories]);
  }

  function clearAllSafer() {
    setSaferAvailable([]);
    setSaferDefault([]);
  }

  function toggleStaffDefault(n: string) {
    setStaffDefault((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );
  }

  function save() {
    const now = new Date().toISOString();
    saveDefaults({
      outreachGoal,
      campaignName,
      outreachLead,
      saferEnabled,
      methodButtons,
      saferAvailable,
      saferDefault,
      staffDefault,
      setAt: now,
      confirmedAt: now,
    });
    setSaved(true);

    // Client-side navigate back to home form
    setTimeout(() => {
      router.push("/");
    }, 150);
  }

  function clearAll() {
    clearDefaults();
    setOutreachGoal("");
    setCampaignName("");
    setOutreachLead("");
    setMethodButtons([]);
    setSaferEnabled(false);
    setSaferAvailable([]);
    setSaferDefault([]);
    setStaffDefault([]);
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
          Pre-set default values for your session. Saved on this device.
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

        {/* Goal */}
        <div className="mb-4">
          <label
            htmlFor="d-outreach-goal"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Default outreach goal
          </label>
          <input
            id="d-outreach-goal"
            type="text"
            value={outreachGoal}
            maxLength={140}
            onChange={(e) => setOutreachGoal(e.target.value)}
            placeholder="Drop off flyer for community Plática, July 25"
            className="min-h-[44px] w-full rounded-xl border border-line bg-field px-3.5 text-sm text-ink placeholder:text-muted/70"
          />
        </div>

        {/* Campaign */}
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

        {/* Team Defaults */}
        <div className="mb-4 rounded-xl border border-line bg-field/50 p-3 space-y-3">
          <div>
            <label
              htmlFor="d-lead"
              className="mb-1 block text-sm font-medium text-ink"
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

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Default supporting staff
            </label>
            {loading ? (
              <div className="h-[36px] animate-pulse rounded-lg border border-line bg-field" />
            ) : (lists?.staff?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted">No staff found.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(lists?.staff ?? []).map((n) => {
                  const checked = staffDefault.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggleStaffDefault(n)}
                      className={[
                        "flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                        checked
                          ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                          : "border-line bg-white text-muted hover:border-brand-primary/40",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-brand-primary bg-brand-primary text-white"
                            : "border-line bg-white",
                        ].join(" ")}
                      >
                        {checked && (
                          <svg width="9" height="9" viewBox="0 0 16 16">
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
                      <span>{n}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Method Buttons */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-ink">
              Quick method buttons
            </label>
            {!loading && (lists?.methods?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAllMethods}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-field px-2 py-1 text-[11px] font-medium text-ink transition-colors hover:border-brand-primary/40 hover:bg-white"
                >
                  <Check className="h-3 w-3 text-brand-secondary" />
                  All
                </button>
                <button
                  type="button"
                  onClick={clearAllMethods}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-field px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:border-line hover:bg-white hover:text-ink"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="h-[44px] animate-pulse rounded-xl border border-line bg-field" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(lists?.methods ?? []).map((m) => {
                const checked = methodButtons.includes(m);
                const Icon = METHOD_ICONS[m] || HelpCircle;

                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleMethod(m)}
                    className={[
                      "flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3 text-left text-xs font-medium transition-colors",
                      checked
                        ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                        : "border-line bg-field text-muted hover:bg-white",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{m}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SAFER Compliance */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label
                htmlFor="safer-enabled"
                className="block text-sm font-medium text-ink"
              >
                SAFER Compliance
              </label>
              <p className="mt-0.5 text-xs text-muted">
                Enable compliance tagging.
              </p>
            </div>
            <button
              id="safer-enabled"
              type="button"
              role="switch"
              aria-checked={saferEnabled}
              onClick={() => setSaferEnabled((v) => !v)}
              className={[
                "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
                saferEnabled ? "bg-brand-primary" : "bg-line",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                  saferEnabled ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>

          {saferEnabled && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-end">
                {!loading && (lists?.saferCategories?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={selectAllSafer}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-field px-2 py-1 text-[11px] font-medium text-ink transition-colors hover:border-brand-primary/40 hover:bg-white"
                    >
                      <Check className="h-3 w-3 text-brand-secondary" />
                      All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllSafer}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-field px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:border-line hover:bg-white hover:text-ink"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="h-[38px] animate-pulse rounded-xl border border-line bg-field" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(lists?.saferCategories ?? []).map((c) => {
                    const included = saferAvailable.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={included}
                        onClick={() => toggleSaferAvailable(c)}
                        className={[
                          "flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                          included
                            ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                            : "border-line bg-white text-muted hover:border-brand-primary/40",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden="true"
                          className={[
                            "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                            included
                              ? "border-brand-primary bg-brand-primary text-white"
                              : "border-line bg-white",
                          ].join(" ")}
                        >
                          {included && (
                            <svg width="9" height="9" viewBox="0 0 16 16">
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
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save/Clear Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={loading}
            className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-brand-primary text-base font-semibold text-white transition-opacity disabled:opacity-60"
          >
            Save defaults
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="min-h-[48px] shrink-0 rounded-xl border border-line bg-white px-4 text-sm font-medium text-muted hover:bg-field"
          >
            Clear
          </button>
        </div>

        {saved && (
          <p className="mt-2 text-center text-xs font-medium text-brand-success">
            Saved! Redirecting…
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
      className="min-h-[44px] w-full appearance-none rounded-xl border border-line bg-field px-3 text-sm text-ink disabled:opacity-60"
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
