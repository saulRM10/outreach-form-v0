"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact, ListData, SubmissionPayload } from "@/lib/types";
import { loadDefaults, type Defaults } from "@/lib/defaults";
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
  campaignName: "",
  outreachLead: "",
  methodButtons: [],
  outreachGoal: "",
};

export default function OutreachForm() {
  const [lists, setLists] = useState<ListData | null>(null);
  const [listError, setListError] = useState(false);
  const [form, setForm] = useState<FormState>(() => blankState(EMPTY_DEFAULTS));
  const [methodButtons, setMethodButtons] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [goalError, setGoalError] = useState(false);
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
  }, []);

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
      setToast({
        kind: "error",
        message: "Add the goal of the outreach before saving.",
      });
      document.getElementById("outreach-goal")?.focus();
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
      // Reset, but keep defaults + today's date for fast repeat entries.
      const carriedGoal = form.outreachGoal;
      setForm({
        ...blankState(defaultsRef.current),
        outreachGoal: carriedGoal,
      });
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

        {/* Outreach goal — lands in the Salesforce note. Can be pre-set in
            Settings before heading out, and survives each save so repeat
            entries at the same event stay one-tap fast. */}
        <Field label="Outreach goal" htmlFor="outreach-goal">
          <input
            id="outreach-goal"
            type="text"
            value={form.outreachGoal}
            maxLength={GOAL_MAX}
            onChange={(e) => {
              set("outreachGoal", e.target.value);
              if (goalError) setGoalError(false);
            }}
            placeholder="Drop off flyer for community Plática, July 25"
            className={[
              "min-h-[48px] w-full rounded-xl border bg-field px-3.5 text-ink placeholder:text-muted/70",
              goalError ? "border-red-400" : "border-line",
            ].join(" ")}
          />
          <p className="mt-1.5 text-xs text-muted">
            Why you reached out. Saved to the note on every entry — set it once
            in Settings and it stays filled in.
          </p>
        </Field>

        {/* Contact — the most-used field, given the most room */}
        <Field label="Contact" htmlFor="contact">
          <ContactPicker
            options={lists?.contacts ?? []}
            value={form.contact}
            onChange={(v) => set("contact", v)}
            loading={loading}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Campaign" htmlFor="campaign">
            <Select
              id="campaign"
              value={form.campaignName}
              onChange={(v) => set("campaignName", v)}
              options={lists?.campaigns}
              loading={loading}
            />
          </Field>
          <Field label="Outreach lead" htmlFor="lead">
            <Select
              id="lead"
              value={form.outreachLead}
              onChange={(v) => set("outreachLead", v)}
              options={lists?.leads}
              loading={loading}
            />
          </Field>
        </div>

        {/* Method — quick-tap buttons (configurable in Settings), with an
            "Other" dropdown for any method that isn't a quick button. */}
        <Field label="Method" htmlFor="method">
          <MethodPicker
            value={form.outreachMethod}
            onChange={(v) => set("outreachMethod", v)}
            all={lists?.methods ?? []}
            quick={methodButtons}
            loading={loading}
          />
        </Field>

        {/* Response — one-tap buttons (3 options fit inline). */}
        <Field label="Response" htmlFor="response">
          <ChoiceField
            id="response"
            value={form.response}
            onChange={(v) => set("response", v)}
            options={lists?.responses}
            loading={loading}
          />
        </Field>

        {/* Date of outreach with Today quick-action */}
        <Field label="Date of outreach" htmlFor="date">
          <div className="flex gap-2">
            <input
              id="date"
              type="date"
              value={mmddyyToISO(form.dateOfOutreach)}
              onChange={(e) =>
                set("dateOfOutreach", isoToMMDDYY(e.target.value))
              }
              className="min-h-[48px] flex-1 rounded-xl border border-line bg-field px-3.5 text-ink"
            />
            <button
              type="button"
              aria-pressed={isToday}
              onClick={() => set("dateOfOutreach", todayMMDDYY())}
              className={[
                "min-h-[48px] shrink-0 rounded-xl px-4 font-medium transition-colors",
                isToday
                  ? "bg-brand-accent text-white"
                  : "border border-line bg-white text-brand-secondary hover:bg-field",
              ].join(" ")}
            >
              Today
            </button>
          </div>
        </Field>

        {/* Notes */}
        <Field label="Notes" htmlFor="notes" optional>
          <textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything worth remembering"
            className="w-full resize-y rounded-xl border border-line bg-field px-3.5 py-3 text-ink placeholder:text-muted/70"
          />
        </Field>

        {/* Follow-up (Yes/No -> TRUE/FALSE) */}
        <Field label="Follow-up needed?" htmlFor="followup">
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

        <button
          type="submit"
          disabled={submitting || loading}
          className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand-primary text-[17px] font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save entry"}
        </button>
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

function Field({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-ink"
      >
        {label}
        {optional && (
          <span className="ml-1 font-normal text-muted">· optional</span>
        )}
      </label>
      {children}
    </div>
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
