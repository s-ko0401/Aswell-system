import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Trash2, Calendar as CalendarIcon, RefreshCw, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { Button } from "../../../components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../../components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "../../../components/ui/drawer";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../../../components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { useToast } from "../../../hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "../../../lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import { Progress } from "../../../components/ui/progress";
import { Spinner } from "../../../components/ui/spinner";
import { getTrainings, createTraining, deleteTraining, type Training } from "../../../api/training_management";
import { getTrainingTemplates } from "../../../api/training";
import { getUsersSelection } from "../../../api/users";
import { TrainingDetailDrawer } from "./TrainingDetailDrawer";

const formSchema = z.object({
    name: z.string().min(1, "研修名は必須です"),
    training_template_id: z.string().optional(),
    manager_id: z.string().min(1, "責任者は必須です"),
    teacher_id: z.string().min(1, "講師は必須です"),
    trainee_id: z.string().min(1, "研修生は必須です"),
    start_date: z.string().optional(),
});

export function TrainingListPage() {
    const [page] = useState(1);
    const [open, setOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailEditMode, setDetailEditMode] = useState(false);
    const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null);
    const [deleteConfirmStep, setDeleteConfirmStep] = useState<0 | 1 | 2>(0);
    const [trainingToDelete, setTrainingToDelete] = useState<number | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const handleViewDetail = (id: number) => {
        setSelectedTrainingId(id);
        setDetailEditMode(false);
        setDetailOpen(true);
    };

    const handleEditDetail = (id: number) => {
        setSelectedTrainingId(id);
        setDetailEditMode(true);
        setDetailOpen(true);
    };

    const { data, isLoading } = useQuery({
        queryKey: ["trainings", page],
        queryFn: () => getTrainings(page),
    });

    const { data: templates } = useQuery({
        queryKey: ["trainingTemplatesAll"],
        queryFn: () => getTrainingTemplates(1), // Simple for now, assuming not too many
    });

    const { data: users } = useQuery({
        queryKey: ["usersSelection"],
        queryFn: () => getUsersSelection(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            training_template_id: "",
            manager_id: "",
            teacher_id: "",
            trainee_id: "",
            start_date: "",
        },
    });

    const createMutation = useMutation({
        mutationFn: createTraining,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainings"] });
            toast({ title: "作成しました", description: "研修を作成しました。" });
            setOpen(false);
            form.reset();
        },
        onError: () => {
            toast({ variant: "destructive", title: "エラー", description: "作成に失敗しました。" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTraining,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainings"] });
            toast({ title: "削除しました", description: "研修を削除しました。" });
            setDeleteConfirmStep(0);
            setTrainingToDelete(null);
        },
        onError: () => {
            toast({ variant: "destructive", title: "エラー", description: "削除に失敗しました。" });
            setDeleteConfirmStep(0);
            setTrainingToDelete(null);
        }
    });

    const handleDeleteClick = (id: number) => {
        setTrainingToDelete(id);
        setDeleteConfirmStep(1);
    };

    const calculateOverallProgress = (training: Training) => {
        const allMinorItems = training.major_items?.flatMap(
            major => major.middle_items?.flatMap(middle => middle.minor_items || []) || []
        ) || [];

        if (allMinorItems.length === 0) return 0;
        const completedItems = allMinorItems.filter(item => item.status === "完了").length;
        return Math.round((completedItems / allMinorItems.length) * 100);
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        createMutation.mutate({
            name: values.name,
            training_template_id: values.training_template_id ? parseInt(values.training_template_id) : undefined,
            manager_id: parseInt(values.manager_id),
            teacher_id: parseInt(values.teacher_id),
            trainee_id: parseInt(values.trainee_id),
            start_date: values.start_date || undefined,
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">研修一覧</h2>
                    <p className="text-muted-foreground">実施中の研修を管理します。</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["trainings"] })}
                        title="更新"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Drawer open={open} onOpenChange={setOpen}>
                        <DrawerTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                新規研修作成
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="h-[96vh]">
                            <div className="mx-auto w-full max-w-2xl h-full overflow-y-auto">
                                <DrawerHeader>
                                    <DrawerTitle>新規研修作成</DrawerTitle>
                                    <DrawerDescription>
                                        テンプレートを選択して、新しい研修を開始します。
                                    </DrawerDescription>
                                </DrawerHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 pb-0">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>研修名</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="例：2024年度 新人研修" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="training_template_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>使用テンプレート</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="テンプレートを選択" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {templates?.data?.map((t: any) => (
                                                                <SelectItem key={t.id} value={t.id.toString()}>
                                                                    {t.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="manager_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>責任者</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="選択" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {users?.data?.map((u: { id: number; username: string }) => (
                                                                    <SelectItem key={u.id} value={u.id.toString()}>
                                                                        {u.username}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="teacher_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>講師</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="選択" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {users?.data?.map((u: { id: number; username: string }) => (
                                                                    <SelectItem key={u.id} value={u.id.toString()}>
                                                                        {u.username}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="trainee_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>研修生</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="選択" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {users?.data?.map((u: { id: number; username: string }) => (
                                                                <SelectItem key={u.id} value={u.id.toString()}>
                                                                    {u.username}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="start_date"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>開始予定日</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                        "w-full pl-3 text-left font-normal",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? (
                                                                        format(new Date(field.value), "PPP", { locale: ja })
                                                                    ) : (
                                                                        <span>日付を選択</span>
                                                                    )}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value ? new Date(field.value) : undefined}
                                                                onSelect={(date) => field.onChange(date?.toISOString())}
                                                                disabled={(date) =>
                                                                    date < new Date("1900-01-01")
                                                                }
                                                                initialFocus
                                                                locale={ja}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <DrawerFooter>
                                            <Button type="submit" disabled={createMutation.isPending}>
                                                {createMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                                                作成
                                            </Button>
                                        </DrawerFooter>
                                    </form>
                                </Form>
                            </div>
                        </DrawerContent>
                    </Drawer>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>研修一覧</CardTitle>
                    <CardDescription>現在登録されている研修の一覧です。</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>研修名</TableHead>
                                <TableHead>担当者</TableHead>
                                <TableHead>講師</TableHead>
                                <TableHead>研修生</TableHead>
                                <TableHead>開始日</TableHead>
                                <TableHead className="w-[200px]">全体進捗</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Spinner className="mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : data?.data?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        研修がありません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.data?.map((training: Training) => (
                                    <TableRow key={training.id}>
                                        <TableCell className="font-medium">{training.name}</TableCell>
                                        <TableCell>{training.manager?.username || "-"}</TableCell>
                                        <TableCell>{training.teacher?.username}</TableCell>
                                        <TableCell>{training.trainee?.username}</TableCell>
                                        <TableCell>
                                            {training.start_date ? format(new Date(training.start_date), "yyyy/MM/dd") : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Progress value={calculateOverallProgress(training)} className="h-2 flex-1" />
                                                <span className="text-xs font-medium text-muted-foreground min-w-[2.5rem] text-right">
                                                    {calculateOverallProgress(training)}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleViewDetail(training.id)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditDetail(training.id)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(training.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <TrainingDetailDrawer
                trainingId={selectedTrainingId}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                initialEditMode={detailEditMode}
            />

            {/* First Confirmation */}
            <AlertDialog open={deleteConfirmStep === 1} onOpenChange={(open) => !open && setDeleteConfirmStep(0)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>研修を削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。本当に削除の準備を進めますか？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                setDeleteConfirmStep(2);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            次へ進む
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Second Confirmation */}
            <AlertDialog open={deleteConfirmStep === 2} onOpenChange={(open) => !open && setDeleteConfirmStep(0)}>
                <AlertDialogContent className="border-destructive">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            最終確認：本当に削除しますか？
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-bold text-foreground">
                            関連するすべてのデータ（タスク、進捗、日報など）が完全に削除されます。
                            この操作は非常に危険です。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmStep(0)}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => trainingToDelete && deleteMutation.mutate(trainingToDelete)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : "完全に削除する"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
