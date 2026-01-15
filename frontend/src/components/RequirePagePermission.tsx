import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import { hasPagePermission, type PagePermissionKey } from "@/lib/pagePermissions";

type RequirePagePermissionProps = {
  page: PagePermissionKey;
  children?: ReactNode;
};

export function RequirePagePermission({
  page,
  children,
}: RequirePagePermissionProps) {
  const { data: user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 1 && !hasPagePermission(user.page_permissions, page)) {
    return <div className="p-6 text-sm text-destructive">権限がありません</div>;
  }

  return children ? <>{children}</> : <Outlet />;
}
