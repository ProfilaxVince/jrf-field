"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/fr-BE";
import { parseDelimited } from "@/lib/csv";
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
  region: string;
  lat: string;
  lng: string;
  contact_name: string;
  contact_phone: string;
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
  region: REGIONS[0],
  lat: "",
  lng: "",
  contact_name: "",
  contact_phone: "",
  jrf_revenue_eur: "",
  jrf_revenue_year: "",
};

function nombreOuNull(valeur: string): number | null {
  if (!valeur.trim()) return null;
  const n = Number(valeur.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

function draftToInsert(d: Draft): StoreInsert {
  return {
    external_ref: d.external_ref.trim() || null,
    name: d.name.trim(),
    address: d.address.trim() || null,
    postal_code: d.postal_code.trim() || null,
    city: d.city.trim(),
    enseigne: d.enseigne as StoreInsert["enseigne"],
    region: d.region as StoreInsert["region"],
    lat: nombreOuNull(d.lat),
    lng: nombreOuNull(d.lng),
    contact_name: d.contact_name.trim() || null,
    contact_phone: d.contact_phone.trim() || null,
    jrf_revenue_eur: nombreOuNull(d.jrf_revenue_eur),
    jrf_revenue_year:
      nombreOuNull(d.jrf_revenue_year) ??
      (d.jrf_revenue_eur.trim() ? new Date().getFullYear() : null),
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
  region: ["region", "région", "province"],
  lat: ["lat", "latitude"],
  lng: ["lng", "lon", "long", "longitude"],
  contact_name: ["contact_name", "contact", "chef_de_rayon", "responsable"],
  contact_phone: ["contact_phone", "telephone", "téléphone", "tel", "gsm"],
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
      enseigne: lire("enseigne").toLowerCase().replace(/[^a-z_]/g, ""),
      region: lire("region").toLowerCase().replace(/[^a-z_]/g, ""),
      lat: lire("lat"),
      lng: lire("lng"),
      contact_name: lire("contact_name"),
      contact_phone: lire("contact_phone"),
      jrf_revenue_eur: lire("jrf_revenue_eur"),
      jrf_revenue_year: lire("jrf_revenue_year"),
    };

    if (!data.name || !data.city) return { data, valid: false, error: "Nom et ville obligatoires" };
    if (!ENSEIGNES.includes(data.enseigne as (typeof ENSEIGNES)[number]))
      return { data, valid: false, error: `Enseigne inconnue : ${data.enseigne || "(vide)"}` };
    if (!REGIONS.includes(data.region as (typeof REGIONS)[number]))
      return { data, valid: false, error: `Région inconnue : ${data.region || "(vide)"}` };
    return { data, valid: true };
  });
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
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
      address: s.address ?? "",
      postal_code: s.postal_code ?? "",
      city: s.city,
      enseigne: s.enseigne,
      region: s.region,
      lat: s.lat != null ? String(s.lat) : "",
      lng: s.lng != null ? String(s.lng) : "",
      contact_name: s.contact_name ?? "",
      contact_phone: s.contact_phone ?? "",
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
      if (editingId) {
        const updated = await updateStore(editingId, draftToInsert(draft));
        setStores((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      } else {
        const created = await createStore(draftToInsert(draft));
        setStores((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setPanel(null);
      setEditingId(null);
    } catch {
      setError("Enregistrement impossible. Vérifie les champs et réessaie.");
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
    setSaving(true);
    try {
      const inserted = await importStores(csvRows.map((r) => draftToInsert(r.data)));
      setStores((prev) => [...prev, ...inserted].sort((a, b) => a.name.localeCompare(b.name)));
      setCsvRows(null);
      setPanel(null);
    } catch {
      setError("Import impossible. Vérifie le fichier et réessaie.");
    } finally {
      setSaving(false);
    }
  }

  const invalidCount = csvRows?.filter((r) => !r.valid).length ?? 0;

  return (
    <main className="p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
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
                <input
                  className="w-full rounded border border-border px-3 py-2 text-base"
                  placeholder={t.stores.revenue}
                  inputMode="numeric"
                  value={draft.jrf_revenue_eur}
                  onChange={(e) => setDraft({ ...draft, jrf_revenue_eur: e.target.value.replace(/\D/g, "") })}
                />
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

        {loading ? (
          <p className="text-base text-neutral-600">{t.common.loading}</p>
        ) : stores.length === 0 ? (
          <p className="text-base text-neutral-600">{t.stores.empty}</p>
        ) : (
          <div className="space-y-3">
            {stores.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div>
                  <div className="text-lg font-semibold">{s.name}</div>
                  <div className="text-sm text-neutral-600">
                    {s.postal_code ? `${s.postal_code} ` : ""}
                    {s.city} — {t.stores.enseigneLabels[s.enseigne] ?? s.enseigne}
                  </div>
                  {/* Adresse et référence affichées : sans elles, deux magasins
                      homonymes dans la même ville sont impossibles à distinguer. */}
                  {(s.address || s.external_ref) && (
                    <div className="text-sm text-neutral-500">
                      {s.address ?? ""}
                      {s.address && s.external_ref ? " · " : ""}
                      {s.external_ref ?? ""}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => startEdit(s)}>
                    {t.stores.edit}
                  </Button>
                  <Button variant="destructive" onClick={() => handleRemove(s)}>
                    {t.stores.remove}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
