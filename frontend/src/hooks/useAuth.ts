import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { tokenStorage } from "../lib/auth";

type AuthUser = {
  id: number;
  username: string;
  email: string;
  loginid: string;
  role: number;
  page_permissions?: string[];
};

export function useAuth() {
  const token = tokenStorage.get();

  return useQuery({
    queryKey: ["me"],
    enabled: Boolean(token),
    queryFn: async () => {
      const { data } = await api.get("/auth/me");
      return data.data as AuthUser;
    },
    retry: false,
  });
}
