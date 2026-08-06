"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReglageNombre } from "@/components/admin/reglage-nombre";
import { getDeriveTiers, recalculerTiers, type DeriveTiers } from "@/lib/data/dette";
import { exporterMagasins, exporterRelais, exporterVisites } from "@/lib/data/exports";
import { listSettings, nombre, objet, texte, updateSetting, type Settings } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(new Map());
  const [derive, setDerive] = useState<DeriveTiers | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let monte = true;
    (async () => {
      try {
        const [s, d] = await Promise.all([listSettings(), getDeriveTiers()]);
        if (!monte) return;
        setSettings(s);
        setDerive(d);
      } catch {
        if (monte) setErreur(t.settings.saveError);
      } finally {
        if (monte) setLoading(false);
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  async function enregistrer(cle: string, valeur: unknown) {
    const precedent = new Map(settings);
    setSettings((prev) => new Map(prev).set(cle, valeur));
    try {
      await updateSetting(cle, valeur);
      setMessage(t.settings.saved);
      setErreur(null);
    } catch {
      setSettings(precedent);
      setErreur(t.settings.saveError);
    }
  }

  async function lancerRecalcul() {
    try {
      await recalculerTiers();
      setDerive(await getDeriveTiers());
      setMessage(t.settings.tiersRecalcDone);
      setErreur(null);
    } catch {
      setErreur(t.settings.saveError);
    }
  }

  const mode = texte(settings, "frequence_mode", "auto");
  const frequences = objet(settings, "target_frequency_days");
  const frequence = (tier: string) => Number(frequences[tier] ?? 0);

  async function changerFrequence(tier: string, valeur: number) {
    await enregistrer("target_frequency_days", { ...frequences, [tier]: valeur });
  }

  if (loading) return <p className="p-6 text-base text-neutral-500">{t.common.loading}</p>;

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
          {t.settings.title}
        </h1>

        {erreur ? (
          <p className="text-base text-state-critical">{erreur}</p>
        ) : (
          message && <p className="text-base text-neutral-700">{message}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t.settings.rythmeTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="pb-2 text-base leading-7 text-neutral-700">{t.settings.rythmeHelp}</p>
            <div className="divide-y divide-border">
              <ReglageNombre
                libelle={t.settings.visitesParJour}
                valeur={nombre(settings, "visites_par_jour", 2.6)}
                pas={0.1}
                onEnregistrer={(v) => enregistrer("visites_par_jour", v)}
              />
              <ReglageNombre
                libelle={t.settings.joursOuvres}
                valeur={nombre(settings, "jours_ouvres_semaine", 5)}
                onEnregistrer={(v) => enregistrer("jours_ouvres_semaine", v)}
              />
              <ReglageNombre
                libelle={t.settings.reserveUrgences}
                valeur={nombre(settings, "reserve_urgences_pct", 15)}
                onEnregistrer={(v) => enregistrer("reserve_urgences_pct", v)}
              />
              <ReglageNombre
                libelle={t.settings.montagesParJour}
                valeur={nombre(settings, "montages_par_jour_par_commercial", 1)}
                onEnregistrer={(v) => enregistrer("montages_par_jour_par_commercial", v)}
              />
              <ReglageNombre
                libelle={t.settings.montageCout}
                valeur={nombre(settings, "montage_cout_creneaux", 0)}
                pas={0.5}
                onEnregistrer={(v) => enregistrer("montage_cout_creneaux", v)}
              />
            </div>

            <fieldset className="pt-4">
              <legend className="text-base font-semibold">{t.settings.frequenceMode}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Button
                  variant={mode === "auto" ? "default" : "outline"}
                  aria-pressed={mode === "auto"}
                  onClick={() => enregistrer("frequence_mode", "auto")}
                >
                  {t.settings.frequenceAuto}
                </Button>
                <Button
                  variant={mode === "fixe" ? "default" : "outline"}
                  aria-pressed={mode === "fixe"}
                  onClick={() => enregistrer("frequence_mode", "fixe")}
                >
                  {t.settings.frequenceFixe}
                </Button>
              </div>
              {mode === "fixe" && (
                <div className="mt-2 divide-y divide-border">
                  <ReglageNombre
                    libelle={t.settings.frequenceA}
                    valeur={frequence("A")}
                    onEnregistrer={(v) => changerFrequence("A", v)}
                  />
                  <ReglageNombre
                    libelle={t.settings.frequenceB}
                    valeur={frequence("B")}
                    onEnregistrer={(v) => changerFrequence("B", v)}
                  />
                  <ReglageNombre
                    libelle={t.settings.frequenceC}
                    valeur={frequence("C")}
                    onEnregistrer={(v) => changerFrequence("C", v)}
                  />
                </div>
              )}
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings.tiersTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base leading-7 text-neutral-700">{t.settings.tiersHelp}</p>
            <p className="text-base">
              {t.settings.tiersDrift(derive?.ont_derive ?? 0, derive?.derive_pct ?? 0)}
            </p>
            <p className="text-sm text-neutral-500">
              {derive?.dernier_recalcul
                ? t.settings.tiersLastRun(formatDate(derive.dernier_recalcul))
                : t.settings.tiersNeverRun}
            </p>
            <Button onClick={lancerRecalcul}>{t.settings.tiersRecalc}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings.teamTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/users">{t.settings.teamOpen}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/absences">{t.settings.absencesOpen}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings.exportTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exporterMagasins()}>
              {t.settings.exportStores}
            </Button>
            <Button variant="outline" onClick={() => exporterVisites()}>
              {t.settings.exportVisits}
            </Button>
            <Button variant="outline" onClick={() => exporterRelais()}>
              {t.settings.exportRelais}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
