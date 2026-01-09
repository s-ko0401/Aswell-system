import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
    getTrainingTemplates,
    deleteTrainingTemplate,
    createTrainingTemplate,
    updateTrainingTemplate,
    type TrainingTemplate,
    type TrainingTemplateFormData
} from "@/api/training";
import { Spinner } from "@/components/ui/spinner";
import { TemplateEditor } from "./TemplateEditor";

export function TemplatesPage() {
    const [page, setPage] = useState(1);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TrainingTemplate | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["trainingTemplates", page],
        queryFn: () => getTrainingTemplates(page),
    });

    const createMutation = useMutation({
        mutationFn: createTrainingTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingTemplates"] });
            toast({
                title: "作成しました",
                description: "研修テンプレートを作成しました。",
            });
            setEditorOpen(false);
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "エラー",
                description: "作成に失敗しました。",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: TrainingTemplateFormData }) =>
            updateTrainingTemplate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingTemplates"] });
            toast({
                title: "更新しました",
                description: "研修テンプレートを更新しました。",
            });
            setEditorOpen(false);
            setEditingTemplate(null);
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "エラー",
                description: "更新に失敗しました。",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTrainingTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingTemplates"] });
            toast({
                title: "削除しました",
                description: "研修テンプレートを削除しました。",
            });
            setDeleteId(null);
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "エラー",
                description: "削除に失敗しました。",
            });
        },
    });

    const handleCreate = () => {
        setEditingTemplate(null);
        setEditorOpen(true);
    };

    const handleEdit = (template: TrainingTemplate) => {
        setEditingTemplate(template);
        setEditorOpen(true);
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteMutation.mutate(deleteId);
        }
    };

    const handleEditorSubmit = (data: TrainingTemplateFormData) => {
        if (editingTemplate) {
            updateMutation.mutate({ id: editingTemplate.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    if (isError) {
        return <div className="p-4 text-destructive">エラーが発生しました。</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">研修テンプレート</h2>
                    <p className="text-muted-foreground">
                        社内研修のカリキュラムテンプレートを管理します。
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    新規作成
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>テンプレート一覧</CardTitle>
                    <CardDescription>
                        登録されている研修テンプレートの一覧です。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">ID</TableHead>
                                <TableHead>テンプレート名</TableHead>
                                <TableHead>作成者</TableHead>
                                <TableHead>作成日時</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="flex justify-center">
                                            <Spinner className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : data?.data?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        データがありません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.data?.map((template: TrainingTemplate) => (
                                    <TableRow key={template.id}>
                                        <TableCell>{template.id}</TableCell>
                                        <TableCell className="font-medium">
                                            <button
                                                className="hover:underline text-primary text-left"
                                                onClick={() => handleEdit(template)}
                                            >
                                                {template.name}
                                            </button>
                                        </TableCell>
                                        <TableCell>{template.creator?.username ?? "不明"}</TableCell>
                                        <TableCell>
                                            {template.created_at
                                                ? format(new Date(template.created_at), "yyyy/MM/dd HH:mm")
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => setDeleteId(template.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination (Simple implementation) */}
                    {data && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                            >
                                前へ
                            </Button>
                            <div className="text-sm text-muted-foreground">
                                Page {data.current_page} of {data.last_page}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page >= data.last_page || isLoading}
                            >
                                次へ
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <TemplateEditor
                open={editorOpen}
                onOpenChange={(open) => {
                    setEditorOpen(open);
                    if (!open) setEditingTemplate(null);
                }}
                template={editingTemplate}
                onSubmit={handleEditorSubmit}
                isPending={createMutation.isPending || updateMutation.isPending}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。テンプレートとその配下のすべての項目が削除されます。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleteMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                            削除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
