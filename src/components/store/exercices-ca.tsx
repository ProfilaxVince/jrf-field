"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";
import { detailErreur } from "@/lib/data/erreurs";
import { listRevenus, retirerRevenu, type RevenuRow } from "@/lib/data/revenus";

/**
 * Les exercices déjà enregistrés pour un magasin.
 *
 * Le formulaire au-dessus saisit UN exercice à la fois — celui qu'on est en
 * train de renseigner. Cette liste sert à voir l'historique et à corriger une
 * erreur de saisie : un CA posé sur le mauvais exercice fausse le tier A/B/C
 * du magasin, donc sa place dans les priorités.
 *
 * Retirer supprime vraiment la ligne. C'est la seule suppression physique du
 * produit, assumée en 00018 : la garder « désactivée » fausserait le calcul de
 * l'exercice le plus récent, et l'`audit_log` en garde la trace.
 */
export function ExercicesCa({ storeId }: { storeId: string }) {
  const [lignes, setLignes] = useState<RevenuRow[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    listRevenus(storeId)
      .then((r) => vivant && setLignes(r))
      .catch((e) => vivant && setErreur(detailErreur(e) || t.stores.revenueLoadError));
    return () => {
      vivant = false;
    };
  }, [storeId]);

  async function retirer(ligne: RevenuRow) {
    const precedent = lignes ?? [];
    setLignes(precedent.filter((l) => l.id !== ligne.id));
    try {
      await retirerRevenu(ligne.id);
      setErreur(null);
    } catch (e) {
      setLignes(precedent);
      setErreur(detailErreur(e) || t.stores.revenueRemoveError);
    }
  }

  if (erreur) return <p className="text-base text-[color:var(--state-critical)]">{erreur}</p>;
  if (lignes === null) return <p className="text-base text-neutral-600">{t.common.loading}</p>;
  if (lignes.length === 0)
    return <p className="text-base text-neutral-600">{t.stores.revenueNone}</p>;

  return (
    <ul className="divide-y divide-border">
      {lignes.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-3 py-2">
          <span className="text-base">
            <span className="font-semibold">{l.year}</span>{" "}
            {new Intl.NumberFormat("fr-BE", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(Number(l.amount_eur))}
          </span>
          <Button variant="ghost" onClick={() => retirer(l)}>
            {t.stores.remove}
          </Button>
        </li>
      ))}
    </ul>
  );
}
