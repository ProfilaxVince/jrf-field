/**
 * Dates : stockage UTC, affichage Europe/Brussels, semaine ISO (lundi).
 * Un seul endroit pour formater — aucun composant ne construit une date à la main.
 */
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const TZ = "Europe/Brussels";

/** JJ/MM/AAAA, heure de Bruxelles. */
export function formatDate(value: string | Date): string {
  return formatInTimeZone(typeof value === "string" ? parseISO(value) : value, TZ, "dd/MM/yyyy", {
    locale: fr,
  });
}

/** JJ/MM/AAAA à HH:mm (24 h), heure de Bruxelles. */
export function formatDateTime(value: string | Date): string {
  return formatInTimeZone(
    typeof value === "string" ? parseISO(value) : value,
    TZ,
    "dd/MM/yyyy 'à' HH:mm",
    { locale: fr }
  );
}

/** HH:mm, heure de Bruxelles. */
export function formatHeure(value: string | Date): string {
  return formatInTimeZone(typeof value === "string" ? parseISO(value) : value, TZ, "HH:mm", {
    locale: fr,
  });
}

/** « lundi 6 août » — en-tête de colonne de la vue semaine. */
export function formatJourLong(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(toZonedTime(date, TZ), "EEEE d MMMM", { locale: fr });
}

/** « lun. 6/8 » — en-tête compact (mobile). */
export function formatJourCourt(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(toZonedTime(date, TZ), "EEE d/M", { locale: fr });
}

/** Date du jour à Bruxelles, au format ISO `yyyy-MM-dd` (clé des colonnes `date`). */
export function aujourdhuiISO(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

/** `yyyy-MM-dd` d'une date locale, sans dérive de fuseau. */
export function jourISO(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

/** Lundi de la semaine contenant `date` (semaine ISO, commence lundi). */
export function lundiDeLaSemaine(date: Date = new Date()): Date {
  return startOfWeek(toZonedTime(date, TZ), { weekStartsOn: 1 });
}

export function dimancheDeLaSemaine(date: Date = new Date()): Date {
  return endOfWeek(toZonedTime(date, TZ), { weekStartsOn: 1 });
}

/** Les 5 jours ouvrés (lundi → vendredi) de la semaine d'une date. */
export function joursOuvres(date: Date = new Date()): Date[] {
  const lundi = lundiDeLaSemaine(date);
  return [0, 1, 2, 3, 4].map((i) => addDays(lundi, i));
}

export function numeroSemaineISO(date: Date = new Date()): number {
  return Number(format(toZonedTime(date, TZ), "I", { locale: fr }));
}

export function estAujourdhui(value: string | Date): boolean {
  const date = typeof value === "string" ? parseISO(value) : value;
  return isSameDay(toZonedTime(date, TZ), toZonedTime(new Date(), TZ));
}

export { addDays };
