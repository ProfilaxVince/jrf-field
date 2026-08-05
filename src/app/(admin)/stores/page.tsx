"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/fr-BE";
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
  name: string;
  city: string;
  enseigne: string;
  region: string;
  jrf_revenue_eur: string;
};

const EMPTY_DRAFT: Draft = { name: "", city: "", enseigne: ENSEIGNES[0], region: REGIONS[0], jrf_revenue_eur: "" };

function draftToInsert(d: Draft): StoreInsert {
  return {
    name: d.name.trim(),
    city: d.city.trim(),
    enseigne: d.enseigne as StoreInsert["enseigne"],
    region: d.region as StoreInsert["region"],
    jrf_revenue_eur: d.jrf_revenue_eur ? Number(d.jrf_revenue_eur) : null,
    jrf_revenue_year: d.jrf_revenue_eur ? new Date().getFullYear() : null,
  };
}

type CsvRow = { data: Draft; valid: boolean; error?: string };

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = (lines.shift() ?? "").split(",").map((h) => h.trim().toLowerCase());
  const idx = (...keys: string[]) => keys.map((k) => header.indexOf(k)).find((i) => i >= 0) ?? -1;
  const nameIdx = idx("name", "nom");
  const cityIdx = idx("city", "ville");
  const enseigneIdx = idx("enseigne");
  const regionIdx = idx("region");
  const revenueIdx = idx("jrf_revenue_eur", "ca", "ca_jrf");

  return lines.map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const name = nameIdx >= 0 ? cols[nameIdx] : "";
    const city = cityIdx >= 0 ? cols[cityIdx] : "";
    const enseigne = enseigneIdx >= 0 ? cols[enseigneIdx].toLowerCase() : "";
    const region = regionIdx >= 0 ? cols[regionIdx].toLowerCase() : "";
    const revenue = revenueIdx >= 0 ? cols[revenueIdx] : "";

    const data: Draft = { name, city, enseigne, region, jrf_revenue_eur: revenue };
    if (!name || !city) return { data, valid: false, error: "Nom et ville obligatoires" };
    if (!ENSEIGNES.includes(enseigne as (typeof ENSEIGNES)[number]))
      return { data, valid: false, error: `Enseigne inconnue: ${enseigne || "(vide)"}` };
    if (!REGIONS.includes(region as (typeof REGIONS)[number]))
      return { data, valid: false, error: `Région inconnue: ${region || "(vide)"}` };
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
      name: s.name,
      city: s.city,
      enseigne: s.enseigne,
      region: s.region,
      jrf_revenue_eur: s.jrf_revenue_eur != null ? String(s.jrf_revenue_eur) : "",
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
                <input
                  className="w-full rounded border border-border px-3 py-2 text-base"
                  placeholder={t.stores.city}
                  value={draft.city}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value })}
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
                      <div>{r.data.city || "—"}</div>
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
                    {s.city} — {t.stores.enseigneLabels[s.enseigne] ?? s.enseigne}
                  </div>
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
