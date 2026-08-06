"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { listStores, type StoreRow } from "@/lib/data/stores";
import {
  definirResponsable,
  definirResponsableEnLot,
  listAssignments,
  type Assignment,
} from "@/lib/data/team";
import { listAppUsers, type AppUserRow } from "@/lib/data/users";
import { t } from "@/lib/i18n/fr-BE";

const AFFICHAGE_MAX = 60;

export default function PerimetresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [responsables, setResponsables] = useState<Map<string, string>>(new Map());
  const [recherche, setRecherche] = useState("");
  const [seulementNonAttribues, setSeulementNonAttribues] = useState(false);
  const [cible, setCible] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let monte = true;
    (async () => {
      try {
        const [s, u, a] = await Promise.all([listStores(), listAppUsers(), listAssignments()]);
        if (!monte) return;
        setStores(s);
        setUsers(u.filter((x) => x.porte_visites));
        setResponsables(new Map(a.map((x: Assignment) => [x.store_id, x.user_id])));
      } catch {
        if (monte) setErreur(t.priorities.loadError);
      } finally {
        if (monte) setLoading(false);
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  const filtres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return stores.filter((s) => {
      if (seulementNonAttribues && responsables.has(s.id)) return false;
      if (!terme) return true;
      return `${s.name} ${s.city}`.toLowerCase().includes(terme);
    });
  }, [stores, recherche, seulementNonAttribues, responsables]);

  async function changerResponsable(storeId: string, userId: string) {
    const precedent = responsables.get(storeId);
    setResponsables((prev) => {
      const copie = new Map(prev);
      if (userId) copie.set(storeId, userId);
      else copie.delete(storeId);
      return copie;
    });
    try {
      await definirResponsable(storeId, userId || null);
      setMessage(t.perimetres.saved);
      setErreur(null);
    } catch {
      setResponsables((prev) => {
        const copie = new Map(prev);
        if (precedent) copie.set(storeId, precedent);
        else copie.delete(storeId);
        return copie;
      });
      setErreur(t.perimetres.saveError);
    }
  }

  async function attribuerEnLot() {
    if (!cible || filtres.length === 0) return;
    const ids = filtres.map((s) => s.id);
    try {
      await definirResponsableEnLot(ids, cible);
      setResponsables((prev) => {
        const copie = new Map(prev);
        for (const id of ids) copie.set(id, cible);
        return copie;
      });
      const surnom = users.find((u) => u.id === cible)?.nickname ?? "";
      setMessage(t.perimetres.bulkDone(ids.length, surnom));
      setErreur(null);
    } catch {
      setErreur(t.perimetres.saveError);
    }
  }

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
            {t.perimetres.title}
          </h1>
          <p className="mt-1 text-base text-neutral-700">{t.perimetres.subtitle}</p>
          <p className="mt-1 text-base text-neutral-500">
            {t.perimetres.counts(responsables.size, stores.length)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="min-h-[44px] flex-1 rounded border border-border px-3 text-base"
            placeholder={t.perimetres.search}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <label className="flex min-h-[44px] items-center gap-2 text-base">
            <input
              type="checkbox"
              className="size-5"
              checked={seulementNonAttribues}
              onChange={(e) => setSeulementNonAttribues(e.target.checked)}
            />
            {t.perimetres.filterUnassignedOnly}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
          <span className="text-base">{t.perimetres.bulkTo}</span>
          <select
            className="min-h-[44px] rounded border border-border px-3 text-base"
            value={cible}
            onChange={(e) => setCible(e.target.value)}
          >
            <option value="">{t.perimetres.none}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nickname}
              </option>
            ))}
          </select>
          <Button onClick={attribuerEnLot} disabled={!cible || filtres.length === 0}>
            {t.perimetres.bulkApply(filtres.length)}
          </Button>
        </div>

        {erreur && <p className="text-base text-state-critical">{erreur}</p>}
        {message && !erreur && <p className="text-base text-neutral-700">{message}</p>}

        {loading ? (
          <p className="text-base text-neutral-500">{t.common.loading}</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {filtres.slice(0, AFFICHAGE_MAX).map((store) => {
              const responsableId = responsables.get(store.id) ?? "";
              const couleur = users.find((u) => u.id === responsableId)?.color_hex;
              return (
                <li
                  key={store.id}
                  className="flex items-center gap-3 border-l-4 border-border bg-card px-4 py-2"
                  style={couleur ? { borderLeftColor: couleur } : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{store.name}</p>
                    <p className="truncate text-sm text-neutral-500">{store.city}</p>
                  </div>
                  <select
                    aria-label={`${t.perimetres.assignedTo} — ${store.name}`}
                    className="min-h-[44px] rounded border border-border px-2 text-base"
                    value={responsableId}
                    onChange={(e) => changerResponsable(store.id, e.target.value)}
                  >
                    <option value="">{t.perimetres.unassigned}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nickname}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
        {filtres.length > AFFICHAGE_MAX && (
          <p className="text-base text-neutral-500">
            {t.perimetres.moreHidden(filtres.length - AFFICHAGE_MAX)}
          </p>
        )}
      </div>
    </main>
  );
}
