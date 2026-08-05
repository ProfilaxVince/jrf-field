"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";

export default function AuthPage() {
  const { authenticated, isAdmin, nickname, loading, login, logout } = useSession();
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(accessCode, pin);
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
        <h1 className="text-2xl font-semibold text-jrf-green-800">{t.auth.title}</h1>

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
              <label htmlFor="access-code" className="block text-base font-medium text-neutral-800">
                {t.auth.codeLabel}
              </label>
              <input
                id="access-code"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={8}
                className="w-full rounded-lg border border-border px-4 py-3 text-lg tracking-widest"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="pin" className="block text-base font-medium text-neutral-800">
                {t.auth.pinLabel}
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                className="w-full rounded-lg border border-border px-4 py-3 text-lg tracking-widest"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {error && (
              <p role="alert" className="text-base text-[color:var(--state-critical)]">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting || accessCode.length !== 8 || pin.length !== 6}
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
