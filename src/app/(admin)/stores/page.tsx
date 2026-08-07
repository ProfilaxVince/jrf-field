"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/fr-BE";
import { ListeGroupee } from "@/components/store/liste-groupee";
import { parseDelimited } from "@/lib/csv";
import { detailErreur, estConflitDeCle } from "@/lib/data/erreurs";
import { enregistrerRevenu } from "@/lib/data/revenus";
import { ExercicesCa } from "@/components/store/exercices-ca";
import {
  ENSEIGNES,
  REGIONS,
  createStore,
  importStores,
  listStores,
  softDeleteStore,
  updateStore,
  type StoreInsert,
  type StoreRow,
} from "@/lib/data/stores";

type Draft = {
  id?: string;
  external_ref: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  enseigne: string;
  reseau: string;
  region: string;
  lat: string;
  lng: string;
  adherent_name: string;
  adherent_phone: string;
  fl_manager_name: string;
  fl_manager_phone: string;
  jrf_revenue_eur: string;
  jrf_revenue_year: string;
};

const EMPTY_DRAFT: Draft = {
  external_ref: "",
  name: "",
  address: "",
  postal_code: "",
  city: "",
  enseigne: ENSEIGNES[0],
  reseau: "",
  region: REGIONS[0],
  lat: "",
  lng: "",
  adherent_name: "",
  adherent_phone: "",
  fl_manager_name: "",
  fl_manager_phone: "",
  jrf_revenue_eur: "",
  jrf_revenue_year: "",
};

/**
 * Nombre écrit à l'européenne : « 68.000,50 », « 68 000 € », « 68000 ».
 * Un `Number()` direct renvoie NaN sur les trois premières formes — et un CA
 * à NaN devient un magasin sans chiffre d'affaires, donc mal catégorisé.
 */
function nombreOuNull(valeur: string): number | null {
  const brut = valeur.replace(/[^\d.,-]/g, "").trim();
  if (!brut) return null;
  const aVirgule = brut.includes(",");
  const aPoint = brut.includes(".");
  let normalise = brut;
  if (aVirgule && aPoint) {
    // Le dernier séparateur rencontré est le décimal.
    normalise =
      brut.lastIndexOf(",") > brut.lastIndexOf(".")
        ? brut.replace(/\./g, "").replace(",", ".")
        : brut.replace(/,/g, "");
  } else if (aVirgule) {
    normalise = brut.replace(",", ".");
  } else if (aPoint && /\.\d{3}(\D|$)/.test(brut)) {
    normalise = brut.replace(/\./g, ""); // « 68.000 » = milliers, pas décimales
  }
  const n = Number(normalise);
  return Number.isFinite(n) ? n : null;
}

