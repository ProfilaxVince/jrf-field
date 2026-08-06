"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";

const PIN_LENGTH = 4;

export default function AuthPage() {
  const { authenticated, isAdmin, nickname, loading, login, logout } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(username, pin);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      setPin("");
      return;
    }
    router.replace("/");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
          {t.auth.title}
        </h1>

        {loading ? (
          <p className="text-base text-neutral-600">{t.common.loading}</p>
        ) : authenticated ? (
          <div className="space-y-4">
            <p className="text-base text-neutral-700">{t.auth.signedInAs(nickname ?? "")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={isAdmin ? "/admin" : "/field"}>{t.auth.goToPortal}</Link>
              </Button>
              <Button variant="secondary" onClick={() => logout()}>
                {t.auth.signOut}
              </Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="username" className="block text-base font-medium text-neutral-800">
                {t.auth.usernameLabel}
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="words"
                autoCorrect="off"
                placeholder={t.auth.usernamePlaceholder}
                className="min-h-[52px] w-full rounded-lg border border-border px-4 py-3 text-lg"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="pin" className="block text-base font-medium text-neutral-800">
                {t.auth.pinLabel}
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={PIN_LENGTH}
                className="min-h-[52px] w-full rounded-lg border border-border px-4 py-3 text-2xl tracking-[0.5em]"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {error && (
              <p role="alert" className="text-base text-state-critical">
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={submitting || username.trim().length === 0 || pin.length !== PIN_LENGTH}
              className="w-full"
            >
              {submitting ? t.auth.submitting : t.auth.submit}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
