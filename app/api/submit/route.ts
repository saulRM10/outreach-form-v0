import { NextResponse } from "next/server";
import { getSheetsClient, getSheetId, SHEETS } from "@/lib/google";
import type { SubmissionPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: SubmissionPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  // Minimal server-side guards on the required selections.
  const required: Array<[keyof SubmissionPayload, string]> = [
    ["contactName", "Contact"],
    ["campaignName", "Campaign Name"],
    ["outreachLead", "Outreach Lead"],
    ["outreachMethod", "Outreach Method"],
    ["dateOfOutreach", "Date of Outreach"],
    ["response", "Response"],
  ];
  const missing = required.filter(([k]) => !String(body[k] ?? "").trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing: ${missing.map(([, label]) => label).join(", ")}.` },
      { status: 400 },
    );
  }

  // Outreach Activity Name is automated from the outreach date (MM/DD/YY).
  const activityName = body.dateOfOutreach;

  // Boolean follow-up -> TRUE / FALSE. No follow-up => blank schedule cell.
  const followUp = body.followUpRequired ? "TRUE" : "FALSE";
  const followUpDate = body.followUpRequired ? body.followUpDate || "" : "";

  // Column order must match Form_Submissions schema (1..10).
  const row = [
    activityName, // A  Outreach Activity Name
    body.contactName, // B  Contact (name only)
    body.campaignName, // C  Campaign Name
    body.outreachLead, // D  Outreach Lead
    body.outreachMethod, // E  Outreach Method
    body.dateOfOutreach, // F  Date of Outreach
    body.response, // G  Response
    body.notes ?? "", // H  Notes (If any)
    followUp, // I  Follow-up Required?
    followUpDate, // J  Schedule date for Follow up
    body.streetAddress ?? "", // K  Street Address
  ];

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = getSheetId();

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEETS.submissions}!A:K`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/submit]", err);
    return NextResponse.json(
      {
        error:
          "Could not save to the sheet. Your entry was not lost — try again.",
      },
      { status: 502 },
    );
  }
}
