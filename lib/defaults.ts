"use client";

// Per-device defaults for the form, stored in localStorage.
export interface Defaults {
  campaignName: string;
  outreachLead: string;
}

const KEY = "outreach_defaults_v1";
const EMPTY: Defaults = { campaignName: "", outreachLead: "" };

export function loadDefaults(): Defaults {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw);
    return {
      campaignName: typeof p.campaignName === "string" ? p.campaignName : "",
      outreachLead: typeof p.outreachLead === "string" ? p.outreachLead : "",
    };
  } catch {
    return { ...EMPTY };
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