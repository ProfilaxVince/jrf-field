"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UndoBar } from "@/components/ui/undo-bar";
import { AjoutArret } from "@/components/planning/ajout-arret";
import { SemaineGrille } from "@/components/planning/semaine-grille";
import { usePlanningSemaine } from "@/hooks/use-planning-semaine";
import { listTemplates, listTousLesStops, type TemplateRow } from "@/lib/data/templates";
import {
  addDays,
  dimancheDeLaSemaine,
  formatDate,
  formatJourLong,
  lundiDeLaSemaine,
  numeroSemaineISO,
} from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";
import type { VisitRow } from "@/lib/data/planning";

type Cellule = { userId: string; date: string };

export default function PlanningPage() {
  const [reference, setReference] = useState(() => new Date());
  const [retiree, setRetiree] = useState<VisitRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cellule, setCellule] = useState<Cellule | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [nbArrets, setNbArrets] = useState<Map<string, number>>(new Map());
  const planning = usePlanningSemaine(reference);

  useEffect(() => {
    let monte = true;
    (async () => {
      try {
        const [modeles, stops] = await Promise.all([listTemplates(), listTousLesStops()]);
        if (!monte) return;
        setTemplates(modeles);
        const compte = new Map<string, number>();
        for (const stop of stops) {
          compte.set(stop.template_id, (compte.get(stop.template_id) ?? 0) + 1);
        }
        setNbArrets(compte);
      } catch {
        // Les modèles sont un confort : leur absence ne doit pas bloquer la semaine.
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  const prioritesParStore = useMemo(
    () => new Map(planning.priorites.map((p) => [p.store.id, p])),
    [planning.priorites]
  );
  const dejaPlanifies = useMemo(
    () => new Set([...planning.visitesParCellule.values()].flat().map((v) => v.store_id)),
    [planning.visitesParCellule]
  );

  const lundi = lundiDeLaSemaine(reference);
  const dimanche = dimancheDeLaSemaine(reference);

  const titreAjout = useMemo(() => {
    if (!cellule) return "";
    const surnom = planning.users.find((u) => u.id === cellule.userId)?.nickname ?? "";
    return t.planning.addTo(surnom, formatJourLong(cellule.date));
  }, [cellule, planning.users]);

  async function ajouter(storeId: string, montage: boolean) {
    if (!cellule) return;
    const nom = prioritesParStore.get(storeId)?.store.name ?? "";
    const ajoutes = await planning.ajouterArret(cellule.userId, cellule.date, storeId, montage);
    if (ajoutes > 0) setMessage(t.planning.added(nom));
  }

  async function appliquer(templateId: string) {
    if (!cellule) return;
    const ajoutes = await planning.appliquerTemplate(cellule.userId, cellule.date, templateId);
    setMessage(ajoutes > 0 ? t.planning.addedMany(ajoutes) : t.planning.alreadyPlanned);
    setCellule(null);
  }

  async function ranger(userId: string, date: string) {
    const ranges = await planning.rangerJournee(userId, date);
    if (ranges > 0) setMessage(t.planning.reordered);
  }

  async function vider(userId: string) {
    const surnom = planning.users.find((u) => u.id === userId)?.nickname ?? "";
    const { retirees, conservees } = await planning.viderSemaineDe(userId);
    if (retirees === 0) {
      setMessage(t.planning.nothingToClear);
      return;
    }
    setMessage(
      `${t.planning.cleared(retirees, surnom)}${conservees > 0 ? ` ${t.planning.doneKept(conservees)}` : ""}`
    );
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
              {t.planning.weekLabel(
                numeroSemaineISO(reference),
                formatDate(lundi),
                formatDate(dimanche)
              )}
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
              aria-label={t.planning.refresh}
              title={t.planning.refresh}
              onClick={() => planning.recharger()}
            >
              <RefreshCw aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t.planning.nextWeek}
              onClick={() => setReference((d) => addDays(d, 7))}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>

        {planning.erreur && (
          <p className="text-base text-state-critical">
            {t.planning.errors[planning.erreur] ?? t.planning.errors.chargement}
          </p>
        )}

        {message && <p className="text-base text-neutral-700">{message}</p>}

        {planning.dernierVidage && planning.dernierVidage.length > 0 && (
          <UndoBar
            message={t.planning.clearedShort(planning.dernierVidage.length)}
            onUndo={() => {
              setMessage(null);
              planning.annulerVidage();
            }}
            onExpire={planning.oublierVidage}
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

        {cellule && (
          <AjoutArret
            titre={titreAjout}
            priorites={planning.priorites}
            dejaPlanifies={dejaPlanifies}
            templates={templates}
            nbArretsParTemplate={nbArrets}
            onAjouter={ajouter}
            onAppliquerTemplate={appliquer}
            onFermer={() => setCellule(null)}
          />
        )}

        {planning.loading ? (
          <p className="text-base text-neutral-500">{t.common.loading}</p>
        ) : planning.erreur ? null : planning.users.length === 0 ? (
          <p className="rounded-lg border border-border bg-card px-4 py-6 text-lg">
            {t.planning.noTeam}
          </p>
        ) : (
          <SemaineGrille
            users={planning.users}
            jours={planning.jours}
            visitesParCellule={planning.visitesParCellule}
            indisponibilites={planning.indisponibilites}
            prioritesParStore={prioritesParStore}
            onMonter={(v) => planning.deplacer(v, -1)}
            onDescendre={(v) => planning.deplacer(v, 1)}
            onRetirer={retirer}
            onAjouter={(userId, date) => {
              setMessage(null);
              setCellule({ userId, date });
            }}
            onRanger={ranger}
            onVider={vider}
          />
        )}
      </div>
    </main>
  );
}