/** Débarrasse un libellé de sa casse, de ses accents et de sa ponctuation. */
function simplifier(valeur: string): string {
  return valeur
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Les enseignes telles qu'un humain les écrit — « Intermarché », « AD Delhaize »,
 * « ITM ». Exiger les valeurs techniques du schéma reviendrait à demander à
 * Gérardo de retravailler son fichier Excel avant chaque import.
 * L'ordre compte : « AD Delhaize » et « Proxy Delhaize » contiennent tous deux
 * « delhaize », ils doivent être reconnus AVANT le Delhaize seul.
 */
function reconnaitreEnseigne(valeur: string): string {
  const v = simplifier(valeur);
  if (!v) return "";
  if (v.includes("proxy")) return "proxy_delhaize";
  if (v.includes("addelhaize") || v === "ad" || v.startsWith("ad") && v.includes("delhaize"))
    return "ad_delhaize";
  if (v.includes("intermarche") || v.includes("itm")) return "intermarche";
  if (v.includes("spar")) return "spar";
  if (v.includes("delhaize")) return "delhaize";
  return v;
}

/**
 * Réseau : « BY » (Intermarché by Mestdagh), indépendant, affilié, intégré.
 * Valeur facultative — un réseau non reconnu est laissé vide plutôt que de
 * faire échouer la ligne : ce n'est pas une information critique.
 */
function reconnaitreReseau(valeur: string): string {
  const v = simplifier(valeur);
  if (!v) return "";
  if (v.includes("mestdagh") || v === "by" || v.includes("bymestdagh")) return "by_mestdagh";
  if (v.includes("independ") || v.includes("inde")) return "independant";
  if (v.includes("affili")) return "affilie";
  if (v.includes("integr")) return "integre";
  return "";
}

function reconnaitreRegion(valeur: string): string {
  const v = simplifier(valeur);
  if (!v) return "";
  if (v.includes("wallon")) return "wallonie";
  if (v.includes("brux") || v.includes("brussel") || v === "bxl" || v.includes("bruxelles"))
    return "bruxelles";
  if (v.includes("fland") || v.includes("vlaand") || v.includes("flemish")) return "flandre";
  return v;
}

/**
 * Région déduite du code postal belge, quand la colonne est absente du fichier.
 * Découpage officiel : 1000-1299 Bruxelles, puis alternance Flandre/Wallonie.
 * Ce n'est pas une supposition confortable, c'est la règle postale belge —
 * mais elle n'est appliquée QUE si la colonne région manque.
 */
function regionDepuisCodePostal(codePostal: string): string {
  const cp = Number(codePostal.replace(/\D/g, "").slice(0, 4));
  if (!Number.isFinite(cp) || cp < 1000 || cp > 9999) return "";
  if (cp < 1300) return "bruxelles";
  if (cp < 1500) return "wallonie"; // Brabant wallon
  if (cp < 4000) return "flandre"; // Brabant flamand, Anvers, Limbourg
  if (cp < 8000) return "wallonie"; // Liège, Namur, Luxembourg, Hainaut
  return "flandre"; // Flandre occidentale et orientale
}

function draftToInsert(d: Draft): StoreInsert {
  return {
    external_ref: d.external_ref.trim() || null,
    name: d.name.trim(),
    address: d.address.trim() || null,
    postal_code: d.postal_code.trim() || null,
    city: d.city.trim(),
    enseigne: d.enseigne as StoreInsert["enseigne"],
    network: (d.reseau || null) as StoreInsert["network"],
    region: d.region as StoreInsert["region"],
    lat: nombreOuNull(d.lat),
    lng: nombreOuNull(d.lng),
    adherent_name: d.adherent_name.trim() || null,
    adherent_phone: d.adherent_phone.trim() || null,
    fl_manager_name: d.fl_manager_name.trim() || null,
    fl_manager_phone: d.fl_manager_phone.trim() || null,
    // `jrf_revenue_eur` et `jrf_revenue_year` ne sont PAS écrits ici : depuis
    // la migration 00018 ils sont dérivés de `store_revenues` par trigger.
    // Les poser en direct ferait diverger le magasin de son propre historique
    // jusqu'à la prochaine saisie de CA.
  };
}

type CsvRow = { data: Draft; valid: boolean; error?: string };

/**
 * En-têtes acceptés, en français comme en anglais. Le fichier réel vient
 * d'Excel : on ne peut pas exiger des noms de colonnes techniques.
 * Les coordonnées sont importées si elles existent — sans elles, « Y aller »
 * et le rangement par trajet ne fonctionnent pas.
 */
const ALIAS: Record<keyof Omit<Draft, "id">, string[]> = {
  external_ref: ["external_ref", "ref", "reference", "code", "id"],
  name: ["name", "nom", "magasin", "enseigne_magasin"],
  address: ["address", "adresse", "rue"],
  postal_code: ["postal_code", "code_postal", "cp", "npa"],
  city: ["city", "ville", "commune", "localite"],
  enseigne: ["enseigne", "chaine", "chaîne"],
  reseau: ["reseau", "réseau", "network", "type"],
  region: ["region", "région", "province"],
  lat: ["lat", "latitude"],
  lng: ["lng", "lon", "long", "longitude"],
  adherent_name: ["adherent_name", "adherent", "adhérent", "exploitant", "patron", "gerant", "gérant"],
  adherent_phone: ["adherent_phone", "telephone_adherent", "tel_adherent", "gsm_adherent"],
  fl_manager_name: [
    "fl_manager_name", "contact_name", "contact", "chef_de_rayon",
    "responsable", "responsable_fl", "responsable_fruits_et_legumes",
  ],
  fl_manager_phone: [
    "fl_manager_phone", "contact_phone", "telephone", "téléphone", "tel", "gsm",
  ],
  jrf_revenue_eur: ["jrf_revenue_eur", "ca_jrf", "ca", "chiffre_affaires", "montant"],
  jrf_revenue_year: ["jrf_revenue_year", "exercice", "annee", "année"],
};

function normaliser(entete: string): string {
  return entete
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function parseCsv(text: string): CsvRow[] {
  const lignes = parseDelimited(text);
  if (lignes.length < 2) return [];
  const entetes = (lignes.shift() as string[]).map(normaliser);

  const indexDe = (champ: keyof Omit<Draft, "id">): number => {
    for (const alias of ALIAS[champ]) {
      const i = entetes.indexOf(normaliser(alias));
      if (i >= 0) return i;
    }
    return -1;
  };
  const positions = Object.fromEntries(
    (Object.keys(ALIAS) as (keyof Omit<Draft, "id">)[]).map((champ) => [champ, indexDe(champ)])
  ) as Record<keyof Omit<Draft, "id">, number>;

  return lignes.map((cols) => {
    const lire = (champ: keyof Omit<Draft, "id">) =>
      positions[champ] >= 0 ? (cols[positions[champ]] ?? "") : "";

    const data: Draft = {
      external_ref: lire("external_ref"),
      name: lire("name"),
      address: lire("address"),
      postal_code: lire("postal_code"),
      city: lire("city"),
      enseigne: reconnaitreEnseigne(lire("enseigne")),
      reseau: reconnaitreReseau(lire("reseau")),
      // Sans colonne région, on la déduit du code postal plutôt que de rejeter
      // la ligne : c'est une information mécanique, pas un choix métier.
      region: reconnaitreRegion(lire("region")) || regionDepuisCodePostal(lire("postal_code")),
      lat: lire("lat"),
      lng: lire("lng"),
      adherent_name: lire("adherent_name"),
      adherent_phone: lire("adherent_phone"),
      fl_manager_name: lire("fl_manager_name"),
      fl_manager_phone: lire("fl_manager_phone"),
      jrf_revenue_eur: lire("jrf_revenue_eur"),
      jrf_revenue_year: lire("jrf_revenue_year"),
    };

    if (!data.name || !data.city) return { data, valid: false, error: "Nom et ville obligatoires" };
    if (!ENSEIGNES.includes(data.enseigne as (typeof ENSEIGNES)[number]))
      return {
        data,
        valid: false,
        error: `Enseigne non reconnue : « ${lire("enseigne") || "(vide)"} »`,
      };
    if (!REGIONS.includes(data.region as (typeof REGIONS)[number]))
      return {
        data,
        valid: false,
        error: `Région non reconnue et code postal absent ou hors Belgique : « ${lire("region") || "(vide)"} »`,
      };
    return { data, valid: true };
  });
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"add" | "import" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [removedNotice, setRemovedNotice] = useState<{ id: string; name: string } | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setStores(await listStores());
      setError(null);
    } catch {
      setError("Impossible de charger les magasins. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function startAdd() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setPanel("add");
  }

  function startEdit(s: StoreRow) {
    setDraft({
      id: s.id,
      external_ref: s.external_ref ?? "",
      name: s.name,
      reseau: s.network ?? "",
      address: s.address ?? "",
      postal_code: s.postal_code ?? "",
      city: s.city,
      enseigne: s.enseigne,
      region: s.region,
      lat: s.lat != null ? String(s.lat) : "",
      lng: s.lng != null ? String(s.lng) : "",
      adherent_name: s.adherent_name ?? "",
      adherent_phone: s.adherent_phone ?? "",
      fl_manager_name: s.fl_manager_name ?? "",
      fl_manager_phone: s.fl_manager_phone ?? "",
      jrf_revenue_eur: s.jrf_revenue_eur != null ? String(s.jrf_revenue_eur) : "",
      jrf_revenue_year: s.jrf_revenue_year != null ? String(s.jrf_revenue_year) : "",
    });
    setEditingId(s.id);
    setPanel("add");
  }

  async function submitDraft() {
    if (!draft.name.trim() || !draft.city.trim()) return;
    setSaving(true);
    try {
      const ligne = editingId
        ? await updateStore(editingId, draftToInsert(draft))
        : await createStore(draftToInsert(draft));

      const montant = nombreOuNull(draft.jrf_revenue_eur);
      const exercice = nombreOuNull(draft.jrf_revenue_year) ?? new Date().getFullYear();
      let apres = ligne;
      if (montant !== null) {
        await enregistrerRevenu(ligne.id, exercice, montant);
        // On applique localement la même règle que le trigger — l'exercice le
        // plus récent gagne — plutôt que de relire tout le parc pour deux
        // champs.
        if (ligne.jrf_revenue_year === null || exercice >= ligne.jrf_revenue_year) {
          apres = { ...ligne, jrf_revenue_eur: montant, jrf_revenue_year: exercice };
        }
      }

      setStores((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? apres : s))
          : [...prev, apres].sort((a, b) => a.name.localeCompare(b.name))
      );
      setPanel(null);
      setEditingId(null);
    } catch (e) {
      const detail = detailErreur(e);
      setError(`Enregistrement impossible.${detail ? ` (${detail})` : ""}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(s: StoreRow) {
    setStores((prev) => prev.filter((p) => p.id !== s.id));
    setRemovedNotice({ id: s.id, name: s.name });
    try {
      await softDeleteStore(s.id);
    } catch {
      setError("Le retrait n'a pas pu être enregistré. Réessaie.");
      setStores((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
      setRemovedNotice(null);
      return;
    }
    setTimeout(() => setRemovedNotice((cur) => (cur?.id === s.id ? null : cur)), 10_000);
  }

  async function undoRemove() {
    if (!removedNotice) return;
    const { id } = removedNotice;
    try {
      const restored = await updateStore(id, { active: true });
      setStores((prev) => [...prev, restored].sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      setError("Impossible d'annuler. Réessaie depuis l'import.");
    }
    setRemovedNotice(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvRows(parseCsv(String(reader.result ?? "")));
      setPanel("import");
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!csvRows || csvRows.some((r) => !r.valid)) return;

    // Les références déjà en base se voient AVANT d'écrire : la base répondrait
    // « duplicate key » sur la première seulement, sans dire laquelle ni
    // combien. Ici on les nomme, et l'import n'a rien tenté.
    const dejaPrises = csvRows
      .map((r) => r.data.external_ref.trim())
      .filter((ref) => ref && stores.some((s) => s.external_ref === ref));
    if (dejaPrises.length > 0) {
      setError(t.stores.importRefsExistantes(dejaPrises));
      return;
    }

    setSaving(true);
    try {
      const inserted = await importStores(csvRows.map((r) => draftToInsert(r.data)));
      // Le CA du fichier va dans l'historique, pas dans `stores` : même règle
      // que la saisie à l'écran.
      await Promise.all(
        inserted.map((ligne, i) => {
          const brut = csvRows[i]?.data;
          const montant = brut ? nombreOuNull(brut.jrf_revenue_eur) : null;
          if (montant === null) return null;
          const exercice = nombreOuNull(brut!.jrf_revenue_year) ?? new Date().getFullYear();
          return enregistrerRevenu(ligne.id, exercice, montant);
        })
      );
      setStores((prev) => [...prev, ...inserted].sort((a, b) => a.name.localeCompare(b.name)));
      setCsvRows(null);
      setPanel(null);
    } catch (e) {
      // La cause exacte compte : un doublon de référence ne se corrige pas
      // comme un fichier mal formé, et « import impossible » n'aide personne.
      // Tout ce que la base a dit est repris, `hint` compris — c'est souvent là
      // qu'est la correction à appliquer.
      const detail = detailErreur(e);
      setError(
        estConflitDeCle(e)
          ? `${t.stores.importDuplicate}${detail ? ` (${detail})` : ""}`
          : `${t.stores.importFailed}${detail ? ` (${detail})` : ""}`
      );
    } finally {
      setSaving(false);
    }
  }

  const invalidCount = csvRows?.filter((r) => !r.valid).length ?? 0;

  // La recherche filtre AVANT le regroupement : les compteurs affichés
  // correspondent donc toujours à ce qui est réellement à l'écran.
  const filtres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return stores;
    return stores.filter((s) =>
      `${s.name} ${s.city} ${s.postal_code ?? ""} ${s.address ?? ""} ${s.external_ref ?? ""}`
        .toLowerCase()
        .includes(terme)
    );
  }, [stores, recherche]);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-jrf-green-800">{t.stores.title}</h1>
          <div className="flex gap-2">
            <label>
              <input type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
              <Button variant="outline" asChild>
                <span>{t.stores.importCsv}</span>
              </Button>
            </label>
            <Button onClick={startAdd}>{t.stores.addStore}</Button>
          </div>
        </div>

        {error && <p className="text-base text-[color:var(--state-critical)]">{error}</p>}

        {removedNotice && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3">
            <span className="text-base">{t.stores.removed(removedNotice.name)}</span>
            <Button variant="ghost" size="default" onClick={undoRemove}>
              {t.common.undo}
            </Button>
          </div>
        )}

        {panel === "add" && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? t.stores.edit : t.stores.addStore}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <input
                  className="w-full rounded border border-border px-3 py-2 text-base"
                  placeholder={t.stores.name}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    className="rounded border border-border px-3 py-2 text-base"
                    placeholder={t.stores.postalCode}
                    value={draft.postal_code}
                    onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })}
                  />
                  <input
                    className="col-span-2 rounded border border-border px-3 py-2 text-base"
                    placeholder={t.stores.city}
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  />
                </div>
                <input
                  className="w-full rounded border border-border px-3 py-2 text-base"
                  placeholder={t.stores.address}
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="rounded border border-border px-3 py-2 text-base"
                    value={draft.enseigne}
                    onChange={(e) => setDraft({ ...draft, enseigne: e.target.value })}
                  >
                    {ENSEIGNES.map((v) => (
                      <option key={v} value={v}>
                        {t.stores.enseigneLabels[v]}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded border border-border px-3 py-2 text-base"
                    value={draft.region}
                    onChange={(e) => setDraft({ ...draft, region: e.target.value })}
                  >
                    {REGIONS.map((v) => (
                      <option key={v} value={v}>
                        {t.stores.regionLabels[v]}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Le CA est saisi POUR UN EXERCICE. Depuis 00018 il ne remplace
                    plus le précédent : il s'ajoute à l'historique du magasin. */}
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="w-full rounded border border-border px-3 py-2 text-base"
                    placeholder={t.stores.revenue}
                    inputMode="numeric"
                    value={draft.jrf_revenue_eur}
                    onChange={(e) =>
                      setDraft({ ...draft, jrf_revenue_eur: e.target.value.replace(/\D/g, "") })
                    }
                  />
                  <input
                    className="w-full rounded border border-border px-3 py-2 text-base"
                    placeholder={`${t.stores.revenueYear} (${new Date().getFullYear()})`}
                    inputMode="numeric"
                    value={draft.jrf_revenue_year}
                    onChange={(e) =>
                      setDraft({ ...draft, jrf_revenue_year: e.target.value.replace(/\D/g, "").slice(0, 4) })
                    }
                  />
                </div>
                <p className="text-sm text-neutral-600">{t.stores.revenueYearHint}</p>

                {editingId && (
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">{t.stores.revenueHistory}</h3>
                    <ExercicesCa storeId={editingId} />
                  </div>
                )}

                {/* Les deux contacts du magasin. Saisis ici par le responsable,
                    lus par les commerciaux sur le terrain — jamais modifiés
                    par eux (décision du 06/08). */}
                <fieldset className="space-y-2">
                  <legend className="text-base font-semibold">{t.stores.adherent}</legend>
                  <input
                    className="w-full rounded border border-border px-3 py-2 text-base"
                    placeholder={t.stores.contactName}
                    value={draft.adherent_name}
                    onChange={(e) => setDraft({ ...draft, adherent_name: e.target.value })}
                  />
                  <input
                    className="w-full rounded border border-border px-3 py-2 text-base"
                    placeholder={t.stores.contactPhone}
                    type="tel"
                    value={draft.adherent_phone}
                    onChange={(e) => setDraft({ ...draft, adherent_phone: e.target.value })}
                  />
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="text-base font-semibold">{t.stores.flManager}</legend>
                  <input
                    className="w-full rounded border border-border px-3 py-2 text-base"
                    placeholder={t.stores.contactName}
                    value={draft.fl_manager_name}
                    onChange={(e) => setDraft({ ...draft, fl_manager_name: e.target.value })}
                  />
                  <input
                    className="w-full rounded border border-border px-3 py-2 text-base"
                    placeholder={t.stores.contactPhone}
                    type="tel"
                    value={draft.fl_manager_phone}
                    onChange={(e) => setDraft({ ...draft, fl_manager_phone: e.target.value })}
                  />
                </fieldset>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setPanel(null)}>
                    {t.common.cancel}
                  </Button>
                  <Button
                    onClick={submitDraft}
                    disabled={saving || !draft.name.trim() || !draft.city.trim()}
                  >
                    {t.common.save}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {panel === "import" && csvRows && (
          <Card>
            <CardHeader>
              <CardTitle>{t.stores.importPreviewTitle(csvRows.length)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invalidCount > 0 && (
                  <p className="text-base text-[color:var(--state-critical)]">{t.stores.invalidRows(invalidCount)}</p>
                )}
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {csvRows.map((r, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-4 gap-2 rounded px-2 py-1 text-base ${r.valid ? "" : "bg-[color:var(--state-critical-tint)]"}`}
                    >
                      <div>{r.data.name || "—"}</div>
                      <div>
                        {r.data.postal_code} {r.data.city || "—"}
                      </div>
                      <div>{r.data.jrf_revenue_eur || "-"}</div>
                      <div className="text-sm">{r.error ?? "OK"}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={confirmImport} disabled={saving || invalidCount > 0}>
                    {t.stores.confirmImport}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCsvRows(null);
                      setPanel(null);
                    }}
                  >
                    {t.stores.cancelImport}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="min-h-[44px] flex-1 rounded border border-border px-3 text-base"
            placeholder={t.stores.search}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <span className="text-base text-neutral-600">
            {recherche.trim()
              ? t.stores.searchResults(filtres.length, stores.length)
              : t.stores.total(stores.length)}
          </span>
        </div>

        {loading ? (
          <p className="text-base text-neutral-600">{t.common.loading}</p>
        ) : stores.length === 0 ? (
          <p className="text-base text-neutral-600">{t.stores.empty}</p>
        ) : filtres.length === 0 ? (
          <p className="text-base text-neutral-600">{t.stores.noMatch}</p>
        ) : (
          <ListeGroupee magasins={filtres} onModifier={startEdit} onRetirer={handleRemove} />
        )}

      </div>
    </main>
  );
}
