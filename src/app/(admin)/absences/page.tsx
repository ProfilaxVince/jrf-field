"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { UndoBar } from "@/components/ui/undo-bar";
import {
  MOTIFS,
  ajouterAbsence,
  listAbsencesFutures,
  retirerAbsence,
  type AbsenceRow,
  type MotifAbsence,
} from "@/lib/data/absences";
import { listAppUsers, type AppUserRow } from "@/lib/data/users";
import { aujourdhuiISO, formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<AbsenceRow[]>([]);
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [userId, setUserId] = useState("");
  const [debut, setDebut] = useState(aujourdhuiISO());
  const [fin, setFin] = useState(aujourdhuiISO());
  const [motif, setMotif] = useState<MotifAbsence>("conges");
  const [retiree, setRetiree] = useState<AbsenceRow | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let monte = true;
    (async () => {
      try {
        const [a, u] = await Promise.all([listAbsencesFutures(aujourdhuiISO()), listAppUsers()]);
        if (!monte) return;
        setAbsences(a);
        setUsers(u.filter((x) => x.porte_visites));
        setUserId(u[0]?.id ?? "");
      } catch {
        if (monte) setErreur(t.absences.saveError);
      } finally {
        if (monte) setLoading(false);
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  const surnom = useMemo(() => new Map(users.map((u) => [u.id, u.nickname])), [users]);
  const couleur = useMemo(() => new Map(users.map((u) => [u.id, u.color_hex])), [users]);

  async function ajouter() {
    if (!userId) return;
    if (fin < debut) {
      setErreur(t.absences.invalid);
      return;
    }
    try {
      const creee = await ajouterAbsence({ userId, debut, fin, motif });
      setAbsences((prev) => [...prev, creee].sort((a, b) => a.date_debut.localeCompare(b.date_debut)));
      setErreur(null);
    } catch {
      setErreur(t.absences.saveError);
    }
  }

  async function retirer(absence: AbsenceRow) {
    setAbsences((prev) => prev.filter((a) => a.id !== absence.id));
    setRetiree(absence);
    try {
      await retirerAbsence(absence.id);
    } catch {
      setAbsences((prev) => [...prev, absence]);
      setRetiree(null);
      setErreur(t.absences.saveError);
    }
  }

  async function annulerRetrait() {
    if (!retiree) return;
    try {
      const restauree = await ajouterAbsence({
        userId: retiree.user_id,
        debut: retiree.date_debut,
        fin: retiree.date_fin,
        motif: retiree.motif,
      });
      setAbsences((prev) => [...prev, restauree].sort((a, b) => a.date_debut.localeCompare(b.date_debut)));
    } catch {
      setErreur(t.absences.saveError);
    }
    setRetiree(null);
  }

  const champ = "min-h-[44px] rounded border border-border px-3 text-base";

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
            {t.absences.title}
          </h1>
          <p className="mt-1 text-base text-neutral-700">{t.absences.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">{t.absences.who}</span>
            <select className={champ} value={userId} onChange={(e) => setUserId(e.target.value)}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nickname}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">{t.absences.from}</span>
            <input type="date" className={champ} value={debut} onChange={(e) => setDebut(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">{t.absences.to}</span>
            <input type="date" className={champ} value={fin} onChange={(e) => setFin(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">{t.absences.reason}</span>
            <select
              className={champ}
              value={motif}
              onChange={(e) => setMotif(e.target.value as MotifAbsence)}
            >
              {MOTIFS.map((m) => (
                <option key={m} value={m}>
                  {t.absences.motifs[m]}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={ajouter}>{t.absences.add}</Button>
        </div>

        {erreur && <p className="text-base text-state-critical">{erreur}</p>}

        {retiree && (
          <UndoBar
            message={t.absences.removed}
            onUndo={annulerRetrait}
            onExpire={() => setRetiree(null)}
          />
        )}

        {loading ? (
          <p className="text-base text-neutral-500">{t.common.loading}</p>
        ) : absences.length === 0 ? (
          <p className="rounded-lg border border-border bg-card px-4 py-6 text-base">
            {t.absences.empty}
          </p>
        ) : (
          <ul className="space-y-2">
            {absences.map((absence) => (
              <li
                key={absence.id}
                className="flex items-center gap-3 rounded-lg border border-l-4 border-border bg-card px-4 py-3"
                style={{ borderLeftColor: couleur.get(absence.user_id) }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">{surnom.get(absence.user_id) ?? "—"}</p>
                  <p className="text-base text-neutral-700">
                    {t.absences.range(formatDate(absence.date_debut), formatDate(absence.date_fin))} —{" "}
                    {t.absences.motifs[absence.motif]}
                  </p>
                </div>
                <Button variant="outline" onClick={() => retirer(absence)}>
                  {t.absences.remove}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
