import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calendar } from "lucide-react";

import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type IntegrationStatus = {
  google: {
    connected: boolean;
    email?: string | null;
    connected_at?: string | null;
  };
};

type AclUser = {
  id: number;
  username: string;
  email: string;
};

type GoogleAclResponse = {
  viewer_ids: number[];
};

export function ProfilePage() {
  const { data: user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const googleParam = searchParams.get("google");
  const [isAclOpen, setIsAclOpen] = useState(false);
  const [aclSearch, setAclSearch] = useState("");
  const [selectedViewerIds, setSelectedViewerIds] = useState<Set<number>>(new Set());
  const aclInitialized = useRef(false);

  const statusQuery = useQuery({
    queryKey: ["integrationsStatus"],
    queryFn: async () => {
      const { data } = await api.get("/integrations/status");
      return data.data as IntegrationStatus;
    },
  });

  const aclUsersQuery = useQuery({
    queryKey: ["googleAclUsers"],
    enabled: Boolean(statusQuery.data?.google?.connected),
    queryFn: async () => {
      const { data } = await api.get("/integrations/google/acl/users");
      return data.data.users as AclUser[];
    },
  });

  const aclQuery = useQuery({
    queryKey: ["googleAcl"],
    enabled: Boolean(statusQuery.data?.google?.connected),
    queryFn: async () => {
      const { data } = await api.get("/integrations/google/acl");
      return data.data as GoogleAclResponse;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get("/integrations/google/authorize");
      return data.data as { auth_url: string };
    },
    onSuccess: (payload) => {
      window.location.href = payload.auth_url;
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "接続に失敗しました",
        description: "Google 連携の開始に失敗しました。",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await api.delete("/integrations/google");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrationsStatus"] });
      toast({
        title: "連携を解除しました",
        description: "Google Calendar の接続を解除しました。",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "解除に失敗しました",
        description: "Google 連携の解除に失敗しました。",
      });
    },
  });

  const aclMutation = useMutation({
    mutationFn: async (viewerIds: number[]) => {
      await api.put("/integrations/google/acl", { viewer_ids: viewerIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["googleAcl"] });
      toast({
        title: "公開範囲を更新しました",
        description: "Google カレンダーの表示対象を更新しました。",
      });
      setIsAclOpen(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "更新に失敗しました",
        description: "公開範囲の更新に失敗しました。",
      });
    },
  });

  useEffect(() => {
    if (googleParam === "connected") {
      toast({
        title: "Google Calendar を接続しました",
        description: "連携が完了しました。",
      });
      queryClient.invalidateQueries({ queryKey: ["integrationsStatus"] });
      navigate("/profile", { replace: true });
    }

    if (googleParam === "error") {
      toast({
        variant: "destructive",
        title: "Google 連携に失敗しました",
        description: "もう一度お試しください。",
      });
      navigate("/profile", { replace: true });
    }
  }, [googleParam, navigate, queryClient, toast]);

  useEffect(() => {
    if (!isAclOpen) {
      aclInitialized.current = false;
      return;
    }

    if (!aclQuery.data || aclInitialized.current) {
      return;
    }

    setSelectedViewerIds(new Set(aclQuery.data.viewer_ids ?? []));
    aclInitialized.current = true;
  }, [aclQuery.data, isAclOpen]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-sm text-destructive">ユーザー情報が取得できません。</div>;
  }

  const roleLabel = user.role === 1 ? "システム管理者" : "一般ユーザー";
  const googleStatus = statusQuery.data?.google;
  const aclUsers = aclUsersQuery.data ?? [];
  const aclCount = aclQuery.data?.viewer_ids?.length ?? 0;
  const normalizedAclSearch = aclSearch.trim().toLowerCase();
  const aclVisibleUsers = useMemo(() => {
    const base = aclUsers.filter((aclUser) => aclUser.id !== user.id);
    if (!normalizedAclSearch) {
      return base;
    }

    const tokens = normalizedAclSearch.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return base;
    }

    return base.filter((aclUser) => {
      const label = `${aclUser.username ?? ""} ${aclUser.email ?? ""}`.toLowerCase();
      return tokens.every((token) => label.includes(token));
    });
  }, [aclUsers, normalizedAclSearch, user.id]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">プロフィール</h1>
        <p className="text-sm text-muted-foreground">
          ログイン中のユーザー情報を表示しています。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-1">
            <span className="text-muted-foreground">氏名</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground">メール</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground">ログインID</span>
            <span className="font-medium">{user.loginid}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground">権限</span>
            <span className="font-medium">{roleLabel}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Connectors</h2>
          <p className="text-sm text-muted-foreground">外部カレンダーと連携できます。</p>
        </div>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-4 w-4" />
                  Google Calendar
                </CardTitle>
                <CardDescription>
                  自分の予定を読み取り専用で連携します。
                </CardDescription>
              </div>
              <Badge variant={googleStatus?.connected ? "default" : "secondary"}>
                {googleStatus?.connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusQuery.isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                読み込み中...
              </div>
            )}

            {statusQuery.isError && (
              <div className="text-sm text-destructive">
                連携情報の取得に失敗しました。
              </div>
            )}

            {!statusQuery.isLoading && !statusQuery.isError && !googleStatus?.connected && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">未接続です。</span>
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? "接続中..." : "接続"}
                </Button>
              </div>
            )}

            {!statusQuery.isLoading && !statusQuery.isError && googleStatus?.connected && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="text-muted-foreground">接続アカウント</div>
                    <div className="font-medium">{googleStatus.email}</div>
                    <div className="text-xs text-muted-foreground">
                      公開先: {aclCount}人（自分は常に表示）
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAclOpen(true)}
                      disabled={aclUsersQuery.isLoading || aclQuery.isLoading}
                    >
                      表示設定
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                    >
                      {disconnectMutation.isPending ? "解除中..." : "切断"}
                    </Button>
                  </div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAclOpen} onOpenChange={setIsAclOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Googleカレンダーの公開範囲</DialogTitle>
            <DialogDescription>
              選択したユーザーのみがあなたの Google カレンダーを閲覧できます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={aclSearch}
              onChange={(event) => setAclSearch(event.target.value)}
              placeholder="ユーザー検索"
            />
            {aclUsersQuery.isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                読み込み中...
              </div>
            )}
            {aclUsersQuery.isError && (
              <div className="text-sm text-destructive">
                ユーザー一覧の取得に失敗しました。
              </div>
            )}
            {!aclUsersQuery.isLoading && !aclUsersQuery.isError && (
              <div className="max-h-[360px] overflow-auto rounded-md border p-3">
                {aclVisibleUsers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    該当するユーザーがいません。
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {aclVisibleUsers.map((aclUser) => {
                      const checked = selectedViewerIds.has(aclUser.id);
                      return (
                        <label
                          key={aclUser.id}
                          className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={checked}
                            onChange={() => {
                              setSelectedViewerIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(aclUser.id)) {
                                  next.delete(aclUser.id);
                                } else {
                                  next.add(aclUser.id);
                                }
                                return next;
                              });
                            }}
                          />
                          <div className="space-y-1">
                            <div className="font-medium">{aclUser.username}</div>
                            <div className="text-xs text-muted-foreground break-all">
                              {aclUser.email}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAclOpen(false)}>
              閉じる
            </Button>
            <Button
              onClick={() =>
                aclMutation.mutate(Array.from(selectedViewerIds))
              }
              disabled={aclMutation.isPending}
            >
              {aclMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
