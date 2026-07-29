"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact, ListData, SubmissionPayload } from "@/lib/types";
import { loadDefaults, saveDefaults, type Defaults } from "@/lib/defaults";
import ContactPicker from "./ContactPicker";
import Toast, { type ToastKind } from "./Toast";
import {
  MessageSquare,
  Phone,
  Users,
  Video,
  AtSign,
  Mailbox,
  MoreHorizontal,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";

// --- date helpers (MM/DD/YY) ---
function todayMMDDYY(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}
function isoToMMDDYY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y.slice(-2)}`;
}
function mmddyyToISO(v: string): string {
  if (!v) return "";
  const [m, d, yy] = v.split("/");
  if (!m || !d || !yy) return "";
  return `20${yy}-${m}-${d}`;
}

function isStaleDay(iso: string | undefined): boolean {
  if (!iso) return false;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return false;
  return then.toDateString() !== new Date().toDateString();
}

const FOLLOWUP_OPTIONS = ["No", "Yes"] as const;
const MAX_BUTTONS = 4;
const GOAL_MAX = 140;

function composeNotes(goal: string, notes: string): string {
  const g = goal.trim();
  const n = notes.trim();
  if (!g) return n;
  return n ? `Goal: ${g}\n${n}` : `Goal: ${g}`;
}

interface FormState {
  contact: Contact | null;
  outreachGoal: string;
  campaignName: string;
  outreachLead: string;
  outreachMethod: string;
  dateOfOutreach: string; // MM/DD/YY
  response: string;
  notes: string;
  followUp: (typeof FOLLOWUP_OPTIONS)[number];
  followUpDate: string; // MM/DD/YY
  saferCategories: string[];
  otherStaff: string[];
}

function blankState(defaults: Defaults): FormState {
  return {
    contact: null,
    outreachGoal: defaults.outreachGoal,
    campaignName: defaults.campaignName,
    outreachLead: defaults.outreachLead,
    outreachMethod: "",
    dateOfOutreach: todayMMDDYY(),
    response: "",
    notes: "",
    followUp: "No",
    followUpDate: "",
    saferCategories: defaults.saferEnabled
      ? [...(defaults.saferDefault ?? [])]
      : [],
    otherStaff: [...(defaults.staffDefault ?? [])],
  };
}

const EMPTY_DEFAULTS: Defaults = {
  outreachGoal: "",
  campaignName: "",
  outreachLead: "",
  methodButtons: [],
  saferEnabled: false,
  saferAvailable: [],
  saferDefault: [],
  staffDefault: [],
  setAt: "",
  confirmedAt: "",
};

export default function OutreachForm() {
  const [lists, setLists] = useState<ListData | null>(null);
  const [listError, setListError] = useState(false);
  const [form, setForm] = useState<FormState>(() => blankState(EMPTY_DEFAULTS));
  const [methodButtons, setMethodButtons] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const [followUpDateError, setFollowUpDateError] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const [stale, setStale] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [saferConfig, setSaferConfig] = useState<{
    enabled: boolean;
    available: string[];
    default: string[];
  }>({ enabled: false, available: [], default: [] });

  const [toast, setToast] = useState<{
    kind: ToastKind;
    message: string;
  } | null>(null);
  const defaultsRef = useRef<Defaults>(EMPTY_DEFAULTS);

  useEffect(() => {
    const d = loadDefaults();
    defaultsRef.current = d;
    setMethodButtons(d.methodButtons);
    setSaferConfig({
      enabled: d.saferEnabled ?? false,
      available: d.saferAvailable ?? [],
      default: d.saferDefault ?? [],
    });

    setForm((f) => ({
      ...f,
      outreachGoal: d.outreachGoal || f.outreachGoal,
      campaignName: d.campaignName || f.campaignName,
      outreachLead: d.outreachLead || f.outreachLead,
      saferCategories: d.saferEnabled ? [...(d.saferDefault ?? [])] : [],
      otherStaff: [...(d.staffDefault ?? [])],
    }));
    if (!d.outreachGoal && !d.campaignName && !d.outreachLead)
      setStripOpen(true);
  }, []);

  useEffect(() => {
    const check = () => {
      const d = defaultsRef.current;
      const hasContext = !!(d.outreachGoal || d.campaignName || d.outreachLead);
      const next = hasContext && isStaleDay(d.confirmedAt || d.setAt);
      setStale(next);
      if (next) setStripOpen(true);
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, []);

  function persistContext(next: Partial<Defaults>, confirmOnly = false) {
    const now = new Date().toISOString();
    const merged: Defaults = {
      ...defaultsRef.current,
      ...next,
      setAt: confirmOnly ? defaultsRef.current.setAt || now : now,
      confirmedAt: now,
    };
    defaultsRef.current = merged;
    saveDefaults(merged);
    setStale(false);
  }

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

  const saferAvailable = (() => {
    if (!saferConfig.enabled) return [];
    const all = lists?.saferCategories ?? [];
    if (saferConfig.available.length === 0) return all;
    const allow = new Set(saferConfig.available);
    return all.filter((c) => allow.has(c));
  })();

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const loading = !lists && !listError;

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (submitting) return;
    setToast(null);

    if (!form.outreachGoal.trim()) {
      setGoalError(true);
      setStripOpen(true);
      setToast({
        kind: "error",
        message: "Add the outreach goal before saving.",
      });
      requestAnimationFrame(() =>
        document.getElementById("outreach-goal")?.focus(),
      );
      return;
    }
    setGoalError(false);

    if (form.followUp === "Yes" && !form.followUpDate.trim()) {
      setFollowUpDateError(true);
      setToast({
        kind: "error",
        message: "Pick a follow-up date, or set follow-up to No.",
      });
      document.getElementById("followup-date")?.focus();
      return;
    }
    setFollowUpDateError(false);

    const payload: SubmissionPayload = {
      contactName: form.contact?.name ?? "",
      streetAddress: form.contact?.address ?? "",
      contactId: form.contact?.id ?? "",
      campaignName: form.campaignName,
      outreachLead: form.outreachLead,
      outreachMethod: form.outreachMethod,
      dateOfOutreach: form.dateOfOutreach,
      response: form.response,
      notes: composeNotes(form.outreachGoal, form.notes),
      saferCategories: form.saferCategories,
      otherStaff: form.otherStaff,
      followUpRequired: form.followUp === "Yes",
      followUpDate: form.followUp === "Yes" ? form.followUpDate : "",
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({
          kind: "error",
          message: data.error || "Could not save. Try again.",
        });
        return;
      }
      setForm(blankState(defaultsRef.current));
      setDateOpen(false);
      setToast({ kind: "success", message: "Saved to the team sheet." });
    } catch {
      setToast({
        kind: "error",
        message: "Connection dropped. Nothing was lost — try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isToday = form.dateOfOutreach === todayMMDDYY();

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="rounded-2xl border border-line bg-white p-3 sm:p-5 shadow-sm shadow-ink/5"
      >
        {listError && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm text-red-700">
            <span>Couldn’t load options.</span>
            <button
              type="button"
              onClick={loadLists}
              className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Session context: Goal, Campaign, Lead, and Other Staff */}
        <SessionStrip
          open={stripOpen}
          stale={stale}
          goal={form.outreachGoal}
          campaign={form.campaignName}
          lead={form.outreachLead}
          otherStaff={form.otherStaff}
          goalError={goalError}
          campaigns={lists?.campaigns}
          leads={lists?.leads}
          staffOptions={lists?.staff}
          loading={loading}
          onToggle={() => setStripOpen((o) => !o)}
          onGoal={(v) => {
            set("outreachGoal", v);
            if (goalError) setGoalError(false);
          }}
          onCampaign={(v) => set("campaignName", v)}
          onLead={(v) => set("outreachLead", v)}
          onToggleStaff={(name) =>
            setForm((f) => ({
              ...f,
              otherStaff: f.otherStaff.includes(name)
                ? f.otherStaff.filter((n) => n !== name)
                : [...f.otherStaff, name],
            }))
          }
          onDone={() => {
            persistContext({
              outreachGoal: form.outreachGoal,
              campaignName: form.campaignName,
              outreachLead: form.outreachLead,
              staffDefault: form.otherStaff,
            });
            setStripOpen(false);
          }}
          onConfirm={() => {
            persistContext({}, true);
            setStripOpen(false);
          }}
        />

        {/* Contact */}
        <Field label="Contact" htmlFor="contact" required>
          <ContactPicker
            options={lists?.contacts ?? []}
            value={form.contact}
            onChange={(v) => set("contact", v)}
            loading={loading}
          />
        </Field>

        {/* Method */}
        <Field label="Method" htmlFor="method" required>
          <MethodPicker
            value={form.outreachMethod}
            onChange={(v) => set("outreachMethod", v)}
            all={lists?.methods ?? []}
            quick={methodButtons}
            loading={loading}
          />
        </Field>

        {/* Response */}
        <Field label="Response" htmlFor="response" required>
          <ChoiceField
            id="response"
            value={form.response}
            onChange={(v) => set("response", v)}
            options={lists?.responses}
            loading={loading}
          />
        </Field>

        {/* SAFER Compliance */}
        <SaferField
          available={saferAvailable}
          selected={form.saferCategories}
          loading={loading}
          onToggle={(cat) =>
            setForm((f) => ({
              ...f,
              saferCategories: f.saferCategories.includes(cat)
                ? f.saferCategories.filter((c) => c !== cat)
                : [...f.saferCategories, cat],
            }))
          }
        />

        {/* Date & Follow-up Row */}
        <div className="mb-3 grid grid-cols-2 gap-2.5">
          <div>
            <label
              htmlFor="date"
              className="mb-1 block text-xs font-medium text-ink"
            >
              Date
              <RequiredMark />
            </label>
            {dateOpen || !isToday ? (
              <input
                id="date"
                type="date"
                required
                aria-required="true"
                autoFocus={dateOpen}
                value={mmddyyToISO(form.dateOfOutreach)}
                onChange={(e) =>
                  set("dateOfOutreach", isoToMMDDYY(e.target.value))
                }
                onBlur={() => setDateOpen(false)}
                className="min-h-[42px] w-full rounded-xl border border-line bg-field px-2.5 text-sm text-ink"
              />
            ) : (
              <button
                id="date"
                type="button"
                onClick={() => setDateOpen(true)}
                className="min-h-[42px] w-full rounded-xl bg-brand-accent px-2.5 text-sm font-medium text-white"
              >
                Today
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              Follow-up
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {FOLLOWUP_OPTIONS.map((opt) => {
                const selected = form.followUp === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      set("followUp", opt);
                      if (opt === "No") {
                        set("followUpDate", "");
                        setFollowUpDateError(false);
                      }
                    }}
                    className={[
                      "min-h-[42px] rounded-xl border text-sm font-medium transition-colors",
                      selected
                        ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                        : "border-line bg-field text-muted hover:bg-white",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notes */}
        <Field label="Notes" htmlFor="notes">
          <textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything worth remembering"
            className="w-full resize-y rounded-xl border border-line bg-field px-3 py-2 text-sm text-ink placeholder:text-muted/70"
          />
        </Field>

        {/* Follow-up date (if enabled) */}
        {form.followUp === "Yes" && (
          <Field label="Follow-up date" htmlFor="followup-date" required>
            <input
              id="followup-date"
              type="date"
              required
              aria-required="true"
              aria-invalid={followUpDateError || undefined}
              value={mmddyyToISO(form.followUpDate)}
              onChange={(e) => {
                set("followUpDate", isoToMMDDYY(e.target.value));
                if (followUpDateError) setFollowUpDateError(false);
              }}
              className={[
                "min-h-[42px] w-full rounded-xl border bg-field px-3 text-sm text-ink",
                followUpDateError ? "border-red-400" : "border-line",
              ].join(" ")}
            />
          </Field>
        )}

        {/* Compact Pinned Submit Button */}
        <div
          className="sticky bottom-0 -mx-3 -mb-3 border-t border-line bg-white/95 px-3 pt-2.5 backdrop-blur sm:-mx-5 sm:-mb-5 sm:px-5"
          style={{
            paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="submit"
            disabled={submitting || loading}
            className="flex min-h-[46px] w-full items-center justify-center rounded-xl bg-brand-primary text-base font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save entry"}
          </button>
        </div>
      </form>

      {toast && (
        <Toast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

// --- Session Strip & Field Helpers ---

function SessionStrip({
  open,
  stale,
  goal,
  campaign,
  lead,
  otherStaff,
  goalError,
  campaigns,
  leads,
  staffOptions,
  loading,
  onToggle,
  onGoal,
  onCampaign,
  onLead,
  onToggleStaff,
  onDone,
  onConfirm,
}: {
  open: boolean;
  stale: boolean;
  goal: string;
  campaign: string;
  lead: string;
  otherStaff: string[];
  goalError: boolean;
  campaigns?: string[];
  leads?: string[];
  staffOptions?: string[];
  loading?: boolean;
  onToggle: () => void;
  onGoal: (v: string) => void;
  onCampaign: (v: string) => void;
  onLead: (v: string) => void;
  onToggleStaff: (name: string) => void;
  onDone: () => void;
  onConfirm: () => void;
}) {
  // Available extra staff (exclude person already picked as Lead)
  const availableStaff = (staffOptions ?? []).filter((s) => s !== lead);

  if (!open) {
    const staffCount = otherStaff.filter((s) => s !== lead).length;
    const teamSummary = lead
      ? `${lead}${staffCount > 0 ? ` (+${staffCount})` : ""}`
      : "";

    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        className="mb-3 flex w-full items-center justify-between gap-2 rounded-xl bg-brand-primary/10 px-3 py-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-brand-secondary">
            {goal || "No goal set"}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-brand-secondary/75">
            {[campaign, teamSummary].filter(Boolean).join(" · ") ||
              "Tap to set session context"}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-brand-secondary" />
      </button>
    );
  }

  return (
    <div
      className={[
        "mb-3 rounded-xl p-3 space-y-2.5",
        stale ? "border border-amber-300 bg-amber-50" : "bg-brand-primary/10",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={[
            "text-xs font-semibold",
            stale ? "text-amber-700" : "text-brand-secondary",
          ].join(" ")}
        >
          {stale ? "Outreach context (stale)" : "Session Context"}
        </span>
        {!stale && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded
            aria-label="Collapse session context"
            className="text-brand-secondary p-0.5"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
      </div>

      <div>
        <label
          htmlFor="outreach-goal"
          className="mb-1 block text-xs font-medium text-ink"
        >
          Outreach Goal
          <RequiredMark />
        </label>
        <input
          id="outreach-goal"
          type="text"
          required
          aria-required="true"
          value={goal}
          maxLength={GOAL_MAX}
          onChange={(e) => onGoal(e.target.value)}
          placeholder="Drop off flyer, Plática Jul 25"
          className={[
            "min-h-[38px] w-full rounded-lg border bg-white px-2.5 text-xs text-ink placeholder:text-muted/70",
            goalError ? "border-red-400" : "border-line",
          ].join(" ")}
        />
      </div>

      <div>
        <label
          htmlFor="campaign"
          className="mb-1 block text-xs font-medium text-ink"
        >
          Campaign
          <RequiredMark />
        </label>
        <Select
          id="campaign"
          value={campaign}
          onChange={onCampaign}
          options={campaigns}
          loading={loading}
          compact
          required
        />
      </div>

      {/* Integrated Team Section: Lead + Other Staff */}
      <div className="rounded-lg border border-brand-primary/20 bg-white/70 p-2.5 space-y-2">
        <div>
          <label
            htmlFor="lead"
            className="mb-1 block text-xs font-medium text-ink"
          >
            Outreach Lead
            <RequiredMark />
          </label>
          <Select
            id="lead"
            value={lead}
            onChange={onLead}
            options={leads}
            loading={loading}
            compact
            required
          />
        </div>

        {availableStaff.length > 0 && (
          <div>
            <span className="mb-1 block text-[11px] font-medium text-muted">
              Also on this outreach:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableStaff.map((name) => {
                const checked = otherStaff.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => onToggleStaff(name)}
                    className={[
                      "flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors",
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
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {stale ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[38px] rounded-lg border border-line bg-white text-xs font-medium text-ink"
          >
            Still right
          </button>
          <button
            type="button"
            onClick={onDone}
            className="min-h-[38px] rounded-lg bg-brand-primary text-xs font-semibold text-white"
          >
            Update
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onDone}
          className="min-h-[38px] w-full rounded-lg bg-brand-primary text-xs font-semibold text-white"
        >
          Done
        </button>
      )}
    </div>
  );
}

function SaferField({
  available,
  selected,
  loading,
  onToggle,
}: {
  available: string[];
  selected: string[];
  loading?: boolean;
  onToggle: (category: string) => void;
}) {
  if (loading) {
    return (
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-ink">
          SAFER Compliance
        </label>
        <div className="h-[38px] animate-pulse rounded-xl border border-line bg-field" />
      </div>
    );
  }

  if (available.length === 0) return null;

  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-ink">
        SAFER Compliance
      </label>
      <div className="flex flex-wrap gap-1.5">
        {available.map((cat) => {
          const on = selected.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(cat)}
              className={[
                "flex min-h-[36px] items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors",
                on
                  ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                  : "border-line bg-field text-muted hover:bg-white",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className={[
                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                  on
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-line bg-white",
                ].join(" ")}
              >
                {on && (
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
              <span>{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-xs font-medium text-ink"
      >
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
    </div>
  );
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="ml-0.5 text-red-500">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

function ChoiceButtons({
  options,
  value,
  onChange,
  columns,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  columns: number;
}) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? "" : opt)}
            className={[
              "min-h-[42px] rounded-xl border px-2 text-xs font-medium leading-tight transition-colors",
              selected
                ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                : "border-line bg-field text-muted hover:bg-white",
            ].join(" ")}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ButtonsSkeleton() {
  return (
    <div className="h-[42px] animate-pulse rounded-xl border border-line bg-field" />
  );
}

function ChoiceField({
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
  if (loading) return <ButtonsSkeleton />;
  const opts = options ?? [];
  if (opts.length === 0 || opts.length > MAX_BUTTONS) {
    return (
      <Select
        id={id}
        value={value}
        onChange={onChange}
        options={opts}
        loading={loading}
      />
    );
  }
  return (
    <ChoiceButtons
      options={opts}
      value={value}
      onChange={onChange}
      columns={Math.min(opts.length, 3)}
    />
  );
}

const METHOD_ICONS: Record<string, LucideIcon> = {
  Text: MessageSquare,
  "Phone Call": Phone,
  "In-Person": Users,
  "Virtual Meeting": Video,
  Email: AtSign,
  Mailers: Mailbox,
};

function MethodPicker({
  value,
  onChange,
  all,
  quick,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string[];
  quick: string[];
  loading?: boolean;
}) {
  const [showOtherSelect, setShowOtherSelect] = useState(false);

  if (loading) return <ButtonsSkeleton />;
  if (all.length === 0) {
    return (
      <Select id="method" value={value} onChange={onChange} options={all} />
    );
  }

  const quickButtons = all.filter((m) => quick.includes(m));
  const effectiveQuick =
    quickButtons.length > 0 ? quickButtons : all.slice(0, 6);

  const leftover = all.filter((m) => !effectiveQuick.includes(m));
  const valueIsOther = !!value && !effectiveQuick.includes(value);
  const shouldShowOtherButton =
    effectiveQuick.length < 6 || leftover.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {effectiveQuick.map((method) => {
          const Icon = METHOD_ICONS[method] || HelpCircle;
          const selected = value === method;

          return (
            <button
              key={method}
              type="button"
              title={method}
              aria-label={method}
              aria-pressed={selected}
              onClick={() => {
                onChange(selected ? "" : method);
                setShowOtherSelect(false);
              }}
              className={[
                "flex min-h-[40px] items-center justify-center rounded-xl border p-1.5 transition-colors",
                selected
                  ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                  : "border-line bg-field text-muted hover:bg-white",
              ].join(" ")}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            </button>
          );
        })}

        {shouldShowOtherButton && (
          <button
            type="button"
            title="Other method"
            aria-label="Other method"
            aria-pressed={valueIsOther || showOtherSelect}
            onClick={() => setShowOtherSelect((prev) => !prev)}
            className={[
              "flex min-h-[40px] items-center justify-center rounded-xl border p-1.5 transition-colors",
              valueIsOther || showOtherSelect
                ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                : "border-line bg-field text-muted hover:bg-white",
            ].join(" ")}
          >
            <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        )}
      </div>

      {(showOtherSelect || valueIsOther) &&
        (leftover.length > 0 || effectiveQuick.length < all.length) && (
          <select
            id="method"
            aria-label="Other method"
            value={valueIsOther ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className={[
              "min-h-[38px] w-full appearance-none rounded-xl border px-3 text-xs transition-colors",
              valueIsOther
                ? "border-brand-primary bg-brand-primary/10 text-brand-secondary"
                : "border-line bg-field text-muted",
            ].join(" ")}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><path d='M4 6l4 4 4-4' stroke='%235b6478' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px center",
            }}
          >
            <option value="">Other method…</option>
            {(leftover.length > 0 ? leftover : all).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
  loading,
  compact,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  loading?: boolean;
  compact?: boolean;
  required?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={loading}
      required={required}
      aria-required={required || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={[
        "w-full appearance-none border disabled:opacity-60 text-ink",
        compact
          ? "min-h-[38px] rounded-lg border-line bg-white px-2.5 pr-8 text-xs"
          : "min-h-[42px] rounded-xl border-line bg-field px-3 text-xs",
      ].join(" ")}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><path d='M4 6l4 4 4-4' stroke='%235b6478' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      <option value="" disabled>
        {loading ? "Loading…" : "Select"}
      </option>
      {(options ?? []).map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
