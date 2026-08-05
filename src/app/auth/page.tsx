"use client";
import Link from "next/link";
import { useState } from "react";
import { useSession, SessionProvider } from "@/lib/session";
import { Button } from "@/components/ui/button";

function AuthForm() {
  const { authUser, appUser, loading, signInWithEmail, signOut } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (loading) return <div>Chargement…</div>;

  if (authUser)
    return (
      <div className="space-y-4">
        <p>
          Connecté en tant que <strong>{appUser?.nickname ?? authUser.email}</strong>
        </p>
        <div className="flex gap-2">
          <Button onClick={() => signOut()}>Se déconnecter</Button>
          <Button asChild>
            <Link href={appUser?.is_admin ? "/admin" : "/field"}>Aller au portail</Link>
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-700">Connecte-toi par email (magic link)</p>
      <div className="space-y-2">
        <input className="w-full rounded border border-border px-3 py-2" placeholder="email@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={async () => { await signInWithEmail(email); setSent(true); }} disabled={!email}>
            Envoyer le lien
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/">Retour</Link>
          </Button>
        </div>
        {sent && <div className="text-sm text-neutral-600">Lien envoyé — vérifie ta boîte mail.</div>}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <SessionProvider>
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="mb-4 text-2xl font-semibold">Connexion</h1>
          <AuthForm />
        </div>
      </main>
    </SessionProvider>
  );
}
