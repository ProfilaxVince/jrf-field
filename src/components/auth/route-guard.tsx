"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { t } from "@/lib/i18n/fr-BE";

export function RouteGuard({
  role,
  children,
}: {
  role: "admin" | "any";
  children: React.ReactNode;
}) {
  const { authenticated, isAdmin, loading } = useSession();
  const router = useRouter();
  const allowed = authenticated && (role === "any" || isAdmin);

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      router.replace("/auth");
      return;
    }
    if (role === "admin" && !isAdmin) {
      router.replace("/field");
    }
  }, [authenticated, isAdmin, loading, role, router]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-base text-neutral-600">{t.common.loading}</p>
      </div>
    );
  }

  return <>{children}</>;
}
