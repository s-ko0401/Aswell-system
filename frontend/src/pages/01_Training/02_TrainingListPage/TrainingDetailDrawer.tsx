import { useState, useEffect, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash, ChevronLeft, Save, Pencil, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { Button as ShadcnButton } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useToast } from "../../../hooks/use-toast";
import { cn } from "../../../lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { Spinner } from "../../../components/ui/spinner";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
    getTraining,
    updateTrainingItemStatus,
    getDailyReports,
    getDailyReport,
    createDailyReport,
    updateDailyReport,
    deleteDailyReport,
    updateTraining,
    type TrainingMajorItem,
    type TrainingMiddleItem,
    type TrainingMinorItem,
    type TrainingStatus,
    type TrainingDailyReport,
    type TrainingDailyReportEntry
} from "../../../api/training_management";
import { getUsersSelection } from "../../../api/users";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "../../../components/ui/drawer";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../../../components/ui/tabs";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "../../../components/ui/accordion";
import { Progress } from "../../../components/ui/progress";

interface TrainingDetailDrawerProps {
    trainingId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialEditMode?: boolean;
}

export function TrainingDetailDrawer({ trainingId, open, onOpenChange, initialEditMode = false }: TrainingDetailDrawerProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [reportView, setReportView] = useState<"list" | "detail" | "form">("list");
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [editName, setEditName] = useState("");
    const [editManagerId, setEditManagerId] = useState("");
    const [editTeacherId, setEditTeacherId] = useState("");
    const [editTraineeId, setEditTraineeId] = useState("");
    const [editStartDate, setEditStartDate] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!open) {
            setReportView("list");
            setSelectedReportId(null);
            setIsEditingMetadata(false);
        } else if (initialEditMode) {
            setIsEditingMetadata(true);
        }
    }, [open, initialEditMode]);

    const { data: training, isLoading } = useQuery({
        queryKey: ["training", trainingId],
        queryFn: async () => {
            const data = await getTraining(trainingId!);
            setEditName(data.name);
            setEditManagerId(data.manager_id.toString());
            setEditTeacherId(data.teacher_id.toString());
            setEditTraineeId(data.trainee_id.toString());
            setEditStartDate(data.start_date);
            return data;
        },
        enabled: !!trainingId && open,
    });

    const { data: users } = useQuery({
        queryKey: ["usersSelection"],
        queryFn: () => getUsersSelection(),
        enabled: open && isEditingMetadata,
    });

    const { data: reports, isLoading: isLoadingReports } = useQuery({
        queryKey: ["daily-reports", trainingId],
        queryFn: () => getDailyReports(trainingId!),
        enabled: !!trainingId && open,
    });

    const deleteReportMutation = useMutation({
        mutationFn: deleteDailyReport,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["daily-reports", trainingId] });
            toast({ title: "削除しました", description: "日報を削除しました。" });
        },
    });

    const updateMetadataMutation = useMutation({
        mutationFn: (data: any) => updateTraining(trainingId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["training", trainingId] });
            queryClient.invalidateQueries({ queryKey: ["trainings"] });
            toast({ title: "更新しました", description: "研修情報を更新しました。" });
            setIsEditingMetadata(false);
        },
        onError: () => {
            toast({ variant: "destructive", title: "エラー", description: "更新に失敗しました。" });
        },
    });

    const statusMutation = useMutation({
        mutationFn: ({ itemId, status }: { itemId: number; status: TrainingStatus }) =>
            updateTrainingItemStatus(itemId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["training", trainingId] });
            queryClient.invalidateQueries({ queryKey: ["trainings"] });
            toast({ title: "更新しました", description: "ステータスを更新しました。" });
        },
        onError: () => {
            toast({ variant: "destructive", title: "エラー", description: "更新に失敗しました。" });
        },
    });

    const calculateProgress = (major: TrainingMajorItem) => {
        const minorItems = major.middle_items?.flatMap(middle => middle.minor_items || []) || [];
        if (minorItems.length === 0) return 0;
        const completedItems = minorItems.filter(item => item.status === "完了").length;
        return Math.round((completedItems / minorItems.length) * 100);
    };

    const getSummaryStats = () => {
        const allMinorItems = training?.major_items?.flatMap(
            (major: TrainingMajorItem) => major.middle_items?.flatMap((middle: TrainingMiddleItem) => middle.minor_items || []) || []
        ) || [];

        return {
            notStarted: allMinorItems.filter((item: TrainingMinorItem) => item.status === "未着手").length,
            inProgress: allMinorItems.filter((item: TrainingMinorItem) => item.status === "研修中").length,
            completed: allMinorItems.filter((item: TrainingMinorItem) => item.status === "完了").length,
            total: allMinorItems.length,
            progress: allMinorItems.length > 0
                ? Math.round((allMinorItems.filter((item: TrainingMinorItem) => item.status === "完了").length / allMinorItems.length) * 100)
                : 0
        };
    };
    const stats = getSummaryStats();

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="h-[98vh] flex flex-col">
                <div className="w-full flex-1 flex flex-col overflow-hidden">
                    <DrawerHeader className="flex-none flex flex-row items-center justify-between border-b pb-4 px-4">
                        <div className="flex items-center gap-4 flex-1">
                            <ShadcnButton variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                                <X className="h-5 w-5" />
                            </ShadcnButton>
                            <div className="flex-1">
                                {isEditingMetadata ? (
                                    <div className="flex items-center gap-3">
                                        <DrawerTitle className="text-2xl font-bold">研修情報の編集</DrawerTitle>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <DrawerTitle className="text-2xl font-bold">
                                                {isLoading ? "読み込み中..." : training?.name || "研修詳細"}
                                            </DrawerTitle>
                                            {!isLoading && training && (
                                                <ShadcnButton
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => setIsEditingMetadata(true)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </ShadcnButton>
                                            )}
                                        </div>
                                        <DrawerDescription>
                                            {training ? (
                                                <>
                                                    責任者: {training.manager?.username} |
                                                    研修生: {training.trainee?.username} |
                                                    講師: {training.teacher?.username} |
                                                    開始日: {training.start_date ? format(new Date(training.start_date), "yyyy/MM/dd") : "未設定"}
                                                </>
                                            ) : (
                                                "研修の進捗状況とタスクを確認・管理します。"
                                            )}
                                        </DrawerDescription>
                                    </>
                                )}
                            </div>
                        </div>
                        {training && !isEditingMetadata && (
                            <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-full border">
                                <span className="text-sm font-medium text-muted-foreground">全体進捗:</span>
                                <div className="flex items-center gap-2 min-w-[120px]">
                                    <Progress value={stats.progress} className="h-2 flex-1" />
                                    <span className="text-sm font-bold text-primary">{stats.progress}%</span>
                                </div>
                            </div>
                        )}
                    </DrawerHeader>

                    <div className="flex-1 overflow-hidden">
                        {isEditingMetadata ? (
                            <div className="mx-auto w-full max-w-2xl h-full overflow-y-auto p-6">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">研修名</label>
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="例：2024年度 新人研修"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">責任者</label>
                                            <Select value={editManagerId} onValueChange={setEditManagerId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="選択" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users?.data?.map((u: { id: number; username: string }) => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">講師</label>
                                            <Select value={editTeacherId} onValueChange={setEditTeacherId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="選擇" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users?.data?.map((u: { id: number; username: string }) => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">研修生</label>
                                        <Select value={editTraineeId} onValueChange={setEditTraineeId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="選択" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users?.data?.map((u: { id: number; username: string }) => (
                                                    <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 flex flex-col">
                                        <label className="text-sm font-medium">開始予定日</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <ShadcnButton
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !editStartDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    {editStartDate ? format(new Date(editStartDate), "yyyy/MM/dd") : "日付を選択"}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </ShadcnButton>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={editStartDate ? new Date(editStartDate) : undefined}
                                                    onSelect={(date) => setEditStartDate(date?.toISOString())}
                                                    initialFocus
                                                    locale={ja}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="pt-6 flex flex-col gap-3">
                                        <ShadcnButton
                                            className="w-full"
                                            onClick={() => updateMetadataMutation.mutate({
                                                name: editName,
                                                manager_id: parseInt(editManagerId),
                                                teacher_id: parseInt(editTeacherId),
                                                trainee_id: parseInt(editTraineeId),
                                                start_date: editStartDate
                                            })}
                                            disabled={updateMetadataMutation.isPending}
                                        >
                                            {updateMetadataMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                                            保存
                                        </ShadcnButton>
                                        <ShadcnButton
                                            variant="ghost"
                                            className="w-full"
                                            onClick={() => {
                                                setIsEditingMetadata(false);
                                                if (training) {
                                                    setEditName(training.name);
                                                    setEditManagerId(training.manager_id.toString());
                                                    setEditTeacherId(training.teacher_id.toString());
                                                    setEditTraineeId(training.trainee_id.toString());
                                                    setEditStartDate(training.start_date);
                                                }
                                            }}
                                        >
                                            キャンセル
                                        </ShadcnButton>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0">
                                <div className="px-4 border-b">
                                    <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-6">
                                        <TabsTrigger
                                            value="dashboard"
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2"
                                        >
                                            ダッシュボード
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="tasks"
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2"
                                        >
                                            研修タスク
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="daily_report"
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2"
                                        >
                                            日報
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                                    <TabsContent value="dashboard" className="flex-1 overflow-y-auto m-0 p-6 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:flex data-[state=active]:flex-col gap-8">
                                        {/* Top Summary Stats */}
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="bg-muted/30 p-6 rounded-xl border flex flex-col items-center justify-center gap-2">
                                                <span className="text-sm font-medium text-muted-foreground">未着手</span>
                                                <span className="text-4xl font-bold">{stats.notStarted}</span>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center gap-2">
                                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">研修中</span>
                                                <span className="text-4xl font-bold text-blue-700 dark:text-blue-300">{stats.inProgress}</span>
                                            </div>
                                            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800 flex flex-col items-center justify-center gap-2">
                                                <span className="text-sm font-medium text-green-600 dark:text-green-400">完了</span>
                                                <span className="text-4xl font-bold text-green-700 dark:text-green-300">{stats.completed}</span>
                                            </div>
                                        </div>

                                        {/* Bottom Progress Section */}
                                        <div className="flex-1 flex gap-8 min-h-0">
                                            {/* Left Column: Major Item Progress */}
                                            <div className="flex-1 flex flex-col gap-4">
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <div className="w-1 h-6 bg-primary rounded-full" />
                                                    研修進捗
                                                </h3>
                                                <div className="space-y-6 overflow-y-auto pr-2">
                                                    {training?.major_items?.map((major: TrainingMajorItem) => {
                                                        const progress = calculateProgress(major);
                                                        return (
                                                            <div key={major.id} className="space-y-2">
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="font-semibold">{major.name}</span>
                                                                    <span className="text-muted-foreground font-medium">{progress}%</span>
                                                                </div>
                                                                <Progress value={progress} className="h-2.5" />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Right Column: Placeholder */}
                                            <div className="flex-1 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground bg-muted/5">
                                                <p>（右側留空）</p>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="tasks" className="flex-1 overflow-y-auto m-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:flex data-[state=active]:flex-col">
                                        {isLoading ? (
                                            <div className="flex h-full items-center justify-center p-12">
                                                <Spinner />
                                            </div>
                                        ) : !training || !training.major_items || training.major_items.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12">
                                                <p className="text-lg font-medium">研修タスクがありません</p>
                                                <p className="text-sm">テンプレートに項目が設定されているか確認してください。</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 p-2 py-4">
                                                <Accordion type="multiple" className="w-full space-y-4">
                                                    {training.major_items?.map((major: TrainingMajorItem) => {
                                                        const progress = calculateProgress(major);
                                                        return (
                                                            <AccordionItem key={major.id} value={`major-${major.id}`} className="border rounded-lg overflow-hidden bg-card">
                                                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors border-l-4 border-l-primary">
                                                                    <div className="flex flex-1 items-center justify-between mr-4">
                                                                        <div className="flex items-center gap-2 text-lg font-bold">
                                                                            <Badge variant="outline" className="font-normal">大項目</Badge>
                                                                            {major.name}
                                                                        </div>
                                                                        <div className="flex items-center gap-4 w-1/3">
                                                                            <Progress value={progress} className="h-2" />
                                                                            <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
                                                                                {progress}%
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="p-0">
                                                                    <div className="p-4 space-y-4 bg-muted/10">
                                                                        <Accordion type="multiple" className="w-full space-y-3">
                                                                            {major.middle_items?.map((middle: TrainingMiddleItem) => (
                                                                                <AccordionItem key={middle.id} value={`middle-${middle.id}`} className="border rounded-md overflow-hidden bg-background">
                                                                                    <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/30 transition-colors">
                                                                                        <div className="flex items-center gap-2 font-semibold text-sm">
                                                                                            <Badge variant="secondary" className="font-normal">中項目</Badge>
                                                                                            {middle.name}
                                                                                        </div>
                                                                                    </AccordionTrigger>
                                                                                    <AccordionContent className="p-0">
                                                                                        <div className="p-3 space-y-2">
                                                                                            {middle.minor_items?.map((minor: TrainingMinorItem) => (
                                                                                                <div key={minor.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                                                                                                    <div className="flex items-center gap-3">
                                                                                                        <span className="text-xs text-muted-foreground w-4">{minor.sort}.</span>
                                                                                                        <span className="text-sm">{minor.name}</span>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-4">
                                                                                                        <StatusBadge status={minor.status} />
                                                                                                        <Select
                                                                                                            value={minor.status}
                                                                                                            onValueChange={(value) =>
                                                                                                                statusMutation.mutate({ itemId: minor.id, status: value as TrainingStatus })
                                                                                                            }
                                                                                                        >
                                                                                                            <SelectTrigger className="w-[110px] h-8 text-xs">
                                                                                                                <SelectValue />
                                                                                                            </SelectTrigger>
                                                                                                            <SelectContent>
                                                                                                                <SelectItem value="未着手">未着手</SelectItem>
                                                                                                                <SelectItem value="研修中">研修中</SelectItem>
                                                                                                                <SelectItem value="完了">完了</SelectItem>
                                                                                                            </SelectContent>
                                                                                                        </Select>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </AccordionContent>
                                                                                </AccordionItem>
                                                                            ))}
                                                                        </Accordion>
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        )
                                                    })}
                                                </Accordion>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="daily_report" className="flex-1 overflow-y-auto m-0 p-6 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:flex data-[state=active]:flex-col gap-6">
                                        {reportView === "list" ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-xl font-bold">日報一覧</h3>
                                                    <ShadcnButton onClick={() => { setReportView("form"); setSelectedReportId(null); }}>
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        新規日報作成
                                                    </ShadcnButton>
                                                </div>

                                                {isLoadingReports ? (
                                                    <div className="flex justify-center py-12">
                                                        <Spinner />
                                                    </div>
                                                ) : reports?.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed rounded-xl">
                                                        <p className="text-lg font-medium">日報がまだありません</p>
                                                        <p className="text-sm">新しい日報を作成して、研修の記録を残しましょう。</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {reports?.map((report: TrainingDailyReport) => (
                                                            <Card key={report.id} className="hover:border-primary cursor-pointer transition-colors group" onClick={() => { setSelectedReportId(report.id); setReportView("detail"); }}>
                                                                <CardHeader className="pb-3">
                                                                    <div className="flex justify-between items-start">
                                                                        <CardTitle className="text-lg">
                                                                            {format(new Date(report.report_date), "yyyy/MM/dd (E)", { locale: ja })}
                                                                        </CardTitle>
                                                                        <ShadcnButton
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (confirm("本当に削除しますか？")) {
                                                                                    deleteReportMutation.mutate(report.id);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Trash className="h-4 w-4" />
                                                                        </ShadcnButton>
                                                                    </div>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                                        {report.notes || "備考なし"}
                                                                    </p>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : reportView === "detail" ? (
                                            <DailyReportDetail
                                                reportId={selectedReportId!}
                                                traineeName={training?.trainee?.username || ""}
                                                onBack={() => setReportView("list")}
                                                onEdit={() => setReportView("form")}
                                            />
                                        ) : (
                                            <DailyReportForm
                                                trainingId={trainingId!}
                                                reportId={selectedReportId}
                                                traineeName={training?.trainee?.username || ""}
                                                onCancel={() => selectedReportId ? setReportView("detail") : setReportView("list")}
                                                onSuccess={() => {
                                                    setReportView("list");
                                                    queryClient.invalidateQueries({ queryKey: ["daily-reports", trainingId] });
                                                }}
                                            />
                                        )}
                                    </TabsContent>
                                </div>
                            </Tabs>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function DailyReportDetail({
    reportId,
    traineeName,
    onBack,
    onEdit
}: {
    reportId: number;
    traineeName: string;
    onBack: () => void;
    onEdit: () => void;
}) {
    const { data: report, isLoading } = useQuery({
        queryKey: ["daily-report", reportId],
        queryFn: () => getDailyReport(reportId),
    });

    if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
    if (!report) return null;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <ShadcnButton variant="ghost" size="icon" onClick={onBack}>
                        <ChevronLeft className="h-5 w-5" />
                    </ShadcnButton>
                    <h3 className="text-xl font-bold">日報詳細</h3>
                </div>
                <ShadcnButton onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    編集する
                </ShadcnButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">日付</p>
                    <p className="text-lg font-semibold">{format(new Date(report.report_date), "yyyy/MM/dd (E)", { locale: ja })}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">研修生</p>
                    <p className="text-lg font-semibold">{traineeName}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    作業明細
                </h4>

                <div className="space-y-4">
                    {report.entries?.map((entry, index) => (
                        <Card key={index}>
                            <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">作業時間</p>
                                        <p className="text-sm font-medium">{entry.start_time.substring(0, 5)} ～ {entry.end_time.substring(0, 5)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">作業場所</p>
                                        <p className="text-sm font-medium">{entry.work_place}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">指示者</p>
                                        <p className="text-sm font-medium">{entry.instructor}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">内容</p>
                                        <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">作業実績</p>
                                        <p className="text-sm whitespace-pre-wrap">{entry.achievement}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {report.notes && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">備考</p>
                    <div className="p-4 rounded-lg bg-muted/30 border min-h-[100px]">
                        <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function DailyReportForm({
    trainingId,
    reportId,
    traineeName,
    onCancel,
    onSuccess
}: {
    trainingId: number;
    reportId: number | null;
    traineeName: string;
    onCancel: () => void;
    onSuccess: () => void;
}) {
    const { toast } = useToast();
    const [reportDate, setReportDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notes, setNotes] = useState("");
    const [entries, setEntries] = useState<Omit<TrainingDailyReportEntry, "id" | "sort">[]>([
        { start_time: "09:00", end_time: "10:00", work_place: "本社", instructor: "", content: "", achievement: "" }
    ]);

    const { isLoading } = useQuery({
        queryKey: ["daily-report", reportId],
        queryFn: async () => {
            const data = await getDailyReport(reportId!);
            setReportDate(data.report_date);
            setNotes(data.notes || "");
            setEntries(data.entries?.map(e => ({
                start_time: e.start_time.substring(0, 5),
                end_time: e.end_time.substring(0, 5),
                work_place: e.work_place,
                instructor: e.instructor,
                content: e.content,
                achievement: e.achievement
            })) || []);
            return data;
        },
        enabled: !!reportId,
    });

    const mutation = useMutation({
        mutationFn: (data: any) => reportId ? updateDailyReport(reportId, data) : createDailyReport(trainingId, data),
        onSuccess: () => {
            toast({ title: reportId ? "更新しました" : "作成しました", description: "日報を保存しました。" });
            onSuccess();
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "エラー", description: error.response?.data?.message || "保存に失敗しました。" });
        }
    });

    const addEntry = () => {
        const lastEntry = entries[entries.length - 1];
        setEntries([...entries, {
            start_time: lastEntry?.end_time || "09:00",
            end_time: "",
            work_place: lastEntry?.work_place || "本社",
            instructor: lastEntry?.instructor || "",
            content: "",
            achievement: ""
        }]);
    };

    const removeEntry = (index: number) => {
        if (entries.length > 1) {
            setEntries(entries.filter((_, i) => i !== index));
        }
    };

    const updateEntry = (index: number, field: keyof Omit<TrainingDailyReportEntry, "id" | "sort">, value: string) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <ShadcnButton variant="ghost" size="icon" onClick={onCancel}>
                        <ChevronLeft className="h-5 w-5" />
                    </ShadcnButton>
                    <h3 className="text-xl font-bold">{reportId ? "日報編集" : "新規日報作成"}</h3>
                </div>
                <ShadcnButton onClick={() => mutation.mutate({ report_date: reportDate, notes, entries })} disabled={mutation.isPending}>
                    {mutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    保存
                </ShadcnButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">日付</label>
                    <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">研修生</label>
                    <Input value={traineeName} readOnly className="bg-muted" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        作業明細
                    </h4>
                    <ShadcnButton variant="outline" size="sm" onClick={addEntry}>
                        <Plus className="mr-2 h-4 w-4" />
                        作業を追加
                    </ShadcnButton>
                </div>

                <div className="space-y-4">
                    {entries.map((entry, index) => (
                        <Card key={index} className="relative group">
                            <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">作業時間</label>
                                        <div className="flex items-center gap-2">
                                            <Input type="time" value={entry.start_time} onChange={(e) => updateEntry(index, "start_time", e.target.value)} />
                                            <span>～</span>
                                            <Input type="time" value={entry.end_time} onChange={(e) => updateEntry(index, "end_time", e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">作業場所</label>
                                        <Input value={entry.work_place} onChange={(e: ChangeEvent<HTMLInputElement>) => updateEntry(index, "work_place", e.target.value)} placeholder="例：本社、リモート" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">指示者</label>
                                        <Input value={entry.instructor} onChange={(e: ChangeEvent<HTMLInputElement>) => updateEntry(index, "instructor", e.target.value)} placeholder="指示者の名前" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">内容</label>
                                        <Textarea value={entry.content} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateEntry(index, "content", e.target.value)} placeholder="作業内容を詳しく記入してください" className="min-h-[100px]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">作業実績</label>
                                        <Textarea value={entry.achievement} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateEntry(index, "achievement", e.target.value)} placeholder="得られた成果や進捗を記入してください" className="min-h-[100px]" />
                                    </div>
                                </div>
                                {entries.length > 1 && (
                                    <ShadcnButton
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeEntry(index)}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </ShadcnButton>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">備考</label>
                <Textarea value={notes} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)} placeholder="その他、特記事項があれば記入してください" className="min-h-[120px]" />
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: TrainingStatus }) {
    switch (status) {
        case "未着手":
            return <Badge variant="outline" className="bg-background">未着手</Badge>;
        case "研修中":
            return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100">研修中</Badge>;
        case "完了":
            return <Badge variant="default" className="bg-green-600 hover:bg-green-600">完了</Badge>;
        default:
            return null;
    }
}
