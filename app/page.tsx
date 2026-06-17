import Link from "next/link";
import OutreachForm from "@/components/OutreachForm";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-16 pt-6 sm:pt-10">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-7 w-1.5 rounded-full bg-brand-primary" />
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Log outreach
            </h1>
          </div>
          <p className="mt-1.5 pl-4 text-sm text-muted">
            One contact, one entry. Saves straight to the team sheet.
          </p>
        </div>
        <Link
          href="/settings"
          aria-label="Defaults"
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted hover:bg-field hover:text-brand-secondary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 13a3 3 0 100-6 3 3 0 000 6z"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
            />
            <path
              d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </header>
      <OutreachForm />
    </main>
  );
}
