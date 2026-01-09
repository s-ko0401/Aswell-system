import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { tokenStorage } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";

export function RequireAuth() {
  const token = tokenStorage.get();
  const { data: user, isLoading, isError } = useAuth();

  useEffect(() => {
    if (isError) {
      tokenStorage.clear();
    }
  }, [isError]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

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

  return <Outlet />;
}
