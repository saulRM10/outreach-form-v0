import { google } from "googleapis";

/**
 * Builds an authenticated Google Sheets v4 client using a service account.
 * Credentials live only in server-side env vars — never in the client bundle.
 */
export function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !rawKey) {
    throw new Error(
      "Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY environment variables."
    );
  }

  // Vercel stores the key with literal "\n" sequences; restore real newlines.
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEET_ID environment variable.");
  return id;
}

export const SHEETS = {
  submissions: "Form_Submissions",
  lists: "Form_Lists",
} as const;
