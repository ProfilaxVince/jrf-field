"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/session";
import { t } from "@/lib/i18n/fr-BE";

export default function AdminHome() {
  const { nickname, logout } = useSession();

  return (
    <main className="min-h-dvh bg-background">
      <section className="border-b border-border bg-jrf-green-800/5 px-6 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="space-y-3 rounded-3xl border border-border bg-card px-6 py-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-jrf-green-800/80">Portail responsable</p>
            <h1 className="font-display text-3xl font-bold uppercase tracking-[0.14em] text-jrf-green-800">
              Vue semaine
            </h1>
            <p className="max-w-2xl text-base leading-7 text-neutral-700">
              {nickname ? `Bonjour ${nickname}. ` : ""}Planifiez les tournées, suivez les magasins en retard et gérez les urgences sans ouvrir Excel.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/stores">
              <Card className="h-full transition-colors hover:bg-secondary">
                <CardHeader>
                  <CardTitle>Magasins</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-neutral-700">
                    Ajouter, modifier ou importer les magasins du parc.
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/users">
              <Card className="h-full transition-colors hover:bg-secondary">
                <CardHeader>
                  <CardTitle>Équipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-neutral-700">
                    Générer les codes d&apos;accès des commerciaux.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card px-6 py-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-neutral-600">
              La planification des tournées arrive au prochain lot.
            </p>
            <Button variant="secondary" onClick={() => logout()}>
              {t.auth.signOut}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
