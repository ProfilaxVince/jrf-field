"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UndoBar } from "@/components/ui/undo-bar";
import { t } from "@/lib/i18n/fr-BE";
import { detailErreur, estConflitDeCle } from "@/lib/data/erreurs";
import {
  FICHE_VIDE,
  FormulaireCommercial,
  ficheDepuis,
} from "@/components/admin/fiche-commercial";
import { LigneCommercial } from "@/components/admin/ligne-commercial";
import {
  creerCommercial,
  generatePin,
  listAppUsers,
  modifierCommercial,
  reactiverCommercial,
  retirerCommercial,
  type AppUserRow,
  type FicheCommercial,
} from "@/lib/data/users";

type Edition = { id: string | null; fiche: FicheCommercial };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [retire, setRetire] = useState<AppUserRow | null>(null);
  const [reveal, setReveal] = useState<{ nickname: string; pin: string } | null>(null);

  useEffect(() => {
    listAppUsers()
      .then(setUsers)
      .catch(() => setError("Impossible de charger l'équipe."))
      .finally(() => setLoading(false));
  }, []);

  const trier = (l: AppUserRow[]) =>
    [...l].sort((a, b) => Number(b.is_admin) - Number(a.is_admin) || a.nickname.localeCompare(b.nickname));

  async function handleGenerate(u: AppUserRow) {
    setBusyId(u.id);
    setError(null);
    try {
      const { pin } = await generatePin(u.id);
      setReveal({ nickname: u.nickname, pin });
      setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, pin_hash: "x" } : p)));
    } catch {
      setError("Génération impossible. Réessaie.");
    } finally {
      setBusyId(null);
    }
  }

  async function enregistrer() {
    if (!edition) return;
    setSaving(true);
    setError(null);
    try {
      const ligne = edition.id
        ? await modifierCommercial(edition.id, edition.fiche)
        : await creerCommercial(edition.fiche);
      setUsers((prev) =>
        trier(edition.id ? prev.map((p) => (p.id === ligne.id ? ligne : p)) : [...prev, ligne])
      );
      setEdition(null);
    } catch (e) {
      const detail = detailErreur(e);
      setError(
        estConflitDeCle(e)
          ? t.adminUsers.nicknameTaken
          : `${t.adminUsers.saveError}${detail ? ` (${detail})` : ""}`
      );
    } finally {
      setSaving(false);
    }
  }

  // Le retrait est appliqué tout de suite et la barre d'annulation le défait
  // pendant 10 secondes — pas de modale de confirmation avant l'action.
  async function retirer(u: AppUserRow) {
    setUsers((prev) => prev.filter((p) => p.id !== u.id));
    setRetire(u);
    try {
      await retirerCommercial(u.id);
      setError(null);
    } catch {
      setUsers((prev) => trier([...prev, u]));
      setRetire(null);
      setError(t.adminUsers.removeError);
    }
  }

  async function annulerRetrait() {
    if (!retire) return;
    const u = retire;
    setRetire(null);
    setUsers((prev) => trier([...prev, u]));
    try {
      await reactiverCommercial(u.id, u.porte_visites);
    } catch {
      setUsers((prev) => prev.filter((p) => p.id !== u.id));
      setError(t.adminUsers.removeError);
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

        {retire && (
          <UndoBar
            message={t.adminUsers.removeConfirm(retire.nickname)}
            onUndo={annulerRetrait}
            onExpire={() => setRetire(null)}
          />
        )}

        {reveal && (
          <Card className="border-[color:var(--state-warning)]">
            <CardHeader>
              <CardTitle>{t.adminUsers.revealTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-6">
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

        {edition ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {edition.id ? t.adminUsers.editTitle(edition.fiche.nickname) : t.adminUsers.addTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormulaireCommercial
                fiche={edition.fiche}
                onChange={(fiche) => setEdition({ ...edition, fiche })}
                onValider={enregistrer}
                onAnnuler={() => setEdition(null)}
                enCours={saving}
              />
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setEdition({ id: null, fiche: FICHE_VIDE })}>
            {t.adminUsers.add}
          </Button>
        )}

        {loading ? (
          <p className="text-base text-neutral-600">{t.common.loading}</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <LigneCommercial
                key={u.id}
                u={u}
                busy={busyId === u.id}
                onModifier={() => setEdition({ id: u.id, fiche: ficheDepuis(u) })}
                onRetirer={() => retirer(u)}
                onGenerer={() => handleGenerate(u)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
