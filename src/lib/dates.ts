/**
 * Dates : stockage UTC, affichage Europe/Brussels, semaine ISO (lundi).
 * Un seul endroit pour formater — aucun composant ne construit une date à la main.
 */
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

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
  return joursSemaine(date, false);
}

/**
 * Les jours de la semaine d'une date. Avec `avecWeekEnd`, samedi et dimanche
 * suivent — le dépannage du week-end est rare, mais il existe (06/08/2026).
 */
export function joursSemaine(date: Date = new Date(), avecWeekEnd = true): Date[] {
  const lundi = lundiDeLaSemaine(date);
  const n = avecWeekEnd ? 7 : 5;
  return Array.from({ length: n }, (_, i) => addDays(lundi, i));
}

/** Samedi ou dimanche. */
export function estWeekEnd(jourISOStr: string): boolean {
  const j = new Date(`${jourISOStr}T12:00:00`).getDay();
  return j === 0 || j === 6;
}

export function numeroSemaineISO(date: Date = new Date()): number {
  return Number(format(toZonedTime(date, TZ), "I", { locale: fr }));
}

export function estAujourdhui(value: string | Date): boolean {
  const date = typeof value === "string" ? parseISO(value) : value;
  return isSameDay(toZonedTime(date, TZ), toZonedTime(new Date(), TZ));
}

export { addDays };

/**
 * Un jour et une heure LOCALE belge deviennent un instant UTC.
 *
 * Passer par `fromZonedTime` et non par un décalage écrit en dur : la Belgique
 * est à UTC+2 l'été et UTC+1 l'hiver. Un « +02:00 » codé en dur décale de
 * soixante minutes la moitié de l'année — une erreur invisible qui fausserait
 * les durées de visite reconstituées depuis le fichier de l'informatique.
 */
export function instantLocal(jour: string, heure: string): string {
  return fromZonedTime(`${jour}T${heure}:00`, TZ).toISOString();
}
