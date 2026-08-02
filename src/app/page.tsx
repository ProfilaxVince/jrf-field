import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { t } from "@/lib/i18n/fr-BE";

/**
 * Coquille du Lot 0. Les deux portails sont des liens vers les routes
 * (admin) et (field) qui seront construites aux lots 1-4.
 */
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header
        className="flex items-center justify-center px-6 py-10"
        style={{ background: "var(--jrf-gradient)" }}
      >
        <Logo inverted />
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-10">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.12em] text-jrf-800">
          {t.app.tagline}
        </h1>

        <Link
          href="/admin"
          className="flex min-h-[72px] flex-col justify-center rounded-lg border border-border bg-card px-6 py-4 shadow-sm transition-colors hover:bg-secondary"
        >
          <span className="text-lg font-semibold text-jrf-800">{t.home.adminPortal}</span>
          <span className="text-muted-foreground">{t.home.adminPortalHint}</span>
        </Link>

        <Link
          href="/field"
          className="flex min-h-[72px] flex-col justify-center rounded-lg border border-border bg-card px-6 py-4 shadow-sm transition-colors hover:bg-secondary"
        >
          <span className="text-lg font-semibold text-jrf-800">{t.home.fieldPortal}</span>
          <span className="text-muted-foreground">{t.home.fieldPortalHint}</span>
        </Link>
      </section>
    </main>
  );
}
