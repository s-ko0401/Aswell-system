import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import api from "@/lib/api";
import { tokenStorage } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import AppLogoIcon from "@/components/icons/AppLogo";
import { ModeToggle } from "@/components/mode-toggle";

const schema = z.object({
  loginid: z.string().min(1, "ログインIDを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type LoginFormValues = z.infer<typeof schema>;

type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    username: string;
    email: string;
    loginid: string;
    role: number;
    page_permissions?: string[];
  };
};

export function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      loginid: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await api.post("/auth/login", values);
      return data.data as LoginResponse;
    },
    onSuccess: (data) => {
      tokenStorage.set(data.access_token);
      queryClient.setQueryData(["me"], data.user);
      toast({
        title: "ログインしました",
        description: "ようこそ、" + data.user.username + "さん",
      });
      navigate("/home", { replace: true });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "ログイン失敗",
        description: "ID またはパスワードが違います",
      });
    },
  });

  const onSubmit = form.handleSubmit(
    (values) => {
      mutation.mutate(values);
    },
    (errors) => {
      Object.values(errors).forEach((error) => {
        if (error && error.message) {
          toast({
            variant: "destructive",
            title: "入力エラー",
            description: error.message,
          });
        }
      });
    },
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-sm relative mt-8">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 inline-flex items-center justify-center rounded-lg bg-primary p-3 shadow-sm border">
          <AppLogoIcon className="h-8 w-8 fill-secondary" />
        </div>
        <CardHeader className="text-center pt-16">
          <CardTitle>ログイン</CardTitle>
          <CardDescription>
            管理者アカウントでログインしてください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="loginid">ログインID</Label>
              <Input id="loginid" {...form.register("loginid")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <PasswordInput id="password" {...form.register("password")} />
            </div>

            <Button
              className="w-full"
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="absolute bottom-4 left-4">
        <ModeToggle />
      </div>
    </div>
  );
}
