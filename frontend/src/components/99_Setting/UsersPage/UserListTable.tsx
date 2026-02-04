import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Edit, MoreVertical, Trash2, Shield } from "lucide-react";
import AppLogoIcon from "@/components/icons/AppLogo";
import { LoadingBar } from "@/components/ui/loading-bar";
import { type UserRoleId, USER_ROLE_LABELS } from "@/lib/roles";
import type { UserItem } from "@/types/settings";

type UserListTableProps = {
  users: UserItem[];
  isLoading: boolean;
  isAdmin: boolean;
  onEdit: (user: UserItem) => void;
  onEditPermissions: (user: UserItem) => void;
  onDelete: (user: UserItem) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function UserListTable({
  users,
  isLoading,
  isAdmin,
  onEdit,
  onEditPermissions,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
}: UserListTableProps) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>氏名</TableHead>
            <TableHead>メール</TableHead>
            <TableHead>ログインID</TableHead>
            <TableHead>社員番号</TableHead>
            <TableHead>権限</TableHead>
            <TableHead>作成日</TableHead>
            <TableHead>更新日</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody
          className={
            isLoading ? "opacity-50 transition-opacity" : "transition-opacity"
          }
        >
          <TableRow className="hover:bg-transparent border-0">
            <TableCell colSpan={7} className="p-0 border-0">
              <LoadingBar isLoading={isLoading} />
            </TableCell>
          </TableRow>
          {users.length === 0 && !isLoading ? (
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
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.loginid}</TableCell>
                <TableCell>{user.staff_number || "-"}</TableCell>
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
                        onClick={() => onEdit(user)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        <span>編集</span>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => onEditPermissions(user)}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          <span>ページ権限</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive"
                        onClick={() => onDelete(user)}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
