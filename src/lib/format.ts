/** Nombres et montants au format belge francophone (virgule décimale, EUR). */
const NOMBRE = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("fr-BE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const EUROS = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatNombre(valeur: number | null | undefined): string {
  return valeur === null || valeur === undefined ? "—" : NOMBRE.format(valeur);
}

export function formatDecimal(valeur: number | null | undefined): string {
  return valeur === null || valeur === undefined ? "—" : DECIMAL.format(valeur);
}

export function formatPourcent(valeur: number | null | undefined): string {
  return valeur === null || valeur === undefined ? "—" : `${DECIMAL.format(valeur)} %`;
}

export function formatEuros(valeur: number | null | undefined): string {
  return valeur === null || valeur === undefined ? "—" : EUROS.format(valeur);
}
