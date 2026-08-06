"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, LogOut, Route, Settings, Siren, Store, Target } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { t } from "@/lib/i18n/fr-BE";

const LIENS = [
  { href: "/admin", label: t.nav.priorities, icone: Target },
  { href: "/planning", label: t.nav.planning, icone: CalendarDays },
  { href: "/templates", label: t.nav.templates, icone: Route },
  { href: "/stores", label: t.nav.stores, icone: Store },
  { href: "/incidents", label: t.nav.incidents, icone: Siren },
  { href: "/stats", label: t.nav.stats, icone: BarChart3 },
  { href: "/settings", label: t.nav.settings, icone: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const { nickname, logout } = useSession();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-2">
        <Link href="/admin" className="shrink-0" aria-label={t.app.name}>
          <Logo compact />
        </Link>
        <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto" aria-label={t.nav.home}>
          {LIENS.map(({ href, label, icone: Icone }) => {
            const actif = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={actif ? "page" : undefined}
                className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-md px-3 text-base ${
                  actif
                    ? "bg-secondary font-semibold text-jrf-800"
                    : "text-neutral-700 hover:bg-secondary"
                }`}
              >
                <Icone aria-hidden className="size-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        {/* Déconnexion à portée de main : l'Admin doit pouvoir repasser sur un
            compte commercial pour vérifier ce que son équipe voit réellement. */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={`${t.auth.signOut}${nickname ? ` (${nickname})` : ""}`}
          title={`${t.auth.signOut}${nickname ? ` — ${nickname}` : ""}`}
          onClick={() => logout()}
        >
          <LogOut aria-hidden />
        </Button>
      </div>
    </header>
  );
}
