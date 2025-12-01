import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SupportTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorDetails?: string;
  errorType?: string;
}

export function SupportTicketDialog({ open, onOpenChange, errorDetails, errorType }: SupportTicketDialogProps) {
  const { language } = useLanguage();
  const [subject, setSubject] = useState(errorType || "");
  const [description, setDescription] = useState(errorDetails || "");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("contact_messages")
        .insert({
          name: name || "匿名ユーザー",
          email: email || "no-email@jiuflow.com",
          subject: `[サポートチケット] ${subject}`,
          message: `エラータイプ: ${errorType}\n\n説明:\n${description}\n\n詳細:\n${errorDetails || "なし"}`,
        });

      if (error) throw error;

      toast.success(
        language === "ja" 
          ? "サポートチケットを送信しました。担当者から連絡いたします。" 
          : "Support ticket submitted. We'll get back to you soon."
      );
      
      onOpenChange(false);
      // Reset form
      setSubject("");
      setDescription("");
      setEmail("");
      setName("");
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      toast.error(
        language === "ja" 
          ? "チケットの送信に失敗しました。もう一度お試しください。" 
          : "Failed to submit ticket. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {language === "ja" ? "サポートチケット作成" : "Create Support Ticket"}
          </DialogTitle>
          <DialogDescription>
            {language === "ja" 
              ? "問題の詳細を入力してください。担当者が確認後、ご連絡いたします。" 
              : "Please provide details about the issue. Our team will review and contact you."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {language === "ja" ? "お名前（任意）" : "Name (Optional)"}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === "ja" ? "山田太郎" : "John Doe"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              {language === "ja" ? "メールアドレス（任意）" : "Email (Optional)"}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === "ja" ? "example@email.com" : "example@email.com"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">
              {language === "ja" ? "件名" : "Subject"}
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={language === "ja" ? "エラーの概要" : "Error summary"}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {language === "ja" ? "詳細説明" : "Description"}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === "ja" 
                ? "エラーの詳細や発生した状況を教えてください" 
                : "Please describe the error and how it occurred"}
              rows={5}
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {language === "ja" ? "キャンセル" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {language === "ja" ? "送信" : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
