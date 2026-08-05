"use client";
import { useState } from "react";
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalStores, type SimpleStore } from "@/lib/data/localStores";

function parseCSV(text: string): SimpleStore[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split(",").map((h) => h.trim().toLowerCase()) || [];
  const idx = (k: string) => header.indexOf(k);
  return lines.map((ln) => {
    const cols = ln.split(",").map((c) => c.trim());
    return {
      id: makeId(),
      name: cols[idx("name")] || cols[idx("nom")] || "Magasin sans nom",
      city: cols[idx("city")] || cols[idx("ville")] || "",
      enseigne: cols[idx("enseigne")] || "",
      region: (cols[idx("region")] || "") as SimpleStore["region"],
      lat: cols[idx("lat")] ? Number(cols[idx("lat")]) : null,
      lng: cols[idx("lng")] ? Number(cols[idx("lng")]) : null,
      jrf_revenue_eur: cols[idx("jrf_revenue_eur")] ? Number(cols[idx("jrf_revenue_eur")]) : null,
      active: true,
    };
  });
}

export default function AdminStoresPage() {
  const { stores, upsert, remove, importList } = useLocalStores();
  const [editing, setEditing] = useState<SimpleStore | null>(null);
  const [preview, setPreview] = useState<SimpleStore[] | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCSV(text).map((p) => ({ ...p, id: makeId() }));
      setPreview(parsed);
    };
    reader.readAsText(f);
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-2xl font-semibold">Magasins — CRUD & Import CSV</h1>

          <div className="mb-4 flex gap-2">
          <Button onClick={() => setEditing({ id: makeId(), name: "", active: true })}>Ajouter un magasin</Button>
          <label className="cursor-pointer">
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
            <Button>Importer CSV</Button>
          </label>
        </div>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Import — aperçu ({preview.length} lignes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 font-medium">
                  <div>Nom</div>
                  <div>Ville</div>
                  <div>CA JRF</div>
                </div>
                {preview.slice(0, 30).map((s) => (
                  <div key={s.id} className="grid grid-cols-3 gap-2 py-1">
                    <div>{s.name}</div>
                    <div>{s.city}</div>
                    <div>{s.jrf_revenue_eur ?? "-"}</div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={() => { importList(preview); setPreview(null); }}>Valider l&apos;import</Button>
                  <Button variant="secondary" onClick={() => setPreview(null)}>Annuler</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 space-y-3">
          {stores.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div>
                <div className="text-lg font-semibold">{s.name}</div>
                <div className="text-sm text-neutral-600">{s.city} — {s.enseigne}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(s)}>Modifier</Button>
                <Button variant="destructive" onClick={() => remove(s.id)}>Supprimer</Button>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
            <div className="w-full max-w-lg rounded-lg bg-card p-6">
              <h2 className="mb-3 text-lg font-semibold">{editing.name ? 'Modifier' : 'Nouveau'} magasin</h2>
              <div className="space-y-3">
                <input className="w-full rounded border border-border px-3 py-2" placeholder="Nom" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <input className="w-full rounded border border-border px-3 py-2" placeholder="Ville" value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
                <div className="flex gap-2">
                  <input className="flex-1 rounded border border-border px-3 py-2" placeholder="Enseigne" value={editing.enseigne || ''} onChange={(e) => setEditing({ ...editing, enseigne: e.target.value })} />
                  <input className="w-40 rounded border border-border px-3 py-2" placeholder="CA JRF" value={editing.jrf_revenue_eur ?? ''} onChange={(e) => setEditing({ ...editing, jrf_revenue_eur: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setEditing(null)}>Annuler</Button>
                  <Button onClick={() => { upsert(editing); setEditing(null); }}>Enregistrer</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
