import { NextResponse } from "next/server";
import { getSheetsClient, getSheetId, SHEETS } from "@/lib/google";
import type { ListData } from "@/lib/types";

// Always fetch fresh so admin edits in the sheet show up quickly (no SSG).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Strip blanks/whitespace and de-dupe while keeping sheet order.
function clean(column: any[][] | null | undefined): string[] {
  const flat = (column ?? []).map((row) => (row?.[0] ?? "").trim());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of flat) {
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

export async function GET() {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = getSheetId();

    // Independent column ranges => columns of different lengths are fine.
    const ranges = [
      `${SHEETS.lists}!A2:A`, // Contact Names
      `${SHEETS.lists}!B2:B`, // Contact Addresses
      `${SHEETS.lists}!C2:C`, // Campaigns
      `${SHEETS.lists}!D2:D`, // Leads
      `${SHEETS.lists}!E2:E`, // Methods
      `${SHEETS.lists}!F2:F`, // Responses
    ];

    const { data } = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });

    const vr = data.valueRanges ?? [];
    const names = vr[0]?.values ?? [];
    const addresses = vr[1]?.values ?? [];

    // Concatenate "Name - Address" row by row. Address may be missing for some.
    const contacts: string[] = [];
    const seenContacts = new Set<string>();
    for (let i = 0; i < names.length; i++) {
      const name = (names[i]?.[0] ?? "").trim();
      if (!name) continue;
      const address = (addresses[i]?.[0] ?? "").trim();
      const label = address ? `${name} - ${address}` : name;
      if (!seenContacts.has(label)) {
        seenContacts.add(label);
        contacts.push(label);
      }
    }

    const payload: ListData = {
      contacts,
      campaigns: clean(vr[2]?.values),
      leads: clean(vr[3]?.values),
      methods: clean(vr[4]?.values),
      responses: clean(vr[5]?.values),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/api/lists]", err);
    return NextResponse.json(
      { error: "Could not load dropdown values from the sheet." },
      { status: 500 }
    );
  }
}
