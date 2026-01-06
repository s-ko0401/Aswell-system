import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { tokenStorage } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

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
    return <div className="p-6 text-sm text-muted-foreground">読み込み中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
