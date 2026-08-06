"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/fr-BE";
import {
  definirPorteVisites,
  generatePin,
  listAppUsers,
  type AppUserRow,
} from "@/lib/data/users";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ userId: string; nickname: string; pin: string } | null>(
    null
  );

  useEffect(() => {
    listAppUsers()
      .then(setUsers)
      .catch(() => setError("Impossible de charger l'équipe."))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate(u: AppUserRow) {
    setBusyId(u.id);
    setError(null);
    try {
      const { pin } = await generatePin(u.id);
      setReveal({ userId: u.id, nickname: u.nickname, pin });
      setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, pin_hash: "x" } : p)));
    } catch {
      setError("Génération impossible. Réessaie.");
    } finally {
      setBusyId(null);
    }
  }

  async function basculerPorteVisites(u: AppUserRow, porte: boolean) {
    const precedent = users;
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, porte_visites: porte } : p)));
    try {
      await definirPorteVisites(u.id, porte);
      setError(null);
    } catch {
      setUsers(precedent);
      setError(t.adminUsers.updateError);
    }
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
          {t.adminUsers.title}
        </h1>
        <p className="text-base text-neutral-700">{t.adminUsers.carriesVisitsHint}</p>

        {error && <p className="text-base text-[color:var(--state-critical)]">{error}</p>}

        {reveal && (
          <Card className="border-[color:var(--state-warning)]">
            <CardHeader>
              <CardTitle>{t.adminUsers.revealTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-6">
                  <div>
                    <div className="text-sm text-neutral-600">{t.auth.usernameLabel}</div>
                    <div className="text-2xl font-semibold">{reveal.nickname}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-600">{t.auth.pinLabel}</div>
                    <div className="text-2xl font-semibold tracking-widest">{reveal.pin}</div>
                  </div>
                </div>
                <p className="text-base text-neutral-700">{t.adminUsers.revealWarning}</p>
                <Button onClick={() => setReveal(null)}>{t.adminUsers.revealDone}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-base text-neutral-600">{t.common.loading}</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="size-3 rounded-full"
                    style={{ backgroundColor: u.color_hex }}
                  />
                  <div>
                    <div className="text-lg font-semibold">{u.nickname}</div>
                    <div className="text-sm text-neutral-600">
                      {u.pin_hash ? t.adminUsers.hasCode : t.adminUsers.noCode}
                      {u.is_admin ? " · admin" : ""}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex min-h-[44px] items-center gap-2 text-base">
                    <input
                      type="checkbox"
                      className="size-5"
                      checked={u.porte_visites}
                      onChange={(e) => basculerPorteVisites(u, e.target.checked)}
                    />
                    {t.adminUsers.carriesVisits}
                  </label>
                  <Button
                    variant={u.pin_hash ? "outline" : "default"}
                    disabled={busyId === u.id}
                    onClick={() => handleGenerate(u)}
                  >
                    {busyId === u.id
                      ? t.adminUsers.generating
                      : u.pin_hash
                        ? t.adminUsers.regenerateCode
                        : t.adminUsers.generateCode}
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
