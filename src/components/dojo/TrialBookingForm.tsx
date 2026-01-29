import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, Clock, User, Mail, Phone, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrialBookingFormProps {
  dojoId: string;
  dojoName?: string;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  preferred_date: Date | undefined;
  preferred_time: string;
  schedule_id: string;
  experience_level: string;
  message: string;
}

const defaultFormData: FormData = {
  name: "",
  email: "",
  phone: "",
  preferred_date: undefined,
  preferred_time: "",
  schedule_id: "",
  experience_level: "none",
  message: "",
};

export default function TrialBookingForm({ dojoId, dojoName, onSuccess }: TrialBookingFormProps) {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: schedules } = useQuery({
    queryKey: ["dojo-trial-schedules", dojoId, formData.preferred_date],
    queryFn: async () => {
      if (!formData.preferred_date) return [];
      
      const dayOfWeek = formData.preferred_date.getDay();
      const { data, error } = await supabase
        .from("dojo_class_schedules")
        .select(`
          id,
          start_time,
          end_time,
          max_capacity,
          dojo_classes!inner (
            id,
            name,
            name_ja,
            class_type,
            dojo_id
          )
        `)
        .eq("dojo_classes.dojo_id", dojoId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!formData.preferred_date,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase
        .from("dojo_trial_bookings")
        .insert({
          dojo_id: dojoId,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          preferred_date: format(data.preferred_date!, "yyyy-MM-dd"),
          preferred_time: data.preferred_time || null,
          schedule_id: data.schedule_id || null,
          experience_level: data.experience_level,
          message: data.message || null,
          status: "pending",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("体験予約を受け付けました");
      onSuccess?.();
    },
    onError: () => {
      toast.error("予約の送信に失敗しました");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.preferred_date) {
      toast.error("必須項目を入力してください");
      return;
    }
    submitMutation.mutate(formData);
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-bold mb-2">体験予約を受け付けました</h3>
          <p className="text-muted-foreground">
            ご入力いただいたメールアドレスに確認メールをお送りします。
            <br />
            道場スタッフより折り返しご連絡いたします。
          </p>
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => {
              setIsSubmitted(false);
              setFormData(defaultFormData);
            }}
          >
            別の予約をする
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          体験クラス予約
        </CardTitle>
        <CardDescription>
          {dojoName ? `${dojoName}の` : ""}体験クラスをご予約ください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <User className="h-4 w-4" />
              お名前 <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="山田 太郎"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              メールアドレス <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@email.com"
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              電話番号（任意）
            </Label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="090-1234-5678"
            />
          </div>

          {/* Preferred Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              希望日 <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.preferred_date && "text-muted-foreground"
                  )}
                >
                  {formData.preferred_date ? (
                    format(formData.preferred_date, "yyyy年M月d日 (E)", { locale: ja })
                  ) : (
                    "日付を選択"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={formData.preferred_date}
                  onSelect={(date) => setFormData({ ...formData, preferred_date: date, schedule_id: "" })}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Class Selection (if date selected) */}
          {formData.preferred_date && schedules && schedules.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                希望クラス（任意）
              </Label>
              <Select
                value={formData.schedule_id}
                onValueChange={(v) => setFormData({ ...formData, schedule_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="クラスを選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">指定なし</SelectItem>
                  {schedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.start_time.slice(0, 5)} - {schedule.dojo_classes?.name_ja || schedule.dojo_classes?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preferred Time (fallback if no class selected) */}
          {formData.preferred_date && !formData.schedule_id && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                希望時間帯（任意）
              </Label>
              <Select
                value={formData.preferred_time}
                onValueChange={(v) => setFormData({ ...formData, preferred_time: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="時間帯を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">指定なし</SelectItem>
                  <SelectItem value="morning">午前（9:00-12:00）</SelectItem>
                  <SelectItem value="afternoon">午後（12:00-17:00）</SelectItem>
                  <SelectItem value="evening">夜間（17:00-21:00）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Experience Level */}
          <div className="space-y-2">
            <Label>柔術経験</Label>
            <Select
              value={formData.experience_level}
              onValueChange={(v) => setFormData({ ...formData, experience_level: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし（完全初心者）</SelectItem>
                <SelectItem value="beginner">初心者（1年未満）</SelectItem>
                <SelectItem value="intermediate">中級者（1-3年）</SelectItem>
                <SelectItem value="advanced">上級者（3年以上）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              メッセージ（任意）
            </Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="ご質問やご要望があればお書きください"
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "送信中..." : "体験予約を申し込む"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            ご予約いただいた後、道場スタッフより確認のご連絡をいたします。
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
