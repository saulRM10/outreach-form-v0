# Outreach Engagement Form

A mobile-first form that reads dropdown values from a Google Sheet and writes
submissions back as structured rows. Built with Next.js (App Router) and the
Google Sheets API, ready to deploy on Vercel.

Credentials live only in server-side environment variables — nothing Google-related
is ever shipped to the browser.

---

## What you need before deploying

1. A **Google Cloud project** with the Sheets API enabled.
2. A **service account** + its JSON key (gives you the email and private key).
3. The **target Google Sheet**, shared with the service account, with two tabs set up.
4. A **Vercel account** to host it (free tier is fine).

---

## Step 1 — Create the service account

1. Go to <https://console.cloud.google.com> and create (or pick) a project.
2. **APIs & Services → Library → Google Sheets API → Enable.**
3. **APIs & Services → Credentials → Create credentials → Service account.**
   Name it anything (e.g. `outreach-form`), then **Done**.
4. Open the service account → **Keys → Add key → Create new key → JSON.**
   A `.json` file downloads. From it you need:
   - `client_email`  →  `GOOGLE_CLIENT_EMAIL`
   - `private_key`   →  `GOOGLE_PRIVATE_KEY`

## Step 2 — Set up the spreadsheet

Create a Google Sheet with **two tabs named exactly**:

### Tab `Form_Submissions`
Put these headers in row 1, columns A–J (the app appends rows below them):

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Outreach Activity Name | Contact | Campaign Name | Outreach Lead | Outreach Method | Date of Outreach | Response | Notes (If any) | Follow-up Required? | Schedule date for Follow up |

### Tab `Form_Lists`
Row 1 holds headers; values start in row 2. Columns can be **different lengths** —
blanks are ignored.

| A (Contact Names) | B (Contact Addresses) | C (Campaigns) | D (Leads) | E (Methods) | F (Responses) |
|---|---|---|---|---|---|
| John Doe | 123 Main St | Spring Drive | Maria | Phone | Interested |
| Jane Smith | 456 Oak Ave | Fall Push | Sam | Email | No answer |

The Contact dropdown shows each row as `Name - Address` (e.g. `John Doe - 123 Main St`).

### Share the sheet with the service account
Click **Share**, paste the `client_email` from the JSON, give it **Editor**, send.
**If you skip this, the app can't read or write.**

Grab the **Sheet ID** from the URL — it's the long part between `/d/` and `/edit`:
`docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit` → `GOOGLE_SHEET_ID`.

## Step 3 — Run locally (optional)

```bash
npm install
cp .env.example .env.local   # then fill in the three values
npm run dev                  # http://localhost:3000
```

For `GOOGLE_PRIVATE_KEY` in `.env.local`, wrap it in double quotes and keep the
`\n` sequences from the JSON exactly as they are.

## Step 4 — Deploy to Vercel

1. Push this folder to a Git repo and **Import Project** in Vercel
   (or run `vercel` from the CLI).
2. In **Project → Settings → Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `GOOGLE_CLIENT_EMAIL` | the service account email |
   | `GOOGLE_PRIVATE_KEY` | the full private key, in double quotes, with `\n` intact |
   | `GOOGLE_SHEET_ID` | the sheet ID |

3. Deploy. Done.

---

## How it behaves

- **Dropdowns** are fetched fresh on every load (`force-dynamic`, no caching), so
  admin edits in `Form_Lists` show up right away.
- **Contact** is a type-to-filter picker (search by name or street) since it's the
  field used most.
- **Date of Outreach** defaults to today and has a one-tap **Today** button that
  skips the calendar.
- **Outreach Activity Name** is filled automatically from the outreach date.
- **Follow-up needed?** is a Yes/No control that saves as `TRUE` / `FALSE`. Pick
  **No** and the follow-up date field disappears and is written blank.
- **On success:** the form clears, the date stays on today, and a green toast confirms.
- **On error / dropped connection:** nothing you typed is wiped, and a red toast
  tells you what to do.

## Note on date formatting

Submissions use `valueInputOption: USER_ENTERED` (per spec), so Google Sheets may
interpret `MM/DD/YY` cells as real dates and reformat them by locale. If you need
the activity name kept as literal text, format columns A and F as **Plain text**
in the sheet (Format → Number → Plain text), or ask and I'll switch that column to
`RAW` input.

## Project layout

```
app/
  page.tsx              header + form
  layout.tsx            fonts, viewport (16px-safe, no auto-zoom)
  api/lists/route.ts    GET  — reads Form_Lists, builds Name - Address
  api/submit/route.ts   POST — appends a row to Form_Submissions
components/
  OutreachForm.tsx      state, validation, Today toggle, conditional follow-up
  ContactPicker.tsx     searchable contact combobox
  Toast.tsx             success / error notifications
lib/
  google.ts             service-account auth + Sheets client
  types.ts              shared types
```
