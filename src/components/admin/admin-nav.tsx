"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  LogOut,
  Menu,
  Route,
  Settings,
  Siren,
  Store,
  Camera,
  Target,
  X,
} from "lucide-react";
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
  { href: "/comptes-rendus", label: t.nav.reports, icone: Camera },
  { href: "/stats", label: t.nav.stats, icone: BarChart3 },
  { href: "/settings", label: t.nav.settings, icone: Settings },
];

/**
 * Navigation en colonne à gauche, repliable.
 *
 * Elle était horizontale : sur téléphone, sept entrées finissaient en
 * défilement latéral, le geste le moins fiable au pouce. En colonne, chaque
 * entrée fait toute la largeur et se touche sans viser.
 *
 * Sur grand écran la colonne reste ouverte en permanence ; sur téléphone elle
 * se referme d'elle-même dès qu'on a choisi, pour rendre l'écran au contenu.
 */
export function AdminNav() {
  const pathname = usePathname();
  const { nickname, logout } = useSession();
  const [ouvert, setOuvert] = useState(false);

  // Changer de page referme le tiroir : le laisser ouvert masquerait
  // justement l'écran qu'on vient de demander.
  useEffect(() => {
    setOuvert(false);
  }, [pathname]);

  return (
    <>
      {/* Barre supérieure — téléphone uniquement */}
      <header data-chrome="nav" className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-3 py-2 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label={ouvert ? t.nav.closeMenu : t.nav.openMenu}
          aria-expanded={ouvert}
          onClick={() => setOuvert((v) => !v)}
        >
          <Menu aria-hidden />
        </Button>
        <Link href="/admin" className="flex-1">
          <Logo compact />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.auth.signOut}
          onClick={() => logout()}
        >
          <LogOut aria-hidden />
        </Button>
      </header>

      {/* Voile derrière le tiroir ouvert */}
      {ouvert && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOuvert(false)}
          className="fixed inset-0 z-30 bg-neutral-950/40 md:hidden"
        />
      )}

      <nav
        data-chrome="nav"
        aria-label={t.nav.home}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-card px-3 py-3 transition-transform md:sticky md:top-0 md:h-dvh md:translate-x-0 ${
          ouvert ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <Link href="/admin" aria-label={t.app.name}>
            <Logo compact />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.nav.closeMenu}
            onClick={() => setOuvert(false)}
            className="md:hidden"
          >
            <X aria-hidden />
          </Button>
        </div>

        {LIENS.map(({ href, label, icone: Icone }) => {
          const actif = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={actif ? "page" : undefined}
              className={`flex min-h-[48px] items-center gap-3 rounded-md px-3 text-base ${
                actif
                  ? "bg-secondary font-semibold text-jrf-800"
                  : "text-neutral-700 hover:bg-secondary"
              }`}
            >
              <Icone aria-hidden className="size-5 shrink-0" />
              {label}
            </Link>
          );
        })}

        <div className="mt-auto border-t border-border pt-2">
          <Button
            variant="ghost"
            className="w-full justify-start px-3"
            onClick={() => logout()}
          >
            <LogOut aria-hidden />
            {nickname ? `${t.auth.signOut} (${nickname})` : t.auth.signOut}
          </Button>
        </div>
      </nav>
    </>
  );
}
