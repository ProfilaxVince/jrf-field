"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarrePart } from "@/components/stats/barre-part";
import {
  couvertureMensuelle,
  effortParTier,
  pireEcartFrequence,
  rotationMontage,
  statsParc,
  suiviMontage,
  type CouvertureMensuelle,
  type EffortParTier,
  type FrequenceReelle,
  type RotationMontage,
  type StatsParc,
  type SuiviMontage,
} from "@/lib/data/stats";
import { formatDecimal, formatNombre, formatPourcent } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";

export default function StatsPage() {
  const [parc, setParc] = useState<StatsParc[]>([]);
  const [couverture, setCouverture] = useState<CouvertureMensuelle[]>([]);
  const [effort, setEffort] = useState<EffortParTier[]>([]);
  const [frequences, setFrequences] = useState<FrequenceReelle[]>([]);
  const [montages, setMontages] = useState<SuiviMontage[]>([]);
  const [rotation, setRotation] = useState<RotationMontage | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let monte = true;
    (async () => {
      try {
        const [p, c, e, f, m, r] = await Promise.all([
          statsParc(),
          couvertureMensuelle(),
          effortParTier(),
          pireEcartFrequence(),
          suiviMontage(),
          rotationMontage(),
        ]);
        if (!monte) return;
        setParc(p);
        setCouverture(c);
        setEffort(e);
        setFrequences(f);
        setMontages(m);
        setRotation(r);
      } catch {
        if (monte) setErreur(t.stats.loadError);
      } finally {
        if (monte) setLoading(false);
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  const totaux = useMemo(
    () =>
      parc.reduce(
        (acc, ligne) => ({
          magasins: acc.magasins + (ligne.magasins ?? 0),
          retard: acc.retard + (ligne.en_retard ?? 0),
          jamais: acc.jamais + (ligne.jamais_vus ?? 0),
        }),
        { magasins: 0, retard: 0, jamais: 0 }
      ),
    [parc]
  );

  const parEnseigne = useMemo(() => {
    const index = new Map<string, { magasins: number; retard: number }>();
    for (const ligne of parc) {
      const cle = ligne.enseigne ?? "—";
      const courant = index.get(cle) ?? { magasins: 0, retard: 0 };
      index.set(cle, {
        magasins: courant.magasins + (ligne.magasins ?? 0),
        retard: courant.retard + (ligne.en_retard ?? 0),
      });
    }
    return [...index.entries()].sort((a, b) => b[1].magasins - a[1].magasins);
  }, [parc]);

  if (loading) {
    return <p className="p-6 text-base text-neutral-500">{t.common.loading}</p>;
  }

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
            {t.stats.title}
          </h1>
          <p className="mt-1 text-base text-neutral-700">{t.stats.subtitle}</p>
        </div>

        {erreur && <p className="text-base text-state-critical">{erreur}</p>}

        <Card>
          <CardHeader>
            <CardTitle>{t.stats.parcTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">
              {t.stats.parcTotal(totaux.magasins)} — {t.stats.parcLate(totaux.retard)}
              {totaux.jamais > 0 ? `, ${t.stats.parcNever(totaux.jamais)}` : ""}
            </p>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-neutral-700">{t.stats.byEnseigne}</h3>
              {parEnseigne.map(([enseigne, valeurs]) => (
                <BarrePart
                  key={enseigne}
                  libelle={t.stores.enseigneLabels[enseigne] ?? enseigne}
                  valeur={valeurs.retard}
                  maximum={valeurs.magasins}
                  chiffre={`${formatNombre(valeurs.retard)} / ${formatNombre(valeurs.magasins)}`}
                  accent
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.stats.coverageTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {couverture.length === 0 ? (
              <p className="text-base text-neutral-500">{t.stats.empty}</p>
            ) : (
              couverture.map((mois) => (
                <BarrePart
                  key={mois.mois ?? ""}
                  libelle={mois.mois ? formatDate(mois.mois) : "—"}
                  valeur={mois.magasins_vus ?? 0}
                  maximum={mois.parc ?? 0}
                  chiffre={formatPourcent(mois.couverture_pct)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.stats.effortTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-7 text-neutral-700">{t.stats.effortHelp}</p>
            {effort.length === 0 ? (
              <p className="text-base text-neutral-500">{t.stats.empty}</p>
            ) : (
              effort.map((ligne) => (
                <div key={ligne.tier ?? ""} className="space-y-1 border-t border-border pt-3">
                  <p className="text-base font-semibold">
                    {t.stats.effortRow(ligne.tier ?? "—", ligne.magasins ?? 0)}
                  </p>
                  <p className="text-base text-neutral-700">
                    {t.stats.effortVisits} {formatPourcent(ligne.part_visites_pct)} ·{" "}
                    {t.stats.effortRevenue} {formatPourcent(ligne.part_ca_pct)} ·{" "}
                    {t.stats.effortIndex} {formatDecimal(ligne.indice_effort)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.stats.frequencyTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {frequences.length === 0 ? (
              <p className="text-base text-neutral-500">{t.stats.empty}</p>
            ) : (
              frequences.map((ligne) => (
                <div key={ligne.store_id ?? ""} className="border-t border-border pt-2">
                  <p className="text-base font-semibold">{ligne.name ?? "—"}</p>
                  <p className="text-base text-neutral-700">
                    {t.stats.frequencyRow(
                      ligne.frequence_cible_jours ?? 0,
                      Math.round(ligne.frequence_reelle_jours ?? 0)
                    )}{" "}
                    — {t.stats.frequencyGap(Math.round(ligne.ecart_jours ?? 0))}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.stats.montageTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rotation?.jours_entre_deux_montages != null && (
              <p className="text-base text-neutral-700">
                {t.stats.montageRotation(rotation.jours_entre_deux_montages)}
              </p>
            )}
            {montages.length === 0 ? (
              <p className="text-base text-neutral-500">{t.stats.empty}</p>
            ) : (
              montages.map((mois) => (
                <p key={mois.mois ?? ""} className="text-base">
                  {t.stats.montageRow(
                    mois.mois ? formatDate(mois.mois) : "—",
                    mois.montages_faits ?? 0,
                    mois.montages_planifies ?? 0
                  )}
                  {(mois.cedes_a_une_urgence ?? 0) > 0
                    ? ` — ${t.stats.montageCeded(mois.cedes_a_une_urgence ?? 0)}`
                    : ""}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
