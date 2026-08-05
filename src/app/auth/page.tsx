"use client";
import Link from "next/link";
import { seedUsers } from "@/lib/data/seedUsers";
import { useSession, SessionProvider } from "@/lib/session";
import { Button } from "@/components/ui/button";

function AuthForm() {
  const { user, loginAs, logout } = useSession();

  if (user)
    return (
      <div className="space-y-4">
        <p>Connecté en tant que <strong>{user.nickname}</strong></p>
        <div className="flex gap-2">
          <Button onClick={() => logout()}>Se déconnecter</Button>
          <Button asChild>
            <Link href={user.is_admin ? "/admin" : "/field"}>Aller au portail</Link>
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-700">Sélectionne ton utilisateur pour démarrer (dev only)</p>
      <div className="grid gap-2">
        {seedUsers.map((u) => (
          <Button key={u.id} onClick={() => loginAs(u.id)}>
            {u.nickname} — {u.full_name}
          </Button>
        ))}
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
