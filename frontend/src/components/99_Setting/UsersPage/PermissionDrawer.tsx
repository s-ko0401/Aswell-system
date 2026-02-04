import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  PAGE_PERMISSION_OPTIONS,
  normalizePagePermissions,
  type PagePermissionKey,
} from "@/lib/pagePermissions";
import type { UserItem } from "@/types/settings";

type PermissionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserItem | null;
  onSubmit: (user: UserItem, permissions: PagePermissionKey[]) => void;
  isPending: boolean;
};

function PermissionDrawerContent({
  user,
  onSubmit,
  isPending,
}: {
  user: UserItem;
  onSubmit: (user: UserItem, permissions: PagePermissionKey[]) => void;
  isPending: boolean;
}) {
  const [selectedPermissions, setSelectedPermissions] = useState<
    PagePermissionKey[]
  >(() => normalizePagePermissions(user.page_permissions));

  const togglePermission = (key: PagePermissionKey) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(key)) {
        return prev.filter((permission) => permission !== key);
      }
      return [...prev, key];
    });
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col px-4">
      <DrawerHeader>
        <DrawerTitle>ページ権限</DrawerTitle>
        <DrawerDescription>
          {user.username}
          が表示できるページを選択してください。
        </DrawerDescription>
      </DrawerHeader>
      <div className="border rounded-lg overflow-hidden">
        <div className="flex-1 space-y-3 p-3 overflow-y-auto shadow-inner max-h-[calc(100vh-250px)] bg-muted/20">
          {PAGE_PERMISSION_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm bg-card cursor-pointer"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary cursor-pointer"
                checked={selectedPermissions.includes(option.key)}
                onChange={() => togglePermission(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      <DrawerFooter className="p-0 pt-2 mt-5">
        <Button
          type="button"
          onClick={() => onSubmit(user, selectedPermissions)}
          disabled={isPending}
        >
          {isPending && <Spinner className="mr-2 h-4 w-4" />}
          更新
        </Button>
        <DrawerClose asChild>
          <Button variant="outline" type="button">
            キャンセル
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </div>
  );
}

export function PermissionDrawer({
  open,
  onOpenChange,
  user,
  onSubmit,
  isPending,
}: PermissionDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-screen">
        {user && (
          <PermissionDrawerContent
            key={user.id}
            user={user}
            onSubmit={onSubmit}
            isPending={isPending}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
// Force reload
