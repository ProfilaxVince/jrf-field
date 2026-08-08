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
import { listEvolutions, type EvolutionRow } from "@/lib/data/revenus";
import { detailErreur } from "@/lib/data/erreurs";
import { formatDecimal, formatNombre, formatPourcent } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";

/** Dans l'ordre des lectures : ce qui a échoué doit être NOMMÉ à l'écran. */
const SOURCES = [
  "Où en est le parc",
  "Part du parc vue chaque mois",
  "Effort par importance",
  "Écarts de fréquence",
  "Suivi des montages",
  "Rotation des montages",
  "Évolution du CA",
];

const EUR = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

function LigneEvolution({ l }: { l: EvolutionRow }) {
  const hausse = (l.ecart_pct ?? 0) > 0;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 py-1">
      <span className="text-base">{l.magasin}</span>
      <span
        className="text-base font-semibold"
        style={{ color: hausse ? "var(--state-ok)" : "var(--state-critical)" }}
      >
        {hausse ? "+" : ""}
        {formatPourcent(l.ecart_pct)}{" "}
        <span className="font-normal text-neutral-700">
          ({EUR.format(Number(l.ecart_eur ?? 0))} · {l.exercice_precedent} → {l.exercice})
        </span>
      </span>
    </div>
  );
}

export default function StatsPage() {
  const [parc, setParc] = useState<StatsParc[]>([]);
  const [couverture, setCouverture] = useState<CouvertureMensuelle[]>([]);
  const [effort, setEffort] = useState<EffortParTier[]>([]);
  const [frequences, setFrequences] = useState<FrequenceReelle[]>([]);
  const [montages, setMontages] = useState<SuiviMontage[]>([]);
  const [rotation, setRotation] = useState<RotationMontage | null>(null);
  const [evolutions, setEvolutions] = useState<EvolutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Sept lectures indépendantes, résolues INDÉPENDAMMENT.
   *
   * `Promise.all` rejetait au premier échec : une seule vue en défaut vidait
   * les sept blocs, et l'écran affichait « 0 magasin suivi » — un chiffre faux,
   * pas un chiffre manquant. Six blocs sur sept restent affichables ; les
   * masquer tous parce que le septième a échoué, c'est fabriquer l'écran vide
   * que le produit s'interdit.
   *
   * Et l'erreur est rapportée TELLE QUELLE. « Vérifie ta connexion » était une
   * hypothèse déguisée en diagnostic : une vue absente, une policy manquante ou
   * une requête trop lente donnent le même écran, et le `hint` de Postgres —
   * celui qui contient la correction — était jeté.
   */
  useEffect(() => {
    let monte = true;
    (async () => {
      const resultats = await Promise.allSettled([
        statsParc(),
        couvertureMensuelle(),
        effortParTier(),
        pireEcartFrequence(),
        suiviMontage(),
        rotationMontage(),
        listEvolutions(),
      ]);
      if (!monte) return;

      const [p, c, e, f, m, r, ev] = resultats;
      if (p.status === "fulfilled") setParc(p.value);
      if (c.status === "fulfilled") setCouverture(c.value);
      if (e.status === "fulfilled") setEffort(e.value);
      if (f.status === "fulfilled") setFrequences(f.value);
      if (m.status === "fulfilled") setMontages(m.value);
      if (r.status === "fulfilled") setRotation(r.value);
      if (ev.status === "fulfilled") setEvolutions(ev.value);

      const echecs = resultats
        .map((res, i) => (res.status === "rejected" ? `${SOURCES[i]} : ${detailErreur(res.reason)}` : ""))
        .filter(Boolean);
      setErreur(echecs.length ? `${t.stats.loadError} ${echecs.join(" · ")}` : null);
      setLoading(false);
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

  // On ne garde que le DERNIER écart connu de chaque magasin : un magasin qui a
  // trois exercices d'historique ne doit pas occuper trois lignes du classement.
  const dernierEcart = [...evolutions]
    .sort((a, b) => (b.exercice ?? 0) - (a.exercice ?? 0))
    .filter((l, i, tous) => tous.findIndex((x) => x.store_id === l.store_id) === i);
  const hausses = dernierEcart
    .filter((l) => (l.ecart_pct ?? 0) > 0)
    .sort((a, b) => (b.ecart_pct ?? 0) - (a.ecart_pct ?? 0))
    .slice(0, 5);
  const baisses = dernierEcart
    .filter((l) => (l.ecart_pct ?? 0) < 0)
    .sort((a, b) => (a.ecart_pct ?? 0) - (b.ecart_pct ?? 0))
    .slice(0, 5);

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
            {t.stats.title}
          </h1>
          <p className="mt-1 text-base text-neutral-700">{t.stats.subtitle}</p>
        </div>

        {/* `break-words` : le message porte maintenant le texte brut de
            Postgres, qui contient des identifiants d'un seul tenant plus longs
            qu'un écran de téléphone. */}
        {erreur && <p className="text-base break-words text-state-critical">{erreur}</p>}

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

        {/* Ce que l'historique du CA (00018) rend enfin possible : distinguer un
            magasin qui progresse d'un magasin qui décroche. Avant, saisir un
            exercice écrasait le précédent et l'écart était introuvable. */}
        <Card>
          <CardHeader>
            <CardTitle>{t.stats.revenueTrendTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-7 text-neutral-700">{t.stats.revenueTrendHelp}</p>
            {evolutions.length === 0 ? (
              <p className="text-base text-neutral-500">{t.stats.revenueTrendEmpty}</p>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">{t.stats.revenueUp}</h3>
                  {hausses.length === 0 ? (
                    <p className="text-base text-neutral-500">{t.stats.empty}</p>
                  ) : (
                    hausses.map((l) => <LigneEvolution key={`${l.store_id}-${l.exercice}`} l={l} />)
                  )}
                </div>
                <div className="space-y-1 border-t border-border pt-3">
                  <h3 className="text-base font-semibold">{t.stats.revenueDown}</h3>
                  {baisses.length === 0 ? (
                    <p className="text-base text-neutral-500">{t.stats.empty}</p>
                  ) : (
                    baisses.map((l) => <LigneEvolution key={`${l.store_id}-${l.exercice}`} l={l} />)
                  )}
                </div>
              </>
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
