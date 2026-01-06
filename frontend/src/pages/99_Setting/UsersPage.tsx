import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Edit, MoreVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const schema = z.object({
  username: z.string().min(1, "必須です").max(100, "100文字以内"),
  email: z.string().email("メール形式が不正です").max(255, "255文字以内"),
  loginid: z.string().min(1, "必須です").max(100, "100文字以内"),
  password: z.string().min(8, "8文字以上").optional().or(z.literal("")),
  role: z.union([z.literal("1"), z.literal("2")]),
});

type UserFormValues = z.infer<typeof schema>;

type UserItem = {
  id: number;
  username: string;
  email: string;
  loginid: string;
  role: number;
  created_at: string | null;
  updated_at: string | null;
};

type UsersResponse = {
  data: UserItem[];
  meta: {
    page: number;
    per_page: number;
    total: number;
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
  const [open, setOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const isEditMode = editingUserId !== null;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      email: "",
      loginid: "",
      password: "",
      role: "2",
    },
  });

  const usersQuery = useQuery({
    queryKey: ["users", 1],
    queryFn: async () => {
      const { data } = await api.get("/users", { params: { page: 1, per_page: 20 } });
      return {
        data: data.data as UserItem[],
        meta: data.meta as UsersResponse["meta"],
      } satisfies UsersResponse;
    },
  });

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
        role: "2",
      });
      setOpen(false);
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const payload: any = {
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
        role: "2",
      });
      setOpen(false);
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
      role: "2",
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
      role: String(user.role) as "1" | "2",
    });
    setOpen(true);
  };

  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ユーザー</h1>
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
          <DrawerContent className="h-[66vh]">
            <div className="mx-auto w-full max-w-2xl h-full overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>{isEditMode ? "ユーザー編集" : "新規ユーザー追加"}</DrawerTitle>
                <DrawerDescription>
                  {isEditMode
                    ? "ユーザー情報を編集してください。"
                    : "新しいユーザーの情報を入力してください。"}
                </DrawerDescription>
              </DrawerHeader>
              <form className="p-4 pb-0" onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">氏名</Label>
                    <Input id="username" {...form.register("username")} />
                    {form.formState.errors.username && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">メール</Label>
                    <Input id="email" type="email" {...form.register("email")} />
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginid">ログインID</Label>
                    <Input id="loginid" {...form.register("loginid")} />
                    {form.formState.errors.loginid && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.loginid.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      パスワード{isEditMode && <span className="text-muted-foreground"> (変更する場合のみ)</span>}
                    </Label>
                    <Input id="password" type="password" {...form.register("password")} />
                    {form.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>権限</Label>
                    <Controller
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - システム管理者</SelectItem>
                            <SelectItem value="2">2 - 一般ユーザー</SelectItem>
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
                </div>
                <DrawerFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (isEditMode ? "更新中..." : "追加中...") : isEditMode ? "更新" : "追加"}
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
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">全ユーザー ({usersQuery.data?.meta.total ?? 0})</CardTitle>
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
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.loginid}</TableCell>
                  <TableCell>{user.role === 1 ? "システム管理者" : "一般ユーザー"}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>編集</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>削除</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {usersQuery.isLoading && <p className="mt-3 text-xs text-muted-foreground">読み込み中...</p>}
        </CardContent>
      </Card>
    </div>
  );
}
