"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  changerStatutIncident,
  listIncidents,
  listRelaisCentrale,
  type IncidentRow,
} from "@/lib/data/incidents";
import { listStores, type StoreRow } from "@/lib/data/stores";
import { listAppUsers, type AppUserRow } from "@/lib/data/users";
import type { VisitRow } from "@/lib/data/planning";
import type { CompteRendu } from "@/lib/domain/compte-rendu";
import { addDays, formatDate, jourISO } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";

const HISTORIQUE_JOURS = 30;

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [relais, setRelais] = useState<VisitRow[]>([]);
  const [magasins, setMagasins] = useState<StoreRow[]>([]);
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let monte = true;
    (async () => {
      try {
        const depuis = jourISO(addDays(new Date(), -HISTORIQUE_JOURS));
        const [i, r, s, u] = await Promise.all([
          listIncidents(["ouvert", "en_cours"]),
          listRelaisCentrale(depuis),
          listStores(),
          listAppUsers(),
        ]);
        if (!monte) return;
        setIncidents(i);
        setRelais(r);
        setMagasins(s);
        setUsers(u);
      } catch {
        if (monte) setErreur(t.incidents.loadError);
      } finally {
        if (monte) setLoading(false);
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  const nomMagasin = useMemo(() => new Map(magasins.map((m) => [m.id, m.name])), [magasins]);
  const surnom = useMemo(() => new Map(users.map((u) => [u.id, u.nickname])), [users]);

  async function changer(incident: IncidentRow, statut: "en_cours" | "resolu") {
    const precedent = incidents;
    setIncidents((prev) =>
      statut === "resolu"
        ? prev.filter((i) => i.id !== incident.id)
        : prev.map((i) => (i.id === incident.id ? { ...i, status: statut } : i))
    );
    try {
      await changerStatutIncident(incident.id, statut);
      setErreur(null);
    } catch {
      setIncidents(precedent);
      setErreur(t.incidents.saveError);
    }
  }

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
          {t.incidents.title}
        </h1>

        {erreur && <p className="text-base text-state-critical">{erreur}</p>}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t.incidents.openOnes}</h2>
          {loading ? (
            <p className="text-base text-neutral-500">{t.common.loading}</p>
          ) : incidents.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-4 py-6 text-base">
              {t.incidents.empty}
            </p>
          ) : (
            <ul className="space-y-2">
              {incidents.map((incident) => (
                <li
                  key={incident.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold">
                      {nomMagasin.get(incident.store_id) ?? "—"}
                    </p>
                    <p className="text-base text-neutral-700">
                      {t.incidents.types[incident.incident_type]} ·{" "}
                      {t.incidents.criticites[incident.criticality]}
                    </p>
                    {incident.description && (
                      <p className="text-base text-neutral-700">{incident.description}</p>
                    )}
                    <p className="text-sm text-neutral-500">
                      {t.incidents.reportedOn(formatDate(incident.created_at))} ·{" "}
                      {surnom.get(incident.reported_by) ?? ""}
                    </p>
                  </div>
                  {incident.status === "ouvert" && (
                    <Button variant="outline" onClick={() => changer(incident, "en_cours")}>
                      {t.incidents.markInProgress}
                    </Button>
                  )}
                  <Button onClick={() => changer(incident, "resolu")}>
                    {t.incidents.markResolved}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t.incidents.relaisTitle}</h2>
          {relais.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-4 py-6 text-base">
              {t.incidents.relaisEmpty}
            </p>
          ) : (
            <ul className="space-y-2">
              {relais.map((visite) => {
                const rapport = (visite.report ?? {}) as CompteRendu;
                return (
                  <li key={visite.id} className="rounded-lg border border-border bg-card px-4 py-3">
                    <p className="text-base font-semibold">
                      {t.incidents.relaisFrom(
                        nomMagasin.get(visite.store_id) ?? "—",
                        formatDate(visite.scheduled_date)
                      )}
                    </p>
                    {rapport.message_centrale && (
                      <p className="text-base text-neutral-700">{rapport.message_centrale}</p>
                    )}
                    {rapport.ruptures && (
                      <Badge variant="warning" className="mt-1">
                        {rapport.ruptures}
                      </Badge>
                    )}
                    <p className="text-sm text-neutral-500">{surnom.get(visite.user_id) ?? ""}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
