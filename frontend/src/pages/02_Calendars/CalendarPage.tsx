import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addDays,
    addWeeks,
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfDay,
    endOfWeek,
    format,
    isSameMonth,
    isToday,
    startOfMonth,
    startOfDay,
    startOfWeek,
    subDays,
    subMonths,
    subWeeks,
} from "date-fns";
import { Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { ja } from "date-fns/locale";
import {
    getCompanyCalendars,
    getCompanyCalendarEventDetail,
    refreshCompanyCalendars,
    type CalendarEvent,
    type CalendarEventDetail,
    type CompanyCalendarResponse,
    type UserCalendar,
} from "../../api/calendar";
import {
    createCalendarGroup,
    deleteCalendarGroup,
    getCalendarGroups,
    updateCalendarGroupMembers,
    updateCalendarGroupName,
    type CalendarGroup,
    type CalendarGroupsResponse,
} from "../../api/calendarGroups";
import { getUsersSelection } from "../../api/users";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/use-toast";
import {
    Card,
    CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Calendar } from "../../components/ui/calendar";
import { Input } from "../../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../components/ui/dialog";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "../../components/ui/drawer";
import { Spinner } from "../../components/ui/spinner";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "../../components/ui/accordion";

export const CalendarPage: React.FC = () => {
    const { data: me } = useAuth();
    const { toast } = useToast();
    const isLoggedIn = Boolean(me?.email);
    const [viewMode, setViewMode] = React.useState<"day" | "week">("day");
    const queryClient = useQueryClient();
    const [sourceFilters, setSourceFilters] = React.useState<Set<"outlook" | "google">>(
        () => new Set(["outlook"])
    );

    const [anchorDate, setAnchorDate] = React.useState(() => new Date());
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
    const [isMemberFilterOpen, setIsMemberFilterOpen] = React.useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(new Set());
    const [memberSearch, setMemberSearch] = React.useState("");
    const shouldResetMemberSelection = React.useRef(true);
    const [activeGroupId, setActiveGroupId] = React.useState<number | "all" | null>(null);
    const [isGroupManagerOpen, setIsGroupManagerOpen] = React.useState(false);
    const [newGroupName, setNewGroupName] = React.useState("");
    const [editingGroupId, setEditingGroupId] = React.useState<number | null>(null);
    const [editingGroupName, setEditingGroupName] = React.useState("");
    const [memberEditorGroupId, setMemberEditorGroupId] = React.useState<number | null>(null);
    const [memberEditorSelection, setMemberEditorSelection] = React.useState<Set<string>>(new Set());
    const [memberEditorSearch, setMemberEditorSearch] = React.useState("");
    const lastAutoRefreshKey = React.useRef<string | null>(null);
    const lastMemberAutoRefreshKey = React.useRef<string | null>(null);
    const [isMemberCalendarOpen, setIsMemberCalendarOpen] = React.useState(false);
    const [activeMember, setActiveMember] = React.useState<UserCalendar["user"] | null>(null);
    const [memberCalendarMonth, setMemberCalendarMonth] = React.useState(() => new Date());
    const [activeEvent, setActiveEvent] = React.useState<{
        event: CalendarEvent;
        user: UserCalendar["user"];
    } | null>(null);
    const [isEventDrawerOpen, setIsEventDrawerOpen] = React.useState(false);
    const range = React.useMemo(() => {
        if (viewMode === "week") {
            const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
            const end = endOfWeek(anchorDate, { weekStartsOn: 1 });
            return { start, end };
        }

        return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
    }, [anchorDate, viewMode]);
    const fetchRange = React.useMemo(() => {
        const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
        const end = endOfWeek(anchorDate, { weekStartsOn: 1 });
        return { start, end };
    }, [anchorDate]);

    const days = React.useMemo(() => {
        if (viewMode === "day") {
            return [range.start];
        }

        return Array.from({ length: 7 }, (_, index) => addDays(range.start, index));
    }, [range.start, viewMode]);

    const memberMonthRange = React.useMemo(() => {
        const start = startOfMonth(memberCalendarMonth);
        const end = endOfMonth(memberCalendarMonth);
        return { start, end };
    }, [memberCalendarMonth]);

    const memberMonthDays = React.useMemo(() => {
        const start = startOfWeek(startOfMonth(memberCalendarMonth), {
            weekStartsOn: 1,
        });
        const end = endOfWeek(endOfMonth(memberCalendarMonth), {
            weekStartsOn: 1,
        });
        return eachDayOfInterval({ start, end });
    }, [memberCalendarMonth]);

    const memberMonthWeeks = React.useMemo(() => {
        const weeks: Date[][] = [];
        for (let index = 0; index < memberMonthDays.length; index += 7) {
            weeks.push(memberMonthDays.slice(index, index + 7));
        }
        return weeks;
    }, [memberMonthDays]);

    const weekDayLabels = React.useMemo(
        () => ["月", "火", "水", "木", "金", "土", "日"],
        []
    );

    const autoRefreshKey = React.useMemo(
        () =>
            `${fetchRange.start.toISOString()}-${fetchRange.end.toISOString()}`,
        [fetchRange.end, fetchRange.start]
    );

    const { data, isLoading, isError, error, isFetching } = useQuery<
        CompanyCalendarResponse,
        Error
    >({
        queryKey: [
            "companyCalendar",
            fetchRange.start.toISOString(),
            fetchRange.end.toISOString(),
        ],
        enabled: isLoggedIn,
        queryFn: () =>
            getCompanyCalendars({
                start: fetchRange.start.toISOString(),
                end: fetchRange.end.toISOString(),
            }),
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchInterval: (query) =>
            query.state.data?.status === "refreshing" ? 30000 : false,
    });

    const membersQuery = useQuery<
        { success: boolean; data: { id: number; username: string; email: string; role: number }[]; message: string },
        Error
    >({
        queryKey: ["usersSelection"],
        queryFn: () => getUsersSelection(),
        enabled: isLoggedIn,
        staleTime: 5 * 60_000,
    });

    const calendarGroupsQuery = useQuery<CalendarGroupsResponse, Error>({
        queryKey: ["calendarGroups"],
        queryFn: () => getCalendarGroups(),
        enabled: isLoggedIn,
        staleTime: 5 * 60_000,
    });

    const memberCalendarQuery = useQuery<CompanyCalendarResponse, Error>({
        queryKey: [
            "memberCalendar",
            activeMember?.email,
            memberMonthRange.start.toISOString(),
            memberMonthRange.end.toISOString(),
        ],
        enabled: Boolean(activeMember?.email) && isMemberCalendarOpen,
        queryFn: () =>
            getCompanyCalendars({
                email: activeMember?.email,
                start: memberMonthRange.start.toISOString(),
                end: memberMonthRange.end.toISOString(),
            }),
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchInterval: (query) =>
            query.state.data?.status === "refreshing" ? 30000 : false,
        placeholderData: (previousData) => previousData,
    });

    const activeEventSource = activeEvent?.event.source ?? "outlook";
    const isGoogleEvent = activeEventSource === "google";
    const eventDetailQuery = useQuery<CalendarEventDetail, Error>({
        queryKey: [
            "calendarEventDetail",
            activeEvent?.event.id,
            activeEvent?.user.email,
        ],
        enabled:
            Boolean(activeEvent?.event.id && activeEvent?.user.email) &&
            isEventDrawerOpen &&
            !isGoogleEvent,
        queryFn: () =>
            getCompanyCalendarEventDetail({
                email: activeEvent?.user.email ?? "",
                eventId: activeEvent?.event.id ?? "",
            }),
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });

    const refreshMutation = useMutation({
        mutationFn: () =>
            refreshCompanyCalendars({
                start: fetchRange.start.toISOString(),
                end: fetchRange.end.toISOString(),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["companyCalendar"],
            });
        },
    });

    const createGroupMutation = useMutation({
        mutationFn: (name: string) => createCalendarGroup(name),
        onSuccess: () => {
            setNewGroupName("");
            queryClient.invalidateQueries({ queryKey: ["calendarGroups"] });
            toast({
                title: "グループを作成しました",
            });
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "作成に失敗しました",
                description: "同じ名前のグループがある可能性があります。",
            });
        },
    });

    const updateGroupNameMutation = useMutation({
        mutationFn: (payload: { id: number; name: string }) =>
            updateCalendarGroupName(payload.id, payload.name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["calendarGroups"] });
            setEditingGroupId(null);
            setEditingGroupName("");
            toast({
                title: "グループ名を更新しました",
            });
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "更新に失敗しました",
                description: "同じ名前のグループがある可能性があります。",
            });
        },
    });

    const updateGroupMembersMutation = useMutation({
        mutationFn: (payload: { id: number; memberUserIds: number[] }) =>
            updateCalendarGroupMembers(payload.id, payload.memberUserIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["calendarGroups"] });
            if (memberEditorGroupId && activeGroupId === memberEditorGroupId) {
                setSelectedMemberIds(new Set(memberEditorSelection));
                setActiveGroupId(memberEditorGroupId);
            }
            setMemberEditorGroupId(null);
            toast({
                title: "グループのメンバーを更新しました",
            });
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "更新に失敗しました",
                description: "もう一度お試しください。",
            });
        },
    });

    const deleteGroupMutation = useMutation({
        mutationFn: (id: number) => deleteCalendarGroup(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ["calendarGroups"] });
            if (activeGroupId === id) {
                setActiveGroupId(null);
            }
            if (memberEditorGroupId === id) {
                setMemberEditorGroupId(null);
            }
            toast({
                title: "グループを削除しました",
            });
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "削除に失敗しました",
                description: "もう一度お試しください。",
            });
        },
    });

    const memberAutoRefreshKey = React.useMemo(
        () =>
            `${activeMember?.email ?? "none"}-${memberMonthRange.start.toISOString()}-${memberMonthRange.end.toISOString()}`,
        [activeMember?.email, memberMonthRange.end, memberMonthRange.start]
    );

    const memberRefreshMutation = useMutation({
        mutationFn: () => {
            if (!activeMember?.email) {
                return Promise.reject(new Error("Member email is missing"));
            }
            return refreshCompanyCalendars({
                email: activeMember.email,
                start: memberMonthRange.start.toISOString(),
                end: memberMonthRange.end.toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["memberCalendar"],
            });
        },
    });

    React.useEffect(() => {
        if (!isLoggedIn) {
            return;
        }
        if (refreshMutation.isPending) {
            return;
        }
        if (data?.status !== "refreshing") {
            return;
        }
        if (data?.last_updated_at) {
            return;
        }
        if (lastAutoRefreshKey.current === autoRefreshKey) {
            return;
        }

        lastAutoRefreshKey.current = autoRefreshKey;
        refreshMutation.mutate();
    }, [
        autoRefreshKey,
        data?.last_updated_at,
        data?.status,
        isLoggedIn,
        refreshMutation,
    ]);

    React.useEffect(() => {
        if (!activeMember?.email || !isMemberCalendarOpen) {
            return;
        }
        if (memberRefreshMutation.isPending) {
            return;
        }
        if (memberCalendarQuery.data?.status !== "refreshing") {
            return;
        }
        if (memberCalendarQuery.data?.last_updated_at) {
            return;
        }
        if (lastMemberAutoRefreshKey.current === memberAutoRefreshKey) {
            return;
        }

        lastMemberAutoRefreshKey.current = memberAutoRefreshKey;
        memberRefreshMutation.mutate();
    }, [
        activeMember?.email,
        isMemberCalendarOpen,
        memberAutoRefreshKey,
        memberCalendarQuery.data?.last_updated_at,
        memberCalendarQuery.data?.status,
        memberRefreshMutation,
    ]);

    const calendars: UserCalendar[] = data?.calendars ?? [];
    const memberOptions = React.useMemo<UserCalendar["user"][]>(() => {
        const list = membersQuery.data?.data ?? [];
        return list.map((user) => ({
            id: user.id,
            email: user.email,
            username: user.username,
            role: typeof user.role === "number" ? user.role : null,
        }));
    }, [membersQuery.data?.data]);
    const calendarGroups = calendarGroupsQuery.data?.groups ?? [];
    const isBusy = isLoading || isFetching;
    const isCalendarRefreshing =
        refreshMutation.isPending || data?.status === "refreshing";
    const memberEvents: CalendarEvent[] =
        memberCalendarQuery.data?.calendars?.[0]?.events ?? [];
    const isMemberCalendarBusy =
        memberCalendarQuery.isLoading ||
        memberCalendarQuery.isFetching ||
        memberRefreshMutation.isPending;
    const eventDetail = eventDetailQuery.data ?? activeEvent?.event;
    const isEventDetailLoading =
        eventDetailQuery.isLoading || eventDetailQuery.isFetching;
    const eventOrganizer = !isGoogleEvent ? eventDetailQuery.data?.organizer?.emailAddress : undefined;
    const eventAttendees = !isGoogleEvent ? eventDetailQuery.data?.attendees ?? [] : [];
    const eventDescription = !isGoogleEvent
        ? eventDetailQuery.data?.bodyPreview ||
          (eventDetailQuery.data?.body?.contentType === "text"
              ? eventDetailQuery.data?.body?.content
              : undefined)
        : undefined;

    const dayKey = (value: Date | string) => {
        const parts = new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(new Date(value));
        const partMap = Object.fromEntries(
            parts
                .filter((part) => part.type !== "literal")
                .map((part) => [part.type, part.value])
        );

        return `${partMap.year}-${partMap.month}-${partMap.day}`;
    };

    const MEMBER_COLUMN_WIDTH = 140;
    const DAY_COLUMN_MIN_WIDTH = 160;
    const MULTI_DAY_BAR_HEIGHT = 22;
    const MULTI_DAY_BAR_GAP = 4;
    const MULTI_DAY_LIST_GAP = 4;
    const DAY_CELL_BASE_PADDING = 12;
    const MONTH_CELL_BASE_PADDING = 8;

    const compareDayKeys = (a: string, b: string) => a.localeCompare(b);

    const getEventRangeKeys = (event: CalendarEvent) => {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        const endInclusive = new Date(end.getTime() - 1);

        return {
            startKey: dayKey(start),
            endKey: dayKey(endInclusive),
        };
    };

    const isMultiDayEvent = (event: CalendarEvent) => {
        const { startKey, endKey } = getEventRangeKeys(event);
        return startKey !== endKey;
    };

    const eventOverlapsDayKey = (event: CalendarEvent, key: string) => {
        const { startKey, endKey } = getEventRangeKeys(event);
        return compareDayKeys(startKey, key) <= 0 && compareDayKeys(endKey, key) >= 0;
    };

    const isSourceEnabled = React.useCallback(
        (source: "outlook" | "google") => sourceFilters.has(source),
        [sourceFilters]
    );

    const toggleSource = (source: "outlook" | "google") => {
        setSourceFilters((prev) => {
            const next = new Set(prev);
            if (next.has(source)) {
                if (next.size === 1) {
                    return next;
                }
                next.delete(source);
            } else {
                next.add(source);
            }
            return next;
        });
    };

    const filterEventsBySource = React.useCallback(
        (events: CalendarEvent[]) =>
            events.filter((event) => {
                const source = event.source ?? "outlook";
                return sourceFilters.has(source);
            }),
        [sourceFilters]
    );

    const filteredMemberEvents = React.useMemo(
        () => filterEventsBySource(memberEvents),
        [filterEventsBySource, memberEvents]
    );

    const memberMultiDayEvents = React.useMemo(
        () => filteredMemberEvents.filter((event) => isMultiDayEvent(event)),
        [filteredMemberEvents, isMultiDayEvent]
    );

    const memberSingleDayEvents = React.useMemo(
        () => filteredMemberEvents.filter((event) => !isMultiDayEvent(event)),
        [filteredMemberEvents, isMultiDayEvent]
    );

    const memberEventsByDay = React.useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();

        for (const event of memberSingleDayEvents) {
            const key = dayKey(event.start.dateTime);
            const list = map.get(key) ?? [];
            list.push(event);
            map.set(key, list);
        }

        for (const [key, list] of map) {
            list.sort(
                (a, b) =>
                    new Date(a.start.dateTime).getTime() -
                    new Date(b.start.dateTime).getTime()
            );
            map.set(key, list);
        }

        return map;
    }, [memberSingleDayEvents]);

    const roomNames = React.useMemo(
        () => new Set(["名古屋会議室（大）", "名古屋会議室（小）"]),
        []
    );

    const sortMembers = React.useCallback(
        (a: UserCalendar["user"], b: UserCalendar["user"]) => {
            const myEmail = me?.email?.toLowerCase();
            if (myEmail) {
                const isMeA = a.email?.toLowerCase() === myEmail;
                const isMeB = b.email?.toLowerCase() === myEmail;
                if (isMeA && !isMeB) return -1;
                if (!isMeA && isMeB) return 1;
            }

            const isRoomA = a.username && roomNames.has(a.username);
            const isRoomB = b.username && roomNames.has(b.username);
            if (isRoomA && !isRoomB) return -1;
            if (!isRoomA && isRoomB) return 1;

            const roleA = typeof a.role === "number" ? a.role : 999;
            const roleB = typeof b.role === "number" ? b.role : 999;

            if (roleA !== roleB) {
                return roleA - roleB;
            }

            const nameA = (a.username || a.email || "").toLowerCase();
            const nameB = (b.username || b.email || "").toLowerCase();
            const nameCompare = nameA.localeCompare(nameB, "en", {
                sensitivity: "base",
            });

            if (nameCompare !== 0) {
                return nameCompare;
            }

            const emailA = (a.email || "").toLowerCase();
            const emailB = (b.email || "").toLowerCase();
            return emailA.localeCompare(emailB, "en", { sensitivity: "base" });
        },
        [me?.email, roomNames]
    );

    const weekDayKeys = React.useMemo(() => days.map((day) => dayKey(day)), [days]);

    const buildMultiDayLayout = React.useCallback(
        (events: CalendarEvent[], dayKeys: string[]) => {
            if (dayKeys.length === 0) {
                return { bars: [], laneCount: 0 };
            }

            const dayIndexMap = new Map<string, number>();
            dayKeys.forEach((key, index) => {
                dayIndexMap.set(key, index);
            });

            const rangeStartKey = dayKeys[0];
            const rangeEndKey = dayKeys[dayKeys.length - 1];
            const bars: Array<{
                event: CalendarEvent;
                startIndex: number;
                endIndex: number;
                lane: number;
            }> = [];
            const laneByDay = Array(dayKeys.length).fill(0);

            for (const event of events) {
                const { startKey, endKey } = getEventRangeKeys(event);
                if (
                    compareDayKeys(startKey, rangeEndKey) > 0 ||
                    compareDayKeys(endKey, rangeStartKey) < 0
                ) {
                    continue;
                }

                const startIndex = dayIndexMap.get(startKey) ?? 0;
                const endIndex =
                    dayIndexMap.get(endKey) ?? dayKeys.length - 1;

                bars.push({
                    event,
                    startIndex,
                    endIndex,
                    lane: 0,
                });
            }

            bars.sort((a, b) => {
                if (a.startIndex !== b.startIndex) {
                    return a.startIndex - b.startIndex;
                }
                if (a.endIndex !== b.endIndex) {
                    return a.endIndex - b.endIndex;
                }
                return (
                    new Date(a.event.start.dateTime).getTime() -
                    new Date(b.event.start.dateTime).getTime()
                );
            });

            const laneEndIndices: number[] = [];

            for (const bar of bars) {
                let placed = false;
                for (let i = 0; i < laneEndIndices.length; i += 1) {
                    if (laneEndIndices[i] < bar.startIndex) {
                        laneEndIndices[i] = bar.endIndex;
                        bar.lane = i;
                        placed = true;
                        break;
                    }
                }

                if (!placed) {
                    bar.lane = laneEndIndices.length;
                    laneEndIndices.push(bar.endIndex);
                }
            }

            for (const bar of bars) {
                for (let i = bar.startIndex; i <= bar.endIndex; i += 1) {
                    laneByDay[i] = Math.max(laneByDay[i], bar.lane + 1);
                }
            }

            return {
                bars,
                laneCount: laneEndIndices.length,
                laneByDay,
            };
        },
        [compareDayKeys, getEventRangeKeys]
    );

    const sortedCalendars = React.useMemo(
        () => [...calendars].sort((a, b) => sortMembers(a.user, b.user)),
        [calendars, sortMembers]
    );

    const sortedMembers = React.useMemo(
        () => [...memberOptions].sort(sortMembers),
        [memberOptions, sortMembers]
    );

    const availableMemberIds = React.useMemo(
        () => new Set(sortedMembers.map((member) => String(member.id))),
        [sortedMembers]
    );

    React.useEffect(() => {
        if (availableMemberIds.size === 0) {
            return;
        }
        if (shouldResetMemberSelection.current && availableMemberIds.size > 0) {
            setSelectedMemberIds(new Set(availableMemberIds));
            shouldResetMemberSelection.current = false;
            setActiveGroupId("all");
            return;
        }

        setSelectedMemberIds((prev) => {
            const next = new Set(
                Array.from(prev).filter((id) => availableMemberIds.has(id))
            );
            return next.size === prev.size ? prev : next;
        });
    }, [availableMemberIds]);

    const filteredCalendars = React.useMemo(() => {
        if (selectedMemberIds.size === 0) {
            return [];
        }
        return sortedCalendars.filter((calendar) =>
            selectedMemberIds.has(String(calendar.user.id))
        );
    }, [selectedMemberIds, sortedCalendars]);

    const normalizedMemberSearch = memberSearch.trim().toLowerCase();
    const visibleCalendars = React.useMemo(() => {
        if (!normalizedMemberSearch) {
            return filteredCalendars;
        }
        const tokens = normalizedMemberSearch.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) {
            return filteredCalendars;
        }

        return filteredCalendars.filter((calendar) => {
            const label = `${calendar.user.username ?? ""} ${calendar.user.email ?? ""}`
                .toLowerCase();
            return tokens.every((token) => label.includes(token));
        });
    }, [filteredCalendars, normalizedMemberSearch]);

    const sourceFilteredCalendars = React.useMemo(
        () =>
            visibleCalendars.map((calendar) => ({
                ...calendar,
                events: filterEventsBySource(calendar.events),
            })),
        [filterEventsBySource, visibleCalendars]
    );

    const normalizedMemberEditorSearch = memberEditorSearch
        .trim()
        .toLowerCase();
    const visibleMemberEditorOptions = React.useMemo(() => {
        if (!normalizedMemberEditorSearch) {
            return sortedMembers;
        }
        const tokens = normalizedMemberEditorSearch
            .split(/\s+/)
            .filter(Boolean);
        if (tokens.length === 0) {
            return sortedMembers;
        }

        return sortedMembers.filter((member) => {
            const label = `${member.username ?? ""} ${member.email ?? ""}`
                .toLowerCase();
            return tokens.every((token) => label.includes(token));
        });
    }, [normalizedMemberEditorSearch, sortedMembers]);

    const selectedCount = selectedMemberIds.size;
    const hasCalendars = calendars.length > 0;
    const hasVisibleCalendars = visibleCalendars.length > 0;
    const memberEditorSelectedCount = memberEditorSelection.size;
    const memberEditorGroup = calendarGroups.find(
        (group) => group.id === memberEditorGroupId
    );

    const selectAllMembers = React.useCallback(() => {
        setSelectedMemberIds(new Set(availableMemberIds));
        setActiveGroupId("all");
    }, [availableMemberIds]);

    const clearAllMembers = React.useCallback(() => {
        setSelectedMemberIds(new Set());
        setActiveGroupId(null);
    }, []);

    const applyGroupSelection = React.useCallback((group: CalendarGroup) => {
        setSelectedMemberIds(
            new Set(group.member_user_ids.map((id) => String(id)))
        );
        setActiveGroupId(group.id);
    }, []);

    const toggleMember = (memberId: string) => {
        setActiveGroupId(null);
        setSelectedMemberIds((prev) => {
            const next = new Set(prev);
            if (next.has(memberId)) {
                next.delete(memberId);
            } else {
                next.add(memberId);
            }
            return next;
        });
    };

    const handleCreateGroup = () => {
        const name = newGroupName.trim();
        if (!name) {
            return;
        }
        createGroupMutation.mutate(name);
    };

    const startEditGroupName = (group: CalendarGroup) => {
        setEditingGroupId(group.id);
        setEditingGroupName(group.name);
    };

    const handleSaveGroupName = (groupId: number) => {
        const name = editingGroupName.trim();
        if (!name) {
            return;
        }
        updateGroupNameMutation.mutate({ id: groupId, name });
    };

    const handleEditGroupMembers = (group: CalendarGroup) => {
        setMemberEditorGroupId(group.id);
        setMemberEditorSelection(
            new Set(group.member_user_ids.map((id) => String(id)))
        );
        setMemberEditorSearch("");
    };

    const handleSaveGroupMembers = () => {
        if (!memberEditorGroupId) {
            return;
        }
        updateGroupMembersMutation.mutate({
            id: memberEditorGroupId,
            memberUserIds: Array.from(memberEditorSelection).map((id) =>
                Number(id)
            ),
        });
    };

    const toggleMemberInGroupEditor = (memberId: string) => {
        setMemberEditorSelection((prev) => {
            const next = new Set(prev);
            if (next.has(memberId)) {
                next.delete(memberId);
            } else {
                next.add(memberId);
            }
            return next;
        });
    };

    const openEventDrawer = React.useCallback(
        (event: CalendarEvent, user: UserCalendar["user"]) => {
            setActiveEvent({ event, user });
            setIsEventDrawerOpen(true);
        },
        []
    );

    const formatInJst = (value: Date | string) =>
        new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(value));

    const formatTimeInJst = (value: Date | string) =>
        new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(value));

    return (
        <div className="space-y-6 overflow-x-hidden">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">カレンダー</h2>
                <p className="text-muted-foreground">
                    研修スケジュールや予定を管理します。
                </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="calendar-update" className="rounded-md border">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold">
                        2026/01/25 更新
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-sm">
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>週を切り替えても、メンバー選択が消えなくなりました。</li>
                            <li>
                                自分専用のグループを作成して、ワンクリックで表示を切り替えられます。
                                <div className="mt-1 text-xs text-muted-foreground">
                                    使い方：グループ管理 → 追加 → メンバー編集 → 保存。画面上のグループボタンで切り替え。
                                </div>
                            </li>
                            <li>
                                日跨ぎ予定は該当日のみ上段が表示されます。
                            </li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Card>
                <CardContent className="m-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant={viewMode === "day" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("day")}
                        >
                            日
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === "week" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("week")}
                        >
                            週
                        </Button>
                        <div className="h-5 w-px bg-border" />
                        {viewMode === "day" ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAnchorDate(new Date())}
                                >
                                    今日
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setAnchorDate((date) => subDays(date, 1))
                                    }
                                >
                                    前日
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setAnchorDate((date) => addDays(date, 1))
                                    }
                                >
                                    翌日
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAnchorDate(new Date())}
                                >
                                    今週
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setAnchorDate((date) =>
                                            subWeeks(date, 1)
                                        )
                                    }
                                >
                                    前週
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setAnchorDate((date) =>
                                            addWeeks(date, 1)
                                        )
                                    }
                                >
                                    次週
                                </Button>
                            </>
                        )}
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                    {format(anchorDate, "yyyy/MM/dd", { locale: ja })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={anchorDate}
                                    onSelect={(date) => {
                                        if (!date) return;
                                        setAnchorDate(date);
                                        setIsCalendarOpen(false);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Dialog
                            open={isMemberFilterOpen}
                            onOpenChange={setIsMemberFilterOpen}
                        >
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    メンバー
                                    {selectedCount > 0
                                        ? ` (${selectedCount})`
                                        : ""}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="flex h-[85vh] w-[95vw] max-w-6xl flex-col gap-0 p-0">
                                <DialogHeader className="border-b px-6 py-4 text-left">
                                    <DialogTitle>メンバー選択</DialogTitle>
                                    <DialogDescription className="text-xs">
                                        表示するメンバーを選択してください。未選択は表示されません。
                                    </DialogDescription>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span>
                                            表示メンバー：
                                            {selectedCount === 0
                                                ? "なし"
                                                : `${selectedCount}人`}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={selectAllMembers}
                                                disabled={availableMemberIds.size === 0}
                                            >
                                                全て選択
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearAllMembers}
                                                disabled={availableMemberIds.size === 0}
                                            >
                                                全て解除
                                            </Button>
                                        </div>
                                    </div>
                                </DialogHeader>
                                <div className="flex-1 overflow-auto px-6 py-4">
                                    {sortedMembers.length === 0 ? (
                                        <div className="py-6 text-sm text-muted-foreground">
                                            データがありません。
                                        </div>
                                    ) : (
                                        <div
                                            className="grid gap-2"
                                            style={{
                                                gridAutoFlow: "column",
                                                gridAutoColumns:
                                                    "minmax(140px, 1fr)",
                                                gridTemplateRows:
                                                    "repeat(10, minmax(72px, auto))",
                                            }}
                                        >
                                            {sortedMembers.map((member) => {
                                                const memberId = String(
                                                    member.id
                                                );
                                                const isChecked =
                                                    selectedMemberIds.has(memberId);

                                                return (
                                                    <label
                                                        key={memberId}
                                                        className={`flex cursor-pointer flex-col gap-1 rounded-md border px-2 py-2 text-xs transition ${
                                                            isChecked
                                                                ? "border-primary/40 bg-primary/5"
                                                                : "hover:bg-accent"
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <input
                                                                type="checkbox"
                                                                className="mt-0.5 h-4 w-4"
                                                                checked={
                                                                    isChecked
                                                                }
                                                                onChange={() =>
                                                                    toggleMember(
                                                                        memberId
                                                                    )
                                                                }
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="font-medium break-words leading-tight">
                                                                    {member
                                                                        .username ||
                                                                        "No Name"}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground break-words leading-tight">
                                                                    {member
                                                                        .email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <DialogFooter className="border-t px-6 py-3">
                                    <DialogClose asChild>
                                        <Button variant="outline" size="sm">
                                            閉じる
                                        </Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 rounded-md border px-1 py-1">
                                <Button
                                    type="button"
                                    variant={
                                        isSourceEnabled("outlook")
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => toggleSource("outlook")}
                                >
                                    Outlook
                                </Button>
                                <Button
                                    type="button"
                                    variant={
                                        isSourceEnabled("google")
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => toggleSource("google")}
                                >
                                    Google
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refreshMutation.mutate()}
                                disabled={!isLoggedIn || isCalendarRefreshing}
                                className="gap-1"
                            >
                                {isCalendarRefreshing ? (
                                    <Spinner className="h-4 w-4" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                更新
                            </Button>
                            <Input
                                value={memberSearch}
                                onChange={(event) =>
                                    setMemberSearch(event.target.value)
                                }
                                placeholder="メンバー検索"
                                className="h-8 w-[200px] text-sm"
                            />
                            {memberSearch && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setMemberSearch("")}
                                >
                                    クリア
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {viewMode === "day"
                                ? formatInJst(range.start)
                                : `${formatInJst(range.start)} - ${formatInJst(range.end)}`}
                            {isCalendarRefreshing && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Spinner className="h-3.5 w-3.5" />
                                    更新中...
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant={activeGroupId === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={selectAllMembers}
                            disabled={availableMemberIds.size === 0}
                        >
                            全員
                        </Button>
                        {calendarGroups.map((group) => (
                            <Button
                                key={group.id}
                                type="button"
                                variant={activeGroupId === group.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => applyGroupSelection(group)}
                            >
                                {group.name}
                            </Button>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsGroupManagerOpen(true)}
                        >
                            グループ管理
                        </Button>
                    </div>
                    <Dialog
                        open={isGroupManagerOpen}
                        onOpenChange={(open) => {
                            setIsGroupManagerOpen(open);
                            if (!open) {
                                setEditingGroupId(null);
                                setEditingGroupName("");
                                setNewGroupName("");
                            }
                        }}
                    >
                        <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-4xl flex-col gap-0 p-0">
                            <DialogHeader className="border-b px-6 py-4 text-left">
                                <DialogTitle>グループ管理</DialogTitle>
                                <DialogDescription className="text-xs">
                                    メンバーのグループを作成・編集できます。
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-auto px-6 py-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        value={newGroupName}
                                        onChange={(event) =>
                                            setNewGroupName(event.target.value)
                                        }
                                        placeholder="新しいグループ名"
                                        className="h-9 max-w-xs text-sm"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleCreateGroup}
                                        disabled={
                                            createGroupMutation.isPending ||
                                            newGroupName.trim().length === 0
                                        }
                                    >
                                        追加
                                    </Button>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {calendarGroups.length === 0 ? (
                                        <div className="py-6 text-sm text-muted-foreground">
                                            グループはまだありません。
                                        </div>
                                    ) : (
                                        calendarGroups.map((group) => {
                                            const isEditingName =
                                                editingGroupId === group.id;
                                            return (
                                                <div
                                                    key={group.id}
                                                    className="rounded-md border p-3"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="min-w-[180px]">
                                                            {isEditingName ? (
                                                                <Input
                                                                    value={editingGroupName}
                                                                    onChange={(event) =>
                                                                        setEditingGroupName(
                                                                            event.target.value
                                                                        )
                                                                    }
                                                                    className="h-8 text-sm"
                                                                />
                                                            ) : (
                                                                <div className="font-medium">
                                                                    {group.name}
                                                                </div>
                                                            )}
                                                            <div className="text-xs text-muted-foreground">
                                                                メンバー数：
                                                                {
                                                                    group
                                                                        .member_user_ids
                                                                        .length
                                                                }
                                                                人
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {isEditingName ? (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            handleSaveGroupName(
                                                                                group.id
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            updateGroupNameMutation.isPending
                                                                        }
                                                                    >
                                                                        保存
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setEditingGroupId(
                                                                                null
                                                                            );
                                                                            setEditingGroupName(
                                                                                ""
                                                                            );
                                                                        }}
                                                                    >
                                                                        キャンセル
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        startEditGroupName(
                                                                            group
                                                                        )
                                                                    }
                                                                >
                                                                    名前変更
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleEditGroupMembers(
                                                                        group
                                                                    )
                                                                }
                                                            >
                                                                メンバー編集
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() =>
                                                                    deleteGroupMutation.mutate(
                                                                        group.id
                                                                    )
                                                                }
                                                                disabled={
                                                                    deleteGroupMutation.isPending
                                                                }
                                                            >
                                                                削除
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                            <DialogFooter className="border-t px-6 py-3">
                                <DialogClose asChild>
                                    <Button variant="outline" size="sm">
                                        閉じる
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog
                        open={Boolean(memberEditorGroupId)}
                        onOpenChange={(open) => {
                            if (!open) {
                                setMemberEditorGroupId(null);
                            }
                        }}
                    >
                        <DialogContent className="flex h-[85vh] w-[95vw] max-w-6xl flex-col gap-0 p-0">
                            <DialogHeader className="border-b px-6 py-4 text-left">
                                <DialogTitle>
                                    {memberEditorGroup?.name ?? "グループ"}のメンバー編集
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    表示するメンバーを選択してください。
                                </DialogDescription>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span>
                                        選択中：
                                        {memberEditorSelectedCount === 0
                                            ? "なし"
                                            : `${memberEditorSelectedCount}人`}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setMemberEditorSelection(
                                                    new Set(availableMemberIds)
                                                )
                                            }
                                            disabled={
                                                availableMemberIds.size === 0
                                            }
                                        >
                                            全て選択
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setMemberEditorSelection(
                                                    new Set()
                                                )
                                            }
                                            disabled={
                                                availableMemberIds.size === 0
                                            }
                                        >
                                            全て解除
                                        </Button>
                                    </div>
                                </div>
                            </DialogHeader>
                            <div className="flex-1 overflow-auto px-6 py-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <Input
                                        value={memberEditorSearch}
                                        onChange={(event) =>
                                            setMemberEditorSearch(
                                                event.target.value
                                            )
                                        }
                                        placeholder="メンバー検索"
                                        className="h-8 w-[200px] text-sm"
                                    />
                                    {memberEditorSearch && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setMemberEditorSearch("")
                                            }
                                        >
                                            クリア
                                        </Button>
                                    )}
                                </div>
                                {sortedMembers.length === 0 ? (
                                    <div className="py-6 text-sm text-muted-foreground">
                                        データがありません。
                                    </div>
                                ) : (
                                    <div
                                        className="grid gap-2"
                                        style={{
                                            gridAutoFlow: "column",
                                            gridAutoColumns:
                                                "minmax(140px, 1fr)",
                                            gridTemplateRows:
                                                "repeat(10, minmax(72px, auto))",
                                        }}
                                    >
                                        {visibleMemberEditorOptions.map(
                                            (member) => {
                                                const memberId = String(
                                                    member.id
                                                );
                                                const isChecked =
                                                    memberEditorSelection.has(
                                                        memberId
                                                    );

                                                return (
                                                    <label
                                                        key={memberId}
                                                        className={`flex cursor-pointer flex-col gap-1 rounded-md border px-2 py-2 text-xs transition ${
                                                            isChecked
                                                                ? "border-primary/40 bg-primary/5"
                                                                : "hover:bg-accent"
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <input
                                                                type="checkbox"
                                                                className="mt-0.5 h-4 w-4"
                                                                checked={
                                                                    isChecked
                                                                }
                                                                onChange={() =>
                                                                    toggleMemberInGroupEditor(
                                                                        memberId
                                                                    )
                                                                }
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="font-medium break-words leading-tight">
                                                                    {member.username ||
                                                                        "No Name"}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground break-words leading-tight">
                                                                    {member.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="border-t px-6 py-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMemberEditorGroupId(null)}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveGroupMembers}
                                    disabled={
                                        updateGroupMembersMutation.isPending
                                    }
                                >
                                    保存
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {!isLoggedIn && (
                        <p className="text-muted-foreground">
                            ログイン後に表示されます。
                        </p>
                    )}
                    {isLoggedIn && isLoading && (
                        <p className="text-muted-foreground">読み込み中...</p>
                    )}
                    {isLoggedIn &&
                        !isLoading &&
                        !isError &&
                        !hasCalendars &&
                        isCalendarRefreshing && (
                        <p className="text-muted-foreground">更新中...</p>
                    )}
                    {isLoggedIn && isError && (
                        <p className="text-destructive">
                            読み込みに失敗しました:{" "}
                            {(error as Error).message}
                        </p>
                    )}
                    {isLoggedIn &&
                        !isLoading &&
                        !isError &&
                        !hasCalendars &&
                        !isCalendarRefreshing && (
                        <p className="text-muted-foreground">
                            予定が見つかりませんでした。
                        </p>
                    )}
                    {isLoggedIn &&
                        !isLoading &&
                        !isError &&
                        hasCalendars &&
                        !hasVisibleCalendars && (
                        <p className="text-muted-foreground">
                            {selectedCount === 0
                                ? "表示するメンバーを選択してください。"
                                : normalizedMemberSearch
                                ? "検索結果がありません。"
                                : "表示するメンバーを選択してください。"}
                        </p>
                    )}
                    {hasVisibleCalendars && (
                        <div className="overflow-x-auto scrollbar-hidden rounded-md border">
                            <div
                                className="grid border-b text-sm font-medium"
                                style={{
                                    gridTemplateColumns: `${MEMBER_COLUMN_WIDTH}px repeat(${days.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
                                }}
                            >
                                <div className="border-r px-4 py-3">
                                    メンバー
                                </div>
                                {days.map((day) => (
                                    <div
                                        key={day.toISOString()}
                                        className={`border-r px-4 py-3 last:border-r-0 ${
                                            dayKey(day) === dayKey(new Date())
                                                ? "bg-amber-50 dark:bg-amber-900/30 dark:ring-1 dark:ring-amber-400/40 dark:ring-inset"
                                                : ""
                                        }`}
                                    >
                                        {format(day, "M/d (EEE)", {
                                            locale: ja,
                                        })}
                                    </div>
                                ))}
                            </div>
                            <div className="divide-y">
                                {sourceFilteredCalendars.map((calendar) => {
                                    const isWeekView = viewMode === "week";
                                    const currentDayKey = dayKey(range.start);
                                    const multiDayEvents = isWeekView
                                        ? calendar.events.filter((event) =>
                                              isMultiDayEvent(event)
                                          )
                                        : [];
                                    const listEvents = isWeekView
                                        ? calendar.events.filter(
                                              (event) => !isMultiDayEvent(event)
                                          )
                                        : calendar.events.filter((event) =>
                                              eventOverlapsDayKey(
                                                  event,
                                                  currentDayKey
                                              )
                                          );
                                    const eventsByDay = new Map<
                                        string,
                                        typeof calendar.events
                                    >();

                                    if (isWeekView) {
                                        for (const event of listEvents) {
                                            const key = dayKey(
                                                event.start.dateTime
                                            );
                                            const list =
                                                eventsByDay.get(key) ?? [];
                                            list.push(event);
                                            eventsByDay.set(key, list);
                                        }
                                    } else {
                                        eventsByDay.set(currentDayKey, [
                                            ...listEvents,
                                        ]);
                                    }

                                    for (const [key, list] of eventsByDay) {
                                        list.sort(
                                            (a, b) =>
                                                new Date(
                                                    a.start.dateTime
                                                ).getTime() -
                                                new Date(
                                                    b.start.dateTime
                                                ).getTime()
                                        );
                                        eventsByDay.set(key, list);
                                    }

                                    const multiDayLayout = isWeekView
                                        ? buildMultiDayLayout(
                                              multiDayEvents,
                                              weekDayKeys
                                          )
                                        : { bars: [], laneCount: 0, laneByDay: [] };
                                    const multiDayPaddingHeight = (lanes: number) =>
                                        lanes > 0
                                            ? lanes *
                                                  (MULTI_DAY_BAR_HEIGHT +
                                                      MULTI_DAY_BAR_GAP) +
                                              MULTI_DAY_LIST_GAP
                                            : 0;

                                    return (
                                        <div
                                            key={calendar.user.id}
                                            className="relative grid"
                                            style={{
                                                gridTemplateColumns: `${MEMBER_COLUMN_WIDTH}px repeat(${days.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
                                            }}
                                        >
                                            {isWeekView &&
                                                multiDayLayout.bars.length > 0 && (
                                                    <div
                                                        className="absolute top-0 z-10"
                                                        style={{
                                                            left: MEMBER_COLUMN_WIDTH,
                                                            right: 0,
                                                            display: "grid",
                                                            gridTemplateColumns: `repeat(${days.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
                                                            gridAutoRows: `${MULTI_DAY_BAR_HEIGHT}px`,
                                                            rowGap: `${MULTI_DAY_BAR_GAP}px`,
                                                            paddingTop: `${MULTI_DAY_BAR_GAP}px`,
                                                            height:
                                                                multiDayLayout.laneCount *
                                                                    (MULTI_DAY_BAR_HEIGHT +
                                                                        MULTI_DAY_BAR_GAP) +
                                                                MULTI_DAY_BAR_GAP,
                                                        }}
                                                    >
                                                        {multiDayLayout.bars.map(
                                                            (bar) => (
                                                                <button
                                                                    type="button"
                                                                    key={`${calendar.user.id}-${bar.event.id}-${bar.startIndex}-${bar.endIndex}`}
                                                                    className="mx-2 truncate rounded-md border bg-muted/70 px-2 text-left text-[11px] leading-tight transition hover:bg-accent"
                                                                    style={{
                                                                        gridColumn: `${
                                                                            bar.startIndex +
                                                                            1
                                                                        } / ${
                                                                            bar.endIndex +
                                                                            2
                                                                        }`,
                                                                        gridRow:
                                                                            bar.lane +
                                                                            1,
                                                                    }}
                                                                    onClick={() =>
                                                                        openEventDrawer(
                                                                            bar.event,
                                                                            calendar.user
                                                                        )
                                                                    }
                                                                >
                                                                    <div className="font-medium">
                                                                        {bar.event
                                                                            .isAllDay
                                                                            ? "終日"
                                                                            : formatTimeInJst(
                                                                                  bar
                                                                                      .event
                                                                                      .start
                                                                                      .dateTime
                                                                              )}{" "}
                                                                        {bar
                                                                            .event
                                                                            .subject ||
                                                                            "(件名なし)"}
                                                                        {bar
                                                                            .event
                                                                            .source ===
                                                                            "google" && (
                                                                            <span className="ml-1 text-[10px] text-muted-foreground">
                                                                                （Googleカレンダー）
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            <div className="border-r px-4 py-4">
                                                <div className="font-medium break-words whitespace-normal">
                                                    {calendar.user.username ||
                                                        "No Name"}
                                                </div>
                                                <div className="text-xs text-muted-foreground break-words whitespace-normal">
                                                    {calendar.user.email}
                                                </div>
                                                <div className="pt-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => {
                                                            setActiveMember(
                                                                calendar.user
                                                            );
                                                            setMemberCalendarMonth(
                                                                new Date(
                                                                    anchorDate
                                                                )
                                                            );
                                                            setIsMemberCalendarOpen(
                                                                true
                                                            );
                                                        }}
                                                    >
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span className="sr-only">
                                                            月間カレンダーを開く
                                                        </span>
                                                    </Button>
                                                </div>
                                            </div>
                                            {days.map((day, dayIndex) => {
                                                const key = dayKey(day);
                                                const dayEvents =
                                                    eventsByDay.get(key) ?? [];
                                                const isToday = key === dayKey(new Date());
                                                const laneCount =
                                                    isWeekView &&
                                                    multiDayLayout.laneByDay
                                                        ? multiDayLayout.laneByDay[
                                                              dayIndex
                                                          ] ?? 0
                                                        : 0;
                                                const extraPadding =
                                                    isWeekView &&
                                                    laneCount > 0
                                                        ? multiDayPaddingHeight(
                                                              laneCount
                                                          )
                                                        : 0;
                                                const paddingTop =
                                                    isWeekView &&
                                                    extraPadding > 0
                                                        ? DAY_CELL_BASE_PADDING +
                                                          extraPadding
                                                        : undefined;

                                                return (
                                                    <div
                                                        key={`${calendar.user.id}-${key}`}
                                                        className={`border-r px-4 py-3 last:border-r-0 ${
                                                            isToday
                                                                ? "bg-amber-50 dark:bg-amber-900/30 dark:ring-1 dark:ring-amber-400/40 dark:ring-inset"
                                                                : ""
                                                        }`}
                                                        style={
                                                            paddingTop
                                                                ? {
                                                                      paddingTop,
                                                                  }
                                                                : undefined
                                                        }
                                                    >
                                                        {dayEvents.length === 0 ? (
                                                            <div className="text-xs text-muted-foreground">
                                                                {isBusy
                                                                    ? "読み込み中..."
                                                                    : "-"}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {dayEvents.map(
                                                                    (event) => (
                                                                        <button
                                                                            type="button"
                                                                            key={
                                                                                event.id
                                                                            }
                                                                            className="w-full rounded-md border px-2 py-1 text-left text-xs transition hover:bg-accent"
                                                                            onClick={() =>
                                                                                openEventDrawer(
                                                                                    event,
                                                                                    calendar.user
                                                                                )
                                                                            }
                                                                        >
                                                                            <div className="font-medium">
                                                                                {event.subject ||
                                                                                    "(件名なし)"}
                                                                                {viewMode ===
                                                                                    "day" &&
                                                                                    isMultiDayEvent(
                                                                                        event
                                                                                    ) && (
                                                                                        <span className="ml-1 text-[10px] text-muted-foreground">
                                                                                            （跨日）
                                                                                        </span>
                                                                                    )}
                                                                                {event.source ===
                                                                                    "google" && (
                                                                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                                                                        （Googleカレンダー）
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-muted-foreground">
                                                                                {formatTimeInJst(
                                                                                    event
                                                                                        .start
                                                                                        .dateTime
                                                                                )}{" "}
                                                                                -{" "}
                                                                                {formatTimeInJst(
                                                                                    event
                                                                                        .end
                                                                                        .dateTime
                                                                                )}
                                                                            </div>
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <Drawer
                        open={isMemberCalendarOpen}
                        onOpenChange={(open) => {
                            setIsMemberCalendarOpen(open);
                            if (!open) {
                                setActiveMember(null);
                            }
                        }}
                    >
                        <DrawerContent className="h-[97vh]">
                            <DrawerHeader className="border-b px-6 py-4 text-left">
                                <DrawerTitle>
                                    {activeMember?.username ||
                                        activeMember?.email ||
                                        "メンバー"}
                                    の月間カレンダー
                                </DrawerTitle>
                                <DrawerDescription className="text-xs">
                                    月表示で予定を確認できます。
                                </DrawerDescription>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setMemberCalendarMonth((current) =>
                                                subMonths(current, 1)
                                            )
                                        }
                                    >
                                        前月
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setMemberCalendarMonth((current) =>
                                                addMonths(current, 1)
                                            )
                                        }
                                    >
                                        次月
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setMemberCalendarMonth(new Date())
                                        }
                                    >
                                        今月
                                    </Button>
                                    <span className="ml-2 text-sm font-medium text-foreground">
                                        {format(
                                            memberCalendarMonth,
                                            "yyyy年M月",
                                            { locale: ja }
                                        )}
                                    </span>
                                    {isMemberCalendarBusy && (
                                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Spinner className="h-4 w-4" />
                                            読み込み中...
                                        </span>
                                    )}
                                </div>
                            </DrawerHeader>
                            <div className="flex-1 overflow-auto px-6 py-4">
                                {memberCalendarQuery.isError && (
                                    <div className="mb-3 text-sm text-destructive">
                                        読み込みに失敗しました:{" "}
                                        {(
                                            memberCalendarQuery.error as Error
                                        ).message}
                                    </div>
                                )}
                                <div className="rounded-md border bg-border text-xs">
                                    <div className="grid grid-cols-7 gap-px bg-border">
                                        {weekDayLabels.map((label) => (
                                            <div
                                                key={label}
                                                className="bg-muted px-2 py-2 text-center font-medium text-muted-foreground"
                                            >
                                                {label}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-px bg-border">
                                        {memberMonthWeeks.map(
                                            (weekDays, weekIndex) => {
                                                const weekKeys = weekDays.map(
                                                    (day) => dayKey(day)
                                                );
                                                const multiDayLayout =
                                                    buildMultiDayLayout(
                                                        memberMultiDayEvents,
                                                        weekKeys
                                                    );
                                                const multiDayPaddingHeight = (
                                                    lanes: number
                                                ) =>
                                                    lanes > 0
                                                        ? lanes *
                                                              (MULTI_DAY_BAR_HEIGHT +
                                                                  MULTI_DAY_BAR_GAP) +
                                                          MULTI_DAY_LIST_GAP
                                                        : 0;

                                                return (
                                                    <div
                                                        key={`member-week-${weekIndex}`}
                                                        className="relative grid grid-cols-7 gap-px bg-border"
                                                    >
                                                        {multiDayLayout.bars
                                                            .length > 0 && (
                                                            <div
                                                                className="absolute top-0 z-10"
                                                                style={{
                                                                    left: 0,
                                                                    right: 0,
                                                                    display:
                                                                        "grid",
                                                                    gridTemplateColumns:
                                                                        "repeat(7, minmax(0, 1fr))",
                                                                    gridAutoRows: `${MULTI_DAY_BAR_HEIGHT}px`,
                                                                    rowGap: `${MULTI_DAY_BAR_GAP}px`,
                                                                    columnGap:
                                                                        "1px",
                                                                    paddingTop: `${MULTI_DAY_BAR_GAP}px`,
                                                                    height:
                                                                        multiDayLayout.laneCount *
                                                                            (MULTI_DAY_BAR_HEIGHT +
                                                                                MULTI_DAY_BAR_GAP) +
                                                                        MULTI_DAY_BAR_GAP,
                                                                }}
                                                            >
                                                                {multiDayLayout.bars.map(
                                                                    (bar) => (
                                                                        <button
                                                                            type="button"
                                                                            key={`member-${bar.event.id}-${bar.startIndex}-${bar.endIndex}`}
                                                                            className="mx-1 truncate rounded border bg-muted/70 px-1 text-left text-[10px] leading-tight transition hover:bg-muted"
                                                                            style={{
                                                                                gridColumn: `${
                                                                                    bar.startIndex +
                                                                                    1
                                                                                } / ${
                                                                                    bar.endIndex +
                                                                                    2
                                                                                }`,
                                                                                gridRow:
                                                                                    bar.lane +
                                                                                    1,
                                                                            }}
                                                                            onClick={() => {
                                                                                if (
                                                                                    activeMember
                                                                                ) {
                                                                                    openEventDrawer(
                                                                                        bar.event,
                                                                                        activeMember
                                                                                    );
                                                                                }
                                                                            }}
                                                                        >
                                                                            <span className="font-medium">
                                                                                {bar
                                                                                    .event
                                                                                    .isAllDay
                                                                                    ? "終日"
                                                                                    : formatTimeInJst(
                                                                                          bar
                                                                                              .event
                                                                                              .start
                                                                                              .dateTime
                                                                                      )}{" "}
                                                                                {bar
                                                                                    .event
                                                                                    .subject ||
                                                                                    "(件名なし)"}
                                                                                {bar
                                                                                    .event
                                                                                    .source ===
                                                                                    "google" && (
                                                                                    <span className="ml-1 text-[9px] text-muted-foreground">
                                                                                        （Googleカレンダー）
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                        {weekDays.map(
                                                            (day, dayIndex) => {
                                                            const key =
                                                                dayKey(day);
                                                            const events =
                                                                memberEventsByDay.get(
                                                                    key
                                                                ) ?? [];
                                                            const isOutside =
                                                                !isSameMonth(
                                                                    day,
                                                                    memberCalendarMonth
                                                                );
                                                            const isTodayCell =
                                                                isToday(day);
                                                            const isWeekend =
                                                                day.getDay() ===
                                                                    0 ||
                                                                day.getDay() ===
                                                                    6;
                                                            const laneCount =
                                                                multiDayLayout
                                                                    .laneByDay?.[
                                                                    dayIndex
                                                                ] ?? 0;
                                                            const extraPadding =
                                                                laneCount > 0
                                                                    ? multiDayPaddingHeight(
                                                                          laneCount
                                                                      )
                                                                    : 0;
                                                            const paddingTop =
                                                                extraPadding >
                                                                0
                                                                    ? MONTH_CELL_BASE_PADDING +
                                                                      extraPadding
                                                                    : undefined;

                                                            return (
                                                                <div
                                                                    key={day.toISOString()}
                                                                    className={`min-h-[110px] bg-background p-2 ${
                                                                        isOutside
                                                                            ? "bg-muted/40 text-muted-foreground"
                                                                            : ""
                                                                    } ${
                                                                        isTodayCell
                                                                            ? "ring-2 ring-primary/40"
                                                                            : ""
                                                                    }`}
                                                                    style={
                                                                        paddingTop
                                                                            ? {
                                                                                  paddingTop,
                                                                              }
                                                                            : undefined
                                                                    }
                                                                >
                                                                    <div
                                                                        className={`text-[11px] font-medium ${
                                                                            isWeekend &&
                                                                            !isOutside
                                                                                ? day.getDay() ===
                                                                                  0
                                                                                    ? "text-rose-500"
                                                                                    : "text-blue-500"
                                                                                : "text-foreground"
                                                                        }`}
                                                                    >
                                                                        {format(
                                                                            day,
                                                                            "d"
                                                                        )}
                                                                    </div>
                                                                    <div className="mt-1 space-y-1">
                                                                        {events.map(
                                                                            (
                                                                                event
                                                                            ) => (
                                                                                <button
                                                                                    type="button"
                                                                                    key={
                                                                                        event.id
                                                                                    }
                                                                                    className="w-full rounded bg-muted/70 px-1 py-0.5 text-left text-[10px] leading-tight break-words whitespace-normal transition hover:bg-muted"
                                                                                    onClick={() => {
                                                                                        if (
                                                                                            activeMember
                                                                                        ) {
                                                                                            openEventDrawer(
                                                                                                event,
                                                                                                activeMember
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <div className="font-medium">
                                                                                        {formatTimeInJst(
                                                                                            event
                                                                                                .start
                                                                                                .dateTime
                                                                                        )}
                                                                                    </div>
                                                                                    <div>
                                                                                        {event.subject ||
                                                                                            "(件名なし)"}
                                                                                        {event.source ===
                                                                                            "google" && (
                                                                                            <span className="ml-1 text-[9px] text-muted-foreground">
                                                                                                （Googleカレンダー）
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        )}
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DrawerFooter className="border-t px-6 py-3">
                                <DrawerClose asChild>
                                    <Button variant="outline" size="sm">
                                        閉じる
                                    </Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                    <Drawer
                        open={isEventDrawerOpen}
                        onOpenChange={(open) => {
                            setIsEventDrawerOpen(open);
                            if (!open) {
                                setActiveEvent(null);
                            }
                        }}
                    >
                        <DrawerContent>
                            <DrawerHeader>
                                <DrawerTitle className="flex flex-wrap items-center gap-2">
                                    <span>{eventDetail?.subject || "(件名なし)"}</span>
                                    {isGoogleEvent && (
                                        <span className="text-xs text-muted-foreground">
                                            （Googleカレンダー）
                                        </span>
                                    )}
                                </DrawerTitle>
                                <DrawerDescription>
                                    {eventDetail?.start?.dateTime &&
                                    eventDetail?.end?.dateTime
                                        ? `${formatInJst(
                                              eventDetail.start.dateTime
                                          )} - ${formatInJst(
                                              eventDetail.end.dateTime
                                          )}`
                                        : "時間未設定"}
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="space-y-4 px-4 pb-6 text-sm">
                                {isEventDetailLoading && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Spinner className="h-4 w-4" />
                                        読み込み中...
                                    </div>
                                )}
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        担当
                                    </div>
                                    <div className="font-medium">
                                        {activeEvent?.user.username ||
                                            activeEvent?.user.email ||
                                            "-"}
                                    </div>
                                    {activeEvent?.user.email && (
                                        <div className="text-xs text-muted-foreground">
                                            {activeEvent.user.email}
                                        </div>
                                    )}
                                </div>
                                {!isGoogleEvent && eventOrganizer && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            主催者
                                        </div>
                                        <div className="font-medium">
                                            {eventOrganizer.name ||
                                                eventOrganizer.address ||
                                                "-"}
                                        </div>
                                        {eventOrganizer.address && (
                                            <div className="text-xs text-muted-foreground break-all">
                                                {eventOrganizer.address}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!isGoogleEvent && eventAttendees.length > 0 && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            招待者
                                        </div>
                                        <div className="space-y-1">
                                            {eventAttendees.map(
                                                (attendee, index) => (
                                                    <div
                                                        key={`${attendee.emailAddress?.address ?? "attendee"}-${index}`}
                                                        className="text-xs"
                                                    >
                                                        <span className="font-medium">
                                                            {attendee
                                                                .emailAddress
                                                                ?.name ||
                                                                attendee
                                                                    .emailAddress
                                                                    ?.address ||
                                                                "-"}
                                                        </span>
                                                        {attendee.emailAddress
                                                            ?.address && (
                                                            <span className="text-muted-foreground">
                                                                {" "}
                                                                (
                                                                {
                                                                    attendee
                                                                        .emailAddress
                                                                        .address
                                                                }
                                                                )
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                                {!isGoogleEvent && eventDetail?.location?.displayName && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            場所
                                        </div>
                                        <div className="font-medium">
                                            {eventDetail.location.displayName}
                                        </div>
                                    </div>
                                )}
                                {!isGoogleEvent && eventDescription && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            詳細
                                        </div>
                                        <div className="whitespace-pre-wrap text-sm">
                                            {eventDescription}
                                        </div>
                                    </div>
                                )}
                                {!isGoogleEvent && eventDetailQuery.data?.onlineMeetingUrl && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            オンライン会議
                                        </div>
                                        <a
                                            href={
                                                eventDetailQuery.data
                                                    ?.onlineMeetingUrl
                                            }
                                            className="break-all text-sm text-primary underline"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {
                                                eventDetailQuery.data
                                                    ?.onlineMeetingUrl
                                            }
                                        </a>
                                    </div>
                                )}
                                {!isGoogleEvent && eventDetailQuery.data?.webLink && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            詳細リンク
                                        </div>
                                        <a
                                            href={eventDetailQuery.data.webLink}
                                            className="break-all text-sm text-primary underline"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {eventDetailQuery.data.webLink}
                                        </a>
                                    </div>
                                )}
                            </div>
                            <DrawerFooter>
                                <DrawerClose asChild>
                                    <Button variant="outline" size="sm">
                                        閉じる
                                    </Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                </CardContent>
            </Card>
        </div>
    );
};

export default CalendarPage;
