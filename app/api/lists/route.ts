import { NextResponse } from "next/server";
import { getSheetsClient, getSheetId, SHEETS } from "@/lib/google";
import type { Contact, ListData } from "@/lib/types";

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
      `${SHEETS.lists}!A2:A`, // Contact ID
      `${SHEETS.lists}!B2:B`, // Contact Names
      `${SHEETS.lists}!C2:C`, // Contact Addresses
      `${SHEETS.lists}!D2:D`, // Campaigns
      `${SHEETS.lists}!E2:E`, // Leads
      `${SHEETS.lists}!F2:F`, // Methods
      `${SHEETS.lists}!G2:G`, // Responses
      `${SHEETS.lists}!H2:H`, // SAFER Compliance categories
      `${SHEETS.lists}!I2:I`, // Other staff (preset names)
    ];

    const { data } = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });

    const vr = data.valueRanges ?? [];
    const ids = vr[0]?.values ?? []; // column A — Contact ID
    const names = vr[1]?.values ?? []; // column B — Contact Names
    const addresses = vr[2]?.values ?? []; // column C — Contact Addresses

    // Concatenate "Name - Address" row by row. Address may be missing for some.
    const contacts: Contact[] = [];
    const seenContacts = new Set<string>();
    for (let i = 0; i < names.length; i++) {
      const name = (names[i]?.[0] ?? "").trim();
      if (!name) continue;
      const id = (ids[i]?.[0] ?? "").trim();
      const address = (addresses[i]?.[0] ?? "").trim();
      const label = address ? `${name} - ${address}` : name;
      if (!seenContacts.has(label)) {
        seenContacts.add(label);
        contacts.push({ id, name, address, label });
      }
    }

    const payload: ListData = {
      contacts,
      campaigns: clean(vr[3]?.values),
      leads: clean(vr[4]?.values),
      methods: clean(vr[5]?.values),
      responses: clean(vr[6]?.values),
      saferCategories: clean(vr[7]?.values),
      staff: clean(vr[8]?.values),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/api/lists]", err);
    return NextResponse.json(
      { error: "Could not load dropdown values from the sheet." },
      { status: 500 },
    );
  }
}
