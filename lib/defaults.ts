"use client";

// Per-device defaults for the form, stored in localStorage.
export interface Defaults {
  campaignName: string;
  outreachLead: string;
  methodButtons: string[];
  outreachGoal: string;
  saferAvailable: string[]; // Outreach categories
  saferDefault: string[]; // Outreach categories
  setAt: string;
  confirmedAt: string;
}

const KEY = "outreach_defaults_v1";

export function loadDefaults(): Defaults {
  const fallback: Defaults = {
    outreachGoal: "",
    campaignName: "",
    outreachLead: "",
    methodButtons: [],
    saferAvailable: [],
    saferDefault: [],
    setAt: "",
    confirmedAt: "",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Defaults>;
    return {
      outreachGoal:
        typeof parsed.outreachGoal === "string" ? parsed.outreachGoal : "",
      campaignName:
        typeof parsed.campaignName === "string" ? parsed.campaignName : "",
      outreachLead:
        typeof parsed.outreachLead === "string" ? parsed.outreachLead : "",
      methodButtons: Array.isArray(parsed.methodButtons)
        ? parsed.methodButtons
        : [],
      saferAvailable: Array.isArray(parsed.saferAvailable)
        ? parsed.saferAvailable
        : [],
      saferDefault: Array.isArray(parsed.saferDefault)
        ? parsed.saferDefault
        : [],
      setAt: typeof parsed.setAt === "string" ? parsed.setAt : "",
      confirmedAt:
        typeof parsed.confirmedAt === "string" ? parsed.confirmedAt : "",
    };
  } catch {
    return fallback;
  }
}

export function saveDefaults(d: Defaults): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(d));
}

export function clearDefaults(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
