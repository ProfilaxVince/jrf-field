"use client";
import { t } from "@/lib/i18n/fr-BE";
import { formatEuros, formatPourcent } from "@/lib/format";
import type { RapportMagasin } from "@/lib/domain/rapport-magasin";

/**
 * Le rapport qu'on pose sur la table devant l'adhérent.
 *
 * Mêmes règles de papier que la feuille de route : noir sur blanc, pas
 * d'aplat, une page qui se lit sans explication.
 *
 * `interne` commande TOUT ce qui est une appréciation : état du rayon,
 * remarques des commerciaux, description des signalements. Décoché — le
 * défaut — le rapport ne contient que des faits vérifiables : qui est passé,
 * quand, à quel rythme, et ce qui a été signalé. C'est ce qu'on montre à un
 * client sans risquer de lui faire lire « responsable pas coopératif ».
 */
export function RapportImprimable({
  rapport,
  interne,
}: {
  rapport: RapportMagasin;
  interne: boolean;
}) {
  const { magasin, resume, periode } = rapport;

  return (
    <article className="feuille space-y-5 text-black">
      <header className="border-b border-black/40 pb-2">
        <h2 className="font-display text-xl font-bold uppercase tracking-[0.1em]">
          {magasin.nom}
        </h2>
        <p className="text-base">
          {magasin.enseigne}
          {magasin.adresse ? ` · ${magasin.adresse}` : ""} · {magasin.codePostal} {magasin.ville}
        </p>
        <p className="text-sm">{t.stores.reportPeriod(periode.du, periode.au)}</p>
      </header>

      <section className="space-y-1">
        <h3 className="text-base font-semibold">{t.stores.reportSummary}</h3>
        <p className="text-sm">{t.stores.reportVisitCount(resume.visites)}</p>
        <p className="text-sm">
          {resume.derniereVisite
            ? t.stores.reportLastVisit(resume.derniereVisite)
            : t.stores.reportNeverVisited}
        </p>
        <p className="text-sm">
          {resume.frequenceMoyenneJours !== null && resume.frequencePrevueJours !== null
            ? t.stores.reportRhythm(resume.frequenceMoyenneJours, resume.frequencePrevueJours)
            : t.stores.reportRhythmUnknown}
        </p>
        {(magasin.adherent || magasin.responsableFl) && (
          <p className="text-sm">
            {magasin.adherent && `${t.stores.adherent} : ${magasin.adherent}`}
            {magasin.adherent && magasin.responsableFl ? " · " : ""}
            {magasin.responsableFl && `${t.stores.flManager} : ${magasin.responsableFl}`}
          </p>
        )}
      </section>

      {rapport.exercices.length > 0 && (
        <section className="space-y-1 break-inside-avoid">
          <h3 className="text-base font-semibold">{t.stores.reportRevenue}</h3>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rapport.exercices.map((e) => (
                <tr key={e.annee} className="border-t border-black/20">
                  <td className="w-20 py-1 font-semibold">{e.annee}</td>
                  <td className="py-1">{formatEuros(e.montant)}</td>
                  <td className="py-1">
                    {e.ecartPct === null
                      ? ""
                      : `${e.ecartPct > 0 ? "+" : ""}${formatPourcent(e.ecartPct)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="space-y-1">
        <h3 className="text-base font-semibold">{t.stores.reportVisits}</h3>
        {rapport.visites.length === 0 ? (
          <p className="text-sm">{t.stores.reportNeverVisited}</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="w-24 py-1 font-semibold">Date</th>
                <th className="py-1 font-semibold">Commercial</th>
                <th className="py-1 font-semibold">Type</th>
                {interne && <th className="py-1 font-semibold">{t.stores.reportComment}</th>}
              </tr>
            </thead>
            <tbody>
              {rapport.visites.map((v, i) => (
                <tr key={`${v.date}-${i}`} className="border-t border-black/20 align-top">
                  <td className="py-1">{v.date}</td>
                  <td className="py-1">{v.commercial}</td>
                  <td className="py-1">
                    {v.type}
                    {v.motif && <div className="italic">« {v.motif} »</div>}
                  </td>
                  {interne && (
                    <td className="py-1">
                      {v.rayonConforme !== null && (
                        <div>
                          {v.rayonConforme ? t.stores.reportShelfOk : t.stores.reportShelfKo}
                        </div>
                      )}
                      {v.remarque && <div>{v.remarque}</div>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-1 break-inside-avoid">
        <h3 className="text-base font-semibold">{t.stores.reportIncidents}</h3>
        {rapport.incidents.length === 0 ? (
          <p className="text-sm">{t.stores.reportNoIncident}</p>
        ) : interne ? (
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rapport.incidents.map((inc, i) => (
                <tr key={`${inc.date}-${i}`} className="border-t border-black/20 align-top">
                  <td className="w-24 py-1">{inc.date}</td>
                  <td className="py-1">{inc.type}</td>
                  <td className="py-1">{inc.statut}</td>
                  <td className="py-1">{inc.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Sans le mode interne : le NOMBRE par type, pas les descriptions.
             Un signalement dit un fait ; sa description dit souvent qui est
             en tort. */
          <ul className="text-sm">
            {rapport.incidentsParType.map((g) => (
              <li key={g.type}>
                {g.type} : {g.nombre}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
