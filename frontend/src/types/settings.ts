export type UserItem = {
  id: number;
  username: string;
  email: string;
  loginid: string;
  staff_number: string | null;
  role: number;
  page_permissions?: string[];
  created_at: string | null;
  updated_at: string | null;
  deleted?: boolean;
};

export type UsersResponse = {
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
