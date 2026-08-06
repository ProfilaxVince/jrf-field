"use client";
/**
 * Mise en clair d'une erreur Supabase.
 *
 * `lib/data/*` relaie l'objet d'erreur de PostgREST tel quel. Cet objet porte
 * quatre champs — `message`, `code`, `details`, `hint` — et la documentation de
 * la librairie est explicite : c'est souvent `hint` qui contient la correction
 * à appliquer, pas `message`. N'afficher que `message` masque donc la seule
 * information exploitable.
 *
 * Un écran qui dit « Import impossible. » sans dire pourquoi ne laisse à
 * l'utilisateur qu'une chose à faire : réessayer à l'identique.
 */

type ErreurSupabase = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

const texte = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");

/** Le code SQLSTATE, quand il y en a un. `23505` = référence déjà prise. */
export function codeErreur(e: unknown): string {
  return e && typeof e === "object" ? texte((e as ErreurSupabase).code) : "";
}

export function estConflitDeCle(e: unknown): boolean {
  return codeErreur(e) === "23505" || detailErreur(e).includes("duplicate key");
}

/** Tout ce que la base a dit, sur une ligne, sans doublon ni champ vide. */
export function detailErreur(e: unknown): string {
  if (!e) return "";
  if (typeof e === "string") return e.trim();
  if (typeof e !== "object") return "";

  const err = e as ErreurSupabase;
  const morceaux = [
    texte(err.code) && `[${texte(err.code)}]`,
    texte(err.message),
    texte(err.details),
    texte(err.hint),
  ].filter((m): m is string => Boolean(m));

  return [...new Set(morceaux)].join(" — ");
}
