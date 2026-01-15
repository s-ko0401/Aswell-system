import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";

type AuthLogItem = {
  id: number;
  action: "login" | "logout";
  created_at: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  user: {
    id: number;
    username: string;
    email: string;
  } | null;
};

type AuthLogsResponse = {
  data: AuthLogItem[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
};

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function formatAction(action: AuthLogItem["action"]): { label: string; variant: "secondary" | "outline" } {
  if (action === "login") {
    return { label: "ログイン", variant: "secondary" };
  }
  return { label: "ログアウト", variant: "outline" };
}

export function AuthLogsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  const logsQuery = useQuery({
    queryKey: ["authLogs", currentPage],
    queryFn: async () => {
      const { data } = await api.get("/auth-logs", { params: { page: currentPage, per_page: perPage } });
      return {
        data: data.data as AuthLogItem[],
        meta: data.meta as AuthLogsResponse["meta"],
      } satisfies AuthLogsResponse;
    },
  });

  const logs = logsQuery.data?.data ?? [];
  const meta = logsQuery.data?.meta ?? { page: 1, per_page: perPage, total: 0 };
  const totalPages = Math.max(1, Math.ceil(meta.total / perPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">操作履歴</h1>
        <p className="text-sm text-muted-foreground">ログイン・ログアウトの履歴を確認できます。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ログイン/ログアウト履歴</CardTitle>
          <CardDescription>最新の操作履歴が表示されます。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>ユーザー</TableHead>
                <TableHead>メール</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const action = formatAction(log.action);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{formatDateTime(log.created_at)}</TableCell>
                    <TableCell>{log.user?.username ?? "-"}</TableCell>
                    <TableCell>{log.user?.email ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={action.variant}>{action.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {logsQuery.isLoading && (
            <div className="flex justify-center py-4">
              <Spinner className="h-6 w-6 text-muted-foreground" />
            </div>
          )}

          {!logsQuery.isLoading && !logsQuery.isError && logs.length === 0 && (
            <div className="flex justify-center py-6 text-sm text-muted-foreground">
              履歴はまだありません。
            </div>
          )}

          {logsQuery.isError && (
            <div className="flex justify-center py-4 text-sm text-destructive">
              履歴の取得に失敗しました。
            </div>
          )}

          {!logsQuery.isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-sm">
              <div className="text-muted-foreground">
                {meta.total} 件中 {Math.min((currentPage - 1) * perPage + 1, meta.total)}-
                {Math.min(currentPage * perPage, meta.total)} 件
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <span className="text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
