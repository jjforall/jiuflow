import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, Pencil, Trash2, Calendar, Clock, Users, Loader2, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DojoClassesManagementProps {
  dojoId: string;
}

interface DojoClass {
  id: string;
  name: string;
  name_ja: string | null;
  description: string | null;
  description_ja: string | null;
  class_type: string;
  instructor_name: string | null;
  duration_minutes: number;
  level: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  dojo_class_schedules: {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_capacity: number | null;
    room_name: string | null;
    is_active: boolean;
  }[];
}

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
const classTypes = [
  { value: "regular", label: "通常クラス" },
  { value: "open_mat", label: "オープンマット" },
  { value: "competition", label: "試合練習" },
  { value: "private", label: "プライベート" },
  { value: "kids", label: "キッズ" },
  { value: "nogi", label: "ノーギ" },
];
const levels = [
  { value: "all", label: "全レベル" },
  { value: "beginner", label: "初心者" },
  { value: "intermediate", label: "中級" },
  { value: "advanced", label: "上級" },
];
const defaultColors = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
];

interface ClassFormData {
  name: string;
  name_ja: string;
  description: string;
  description_ja: string;
  class_type: string;
  instructor_name: string;
  duration_minutes: number;
  level: string;
  color: string;
  is_active: boolean;
}

interface ScheduleFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  room_name: string;
  is_active: boolean;
}

const defaultClassForm: ClassFormData = {
  name: "",
  name_ja: "",
  description: "",
  description_ja: "",
  class_type: "regular",
  instructor_name: "",
  duration_minutes: 60,
  level: "all",
  color: "#3b82f6",
  is_active: true,
};

const defaultScheduleForm: ScheduleFormData = {
  day_of_week: 1,
  start_time: "19:00",
  end_time: "20:00",
  max_capacity: null,
  room_name: "",
  is_active: true,
};

