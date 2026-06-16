import OutreachForm from "@/components/OutreachForm";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-16 pt-6 sm:pt-10">
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-7 w-1.5 rounded-full bg-brand-primary" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Log outreach
          </h1>
        </div>
        <p className="mt-1.5 pl-4 text-sm text-muted">
          One contact, one entry. Saves straight to the team sheet.
        </p>
      </header>
      <OutreachForm />
    </main>
  );
}
