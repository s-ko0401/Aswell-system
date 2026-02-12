import api from "../lib/api";

export type UserItem = {
    id: number;
    username: string;
    email: string;
    loginid: string;
    role: number;
    created_at: string | null;
    updated_at: string | null;
};

export type UsersResponse = {
    data: UserItem[];
    meta: {
        page: number;
        per_page: number;
        total: number;
    };
};

export const getUsers = async (page = 1, perPage = 20) => {
    const { data } = await api.get("/users", { params: { page, per_page: perPage } });
    return data as UsersResponse;
};

export const getUsersSelection = async () => {
    const { data } = await api.get("/users/selection");
    return data as {
        success: boolean;
        data: { id: number; username: string; email: string; role: number }[];
        message: string;
    };
};
