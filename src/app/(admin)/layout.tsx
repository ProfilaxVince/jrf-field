import { RouteGuard } from "@/components/auth/route-guard";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard role="admin">
      {/*
        `flex-col` sur téléphone, `flex-row` à partir de md. Sans le `flex-col`,
        la direction par défaut est la RANGÉE : la barre supérieure du téléphone
        se retrouvait à gauche du contenu, en colonne, et écrasait l'écran.
        Sur téléphone la colonne de navigation est en `fixed`, donc hors flux :
        elle ne prend aucune place tant qu'elle n'est pas ouverte.
      */}
      <div className="flex min-h-dvh flex-col bg-background md:flex-row">
        <AdminNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </RouteGuard>
  );
}
