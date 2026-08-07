"use client";
import { t } from "@/lib/i18n/fr-BE";
import type { FeuilleCommercial } from "@/lib/domain/feuille-semaine";

/**
 * La feuille qu'un commercial emporte. Pensée POUR LE PAPIER :
 *
 *  · une page par personne (`break-after`), pour distribuer sans découper ;
 *  · noir sur blanc, pas d'aplat — une imprimante de bureau rend les fonds
 *    colorés en gris sale et mange la cartouche ;
 *  · la couleur de la personne survit en liseré gauche seulement, comme
 *    partout ailleurs dans le produit, et seulement si l'impression couleur
 *    est activée ;
 *  · les téléphones sont écrits en toutes lettres : sur papier, un lien ne
 *    sert à rien.
 *
 * Aucune dépendance PDF : le navigateur imprime, et le dialogue Windows
 * propose « Enregistrer au format PDF ». Une bibliothèque de génération pèse
 * quelques centaines de kilo-octets pour refaire ce que l'OS fait déjà.
 */
export function FeuilleImprimable({ feuille }: { feuille: FeuilleCommercial }) {
  return (
    <article className="feuille break-after-page space-y-4 text-black">
      <header
        className="border-l-4 pl-3"
        style={{ borderLeftColor: feuille.couleur }}
      >
        <h2 className="font-display text-xl font-bold uppercase tracking-[0.1em]">
          {feuille.surnom}
        </h2>
        {feuille.nomComplet && feuille.nomComplet !== feuille.surnom && (
          <p className="text-base">{feuille.nomComplet}</p>
        )}
        <p className="text-sm">
          {feuille.semaines
            .map((s) => t.planning.weekLabel(s.numero, s.du, s.au))
            .join("  ·  ")}
          {"  ·  "}
          {t.planning.sheetStops(feuille.total)}
        </p>
      </header>

      {feuille.semaines.map((semaine) =>
        semaine.jours.map((jour) => (
          <section key={jour.date} className="break-inside-avoid">
            <h3 className="jour border-b border-black/40 pb-1 text-base font-semibold">
              {jour.libelle}
              {jour.indisponible && (
                <span className="font-normal"> — {t.planning.sheetUnavailable}</span>
              )}
            </h3>

            {jour.arrets.length === 0 ? (
              <p className="py-1 text-sm">{t.planning.sheetNothing}</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="w-8 py-1 font-semibold">#</th>
                    <th className="py-1 font-semibold">{t.stores.name}</th>
                    <th className="py-1 font-semibold">{t.stores.address}</th>
                    <th className="py-1 font-semibold">{t.stores.adherent}</th>
                    <th className="py-1 font-semibold">{t.stores.flManager}</th>
                  </tr>
                </thead>
                <tbody>
                  {jour.arrets.map((a) => (
                    <tr key={`${jour.date}-${a.ordre}`} className="border-t border-black/20 align-top">
                      <td className="py-1">{a.ordre}</td>
                      <td className="py-1">
                        <div className="font-semibold">{a.magasin}</div>
                        <div>{a.type}</div>
                      </td>
                      <td className="py-1">
                        {a.adresse && <div>{a.adresse}</div>}
                        <div>
                          {a.codePostal} {a.ville}
                        </div>
                      </td>
                      <td className="py-1">
                        {a.adherent && <div>{a.adherent}</div>}
                        {a.adherentTel && <div>{a.adherentTel}</div>}
                      </td>
                      <td className="py-1">
                        {a.responsableFl && <div>{a.responsableFl}</div>}
                        {a.responsableFlTel && <div>{a.responsableFlTel}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))
      )}
    </article>
  );
}
