"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";
import { detailErreur } from "@/lib/data/erreurs";
import {
  analyserFichier,
  appliquerImport,
  type Analyse,
  type Bilan,
  type Verdict,
} from "@/lib/data/import-passages";

const COULEUR: Record<Verdict, string> = {
  creation: "var(--state-ok)",
  confirmation: "var(--state-ok)",
  deja_importee: "var(--neutral-500)",
  refus: "var(--state-critical)",
};

/**
 * Import des passages transmis par l'informatique de Jacques Remy.
 *
 * L'écran impose un temps d'arrêt : on dépose le fichier, on REGARDE, puis on
 * valide. Rien n'est écrit avant le clic final. Le fichier vient d'un autre
 * service et désigne les magasins avec un référentiel qu'on ne maîtrise pas —
 * l'aperçu est la seule occasion de voir une erreur avant qu'elle ne devienne
 * une visite rattachée au mauvais point de vente.
 */
export default function ImportPassagesPage() {
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function lireFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setBilan(null);
    setErreur(null);
    const lecteur = new FileReader();
    lecteur.onload = async () => {
      setEnCours(true);
      try {
        setAnalyse(await analyserFichier(String(lecteur.result ?? "")));
      } catch (err) {
        setErreur(detailErreur(err) || t.passages.analyseError);
      } finally {
        setEnCours(false);
      }
    };
    lecteur.readAsText(fichier);
  }

  async function valider() {
    if (!analyse) return;
    setEnCours(true);
    try {
      setBilan(await appliquerImport(analyse.lignes));
      setAnalyse(null);
      setErreur(null);
    } catch (err) {
      setErreur(detailErreur(err) || t.passages.applyError);
    } finally {
      setEnCours(false);
    }
  }

  const compte = (v: Verdict) => analyse?.lignes.filter((l) => l.verdict === v).length ?? 0;
  const aEcrire = compte("creation") + compte("confirmation");
  const refus = analyse?.lignes.filter((l) => l.verdict === "refus") ?? [];

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
            {t.passages.title}
          </h1>
          <p className="mt-1 text-base text-neutral-700">{t.passages.subtitle}</p>
        </div>

        {erreur && <p className="text-base text-[color:var(--state-critical)]">{erreur}</p>}

        {bilan && (
          <Card className="border-[color:var(--state-ok)]">
            <CardContent className="space-y-1 pt-6">
              <p className="text-base font-semibold">{t.passages.done}</p>
              <p className="text-base">{t.passages.doneCreated(bilan.creees)}</p>
              <p className="text-base">{t.passages.doneConfirmed(bilan.confirmees)}</p>
              <p className="text-base">{t.passages.doneIgnored(bilan.ignorees)}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t.passages.pick}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base leading-7 text-neutral-700">{t.passages.pickHelp}</p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={lireFichier}
              className="min-h-[44px] w-full text-base"
            />
            {enCours && <p className="text-base text-neutral-600">{t.common.loading}</p>}
          </CardContent>
        </Card>

        {analyse && (
          <Card>
            <CardHeader>
              <CardTitle>{t.passages.previewTitle(analyse.lignes.length)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1 text-base">
                <li>{t.passages.countCreation(compte("creation"))}</li>
                <li>{t.passages.countConfirmation(compte("confirmation"))}</li>
                <li>{t.passages.countAlready(compte("deja_importee"))}</li>
                <li className={refus.length ? "text-[color:var(--state-critical)]" : ""}>
                  {t.passages.countRefus(refus.length)}
                </li>
              </ul>

              {refus.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">{t.passages.refusTitle}</h3>
                  <p className="text-sm text-neutral-600">{t.passages.refusHelp}</p>
                  <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                    {refus.map((l) => (
                      <li key={l.ligne} className="border-t border-border pt-1">
                        <span className="font-semibold">{t.passages.line(l.ligne)}</span>{" "}
                        {t.passages.motifs[l.motif] ?? l.motif}
                        <span className="block text-neutral-600">
                          {[l.brut.reference_jrf, l.brut.nom_magasin, l.brut.commercial, l.brut.date_visite]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analyse.prevuesNonVues.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">
                    {t.passages.missingTitle(analyse.prevuesNonVues.length)}
                  </h3>
                  {/* On ne les annule PAS : effacer du planning sur la foi d'un
                      fichier tiers, personne ne l'a décidé. */}
                  <p className="text-sm text-neutral-600">{t.passages.missingHelp}</p>
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                    {analyse.prevuesNonVues.map((v) => (
                      <li key={v.id} className="border-t border-border pt-1">
                        {v.date} · {v.magasin} · {v.commercial}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="max-h-80 space-y-1 overflow-y-auto">
                {analyse.lignes.map((l) => (
                  <div
                    key={l.ligne}
                    className="flex flex-wrap items-baseline gap-x-2 border-t border-border py-1 text-sm"
                  >
                    <span style={{ color: COULEUR[l.verdict] }} className="font-semibold">
                      {t.passages.verdicts[l.verdict]}
                    </span>
                    <span>{l.magasin?.name ?? (l.brut.nom_magasin || "—")}</span>
                    <span className="text-neutral-600">
                      {l.commercial?.nickname ?? l.brut.commercial} · {l.date ?? l.brut.date_visite}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button disabled={enCours || aEcrire === 0} onClick={valider}>
                  {enCours ? t.common.saving : t.passages.apply(aEcrire)}
                </Button>
                <Button variant="secondary" onClick={() => setAnalyse(null)}>
                  {t.common.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
