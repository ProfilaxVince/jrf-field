"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/fr-BE";
import { generateCredentials, listAppUsers, type AppUserRow } from "@/lib/data/users";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ userId: string; nickname: string; accessCode: string; pin: string } | null>(
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
      const { access_code, pin } = await generateCredentials(u.id);
      setReveal({ userId: u.id, nickname: u.nickname, accessCode: access_code, pin });
      setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, access_code_hash: "x" } : p)));
    } catch {
      setError("Génération impossible. Réessaie.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold text-jrf-green-800">{t.adminUsers.title}</h1>

        {error && <p className="text-base text-[color:var(--state-critical)]">{error}</p>}

        {reveal && (
          <Card className="border-[color:var(--state-warning)]">
            <CardHeader>
              <CardTitle>{t.adminUsers.revealTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-base">{reveal.nickname}</p>
                <div className="flex gap-6">
                  <div>
                    <div className="text-sm text-neutral-600">{t.auth.codeLabel}</div>
                    <div className="text-2xl font-semibold tracking-widest">{reveal.accessCode}</div>
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
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
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
                      {u.access_code_hash ? t.adminUsers.hasCode : t.adminUsers.noCode}
                      {u.is_admin ? " · admin" : ""}
                    </div>
                  </div>
                </div>
                <Button
                  variant={u.access_code_hash ? "outline" : "default"}
                  disabled={busyId === u.id}
                  onClick={() => handleGenerate(u)}
                >
                  {busyId === u.id
                    ? t.adminUsers.generating
                    : u.access_code_hash
                      ? t.adminUsers.regenerateCode
                      : t.adminUsers.generateCode}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
