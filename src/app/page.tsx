"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/lib/session";
import { t } from "@/lib/i18n/fr-BE";

/**
 * Pas de menu de choix : on n'ouvre pas une application en demandant à
 * l'utilisateur qui il est. La session le sait — l'écran d'accueil n'est
 * qu'un temps de chargement de marque, et sert aussi de coquille hors ligne.
 */
export default function Home() {
  const { authenticated, isAdmin, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!authenticated) router.replace("/auth");
    else router.replace(isAdmin ? "/admin" : "/field");
  }, [authenticated, isAdmin, loading, router]);

  return (
    <main className="flex min-h-dvh flex-col">
      <header
        className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10"
        style={{ background: "var(--jrf-gradient)" }}
      >
        <Logo inverted />
        <p className="text-base text-[color:var(--jrf-white)]">{t.app.tagline}</p>
      </header>
    </main>
  );
}
