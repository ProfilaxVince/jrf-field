import { RouteGuard } from "@/components/auth/route-guard";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard role="admin">
      {/* Colonne de navigation à gauche, contenu à droite. Sur téléphone la
          colonne est un tiroir : elle sort de l'écran tant qu'on ne l'ouvre pas. */}
      <div className="flex min-h-dvh bg-background md:flex-row">
        <AdminNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </RouteGuard>
  );
}
