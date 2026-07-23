"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact, ListData, SubmissionPayload } from "@/lib/types";
import { loadDefaults, saveDefaults, type Defaults } from "@/lib/defaults";
import ContactPicker from "./ContactPicker";
import Toast, { type ToastKind } from "./Toast";

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

/**
 * Staleness is measured in calendar days
 */
function isStaleDay(iso: string | undefined): boolean {
  if (!iso) return false;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return false;
  return then.toDateString() !== new Date().toDateString();
}

const FOLLOWUP_OPTIONS = ["No", "Yes"] as const;

const MAX_BUTTONS = 4;

// The Salesforce object has no goal field of its own, so the outreach goal is
// prefixed onto the note that gets written there.
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
  };
}

const EMPTY_DEFAULTS: Defaults = {
  outreachGoal: "",
  campaignName: "",
  outreachLead: "",
  methodButtons: [],
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
  const [stripOpen, setStripOpen] = useState(false);
  const [stale, setStale] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [toast, setToast] = useState<{
    kind: ToastKind;
    message: string;
  } | null>(null);
  // Remember defaults so a reset after submit keeps them applied.
  const defaultsRef = useRef<Defaults>(EMPTY_DEFAULTS);

  // Apply per-device defaults once on mount (localStorage is client-only).
  useEffect(() => {
    const d = loadDefaults();
    defaultsRef.current = d;
    setMethodButtons(d.methodButtons);
    setForm((f) => ({
      ...f,
      outreachGoal: d.outreachGoal || f.outreachGoal,
      campaignName: d.campaignName || f.campaignName,
      outreachLead: d.outreachLead || f.outreachLead,
    }));
    // Nothing set yet: open the strip so the first entry can't be filed blind.
    if (!d.outreachGoal && !d.campaignName && !d.outreachLead)
      setStripOpen(true);
  }, []);

  /**
   * No polling. The check is event-driven, so nothing runs while the form sits
   * idle in a pocket all day. Mounting alone isn't enough: field staff open the
   * form Monday morning and never close the tab, so the component may not
   * remount for days. `visibilitychange` catches app-switching and screen wake;
   * `pageshow` catches iOS Safari restoring from bfcache, where
   * `visibilitychange` sometimes doesn't fire.
   */
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

  /** Strip edits are session-level, so they write through to device defaults. */
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
      // The input only exists while the strip is expanded, so wait a frame.
      requestAnimationFrame(() =>
        document.getElementById("outreach-goal")?.focus(),
      );
      return;
    }
    setGoalError(false);

    const payload: SubmissionPayload = {
      contactName: form.contact?.name ?? "",
      streetAddress: form.contact?.address ?? "",
      campaignName: form.campaignName,
      outreachLead: form.outreachLead,
      outreachMethod: form.outreachMethod,
      dateOfOutreach: form.dateOfOutreach,
      response: form.response,
      notes: composeNotes(form.outreachGoal, form.notes),
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
      // Reset, but keep today's date and the session context for fast repeat
      // entries. defaultsRef holds goal/campaign/lead, kept current by the strip.
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
        className="rounded-2xl border border-line bg-white p-4 shadow-sm shadow-ink/5 sm:p-5"
      >
        {listError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <span>Couldn’t load the dropdowns from the sheet.</span>
            <button
              type="button"
              onClick={loadLists}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Session context — goal, campaign and lead all stay fixed for a
            whole session and describe the outing, not the contact. Grouping
            them keeps everything below this strip about one person. */}
        <SessionStrip
          open={stripOpen}
          stale={stale}
          goal={form.outreachGoal}
          campaign={form.campaignName}
          lead={form.outreachLead}
          goalError={goalError}
          campaigns={lists?.campaigns}
          leads={lists?.leads}
          loading={loading}
          onToggle={() => setStripOpen((o) => !o)}
          onGoal={(v) => {
            set("outreachGoal", v);
            if (goalError) setGoalError(false);
          }}
          onCampaign={(v) => set("campaignName", v)}
          onLead={(v) => set("outreachLead", v)}
          onDone={() => {
            persistContext({
              outreachGoal: form.outreachGoal,
              campaignName: form.campaignName,
              outreachLead: form.outreachLead,
            });
            setStripOpen(false);
          }}
          onConfirm={() => {
            persistContext({}, true);
            setStripOpen(false);
          }}
        />

        {/* Contact — the most-used field, given the most room */}
        <Field label="Contact" htmlFor="contact" required>
          <ContactPicker
            options={lists?.contacts ?? []}
            value={form.contact}
            onChange={(v) => set("contact", v)}
            loading={loading}
          />
        </Field>

        {/* Method — quick-tap buttons (configurable in Settings), with an
            "Other" dropdown for any method that isn't a quick button. */}
        <Field label="Method" htmlFor="method" required>
          <MethodPicker
            value={form.outreachMethod}
            onChange={(v) => set("outreachMethod", v)}
            all={lists?.methods ?? []}
            quick={methodButtons}
            loading={loading}
          />
        </Field>

        {/* Response — one-tap buttons (3 options fit inline). */}
        <Field label="Response" htmlFor="response" required>
          <ChoiceField
            id="response"
            value={form.response}
            onChange={(v) => set("response", v)}
            options={lists?.responses}
            loading={loading}
          />
        </Field>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="date"
              className="mb-1.5 block text-sm font-medium text-ink"
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
                className="min-h-[48px] w-full rounded-xl border border-line bg-field px-3 text-ink"
              />
            ) : (
              <button
                id="date"
                type="button"
                onClick={() => setDateOpen(true)}
                className="min-h-[48px] w-full rounded-xl bg-brand-accent px-3 font-medium text-white"
              >
                Today
              </button>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Follow-up
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FOLLOWUP_OPTIONS.map((opt) => {
                const selected = form.followUp === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => set("followUp", opt)}
                    className={[
                      "min-h-[48px] rounded-xl border font-medium transition-colors",
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
            className="w-full resize-y rounded-xl border border-line bg-field px-3.5 py-3 text-ink placeholder:text-muted/70"
          />
        </Field>

        {/* Only shown when follow-up is Yes; hidden field submits blank otherwise */}
        {form.followUp === "Yes" && (
          <Field label="Follow-up date" htmlFor="followup-date">
            <input
              id="followup-date"
              type="date"
              value={mmddyyToISO(form.followUpDate)}
              onChange={(e) => set("followUpDate", isoToMMDDYY(e.target.value))}
              className="min-h-[48px] w-full rounded-xl border border-line bg-field px-3.5 text-ink"
            />
          </Field>
        )}

        {/* Pinned so a repeat entry never needs a scroll to the end. The
            negative margins let it span the card's padding; the safe-area
            padding keeps it clear of the iPhone home indicator. */}
        <div
          className="sticky bottom-0 -mx-4 -mb-4 border-t border-line bg-white/95 px-4 pt-3 backdrop-blur sm:-mx-5 sm:-mb-5 sm:px-5"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="submit"
            disabled={submitting || loading}
            className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand-primary text-[17px] font-semibold text-white transition-opacity disabled:opacity-60"
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

// --- small presentational helpers ---

/**
 * Collapsed, this shows the session context without letting it be edited by a
 * stray tap. A wrong goal is only an imprecise audit note, but a wrong campaign
 * misfiles the record in Salesforce and someone has to unpick it later — which
 * is why the stale state offers a deliberate choice rather than a dismissal.
 */
function SessionStrip({
  open,
  stale,
  goal,
  campaign,
  lead,
  goalError,
  campaigns,
  leads,
  loading,
  onToggle,
  onGoal,
  onCampaign,
  onLead,
  onDone,
  onConfirm,
}: {
  open: boolean;
  stale: boolean;
  goal: string;
  campaign: string;
  lead: string;
  goalError: boolean;
  campaigns?: string[];
  leads?: string[];
  loading?: boolean;
  onToggle: () => void;
  onGoal: (v: string) => void;
  onCampaign: (v: string) => void;
  onLead: (v: string) => void;
  onDone: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl bg-brand-primary/10 px-3.5 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm text-brand-secondary">
            {goal || "No outreach goal set"}
          </span>
          <span className="mt-0.5 block truncate text-xs text-brand-secondary/75">
            {[campaign, lead].filter(Boolean).join(" · ") || "No campaign set"}
          </span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="shrink-0 text-brand-secondary"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      className={[
        "mb-4 rounded-xl px-3.5 py-3",
        stale ? "border border-amber-300 bg-amber-50" : "bg-brand-primary/10",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={[
            "text-xs font-medium",
            stale ? "text-amber-700" : "text-brand-secondary",
          ].join(" ")}
        >
          {stale ? "Last set on an earlier day" : "This session"}
        </span>
        {!stale && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded
            aria-label="Collapse session context"
            className="text-brand-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4 10l4-4 4 4"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <label
        htmlFor="outreach-goal"
        className="mb-1 block text-xs font-medium text-ink"
      >
        Outreach goal
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
          "min-h-[44px] w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-muted/70",
          goalError ? "border-red-400" : "border-line",
        ].join(" ")}
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
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
        <div>
          <label
            htmlFor="lead"
            className="mb-1 block text-xs font-medium text-ink"
          >
            Lead
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
      </div>

      {stale ? (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] rounded-lg border border-line bg-white text-sm font-medium text-ink"
          >
            Still right
          </button>
          <button
            type="button"
            onClick={onDone}
            className="min-h-[44px] rounded-lg bg-brand-primary text-sm font-semibold text-white"
          >
            Update
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onDone}
          className="mt-2.5 min-h-[44px] w-full rounded-lg bg-brand-primary text-sm font-semibold text-white"
        >
          Done
        </button>
      )}
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
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-ink"
      >
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
    </div>
  );
}

/**
 * The asterisk is decorative
 */
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

/**
 * A row of one-tap option buttons. Tapping a selected button clears it, so a
 * mis-tap is easy to undo in the field.
 */
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
      className="grid gap-2"
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
              "min-h-[48px] rounded-xl border px-2 text-sm font-medium leading-tight transition-colors",
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
    <div className="h-[48px] animate-pulse rounded-xl border border-line bg-field" />
  );
}

/**
 * Renders options as buttons when there are few (<= MAX_BUTTONS), otherwise
 * falls back to the native dropdown. Used for Response.
 */
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

/**
 * Method picker. Shows the user's configured "quick" methods as buttons; any
 * remaining methods stay reachable through an "Other" dropdown so nothing is
 * lost. With no configuration, behaves like ChoiceField (buttons when few,
 * dropdown when many).
 */
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
  if (loading) return <ButtonsSkeleton />;
  if (all.length === 0) {
    return (
      <Select id="method" value={value} onChange={onChange} options={all} />
    );
  }

  // Quick buttons, kept in the sheet's order and limited to methods that exist.
  const quickButtons = all.filter((m) => quick.includes(m));

  // No quick config: fall back to the generic few-buttons-or-dropdown rule.
  if (quickButtons.length === 0) {
    if (all.length > MAX_BUTTONS) {
      return (
        <Select id="method" value={value} onChange={onChange} options={all} />
      );
    }
    return (
      <ChoiceButtons
        options={all}
        value={value}
        onChange={onChange}
        columns={Math.min(all.length, 2)}
      />
    );
  }

  const leftover = all.filter((m) => !quickButtons.includes(m));
  const valueIsOther = !!value && !quickButtons.includes(value);

  return (
    <div className="space-y-2">
      <ChoiceButtons
        options={quickButtons}
        value={value}
        onChange={onChange}
        columns={Math.min(quickButtons.length, 2)}
      />
      {leftover.length > 0 && (
        <select
          id="method"
          aria-label="Other method"
          value={valueIsOther ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={[
            "min-h-[44px] w-full appearance-none rounded-xl border px-3.5 text-sm",
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
          {leftover.map((o) => (
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
        "w-full appearance-none border disabled:opacity-60",
        compact
          ? "min-h-[44px] rounded-lg border-line bg-white px-3 pr-8 text-sm text-ink"
          : "min-h-[48px] rounded-xl border-line bg-field px-3.5 text-ink",
      ].join(" ")}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><path d='M4 6l4 4 4-4' stroke='%235b6478' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
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
