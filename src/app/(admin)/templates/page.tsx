"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateEditeur } from "@/components/planning/template-editeur";
import { listStores, type StoreRow } from "@/lib/data/stores";
import {
  ajouterStop,
  archiverTemplate,
  creerTemplate,
  listStops,
  listTemplates,
  listTousLesStops,
  reordonnerStops,
  retirerStop,
  type TemplateRow,
  type TemplateStopRow,
} from "@/lib/data/templates";
import { useSession } from "@/lib/session";
import { t } from "@/lib/i18n/fr-BE";

export default function TemplatesPage() {
  const { userId } = useSession();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [magasins, setMagasins] = useState<Map<string, StoreRow>>(new Map());
  const [nbArrets, setNbArrets] = useState<Map<string, number>>(new Map());
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [stops, setStops] = useState<TemplateStopRow[]>([]);
  const [creation, setCreation] = useState(false);
  const [nom, setNom] = useState("");
  const [zone, setZone] = useState("");
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let monte = true;
    (async () => {
      try {
        const [modeles, tousStops, stores] = await Promise.all([
          listTemplates(),
          listTousLesStops(),
          listStores(),
        ]);
        if (!monte) return;
        setTemplates(modeles);
        setMagasins(new Map(stores.map((s) => [s.id, s])));
        const compte = new Map<string, number>();
        for (const stop of tousStops) {
          compte.set(stop.template_id, (compte.get(stop.template_id) ?? 0) + 1);
        }
        setNbArrets(compte);
      } catch {
        if (monte) setErreur(t.templates.loadError);
      } finally {
        if (monte) setLoading(false);
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  const modeleOuvert = useMemo(
    () => templates.find((m) => m.id === ouvert) ?? null,
    [templates, ouvert]
  );

  async function ouvrir(id: string) {
    setOuvert(id);
    try {
      setStops(await listStops(id));
      setErreur(null);
    } catch {
      setErreur(t.templates.loadError);
    }
  }

  async function creer() {
    if (!nom.trim() || !userId) return;
    try {
      const cree = await creerTemplate(nom, zone || null, userId);
      setTemplates((prev) => [...prev, cree].sort((a, b) => a.name.localeCompare(b.name)));
      setNom("");
      setZone("");
      setCreation(false);
      setStops([]);
      setOuvert(cree.id);
      setErreur(null);
    } catch {
      setErreur(t.templates.saveError);
    }
  }

  async function archiver(id: string) {
    const precedent = templates;
    setTemplates((prev) => prev.filter((m) => m.id !== id));
    if (ouvert === id) setOuvert(null);
    try {
      await archiverTemplate(id);
    } catch {
      setTemplates(precedent);
      setErreur(t.templates.saveError);
    }
  }

  async function ajouter(storeId: string) {
    if (!ouvert) return;
    try {
      const cree = await ajouterStop(ouvert, storeId, stops.length + 1);
      setStops((prev) => [...prev, cree]);
      setNbArrets((prev) => new Map(prev).set(ouvert, (prev.get(ouvert) ?? 0) + 1));
      setErreur(null);
    } catch {
      setErreur(t.templates.saveError);
    }
  }

  async function retirer(storeId: string) {
    if (!ouvert) return;
    const precedent = stops;
    const restants = stops.filter((s) => s.store_id !== storeId);
    setStops(restants);
    setNbArrets((prev) => new Map(prev).set(ouvert, restants.length));
    try {
      await retirerStop(ouvert, storeId);
      await reordonnerStops(ouvert, restants.map((s) => s.store_id));
    } catch {
      setStops(precedent);
      setErreur(t.templates.saveError);
    }
  }

  async function deplacer(storeId: string, sens: -1 | 1) {
    if (!ouvert) return;
    const index = stops.findIndex((s) => s.store_id === storeId);
    const cible = index + sens;
    if (index < 0 || cible < 0 || cible >= stops.length) return;
    const copie = [...stops];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    setStops(copie.map((s, i) => ({ ...s, position: i + 1 })));
    try {
      await reordonnerStops(ouvert, copie.map((s) => s.store_id));
    } catch {
      setStops(stops);
      setErreur(t.templates.saveError);
    }
  }

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
              {t.templates.title}
            </h1>
            <p className="mt-1 max-w-xl text-base text-neutral-700">{t.templates.subtitle}</p>
          </div>
          <Button onClick={() => setCreation(true)}>{t.templates.create}</Button>
        </div>

        {erreur && <p className="text-base text-state-critical">{erreur}</p>}

        {creation && (
          <Card>
            <CardHeader>
              <CardTitle>{t.templates.create}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className="min-h-[44px] w-full rounded border border-border px-3 text-base"
                placeholder={t.templates.namePlaceholder}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
              <input
                className="min-h-[44px] w-full rounded border border-border px-3 text-base"
                placeholder={t.templates.zone}
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCreation(false)}>
                  {t.common.cancel}
                </Button>
                <Button onClick={creer} disabled={!nom.trim()}>
                  {t.templates.save}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-base text-neutral-500">{t.common.loading}</p>
        ) : templates.length === 0 ? (
          <p className="rounded-lg border border-border bg-card px-4 py-6 text-lg">
            {t.templates.empty}
          </p>
        ) : (
          <ul className="space-y-2">
            {templates.map((modele) => (
              <li key={modele.id} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{modele.name}</p>
                    <p className="text-sm text-neutral-500">
                      {modele.zone ? `${modele.zone} · ` : ""}
                      {t.templates.stops(nbArrets.get(modele.id) ?? 0)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => (ouvert === modele.id ? setOuvert(null) : ouvrir(modele.id))}
                    >
                      {ouvert === modele.id ? t.templates.back : t.templates.edit}
                    </Button>
                    <Button variant="ghost" onClick={() => archiver(modele.id)}>
                      {t.templates.archive}
                    </Button>
                  </div>
                </div>
                {ouvert === modele.id && modeleOuvert && (
                  <div className="pt-4">
                    <TemplateEditeur
                      stops={stops}
                      magasins={magasins}
                      onAjouter={ajouter}
                      onRetirer={retirer}
                      onDeplacer={deplacer}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