export default function DojoClassesManagement({ dojoId }: DojoClassesManagementProps) {
  const queryClient = useQueryClient();
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<DojoClass | null>(null);
  const [classForm, setClassForm] = useState<ClassFormData>(defaultClassForm);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>(defaultScheduleForm);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const { data: classes, isLoading } = useQuery({
    queryKey: ["dojo-classes-admin", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_classes")
        .select(`
          *,
          dojo_class_schedules (*)
        `)
        .eq("dojo_id", dojoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DojoClass[];
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const { error } = await supabase
        .from("dojo_classes")
        .insert({
          dojo_id: dojoId,
          name: data.name,
          name_ja: data.name_ja || null,
          description: data.description || null,
          description_ja: data.description_ja || null,
          class_type: data.class_type,
          instructor_name: data.instructor_name || null,
          duration_minutes: data.duration_minutes,
          level: data.level,
          color: data.color,
          is_active: data.is_active,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-classes-admin", dojoId] });
      queryClient.invalidateQueries({ queryKey: ["dojo-schedules", dojoId] });
      setClassDialogOpen(false);
      setClassForm(defaultClassForm);
      toast.success("クラスを作成しました");
    },
    onError: (error: Error) => {
      toast.error("クラスの作成に失敗しました", { description: error.message });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClassFormData }) => {
      const { error } = await supabase
        .from("dojo_classes")
        .update({
          name: data.name,
          name_ja: data.name_ja || null,
          description: data.description || null,
          description_ja: data.description_ja || null,
          class_type: data.class_type,
          instructor_name: data.instructor_name || null,
          duration_minutes: data.duration_minutes,
          level: data.level,
          color: data.color,
          is_active: data.is_active,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-classes-admin", dojoId] });
      queryClient.invalidateQueries({ queryKey: ["dojo-schedules", dojoId] });
      setClassDialogOpen(false);
      setSelectedClass(null);
      setClassForm(defaultClassForm);
      toast.success("クラスを更新しました");
    },
    onError: (error: Error) => {
      toast.error("クラスの更新に失敗しました", { description: error.message });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dojo_classes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-classes-admin", dojoId] });
      toast.success("クラスを削除しました");
    },
    onError: (error: Error) => {
      toast.error("クラスの削除に失敗しました", { description: error.message });
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async ({ classId, data }: { classId: string; data: ScheduleFormData }) => {
      const { error } = await supabase
        .from("dojo_class_schedules")
        .insert({
          class_id: classId,
          day_of_week: data.day_of_week,
          start_time: data.start_time,
          end_time: data.end_time,
          max_capacity: data.max_capacity,
          room_name: data.room_name || null,
          is_active: data.is_active,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-classes-admin", dojoId] });
      queryClient.invalidateQueries({ queryKey: ["dojo-schedules", dojoId] });
      setScheduleDialogOpen(false);
      setScheduleForm(defaultScheduleForm);
      toast.success("スケジュールを追加しました");
    },
    onError: (error: Error) => {
      toast.error("スケジュールの追加に失敗しました", { description: error.message });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ScheduleFormData }) => {
      const { error } = await supabase
        .from("dojo_class_schedules")
        .update({
          day_of_week: data.day_of_week,
          start_time: data.start_time,
          end_time: data.end_time,
          max_capacity: data.max_capacity,
          room_name: data.room_name || null,
          is_active: data.is_active,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-classes-admin", dojoId] });
      queryClient.invalidateQueries({ queryKey: ["dojo-schedules", dojoId] });
      setScheduleDialogOpen(false);
      setEditingScheduleId(null);
      setScheduleForm(defaultScheduleForm);
      toast.success("スケジュールを更新しました");
    },
    onError: (error: Error) => {
      toast.error("スケジュールの更新に失敗しました", { description: error.message });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dojo_class_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-classes-admin", dojoId] });
      queryClient.invalidateQueries({ queryKey: ["dojo-schedules", dojoId] });
      toast.success("スケジュールを削除しました");
    },
    onError: (error: Error) => {
      toast.error("スケジュールの削除に失敗しました", { description: error.message });
    },
  });

  const handleEditClass = (cls: DojoClass) => {
    setSelectedClass(cls);
    setClassForm({
      name: cls.name,
      name_ja: cls.name_ja || "",
      description: cls.description || "",
      description_ja: cls.description_ja || "",
      class_type: cls.class_type,
      instructor_name: cls.instructor_name || "",
      duration_minutes: cls.duration_minutes,
      level: cls.level || "all",
      color: cls.color || "#3b82f6",
      is_active: cls.is_active,
    });
    setClassDialogOpen(true);
  };

  const handleAddSchedule = (cls: DojoClass) => {
    setSelectedClass(cls);
    setScheduleForm(defaultScheduleForm);
    setEditingScheduleId(null);
    setScheduleDialogOpen(true);
  };

  const handleEditSchedule = (cls: DojoClass, schedule: DojoClass["dojo_class_schedules"][0]) => {
    setSelectedClass(cls);
    setScheduleForm({
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),
      max_capacity: schedule.max_capacity,
      room_name: schedule.room_name || "",
      is_active: schedule.is_active,
    });
    setEditingScheduleId(schedule.id);
    setScheduleDialogOpen(true);
  };

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClass) {
      updateClassMutation.mutate({ id: selectedClass.id, data: classForm });
    } else {
      createClassMutation.mutate(classForm);
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    if (editingScheduleId) {
      updateScheduleMutation.mutate({ id: editingScheduleId, data: scheduleForm });
    } else {
      createScheduleMutation.mutate({ classId: selectedClass.id, data: scheduleForm });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">クラス管理</CardTitle>
          <Button
            onClick={() => {
              setSelectedClass(null);
              setClassForm(defaultClassForm);
              setClassDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            クラス追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!classes || classes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>クラスがありません</p>
              <p className="text-sm mt-1">「クラス追加」ボタンから新しいクラスを作成してください</p>
            </div>
          ) : (
            classes.map((cls) => (
              <div
                key={cls.id}
                className={cn(
                  "p-4 rounded-lg border",
                  !cls.is_active && "opacity-60 bg-muted/50"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cls.color || "#3b82f6" }}
                    />
                    <div>
                      <h3 className="font-medium">{cls.name_ja || cls.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline">
                          {classTypes.find((t) => t.value === cls.class_type)?.label || cls.class_type}
                        </Badge>
                        <Badge variant="outline">
                          {levels.find((l) => l.value === cls.level)?.label || cls.level}
                        </Badge>
                        <Badge variant="outline">{cls.duration_minutes}分</Badge>
                        {!cls.is_active && <Badge variant="secondary">非公開</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClass(cls)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>クラスを削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            この操作は取り消せません。関連するスケジュールと予約も削除されます。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteClassMutation.mutate(cls.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            削除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* スケジュール一覧 */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">スケジュール</h4>
                    <Button variant="outline" size="sm" onClick={() => handleAddSchedule(cls)}>
                      <Plus className="h-3 w-3 mr-1" />
                      追加
                    </Button>
                  </div>
                  {cls.dojo_class_schedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">スケジュールがありません</p>
                  ) : (
                    <div className="grid gap-2">
                      {cls.dojo_class_schedules
                        .sort((a, b) => a.day_of_week - b.day_of_week)
                        .map((schedule) => (
                          <div
                            key={schedule.id}
                            className={cn(
                              "flex items-center justify-between p-2 rounded bg-muted/30",
                              !schedule.is_active && "opacity-50"
                            )}
                          >
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-medium w-6">{dayNames[schedule.day_of_week]}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                              </span>
                              {schedule.max_capacity && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {schedule.max_capacity}名
                                </span>
                              )}
                              {schedule.room_name && (
                                <Badge variant="outline" className="text-xs">
                                  {schedule.room_name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditSchedule(cls, schedule)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>スケジュールを削除しますか？</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      このスケジュールに関連する予約も削除されます。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      削除
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* クラス作成/編集ダイアログ */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedClass ? "クラスを編集" : "クラスを追加"}</DialogTitle>
            <DialogDescription>クラスの基本情報を入力してください</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleClassSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">クラス名 (英語)</Label>
                <Input
                  id="name"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_ja">クラス名 (日本語)</Label>
                <Input
                  id="name_ja"
                  value={classForm.name_ja}
                  onChange={(e) => setClassForm({ ...classForm, name_ja: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class_type">タイプ</Label>
                <Select
                  value={classForm.class_type}
                  onValueChange={(value) => setClassForm({ ...classForm, class_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">レベル</Label>
                <Select
                  value={classForm.level}
                  onValueChange={(value) => setClassForm({ ...classForm, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instructor_name">講師名</Label>
                <Input
                  id="instructor_name"
                  value={classForm.instructor_name}
                  onChange={(e) => setClassForm({ ...classForm, instructor_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">時間（分）</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  min={15}
                  max={240}
                  value={classForm.duration_minutes}
                  onChange={(e) => setClassForm({ ...classForm, duration_minutes: parseInt(e.target.value) || 60 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>カラー</Label>
              <div className="flex gap-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform",
                      classForm.color === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setClassForm({ ...classForm, color })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={classForm.description}
                onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={classForm.is_active}
                onCheckedChange={(checked) => setClassForm({ ...classForm, is_active: checked })}
              />
              <Label htmlFor="is_active">公開する</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClassDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={createClassMutation.isPending || updateClassMutation.isPending}
              >
                {(createClassMutation.isPending || updateClassMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {selectedClass ? "更新" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* スケジュール追加/編集ダイアログ */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingScheduleId ? "スケジュールを編集" : "スケジュールを追加"}</DialogTitle>
            <DialogDescription>
              {selectedClass && (selectedClass.name_ja || selectedClass.name)}のスケジュール
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="day_of_week">曜日</Label>
              <Select
                value={scheduleForm.day_of_week.toString()}
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((name, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {name}曜日
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">開始時間</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={scheduleForm.start_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">終了時間</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={scheduleForm.end_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_capacity">定員（空白で無制限）</Label>
                <Input
                  id="max_capacity"
                  type="number"
                  min={1}
                  value={scheduleForm.max_capacity || ""}
                  onChange={(e) => setScheduleForm({
                    ...scheduleForm,
                    max_capacity: e.target.value ? parseInt(e.target.value) : null
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_name">部屋名</Label>
                <Input
                  id="room_name"
                  value={scheduleForm.room_name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, room_name: e.target.value })}
                  placeholder="例: Aマット"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="schedule_is_active"
                checked={scheduleForm.is_active}
                onCheckedChange={(checked) => setScheduleForm({ ...scheduleForm, is_active: checked })}
              />
              <Label htmlFor="schedule_is_active">有効にする</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
              >
                {(createScheduleMutation.isPending || updateScheduleMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingScheduleId ? "更新" : "追加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
