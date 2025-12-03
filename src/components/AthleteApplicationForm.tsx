import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Star, Plus, X } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
}

export const AthleteApplicationForm = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    home_dojo: "",
    organization_id: "",
    belt_history: [] as { belt: string; date: string }[],
    titles: [] as string[],
  });

  const [currentBelt, setCurrentBelt] = useState({ belt: "", date: "" });
  const [currentTitle, setCurrentTitle] = useState("");

  const loadOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error loading organizations:', error);
      return;
    }
    setOrganizations(data || []);
  };

  const handleOpen = () => {
    setIsOpen(true);
    loadOrganizations();
  };

  const addBelt = () => {
    if (currentBelt.belt && currentBelt.date) {
      setFormData({
        ...formData,
        belt_history: [...formData.belt_history, currentBelt],
      });
      setCurrentBelt({ belt: "", date: "" });
    }
  };

  const removeBelt = (index: number) => {
    setFormData({
      ...formData,
      belt_history: formData.belt_history.filter((_, i) => i !== index),
    });
  };

  const addTitle = () => {
    if (currentTitle.trim()) {
      setFormData({
        ...formData,
        titles: [...formData.titles, currentTitle.trim()],
      });
      setCurrentTitle("");
    }
  };

  const removeTitle = (index: number) => {
    setFormData({
      ...formData,
      titles: formData.titles.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('celebrity_applications')
        .insert({
          display_name: formData.display_name,
          bio: formData.bio,
          home_dojo: formData.home_dojo,
          organization_id: formData.organization_id || null,
          belt_history: formData.belt_history,
          titles: formData.titles,
          status: 'pending',
        });

      if (error) throw error;

      toast.success(
        language === "ja"
          ? "申請が送信されました"
          : language === "pt"
          ? "Aplicação enviada"
          : "Application submitted"
      );
      setIsOpen(false);
      setFormData({
        display_name: "",
        bio: "",
        home_dojo: "",
        organization_id: "",
        belt_history: [],
        titles: [],
      });
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || "Error submitting application");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={handleOpen} className="gap-2 text-xs sm:text-sm" size="sm">
          <Star className="h-4 w-4" />
          <span className="hidden sm:inline">
            {language === "ja"
              ? "有名選手として申請"
              : language === "pt"
              ? "Aplicar como Atleta"
              : "Apply as Athlete"}
          </span>
          <span className="sm:hidden">
            {language === "ja" ? "申請" : "Apply"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === "ja"
              ? "有名選手申請"
              : language === "pt"
              ? "Aplicação de Atleta"
              : "Athlete Application"}
          </DialogTitle>
          <DialogDescription>
            {language === "ja"
              ? "有名選手として登録するための情報を入力してください。管理者が承認後、あなたのプロフィールページが公開されます。"
              : language === "pt"
              ? "Preencha as informações para se registrar como atleta famoso. Seu perfil será publicado após aprovação do administrador."
              : "Fill in the information to register as a famous athlete. Your profile will be published after admin approval."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="display_name">
              {language === "ja" ? "表示名" : language === "pt" ? "Nome" : "Display Name"}
            </Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">
              {language === "ja" ? "自己紹介" : language === "pt" ? "Biografia" : "Bio"}
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="home_dojo">
              {language === "ja" ? "所属道場" : language === "pt" ? "Academia" : "Home Gym"}
            </Label>
            <Input
              id="home_dojo"
              value={formData.home_dojo}
              onChange={(e) => setFormData({ ...formData, home_dojo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">
              {language === "ja" ? "団体" : language === "pt" ? "Organização" : "Organization"}
            </Label>
            <Select
              value={formData.organization_id}
              onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === "ja" ? "団体を選択" : language === "pt" ? "Selecione a organização" : "Select organization"} />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {language === "ja" ? org.name_ja : language === "pt" ? org.name_pt : org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {language === "ja" ? "帯の履歴" : language === "pt" ? "Histórico de Faixas" : "Belt History"}
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder={language === "ja" ? "帯（例：黒帯）" : language === "pt" ? "Faixa (ex: Preta)" : "Belt (e.g., Black)"}
                value={currentBelt.belt}
                onChange={(e) => setCurrentBelt({ ...currentBelt, belt: e.target.value })}
              />
              <Input
                type="date"
                value={currentBelt.date}
                onChange={(e) => setCurrentBelt({ ...currentBelt, date: e.target.value })}
              />
              <Button type="button" onClick={addBelt} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {formData.belt_history.map((belt, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{belt.belt} - {belt.date}</span>
                  <Button type="button" onClick={() => removeBelt(index)} size="icon" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              {language === "ja" ? "タイトル・実績" : language === "pt" ? "Títulos" : "Titles"}
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder={language === "ja" ? "タイトルを入力" : language === "pt" ? "Digite o título" : "Enter title"}
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTitle())}
              />
              <Button type="button" onClick={addTitle} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {formData.titles.map((title, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{title}</span>
                  <Button type="button" onClick={() => removeTitle(index)} size="icon" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {language === "ja" ? "キャンセル" : language === "pt" ? "Cancelar" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? language === "ja"
                  ? "送信中..."
                  : language === "pt"
                  ? "Enviando..."
                  : "Submitting..."
                : language === "ja"
                ? "申請する"
                : language === "pt"
                ? "Enviar"
                : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
