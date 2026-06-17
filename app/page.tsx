import Link from "next/link";
import OutreachForm from "@/components/OutreachForm";
import { Settings } from "lucide-react";

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
          <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </header>
      <OutreachForm />
    </main>
  );
}
