"use client";

import { useCallback, useEffect, useState } from "react";
import type { ListData, SubmissionPayload } from "@/lib/types";
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
// native <input type=date> uses YYYY-MM-DD; convert both ways.
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

interface FormState {
  contact: string;
  campaignName: string;
  outreachLead: string;
  outreachMethod: string;
  dateOfOutreach: string; // MM/DD/YY
  response: string;
  notes: string;
  followUp: (typeof FOLLOWUP_OPTIONS)[number];
  followUpDate: string; // MM/DD/YY
}

function blankState(): FormState {
  return {
    contact: "",
    campaignName: "",
    outreachLead: "",
    outreachMethod: "",
    dateOfOutreach: todayMMDDYY(),
    response: "",
    notes: "",
    followUp: "No",
    followUpDate: "",
  };
}

export default function OutreachForm() {
  const [lists, setLists] = useState<ListData | null>(null);
  const [listError, setListError] = useState(false);
  const [form, setForm] = useState<FormState>(blankState);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null
  );

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

    const payload: SubmissionPayload = {
      contact: form.contact,
      campaignName: form.campaignName,
      outreachLead: form.outreachLead,
      outreachMethod: form.outreachMethod,
      dateOfOutreach: form.dateOfOutreach,
      response: form.response,
      notes: form.notes,
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
        // Keep everything the user typed; just report the problem.
        setToast({ kind: "error", message: data.error || "Could not save. Try again." });
        return;
      }
      // Reset, but keep the date defaulting to today for fast repeat entries.
      setForm(blankState());
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
          <Field label="Method" htmlFor="method">
            <Select
              id="method"
              value={form.outreachMethod}
              onChange={(v) => set("outreachMethod", v)}
              options={lists?.methods}
              loading={loading}
            />
          </Field>
          <Field label="Response" htmlFor="response">
            <Select
              id="response"
              value={form.response}
              onChange={(v) => set("response", v)}
              options={lists?.responses}
              loading={loading}
            />
          </Field>
        </div>

        {/* Date of outreach with Today quick-action */}
        <Field label="Date of outreach" htmlFor="date">
          <div className="flex gap-2">
            <input
              id="date"
              type="date"
              value={mmddyyToISO(form.dateOfOutreach)}
              onChange={(e) => set("dateOfOutreach", isoToMMDDYY(e.target.value))}
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
        {optional && <span className="ml-1 font-normal text-muted">· optional</span>}
      </label>
      {children}
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
