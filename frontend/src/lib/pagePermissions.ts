export const PAGE_PERMISSION_OPTIONS = [
  { key: "dashboard", label: "ダッシュボード" },
  { key: "calendars", label: "カレンダー" },
  { key: "trainings", label: "社内研修" },
] as const;

export type PagePermissionKey = (typeof PAGE_PERMISSION_OPTIONS)[number]["key"];

export const DEFAULT_PAGE_PERMISSIONS: PagePermissionKey[] =
  PAGE_PERMISSION_OPTIONS.map((option) => option.key);

export function normalizePagePermissions(
  permissions?: string[] | null
): PagePermissionKey[] {
  if (!permissions || permissions.length === 0) {
    return DEFAULT_PAGE_PERMISSIONS;
  }

  const allowed = new Set(DEFAULT_PAGE_PERMISSIONS);
  return permissions.filter((permission) => allowed.has(permission as PagePermissionKey)) as PagePermissionKey[];
}

export function hasPagePermission(
  permissions: string[] | null | undefined,
  key: PagePermissionKey
): boolean {
  return normalizePagePermissions(permissions).includes(key);
}
