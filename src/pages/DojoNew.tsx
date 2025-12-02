import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { ArrowLeft, Save, Languages, Loader2 } from "lucide-react";

export default function DojoNew() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslatingName, setIsTranslatingName] = useState(false);
  const [isTranslatingDescription, setIsTranslatingDescription] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    location: "",
    website: "",
    instagram: "",
    facebook: "",
    phone: "",
    email: "",
  });

  const translateText = async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text, sourceLang, targetLang }
      });

      if (error) throw error;
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };

  const detectLanguage = (text: string): 'en' | 'ja' | 'pt' => {
    // Simple detection based on character patterns
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
    const hasPortuguese = /[àáâãéêíóôõúç]/i.test(text);
    
    if (hasJapanese) return 'ja';
    if (hasPortuguese) return 'pt';
    return 'en';
  };

  const handleTranslateName = async () => {
    // Find which field has content
    const sourceText = formData.name_ja || formData.name || formData.name_pt;
    if (!sourceText.trim()) {
      toast.error(
        language === "ja" ? "翻訳するテキストを入力してください" : "Please enter text to translate"
      );
      return;
    }

    setIsTranslatingName(true);
    try {
      const sourceLang = formData.name_ja ? 'ja' : formData.name ? 'en' : 'pt';
      
      const updates: Partial<typeof formData> = {};
      
      if (sourceLang !== 'en' && !formData.name) {
        updates.name = await translateText(sourceText, sourceLang, 'en');
      }
      if (sourceLang !== 'ja' && !formData.name_ja) {
        updates.name_ja = await translateText(sourceText, sourceLang, 'ja');
      }
      if (sourceLang !== 'pt' && !formData.name_pt) {
        updates.name_pt = await translateText(sourceText, sourceLang, 'pt');
      }

      setFormData(prev => ({ ...prev, ...updates }));
      toast.success(language === "ja" ? "翻訳完了" : "Translation complete");
    } catch (error) {
      toast.error(language === "ja" ? "翻訳に失敗しました" : "Translation failed");
    } finally {
      setIsTranslatingName(false);
    }
  };

  const handleTranslateDescription = async () => {
    const sourceText = formData.description_ja || formData.description || formData.description_pt;
    if (!sourceText.trim()) {
      toast.error(
        language === "ja" ? "翻訳するテキストを入力してください" : "Please enter text to translate"
      );
      return;
    }

    setIsTranslatingDescription(true);
    try {
      const sourceLang = formData.description_ja ? 'ja' : formData.description ? 'en' : 'pt';
      
      const updates: Partial<typeof formData> = {};
      
      if (sourceLang !== 'en' && !formData.description) {
        updates.description = await translateText(sourceText, sourceLang, 'en');
      }
      if (sourceLang !== 'ja' && !formData.description_ja) {
        updates.description_ja = await translateText(sourceText, sourceLang, 'ja');
      }
      if (sourceLang !== 'pt' && !formData.description_pt) {
        updates.description_pt = await translateText(sourceText, sourceLang, 'pt');
      }

      setFormData(prev => ({ ...prev, ...updates }));
      toast.success(language === "ja" ? "翻訳完了" : "Translation complete");
    } catch (error) {
      toast.error(language === "ja" ? "翻訳に失敗しました" : "Translation failed");
    } finally {
      setIsTranslatingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim() || !formData.name_ja.trim() || !formData.name_pt.trim()) {
      toast.error(
        language === "ja"
          ? "道場名（英語、日本語、ポルトガル語）は必須です"
          : language === "pt"
          ? "Nomes em inglês, japonês e português são obrigatórios"
          : "Names in English, Japanese, and Portuguese are required"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(language === "ja" ? "ログインが必要です" : "Authentication required");
        navigate("/login");
        return;
      }

      const { error } = await supabase
        .from('dojos')
        .insert([{
          name: formData.name.trim(),
          name_ja: formData.name_ja.trim(),
          name_pt: formData.name_pt.trim(),
          description: formData.description.trim() || null,
          description_ja: formData.description_ja.trim() || null,
          description_pt: formData.description_pt.trim() || null,
          location: formData.location.trim() || null,
          website: formData.website.trim() || null,
          instagram: formData.instagram.trim() || null,
          facebook: formData.facebook.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          created_by: user.id,
        }]);

      if (error) throw error;

      toast.success(
        language === "ja"
          ? "道場を登録しました"
          : language === "pt"
          ? "Dojo adicionado com sucesso"
          : "Dojo registered successfully"
      );

      navigate("/dojos");
    } catch (error: any) {
      console.error('Error creating dojo:', error);
      toast.error(
        language === "ja"
          ? "道場の登録に失敗しました"
          : language === "pt"
          ? "Falha ao adicionar dojo"
          : "Failed to register dojo"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/dojos")}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === "ja" ? "道場一覧に戻る" : language === "pt" ? "Voltar para lista" : "Back to list"}
            </Button>
            <h1 className="text-4xl font-light mb-2">
              {language === "ja" ? "道場を登録" : language === "pt" ? "Adicionar Dojo" : "Register Dojo"}
            </h1>
            <p className="text-muted-foreground">
              {language === "ja"
                ? "新しい道場を登録します。1つの言語で入力すると自動翻訳できます。"
                : language === "pt"
                ? "Registre um novo dojo. Digite em uma língua para traduzir automaticamente."
                : "Register a new dojo. Enter in one language to auto-translate."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === "ja" ? "基本情報" : language === "pt" ? "Informações Básicas" : "Basic Information"}
                </CardTitle>
                <CardDescription>
                  {language === "ja"
                    ? "道場の基本情報を入力してください"
                    : language === "pt"
                    ? "Insira as informações básicas do dojo"
                    : "Enter the basic information of the dojo"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Names - Required */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      {language === "ja" ? "道場名" : language === "pt" ? "Nome do Dojo" : "Dojo Name"}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTranslateName}
                      disabled={isTranslatingName}
                      className="gap-2"
                    >
                      {isTranslatingName ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4" />
                      )}
                      {language === "ja" ? "自動翻訳" : "Auto Translate"}
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-muted-foreground">
                        English
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Gracie Barra Tokyo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name_ja" className="text-muted-foreground">
                        日本語
                      </Label>
                      <Input
                        id="name_ja"
                        value={formData.name_ja}
                        onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                        placeholder="グレイシーバッハ東京"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name_pt" className="text-muted-foreground">
                        Português
                      </Label>
                      <Input
                        id="name_pt"
                        value={formData.name_pt}
                        onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                        placeholder="Gracie Barra Tóquio"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {language === "ja" 
                      ? "💡 1つの言語で入力し、「自動翻訳」ボタンをクリックすると、他の言語に翻訳されます"
                      : "💡 Enter in one language and click 'Auto Translate' to fill other languages"}
                  </p>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">
                    {language === "ja" ? "所在地" : language === "pt" ? "Localização" : "Location"}
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={language === "ja" ? "東京都渋谷区" : "Tokyo, Shibuya"}
                  />
                </div>

                {/* Descriptions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      {language === "ja" ? "説明" : language === "pt" ? "Descrição" : "Description"}
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTranslateDescription}
                      disabled={isTranslatingDescription}
                      className="gap-2"
                    >
                      {isTranslatingDescription ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4" />
                      )}
                      {language === "ja" ? "自動翻訳" : "Auto Translate"}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-muted-foreground">
                        English
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe your dojo..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_ja" className="text-muted-foreground">
                        日本語
                      </Label>
                      <Textarea
                        id="description_ja"
                        value={formData.description_ja}
                        onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                        placeholder="道場について説明してください..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_pt" className="text-muted-foreground">
                        Português
                      </Label>
                      <Textarea
                        id="description_pt"
                        value={formData.description_pt}
                        onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                        placeholder="Descreva seu dojo..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {language === "ja" 
                      ? "💡 1つの言語で入力し、「自動翻訳」ボタンをクリックすると、他の言語に翻訳されます"
                      : "💡 Enter in one language and click 'Auto Translate' to fill other languages"}
                  </p>
                </div>

                {/* Contact Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {language === "ja" ? "連絡先情報" : language === "pt" ? "Informações de Contato" : "Contact Information"}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        {language === "ja" ? "電話番号" : language === "pt" ? "Telefone" : "Phone"}
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+81-3-1234-5678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        {language === "ja" ? "メールアドレス" : language === "pt" ? "E-mail" : "Email"}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="info@example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {language === "ja" ? "ソーシャルメディア" : language === "pt" ? "Redes Sociais" : "Social Media"}
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">
                        {language === "ja" ? "ウェブサイト" : language === "pt" ? "Site" : "Website"}
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">
                        {language === "ja" ? "Instagram" : "Instagram"}
                      </Label>
                      <Input
                        id="instagram"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        placeholder="https://instagram.com/yourdojo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facebook">
                        {language === "ja" ? "Facebook" : "Facebook"}
                      </Label>
                      <Input
                        id="facebook"
                        value={formData.facebook}
                        onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                        placeholder="https://facebook.com/yourdojo"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dojos")}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {language === "ja" ? "キャンセル" : language === "pt" ? "Cancelar" : "Cancel"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSubmitting
                      ? (language === "ja" ? "登録中..." : language === "pt" ? "Salvando..." : "Submitting...")
                      : (language === "ja" ? "登録する" : language === "pt" ? "Salvar" : "Submit")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
