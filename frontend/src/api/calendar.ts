import api from "../lib/api";

export type GraphDateTime = {
  dateTime: string;
  timeZone: string;
};

export type CalendarEvent = {
  id: string;
  subject?: string;
  start: GraphDateTime;
  end: GraphDateTime;
  location?: {
    displayName?: string;
  };
  source?: "outlook" | "google";
  isAllDay?: boolean;
};

export type CalendarAttendee = {
  emailAddress?: {
    name?: string;
    address?: string;
  };
  type?: string;
  status?: {
    response?: string;
    time?: string;
  };
};

export type CalendarOrganizer = {
  emailAddress?: {
    name?: string;
    address?: string;
  };
};

export type CalendarEventDetail = CalendarEvent & {
  bodyPreview?: string;
  body?: {
    contentType?: string;
    content?: string;
  };
  organizer?: CalendarOrganizer;
  attendees?: CalendarAttendee[];
  isAllDay?: boolean;
  onlineMeetingUrl?: string;
  webLink?: string;
  source?: "outlook" | "google";
};

export type UserCalendar = {
  user: {
    id: number | string;
    email: string;
    username: string;
    role?: number | null;
  };
  events: CalendarEvent[];
};

export type CompanyCalendarResponse = {
  range: {
    start: string;
    end: string;
  };
  calendars: UserCalendar[];
  errors: { email: string; message: string }[];
  status?: "fresh" | "refreshing";
  last_updated_at?: string | null;
};

export async function getCompanyCalendars(params: {
  start?: string;
  end?: string;
  email?: string;
}) {
  const { data } = await api.get("/calendars/company", { params });
  return data.data as CompanyCalendarResponse;
}

export async function refreshCompanyCalendars(params: {
  start?: string;
  end?: string;
  email?: string;
}) {
  const { data } = await api.post("/calendars/company/refresh", params);
  return data.data as CompanyCalendarResponse;
}

export async function getCompanyCalendarEventDetail(params: {
  email: string;
  eventId: string;
}) {
  const { data } = await api.get(`/calendars/company/events/${params.eventId}`, {
    params: { email: params.email },
  });
  return data.data as CalendarEventDetail;
}
