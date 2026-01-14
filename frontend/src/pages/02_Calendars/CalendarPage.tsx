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
import { useAuth } from "../../hooks/useAuth";
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

export const CalendarPage: React.FC = () => {
    const { data: me } = useAuth();
    const isLoggedIn = Boolean(me?.email);
    const [viewMode, setViewMode] = React.useState<"day" | "week">("day");
    const queryClient = useQueryClient();

    const [anchorDate, setAnchorDate] = React.useState(() => new Date());
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
    const [isMemberFilterOpen, setIsMemberFilterOpen] = React.useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(new Set());
    const [memberSearch, setMemberSearch] = React.useState("");
    const shouldResetMemberSelection = React.useRef(true);
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

    const eventDetailQuery = useQuery<CalendarEventDetail, Error>({
        queryKey: [
            "calendarEventDetail",
            activeEvent?.event.id,
            activeEvent?.user.email,
        ],
        enabled:
            Boolean(activeEvent?.event.id && activeEvent?.user.email) &&
            isEventDrawerOpen,
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
    const eventOrganizer = eventDetailQuery.data?.organizer?.emailAddress;
    const eventAttendees = eventDetailQuery.data?.attendees ?? [];
    const eventDescription =
        eventDetailQuery.data?.bodyPreview ||
        (eventDetailQuery.data?.body?.contentType === "text"
            ? eventDetailQuery.data?.body?.content
            : undefined);

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

    const memberEventsByDay = React.useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();

        for (const event of memberEvents) {
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
    }, [memberEvents]);

    const sortedCalendars = React.useMemo(() => {
        const myEmail = me?.email?.toLowerCase();
        const roomNames = new Set(["名古屋会議室（大）", "名古屋会議室（小）"]);

        const isRoom = (calendar: UserCalendar) =>
            calendar.user.username &&
            roomNames.has(calendar.user.username);

        return [...calendars].sort((a, b) => {
            if (myEmail) {
                const isMeA = a.user.email?.toLowerCase() === myEmail;
                const isMeB = b.user.email?.toLowerCase() === myEmail;
                if (isMeA && !isMeB) return -1;
                if (!isMeA && isMeB) return 1;
            }

            const isRoomA = isRoom(a);
            const isRoomB = isRoom(b);
            if (isRoomA && !isRoomB) return -1;
            if (!isRoomA && isRoomB) return 1;

            const roleA = typeof a.user.role === "number" ? a.user.role : 999;
            const roleB = typeof b.user.role === "number" ? b.user.role : 999;

            if (roleA !== roleB) {
                return roleA - roleB;
            }

            const nameA = (a.user.username || a.user.email || "").toLowerCase();
            const nameB = (b.user.username || b.user.email || "").toLowerCase();
            const nameCompare = nameA.localeCompare(nameB, "en", {
                sensitivity: "base",
            });

            if (nameCompare !== 0) {
                return nameCompare;
            }

            const emailA = (a.user.email || "").toLowerCase();
            const emailB = (b.user.email || "").toLowerCase();
            return emailA.localeCompare(emailB, "en", { sensitivity: "base" });
        });
    }, [calendars, me?.email]);

    const availableMemberIds = React.useMemo(
        () => new Set(sortedCalendars.map((calendar) => String(calendar.user.id))),
        [sortedCalendars]
    );

    React.useEffect(() => {
        if (shouldResetMemberSelection.current && availableMemberIds.size > 0) {
            setSelectedMemberIds(new Set(availableMemberIds));
            shouldResetMemberSelection.current = false;
            return;
        }

        setSelectedMemberIds((prev) => {
            const next = new Set(
                Array.from(prev).filter((id) => availableMemberIds.has(id))
            );
            return next.size === prev.size ? prev : next;
        });
    }, [availableMemberIds]);

    React.useEffect(() => {
        shouldResetMemberSelection.current = true;
    }, [viewMode]);

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

    const selectedCount = selectedMemberIds.size;
    const hasCalendars = calendars.length > 0;
    const hasVisibleCalendars = visibleCalendars.length > 0;

    const toggleMember = (memberId: string) => {
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
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">カレンダー</h2>
                <p className="text-muted-foreground">
                    研修スケジュールや予定を管理します。
                </p>
            </div>

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
                                                onClick={() =>
                                                    setSelectedMemberIds(
                                                        new Set(availableMemberIds)
                                                    )
                                                }
                                                disabled={availableMemberIds.size === 0}
                                            >
                                                全て選択
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setSelectedMemberIds(new Set())
                                                }
                                                disabled={availableMemberIds.size === 0}
                                            >
                                                全て解除
                                            </Button>
                                        </div>
                                    </div>
                                </DialogHeader>
                                <div className="flex-1 overflow-auto px-6 py-4">
                                    {sortedCalendars.length === 0 ? (
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
                                            {sortedCalendars.map((calendar) => {
                                                const memberId = String(
                                                    calendar.user.id
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
                                                                    {calendar
                                                                        .user
                                                                        .username ||
                                                                        "No Name"}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground break-words leading-tight">
                                                                    {calendar
                                                                        .user
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
                        <div className="overflow-auto rounded-md border">
                            <div
                                className="grid border-b text-sm font-medium"
                                style={{
                                    gridTemplateColumns: `140px repeat(${days.length}, minmax(160px, 1fr))`,
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
                                {visibleCalendars.map((calendar) => {
                                    const eventsByDay = new Map<string, typeof calendar.events>();

                                    for (const event of calendar.events) {
                                        const key = dayKey(event.start.dateTime);
                                        const list = eventsByDay.get(key) ?? [];
                                        list.push(event);
                                        eventsByDay.set(key, list);
                                    }

                                    for (const [key, list] of eventsByDay) {
                                        list.sort(
                                            (a, b) =>
                                                new Date(a.start.dateTime).getTime() -
                                                new Date(b.start.dateTime).getTime()
                                        );
                                        eventsByDay.set(key, list);
                                    }

                                    return (
                                        <div
                                            key={calendar.user.id}
                                            className="grid"
                                            style={{
                                                gridTemplateColumns: `140px repeat(${days.length}, minmax(160px, 1fr))`,
                                            }}
                                        >
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
                                            {days.map((day) => {
                                                const key = dayKey(day);
                                                const dayEvents =
                                                    eventsByDay.get(key) ?? [];
                                                const isToday = key === dayKey(new Date());

                                                return (
                                                    <div
                                                        key={`${calendar.user.id}-${key}`}
                                                        className={`border-r px-4 py-3 last:border-r-0 ${
                                                            isToday
                                                                ? "bg-amber-50 dark:bg-amber-900/30 dark:ring-1 dark:ring-amber-400/40 dark:ring-inset"
                                                                : ""
                                                        }`}
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
                                <div className="grid grid-cols-7 gap-px rounded-md border bg-border text-xs">
                                    {weekDayLabels.map((label) => (
                                        <div
                                            key={label}
                                            className="bg-muted px-2 py-2 text-center font-medium text-muted-foreground"
                                        >
                                            {label}
                                        </div>
                                    ))}
                                    {memberMonthDays.map((day) => {
                                        const key = dayKey(day);
                                        const events =
                                            memberEventsByDay.get(key) ?? [];
                                        const isOutside = !isSameMonth(
                                            day,
                                            memberCalendarMonth
                                        );
                                        const isTodayCell = isToday(day);
                                        const isWeekend =
                                            day.getDay() === 0 ||
                                            day.getDay() === 6;

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
                                            >
                                                <div
                                                    className={`text-[11px] font-medium ${
                                                        isWeekend && !isOutside
                                                            ? day.getDay() === 0
                                                                ? "text-rose-500"
                                                                : "text-blue-500"
                                                            : "text-foreground"
                                                    }`}
                                                >
                                                    {format(day, "d")}
                                                </div>
                                                <div className="mt-1 space-y-1">
                                                    {events.map(
                                                        (event) => (
                                                            <button
                                                                type="button"
                                                                key={event.id}
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
                                                                </div>
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                <DrawerTitle>
                                    {eventDetail?.subject || "(件名なし)"}
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
                                {eventOrganizer && (
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
                                {eventAttendees.length > 0 && (
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
                                {eventDetail?.location?.displayName && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            場所
                                        </div>
                                        <div className="font-medium">
                                            {eventDetail.location.displayName}
                                        </div>
                                    </div>
                                )}
                                {eventDescription && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            詳細
                                        </div>
                                        <div className="whitespace-pre-wrap text-sm">
                                            {eventDescription}
                                        </div>
                                    </div>
                                )}
                                {eventDetailQuery.data?.onlineMeetingUrl && (
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
                                {eventDetailQuery.data?.webLink && (
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
