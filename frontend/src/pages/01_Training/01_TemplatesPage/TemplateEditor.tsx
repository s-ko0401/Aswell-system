import { useEffect, useState } from "react";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import type { TrainingTemplate, TrainingTemplateFormData } from "@/api/training";
import { Card, CardContent } from "@/components/ui/card";

// --- Zod Schema ---

const minorItemSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(1, "必須項目です"),
    sort: z.number(),
});

const middleItemSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(1, "必須項目です"),
    sort: z.number(),
    minor_items: z.array(minorItemSchema).optional(),
});

const majorItemSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(1, "必須項目です"),
    sort: z.number(),
    middle_items: z.array(middleItemSchema).optional(),
});

const templateSchema = z.object({
    name: z.string().min(1, "テンプレート名は必須です"),
    major_items: z.array(majorItemSchema).optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

// --- Components ---

type TemplateEditorProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: TrainingTemplate | null;
    onSubmit: (data: TrainingTemplateFormData) => void;
    isPending: boolean;
};

export function TemplateEditor({
    open,
    onOpenChange,
    template,
    onSubmit,
    isPending,
}: TemplateEditorProps) {
    const [manualEditing, setManualEditing] = useState(false);
    const form = useForm<TemplateFormValues>({
        resolver: zodResolver(templateSchema),
        defaultValues: {
            name: "",
            major_items: [],
        },
    });

    const { fields: majorFields, append: appendMajor, remove: removeMajor } = useFieldArray({
        control: form.control,
        name: "major_items",
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        if (template) {
            form.reset({
                name: template.name,
                major_items: template.major_items?.map((major) => ({
                    id: major.id,
                    name: major.name,
                    sort: major.sort,
                    middle_items: major.middle_items?.map((middle) => ({
                        id: middle.id,
                        name: middle.name,
                        sort: middle.sort,
                        minor_items: middle.minor_items?.map((minor) => ({
                            id: minor.id,
                            name: minor.name,
                            sort: minor.sort,
                        })),
                    })),
                })),
            });
        } else {
            form.reset({
                name: "",
                major_items: [],
            });
        }
    }, [open, template, form]);

    const isEditing = !template || manualEditing;
    const handleOpenChange = (nextOpen: boolean) => {
        setManualEditing(false);
        onOpenChange(nextOpen);
    };

    const handleSubmit = (data: TemplateFormValues) => {
        // Auto-assign sort order based on index if needed, but for now we trust the form state
        // Actually, let's ensure sort is correct based on index before submitting
        const sortedData = {
            ...data,
            major_items: data.major_items?.map((major, majorIndex) => ({
                ...major,
                sort: majorIndex + 1,
                middle_items: major.middle_items?.map((middle, middleIndex) => ({
                    ...middle,
                    sort: middleIndex + 1,
                    minor_items: middle.minor_items?.map((minor, minorIndex) => ({
                        ...minor,
                        sort: minorIndex + 1,
                    })),
                })),
            })),
        };
        onSubmit(sortedData);
    };

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent>
                <div className="w-full flex flex-col">
                    <DrawerHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
                        <div className="space-y-1 text-left">
                            <DrawerTitle>
                                {template ? (isEditing ? "テンプレート編集" : "テンプレート詳細") : "テンプレート新規作成"}
                            </DrawerTitle>
                            <DrawerDescription>
                                研修テンプレートの構成（大・中・小項目）を{isEditing ? "編集" : "確認"}します。
                            </DrawerDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {template && !isEditing && (
                                <Button type="button" variant="outline" size="sm" onClick={() => setManualEditing(true)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    編集する
                                </Button>
                            )}
                            <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                                <Plus className="h-5 w-5 rotate-45" />
                            </Button>
                        </div>
                    </DrawerHeader>

                    <div className="p-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>テンプレート名</FormLabel>
                                            <FormControl>
                                                {isEditing ? (
                                                    <Input placeholder="例：新入社員研修 2024" {...field} value={field.value ?? ""} />
                                                ) : (
                                                    <div className="text-xl font-bold py-2 border-b">{field.value}</div>
                                                )}
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-base font-medium">カリキュラム構成</div>
                                        {isEditing && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => appendMajor({ name: "", sort: majorFields.length + 1, middle_items: [] })}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                大項目を追加
                                            </Button>
                                        )}
                                    </div>

                                    {majorFields.map((major, index) => (
                                        <MajorItemField
                                            key={major.id}
                                            control={form.control}
                                            index={index}
                                            remove={() => removeMajor(index)}
                                            isEditing={isEditing}
                                        />
                                    ))}

                                    {majorFields.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                            項目がありません。「大項目を追加」ボタンから作成してください。
                                        </div>
                                    )}
                                </div>

                                {isEditing && (
                                    <DrawerFooter className="px-0 pt-6">
                                        <Button type="submit" disabled={isPending}>
                                            {isPending && <Spinner className="mr-2 h-4 w-4" />}
                                            保存
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => (template ? setManualEditing(false) : onOpenChange(false))}
                                        >
                                            キャンセル
                                        </Button>
                                    </DrawerFooter>
                                )}
                            </form>
                        </Form>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

