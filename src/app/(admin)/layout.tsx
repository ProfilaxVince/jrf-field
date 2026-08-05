import { RouteGuard } from "@/components/auth/route-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard role="admin">{children}</RouteGuard>;
}
