import { useState } from "react";
import { AxiosError } from "axios";
import { type ApiErrorResponse } from "@/types/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { UserRole } from "@/lib/roles";
import { useDebounce } from "@/hooks/useDebounce";
import { type PagePermissionKey } from "@/lib/pagePermissions";
import api from "@/lib/api";

import {
  UserFormDrawer,
  type UserFormValues,
} from "@/components/99_Setting/UsersPage/UserFormDrawer";
import { PermissionDrawer } from "@/components/99_Setting/UsersPage/PermissionDrawer";
import { UserListTable } from "@/components/99_Setting/UsersPage/UserListTable";
import { UserFilters } from "@/components/99_Setting/UsersPage/UserFilters";
import { DeleteUserDialog } from "@/components/99_Setting/UsersPage/DeleteUserDialog";
import { type UserItem, type UsersResponse } from "@/types/settings";

export function UsersPage() {
  const { data: currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string[]> | null>(
    null,
  );

  const [permissionOpen, setPermissionOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState<UserItem | null>(null);

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const perPage = 20;

  const isAdmin = currentUser?.role === UserRole.SYSTEM_ADMIN;

  const usersQuery = useQuery<UsersResponse, Error>({
    queryKey: ["users", currentPage, selectedRole, debouncedSearchQuery, perPage],
    queryFn: async () => {
      const { data } = await api.get("/users", {
        params: {
          page: currentPage,
          per_page: perPage,
          role: selectedRole === "all" ? undefined : selectedRole,
          search: debouncedSearchQuery || undefined,
        },
      });
      return {
        data: data.data as UserItem[],
        meta: data.meta as UsersResponse["meta"],
      } satisfies UsersResponse;
    },
  });

  const users = usersQuery.data?.data ?? [];
  const total = usersQuery.data?.meta.total ?? 0;
  const roleCounts = usersQuery.data?.meta.roles ?? [];
  const allCount = roleCounts.reduce((acc, curr) => acc + curr.count, 0);
  const isFetching = usersQuery.isFetching;

  const getRoleCount = (roleId: number) => {
    return roleCounts.find((r) => r.id === roleId)?.count ?? 0;
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (total > 0 && currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const createMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const payload = {
        ...values,
        role: Number(values.role),
      };
      const { data } = await api.post("/users", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "ユーザーを追加しました" });
      setOpen(false);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      const errorData = error.response?.data;
      if (
        errorData?.code === "VALIDATION_ERROR" ||
        errorData?.error?.code === "VALIDATION_ERROR"
      ) {
        const details = errorData?.details || errorData?.error?.details;
        if (details) {
          setApiErrors(details);
          return;
        }
      }

      toast({
        variant: "destructive",
        title: "追加に失敗しました",
        description: "入力内容を確認してください",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: UserFormValues;
    }) => {
      const payload: {
        username: string;
        email: string;
        loginid: string;
        staff_number?: string;
        role: number;
        password?: string;
      } = {
        username: values.username,
        email: values.email,
        loginid: values.loginid,
        staff_number: values.staff_number || undefined,
        role: Number(values.role),
      };
      // パスワードが入力されている場合のみ含める
      if (values.password && values.password.length > 0) {
        payload.password = values.password;
      }
      const { data } = await api.put(`/users/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "ユーザー情報を更新しました" });
      setOpen(false);
      setEditingUser(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      const errorData = error.response?.data;
      if (
        errorData?.code === "VALIDATION_ERROR" ||
        errorData?.error?.code === "VALIDATION_ERROR"
      ) {
        const details = errorData?.details || errorData?.error?.details;
        if (details) {
          setApiErrors(details);
          return;
        }
      }

      toast({
        variant: "destructive",
        title: "更新に失敗しました",
        description: "入力内容を確認してください",
      });
    },
  });

  const permissionMutation = useMutation({
    mutationFn: async ({
      user,
      permissions,
    }: {
      user: UserItem;
      permissions: PagePermissionKey[];
    }) => {
      const payload = {
        username: user.username,
        email: user.email,
        loginid: user.loginid,
        staff_number: user.staff_number || undefined,
        role: Number(user.role),
        page_permissions: permissions,
      };
      const { data } = await api.put(`/users/${user.id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "ページ権限を更新しました" });
      setPermissionOpen(false);
      setPermissionUser(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "更新に失敗しました",
        description: "入力内容を確認してください",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "ユーザーを削除しました" });
      setDeleteConfirmationOpen(false);
      setDeletingUserId(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "削除に失敗しました",
      });
    },
  });

  const handleFormSubmit = (values: UserFormValues) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handlePermissionSubmit = (
    user: UserItem,
    permissions: PagePermissionKey[],
  ) => {
    permissionMutation.mutate({ user, permissions });
  };

  const handleDeleteConfirm = () => {
    if (deletingUserId) {
      deleteMutation.mutate(deletingUserId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            ユーザー
          </h1>
          <p className="text-sm text-muted-foreground">
            チームメンバーとアカウント権限をここで管理します。
          </p>
        </div>
        <UserFormDrawer
          open={open}
          onOpenChange={(val) => {
            setOpen(val);
            if (!val) setApiErrors(null);
          }}
          userToEdit={editingUser}
          onAdd={() => {
            setEditingUser(null);
            setApiErrors(null);
          }}
          onSubmit={handleFormSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
          apiErrors={apiErrors}
        />
      </div>

      <PermissionDrawer
        open={permissionOpen}
        onOpenChange={(val) => {
          setPermissionOpen(val);
          if (!val) setPermissionUser(null);
        }}
        user={permissionUser}
        onSubmit={handlePermissionSubmit}
        isPending={permissionMutation.isPending}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg"></CardTitle>
          <UserFilters
            selectedRole={selectedRole}
            onRoleChange={(role) => {
              setSelectedRole(role);
              setCurrentPage(1);
            }}
            allCount={allCount}
            getRoleCount={getRoleCount}
            searchQuery={searchQuery}
            onSearchChange={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
          />
        </CardHeader>
        <CardContent>
          <UserListTable
            users={users}
            isLoading={isFetching}
            isAdmin={isAdmin}
            onEdit={(user) => {
              setEditingUser(user);
              setOpen(true);
            }}
            onEditPermissions={(user) => {
              setPermissionUser(user);
              setPermissionOpen(true);
            }}
            onDelete={(user) => {
              setDeletingUserId(user.id);
              setDeleteConfirmationOpen(true);
            }}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <DeleteUserDialog
        open={deleteConfirmationOpen}
        onOpenChange={(val) => {
          setDeleteConfirmationOpen(val);
          if (!val) setDeletingUserId(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
