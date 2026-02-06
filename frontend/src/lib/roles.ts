export const UserRole = {
  SYSTEM_ADMIN: 1,
  GENERAL_USER: 2,
} as const;

export type UserRoleId = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_LABELS: Record<UserRoleId, string> = {
  [UserRole.SYSTEM_ADMIN]: "システム管理者",
  [UserRole.GENERAL_USER]: "一般ユーザー",
};

export const USER_ROLE_OPTIONS = Object.values(UserRole).map((value) => ({
  value: String(value),
  label: USER_ROLE_LABELS[value],
}));
