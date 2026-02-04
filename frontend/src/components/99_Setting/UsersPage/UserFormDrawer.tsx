import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { USER_ROLE_OPTIONS, UserRole } from "@/lib/roles";
import type { UserItem } from "@/types/settings";

const baseSchema = z.object({
  username: z
    .string()
    .min(1, "必須です")
    .max(100, "100文字以内")
    .regex(/^[^ -~｡-ﾟ]+$/, "全角で入力してください"),
  email: z.string().email("メール形式が不正です").max(255, "255文字以内"),
  loginid: z.string().min(1, "必須です").max(100, "100文字以内"),
  staff_number: z.string().min(1, "必須です").max(100, "100文字以内"),
  role: z.union([
    z.literal(String(UserRole.SYSTEM_ADMIN)),
    z.literal(String(UserRole.GENERAL_USER)),
  ]),
});

const createSchema = baseSchema
  .extend({
    password: z.string().min(1, "必須です").min(8, "8文字以上"),
    confirmPassword: z.string().min(1, "必須です"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

const editSchema = baseSchema
  .extend({
    password: z.string().min(8, "8文字以上").optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

export type UserFormValues =
  | z.infer<typeof createSchema>
  | z.infer<typeof editSchema>;

type UserFormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: UserItem | null;
  onSubmit: (values: UserFormValues) => void;
  isPending: boolean;
  onAdd?: () => void;
};

export function UserFormDrawer({
  open,
  onOpenChange,
  userToEdit,
  onSubmit,
  isPending,
  onAdd,
}: UserFormDrawerProps) {
  const isEditMode = !!userToEdit;
  const schema = isEditMode ? editSchema : createSchema;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      email: "",
      loginid: "",
      staff_number: "",
      password: "",
      confirmPassword: "",
      role: String(UserRole.GENERAL_USER),
    },
  });

  useEffect(() => {
    if (open) {
      if (userToEdit) {
        form.reset({
          username: userToEdit.username,
          email: userToEdit.email,
          loginid: userToEdit.loginid,
          staff_number: userToEdit.staff_number || "",
          password: "",
          confirmPassword: "",
          role: String(userToEdit.role) as "1" | "2",
        });
      } else {
        form.reset({
          username: "",
          email: "",
          loginid: "",
          staff_number: "",
          password: "",
          confirmPassword: "",
          role: String(UserRole.GENERAL_USER),
        });
      }
    }
  }, [open, userToEdit, form]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button
          onClick={() => {
            onAdd?.();
            onOpenChange(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          新規追加
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[97vh]">
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
          <form className="px-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-y-2 gap-x-4 md:grid-cols-2 pb-4">
              <div className="space-y-1">
                <Label htmlFor="username">氏名</Label>
                <Input
                  id="username"
                  placeholder="全角"
                  {...form.register("username")}
                />
                <p className="text-xs h-4 text-destructive mt-[1px]">
                  {form.formState.errors.username &&
                    form.formState.errors.username.message}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">メール</Label>
                <Input
                  id="email"
                  placeholder="mail@as-well.co.jp"
                  type="email"
                  {...form.register("email")}
                />
                <p className="text-xs h-4 text-destructive mt-[1px]">
                  {form.formState.errors.email &&
                    form.formState.errors.email.message}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="loginid">ログインID</Label>
                <Input
                  id="loginid"
                  placeholder="ログインID"
                  {...form.register("loginid")}
                />
                <p className="text-xs h-4 text-destructive mt-[1px]">
                  {form.formState.errors.loginid &&
                    form.formState.errors.loginid.message}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="staff_number">社員番号</Label>
                <Input
                  id="staff_number"
                  placeholder="社員番号"
                  {...form.register("staff_number")}
                />
                <p className="text-xs h-4 text-destructive mt-[1px]">
                  {form.formState.errors.staff_number &&
                    form.formState.errors.staff_number.message}
                </p>
              </div>
              <div className="space-y-1 md:col-span-2">
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
                <p className="text-xs h-4 text-destructive mt-[1px]">
                  {form.formState.errors.role &&
                    form.formState.errors.role.message}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">
                  パスワード
                  {isEditMode && (
                    <span className="text-muted-foreground">
                      {" "}
                      (変更する場合のみ)
                    </span>
                  )}
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="パスワード"
                  {...form.register("password")}
                />
                <p className="text-xs h-4 text-destructive mt-[1px]">
                  {form.formState.errors.password &&
                    form.formState.errors.password.message}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">
                  パスワード（確認）
                  {isEditMode && (
                    <span className="text-muted-foreground">
                      {" "}
                      (変更する場合のみ)
                    </span>
                  )}
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="パスワード"
                  {...form.register("confirmPassword")}
                />
                <p className="text-xs h-4 text-destructive mt-[1px]">
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
  );
}
