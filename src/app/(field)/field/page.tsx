import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FieldHome() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="px-6 py-8">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="space-y-3 rounded-3xl border border-border bg-card px-6 py-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-jrf-green-800/80">Portail commercial</p>
            <h1 className="font-display text-3xl font-bold uppercase tracking-[0.14em] text-jrf-green-800">
              Ma tournée du jour
            </h1>
            <p className="text-base leading-7 text-neutral-700">
              Ta tournée s&apos;affichera ici dès qu&apos;elle sera planifiée. Tu pourras ensuite ouvrir la visite, naviguer et saisir ton compte rendu rapidement.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Pas encore de tournée planifiée</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-neutral-700">
                Ce portail est prêt pour les visites terrain. Le responsable commercial peut maintenant planifier une semaine et tes arrêts apparaîtront ici.
              </p>
            </CardContent>
          </Card>
          <Button asChild>
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
