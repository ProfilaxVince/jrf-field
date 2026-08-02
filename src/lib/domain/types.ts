/**
 * Types métier purs. Les types de base de données NE SONT PAS écrits ici :
 * ils seront générés par `supabase gen types typescript` → src/lib/data/database.types.ts
 * une fois le projet Supabase provisionné (Lot 1).
 *
 * Ici : uniquement les types de domaine indépendants du schéma.
 */

/** Importance d'un magasin, dérivée du CA (A = top 20 %, B = 20-60 %, C = reste). */
export type Tier = "A" | "B" | "C";

export type Enseigne =
  | "intermarche"
  | "ad_delhaize"
  | "proxy_delhaize"
  | "delhaize"
  | "spar";

export type Reseau = "by_mestdagh" | "independant" | "affilie" | "integre";

export type Region = "wallonie" | "bruxelles" | "flandre";

export type TypeVisite =
  | "mise_en_rayon"
  | "conseil"
  | "demo"
  | "urgence"
  | "rattrapage";

export type StatutVisite = "planifiee" | "faite" | "annulee" | "reportee";

export type TypeIncident =
  | "oubli_livraison"
  | "rupture"
  | "litige_qualite"
  | "autre";

/** Criticité 3 = urgence : visite à replanifier sous 48 h. */
export type Criticite = 1 | 2 | 3;

/** État d'affichage dérivé de la dette (calculée en SQL, jamais côté front). */
export type EtatDette = "ok" | "warning" | "critical";

/**
 * Seuils d'état — miroir des seuils SQL (source de vérité : vue v_store_dette).
 * warning : dette > 1.0 · critical : tier A et dette > 1.5.
 */
export function etatDette(dette: number, tier: Tier): EtatDette {
  if (tier === "A" && dette > 1.5) return "critical";
  if (dette > 1.0) return "warning";
  return "ok";
}
