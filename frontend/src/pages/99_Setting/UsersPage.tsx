import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Edit, MoreVertical, Plus, Trash2, Shield } from "lucide-react";
import AppLogoIcon from "@/components/icons/AppLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  PAGE_PERMISSION_OPTIONS,
  normalizePagePermissions,
  type PagePermissionKey,
} from "@/lib/pagePermissions";
import {
  USER_ROLE_LABELS,
  USER_ROLE_OPTIONS,
  UserRole,
  type UserRoleId,
} from "@/lib/roles";

const schema = z
  .object({
    username: z
      .string()
      .min(1, "必須です")
      .max(100, "100文字以内")
      .regex(/^[^ -~｡-ﾟ]+$/, "全角で入力してください"),
    email: z.string().email("メール形式が不正です").max(255, "255文字以内"),
    loginid: z.string().min(1, "必須です").max(100, "100文字以内"),
    password: z.string().min(8, "8文字以上").optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    role: z.union([
      z.literal(String(UserRole.SYSTEM_ADMIN)),
      z.literal(String(UserRole.GENERAL_USER)),
    ]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type UserFormValues = z.infer<typeof schema>;

type UserItem = {
  id: number;
  username: string;
  email: string;
  loginid: string;
  role: number;
  page_permissions?: string[];
  created_at: string | null;
  updated_at: string | null;
  deleted?: boolean;
};

type UsersResponse = {
  data: UserItem[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    roles: {
      id: number;
      count: number;
    }[];
  };
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function UsersPage() {
  const { data: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState<UserItem | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<
    PagePermissionKey[]
  >([]);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState("all");
  const perPage = 20;
  const isEditMode = editingUserId !== null;
  const isAdmin = currentUser?.role === UserRole.SYSTEM_ADMIN;
  const { toast } = useToast();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      email: "",
      loginid: "",
      password: "",
      confirmPassword: "",
      role: String(UserRole.GENERAL_USER),
    },
  });

  const usersQuery = useQuery({
    queryKey: ["users", currentPage, selectedRole],
    queryFn: async () => {
      const { data } = await api.get("/users", {
        params: {
          page: currentPage,
          per_page: perPage,
          role: selectedRole === "all" ? undefined : selectedRole,
        },
      });
      return {
        data: data.data as UserItem[],
        meta: data.meta as UsersResponse["meta"],
      } satisfies UsersResponse;
    },
    placeholderData: keepPreviousData,
  });

  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const total = usersQuery.data?.meta.total ?? 0;
  const roleCounts = usersQuery.data?.meta.roles ?? [];
  const allCount = roleCounts.reduce((acc, curr) => acc + curr.count, 0);
  const isFetching = usersQuery.isFetching;

  const getRoleCount = (roleId: number) => {
    return roleCounts.find((r) => r.id === roleId)?.count ?? 0;
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (usersQuery.data && currentPage > totalPages) {
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
      form.reset({
        username: "",
        email: "",
        loginid: "",
        password: "",
        confirmPassword: "",
        role: String(UserRole.GENERAL_USER),
      });
      setOpen(false);
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "ユーザーを追加しました",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "追加に失敗しました",
        description: "入力内容を確認してください",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const payload: {
        username: string;
        email: string;
        loginid: string;
        role: number;
        password?: string;
      } = {
        username: values.username,
        email: values.email,
        loginid: values.loginid,
        role: Number(values.role),
      };
      // パスワードが入力されている場合のみ含める
      if (values.password && values.password.length > 0) {
        payload.password = values.password;
      }
      const { data } = await api.put(`/users/${editingUserId}`, payload);
      return data;
    },
    onSuccess: () => {
      form.reset({
        username: "",
        email: "",
        loginid: "",
        password: "",
        confirmPassword: "",
        role: String(UserRole.GENERAL_USER),
      });
      setOpen(false);
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "ユーザー情報を更新しました",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "更新に失敗しました",
        description: "入力内容を確認してください",
      });
    },
  });

  const permissionMutation = useMutation({
    mutationFn: async () => {
      if (!permissionUser) {
        throw new Error("user is required");
      }
      const payload = {
        username: permissionUser.username,
        email: permissionUser.email,
        loginid: permissionUser.loginid,
        role: Number(permissionUser.role),
        page_permissions: selectedPermissions,
      };
      const { data } = await api.put(`/users/${permissionUser.id}`, payload);
      return data;
    },
    onSuccess: () => {
      setPermissionOpen(false);
      setPermissionUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({
        title: "ページ権限を更新しました",
      });
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
      toast({
        title: "ユーザーを削除しました",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "削除に失敗しました",
      });
    },
  });

  const handleSubmit = (values: UserFormValues) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleAdd = () => {
    setEditingUserId(null);
    form.reset({
      username: "",
      email: "",
      loginid: "",
      password: "",
      confirmPassword: "",
      role: String(UserRole.GENERAL_USER),
    });
    setOpen(true);
  };

  const handleEdit = (user: UserItem) => {
    setEditingUserId(user.id);
    form.reset({
      username: user.username,
      email: user.email,
      loginid: user.loginid,
      password: "",
      confirmPassword: "",
      role: String(user.role) as "1" | "2",
    });
    setOpen(true);
  };

  const handleEditPermissions = (user: UserItem) => {
    setPermissionUser(user);
    setSelectedPermissions(normalizePagePermissions(user.page_permissions));
    setPermissionOpen(true);
  };

  const togglePermission = (key: PagePermissionKey) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(key)) {
        return prev.filter((permission) => permission !== key);
      }
      return [...prev, key];
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isPermissionPending = permissionMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            ユーザー
            {isFetching && (
              <Spinner className="h-4 w-4 text-muted-foreground" />
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            チームメンバーとアカウント権限をここで管理します。
          </p>
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              新規追加
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[93vh]">
            <div className="mx-auto w-full max-w-2xl h-full overflow-y-auto pb-4">
              <DrawerHeader>
                <DrawerTitle>
                  {isEditMode ? "ユーザー編集" : "新規ユーザー追加"}
                </DrawerTitle>
                <DrawerDescription>
                  {isEditMode
                    ? "ユーザー情報を編集してください。"
                    : "新しいユーザーの情報を入力してください。"}
                </DrawerDescription>
              </DrawerHeader>
              <form className="p-4" onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="grid gap-4 md:grid-cols-2 pb-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">氏名</Label>
                    <Input id="username" {...form.register("username")} />
                    <p className="text-xs h-4 text-destructive">
                      {form.formState.errors.username &&
                        form.formState.errors.username.message}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">メール</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                    />
                    <p className="text-xs h-4 text-destructive">
                      {form.formState.errors.email &&
                        form.formState.errors.email.message}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginid">ログインID</Label>
                    <Input id="loginid" {...form.register("loginid")} />
                    <p className="text-xs h-4 text-destructive">
                      {form.formState.errors.loginid &&
                        form.formState.errors.loginid.message}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>権限</Label>
                    <Controller
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                          <SelectContent>
                            {USER_ROLE_OPTIONS.map((option) => (
                              <SelectItem
                                className="cursor-pointer"
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.role && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.role.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      パスワード
                      {isEditMode && (
                        <span className="text-muted-foreground">
                          {" "}
                          (変更する場合のみ)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register("password")}
                    />
                    <p className="text-xs h-4 text-destructive">
                      {form.formState.errors.password &&
                        form.formState.errors.password.message}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      パスワード（確認）
                      {isEditMode && (
                        <span className="text-muted-foreground">
                          {" "}
                          (変更する場合のみ)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...form.register("confirmPassword")}
                    />
                    <p className="text-xs h-4 text-destructive">
                      {form.formState.errors.confirmPassword &&
                        form.formState.errors.confirmPassword.message}
                    </p>
                  </div>
                </div>
                <DrawerFooter className="p-0">
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Spinner className="mr-2 h-4 w-4" />}
                    {isEditMode ? "更新" : "追加"}
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" type="button">
                      キャンセル
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </form>
            </div>
          </DrawerContent>
        </Drawer>
        <Drawer
          open={permissionOpen}
          onOpenChange={(open) => {
            setPermissionOpen(open);
            if (!open) {
              setPermissionUser(null);
            }
          }}
        >
          <DrawerContent className="h-[70vh]">
            <div className="mx-auto flex h-full w-full max-w-xl flex-col overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>ページ権限</DrawerTitle>
                <DrawerDescription>
                  {permissionUser?.username ?? "ユーザー"}
                  が表示できるページを選択してください。
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex-1 space-y-3 px-4">
                {PAGE_PERMISSION_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedPermissions.includes(option.key)}
                      onChange={() => togglePermission(option.key)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <DrawerFooter>
                <Button
                  type="button"
                  onClick={() => permissionMutation.mutate()}
                  disabled={isPermissionPending || !permissionUser}
                >
                  {isPermissionPending && <Spinner className="mr-2 h-4 w-4" />}
                  更新
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" type="button">
                    キャンセル
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="text-lg">ユーザー一覧</CardTitle>
            <div className="flex items-center justify-between">
              <Tabs
                value={selectedRole}
                onValueChange={(val) => {
                  setSelectedRole(val);
                  setCurrentPage(1);
                }}
              >
                <TabsList>
                  <TabsTrigger value="all">
                    全ユーザー
                    <Badge variant="secondary" className="ml-2">
                      {allCount}
                    </Badge>
                  </TabsTrigger>
                  {USER_ROLE_OPTIONS.map((option) => (
                    <TabsTrigger key={option.value} value={option.value}>
                      {option.label}
                      <Badge variant="secondary" className="ml-2">
                        {getRoleCount(Number(option.value))}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    前へ
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>氏名</TableHead>
                <TableHead>メール</TableHead>
                <TableHead>ログインID</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>作成日</TableHead>
                <TableHead>更新日</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={
                isFetching
                  ? "opacity-50 transition-opacity"
                  : "transition-opacity"
              }
            >
              {users.length === 0 && !usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[200px]">
                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                      <AppLogoIcon className="h-24 w-24 opacity-20" />
                      <p>ユーザー登録がありません</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.username}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.loginid}</TableCell>
                    <TableCell>
                      {USER_ROLE_LABELS[user.role as UserRoleId] ?? "不明"}
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>{formatDate(user.updated_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">メニューを開く</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            <span>編集</span>
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleEditPermissions(user)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              <span>ページ権限</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive"
                            onClick={() => {
                              setDeletingUserId(user.id);
                              setDeleteConfirmationOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>削除</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {usersQuery.isLoading && (
            <div className="flex justify-center py-4">
              <Spinner className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteConfirmationOpen}
        onOpenChange={setDeleteConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。<br></br>
              このユーザーアカウントは完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingUserId(null)}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingUserId) {
                  deleteMutation.mutate(deletingUserId);
                  setDeleteConfirmationOpen(false);
                }
              }}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