// --- Sub-Components for Nested Fields ---

function MajorItemField({ control, index, remove, isEditing }: { control: Control<TemplateFormValues>; index: number; remove: () => void; isEditing: boolean }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { fields: middleFields, append: appendMiddle, remove: removeMiddle } = useFieldArray({
        control,
        name: `major_items.${index}.middle_items`,
    });

    return (
        <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-4">
                    {isEditing && (
                        <div className="mt-3 cursor-move text-muted-foreground">
                            <GripVertical className="h-5 w-5" />
                        </div>
                    )}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <FormField
                                control={control}
                                name={`major_items.${index}.name`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-xs font-bold text-primary">大項目 {index + 1}</FormLabel>
                                            {isEditing && (
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={remove}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <FormControl>
                                            {isEditing ? (
                                                <Input placeholder="大項目名" {...field} value={field.value ?? ""} />
                                            ) : (
                                                <div className="font-semibold py-1">{field.value}</div>
                                            )}
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Middle Items */}
                        {isExpanded && (
                            <div className="pl-4 border-l space-y-4">
                                {middleFields.map((middle, middleIndex) => (
                                    <MiddleItemField
                                        key={middle.id}
                                        control={control}
                                        majorIndex={index}
                                        middleIndex={middleIndex}
                                        remove={() => removeMiddle(middleIndex)}
                                        isEditing={isEditing}
                                    />
                                ))}
                                {isEditing && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => appendMiddle({ name: "", sort: middleFields.length + 1, minor_items: [] })}
                                    >
                                        <Plus className="mr-2 h-3 w-3" />
                                        中項目を追加
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function MiddleItemField({
    control,
    majorIndex,
    middleIndex,
    remove,
    isEditing,
}: {
    control: Control<TemplateFormValues>;
    majorIndex: number;
    middleIndex: number;
    remove: () => void;
    isEditing: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { fields: minorFields, append: appendMinor, remove: removeMinor } = useFieldArray({
        control,
        name: `major_items.${majorIndex}.middle_items.${middleIndex}.minor_items`,
    });

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
                <FormField
                    control={control}
                    name={`major_items.${majorIndex}.middle_items.${middleIndex}.name`}
                    render={({ field }) => (
                        <FormItem className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">中項目 {middleIndex + 1}</span>
                                <FormControl>
                                    {isEditing ? (
                                        <Input placeholder="中項目名" className="h-8" {...field} value={field.value ?? ""} />
                                    ) : (
                                        <div className="text-sm font-medium py-1">{field.value}</div>
                                    )}
                                </FormControl>
                                {isEditing && (
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={remove}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Minor Items */}
            {isExpanded && (
                <div className="pl-6 space-y-2">
                    {minorFields.map((minor, minorIndex) => (
                        <MinorItemField
                            key={minor.id}
                            control={control}
                            majorIndex={majorIndex}
                            middleIndex={middleIndex}
                            minorIndex={minorIndex}
                            remove={() => removeMinor(minorIndex)}
                            isEditing={isEditing}
                        />
                    ))}
                    {isEditing && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => appendMinor({ name: "", sort: minorFields.length + 1 })}
                        >
                            <Plus className="mr-1 h-3 w-3" />
                            小項目を追加
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

function MinorItemField({
    control,
    majorIndex,
    middleIndex,
    minorIndex,
    remove,
    isEditing,
}: {
    control: Control<TemplateFormValues>;
    majorIndex: number;
    middleIndex: number;
    minorIndex: number;
    remove: () => void;
    isEditing: boolean;
}) {
    return (
        <FormField
            control={control}
            name={`major_items.${majorIndex}.middle_items.${middleIndex}.minor_items.${minorIndex}.name`}
            render={({ field }) => (
                <FormItem>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap w-4 text-right">{minorIndex + 1}.</span>
                        <FormControl>
                            {isEditing ? (
                                <Input placeholder="小項目名" className="h-7 text-sm" {...field} value={field.value ?? ""} />
                            ) : (
                                <div className="text-sm py-0.5">{field.value}</div>
                            )}
                        </FormControl>
                        {isEditing && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={remove}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
