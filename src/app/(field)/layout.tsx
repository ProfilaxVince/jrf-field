import { RouteGuard } from "@/components/auth/route-guard";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard role="any">{children}</RouteGuard>;
}
