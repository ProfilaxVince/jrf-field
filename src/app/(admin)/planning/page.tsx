"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UndoBar } from "@/components/ui/undo-bar";
import { SemaineGrille } from "@/components/planning/semaine-grille";
import { usePlanningSemaine } from "@/hooks/use-planning-semaine";
import { addDays, dimancheDeLaSemaine, formatDate, lundiDeLaSemaine, numeroSemaineISO } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";
import type { VisitRow } from "@/lib/data/planning";

export default function PlanningPage() {
  const [reference, setReference] = useState(() => new Date());
  const [retiree, setRetiree] = useState<VisitRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const planning = usePlanningSemaine(reference);

  const prioritesParStore = useMemo(
    () => new Map(planning.priorites.map((p) => [p.store.id, p])),
    [planning.priorites]
  );

  const lundi = lundiDeLaSemaine(reference);
  const dimanche = dimancheDeLaSemaine(reference);
  const aDesVisites = planning.visitesParCellule.size > 0;

  async function remplir() {
    setMessage(null);
    const ajoutees = await planning.remplirSemaine();
    setMessage(ajoutees > 0 ? t.planning.filled(ajoutees) : t.planning.nothingToFill);
  }

  async function retirer(visit: VisitRow) {
    setRetiree(visit);
    await planning.retirer(visit);
  }

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
              {t.planning.title}
            </h1>
            <p className="mt-1 text-base text-neutral-700">
              {t.planning.weekLabel(numeroSemaineISO(reference), formatDate(lundi), formatDate(dimanche))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={t.planning.previousWeek}
              onClick={() => setReference((d) => addDays(d, -7))}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <Button variant="outline" onClick={() => setReference(new Date())}>
              {t.planning.today}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t.planning.nextWeek}
              onClick={() => setReference((d) => addDays(d, 7))}
            >
              <ChevronRight aria-hidden />
            </Button>
            <Button size="lg" onClick={remplir} disabled={planning.enCours || planning.loading}>
              <Wand2 aria-hidden />
              {planning.enCours
                ? t.planning.filling
                : aDesVisites
                  ? t.planning.fillAgain
                  : t.planning.fill}
            </Button>
          </div>
        </div>

        {planning.erreur && (
          <p className="text-base text-state-critical">
            {t.planning.errors[planning.erreur] ?? t.planning.errors.chargement}
          </p>
        )}

        {message && <p className="text-base text-neutral-700">{message}</p>}

        {planning.dernierRemplissage && planning.dernierRemplissage.length > 0 && (
          <UndoBar
            message={t.planning.filled(planning.dernierRemplissage.length)}
            onUndo={() => {
              setMessage(null);
              planning.annulerRemplissage();
            }}
            onExpire={planning.oublierRemplissage}
          />
        )}

        {retiree && (
          <UndoBar
            message={t.planning.removed}
            onUndo={() => {
              planning.restaurer(retiree);
              setRetiree(null);
            }}
            onExpire={() => setRetiree(null)}
          />
        )}

        {planning.loading ? (
          <p className="text-base text-neutral-500">{t.common.loading}</p>
        ) : planning.erreur ? null /* l'erreur est déjà affichée plus haut ; ne pas
             la déguiser en « équipe vide », c'est ce qui a envoyé sur une fausse piste */ : planning.users.length === 0 ? (
          <p className="rounded-lg border border-border bg-card px-4 py-6 text-lg">
            {t.planning.noTeam}
          </p>
        ) : (
          <>
            <SemaineGrille
              users={planning.users}
              jours={planning.jours}
              visitesParCellule={planning.visitesParCellule}
              indisponibilites={planning.indisponibilites}
              prioritesParStore={prioritesParStore}
              onMonter={(v) => planning.deplacer(v, -1)}
              onDescendre={(v) => planning.deplacer(v, 1)}
              onRetirer={retirer}
            />
          </>
        )}
      </div>
    </main>
  );
}
