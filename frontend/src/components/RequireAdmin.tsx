import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";

import { Outlet } from "react-router-dom";

type RequireAdminProps = {
  children?: ReactNode;
};

export function RequireAdmin({ children }: RequireAdminProps) {
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

  if (user.role !== 1) {
    return <div className="p-6 text-sm text-destructive">権限がありません</div>;
  }

  return children ? <>{children}</> : <Outlet />;
}
