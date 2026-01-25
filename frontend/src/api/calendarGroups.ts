import api from "../lib/api";

export type CalendarGroup = {
    id: number;
    name: string;
    member_user_ids: number[];
};

export type CalendarGroupsResponse = {
    groups: CalendarGroup[];
};

export async function getCalendarGroups() {
    const { data } = await api.get("/calendar-groups");
    return data.data as CalendarGroupsResponse;
}

export async function createCalendarGroup(name: string) {
    const { data } = await api.post("/calendar-groups", { name });
    return data.data as CalendarGroup;
}

export async function updateCalendarGroupName(id: number, name: string) {
    const { data } = await api.put(`/calendar-groups/${id}`, { name });
    return data.data as CalendarGroup;
}

export async function updateCalendarGroupMembers(id: number, memberUserIds: number[]) {
    const { data } = await api.put(`/calendar-groups/${id}/members`, {
        member_user_ids: memberUserIds,
    });
    return data.data as CalendarGroup;
}

export async function deleteCalendarGroup(id: number) {
    const { data } = await api.delete(`/calendar-groups/${id}`);
    return data.data as { id?: number };
}
