import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Magasins préchargés", value: "185" },
  { label: "Utilisateurs créés", value: "6" },
  { label: "Tiers et fréquences", value: "définis" },
];

export default function AdminHome() {
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
              Planifiez les tournées, suivez les magasins en retard et gérez les urgences sans ouvrir Excel.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border bg-secondary px-4 py-5"
                >
                  <p className="text-2xl font-semibold text-jrf-green-800">{item.value}</p>
                  <p className="mt-1 text-sm text-neutral-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>État du lot 1</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-neutral-700">
                  L&apos;application est disponible avec les données de base et la marque JRF. Le prochain lot ajoute la planification réelle et l&apos;agenda par commercial.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Prochaines étapes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm leading-7 text-neutral-700">
                  <li>1. Authentification admin et commerciaux</li>
                  <li>2. Crud magasins et import CSV</li>
                  <li>3. Vue semaine et affectations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card px-6 py-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-neutral-600">
              Aucun écran vide : l&apos;application démarre avec les 185 magasins et les 6 utilisateurs du portefeuille.
            </p>
            <Button asChild>
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
