import { RouteGuard } from "@/components/auth/route-guard";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard role="admin">
      <div className="min-h-dvh bg-background">
        <AdminNav />
        {children}
      </div>
    </RouteGuard>
  );
}
