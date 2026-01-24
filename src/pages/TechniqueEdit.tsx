import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Languages, Loader2, Check, Eye, Tags, BookOpen, Film, Hash, FolderOpen, ChevronDown, Save } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useUpdateTechnique,
  useCreateTechnique,
  type Technique
} from "@/hooks/usePaginatedTechniques";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUpload } from "@/contexts/UploadContext";
import { NotationSelector } from "@/components/admin/NotationSelector";

// セクションコンポーネント
const FormSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base font-medium">
        {icon}
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

const TechniqueEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { startCloudflareUpload } = useUpload();
  
  const [isLoading, setIsLoading] = useState(true);
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAutoTranslatingName, setIsAutoTranslatingName] = useState(false);
  const [isAutoTranslatingDesc, setIsAutoTranslatingDesc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [descriptionTab, setDescriptionTab] = useState<"ja" | "en" | "pt">("ja");
  const [hashtagInput, setHashtagInput] = useState("");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    category: "",
    hashtags: [] as string[],
    series_name: "",
    series_order: null as number | null,
    series_prefix: "",
    visibility: "public" as "public" | "unlisted" | "private",
  });

  const updateTechnique = useUpdateTechnique();
  const createTechnique = useCreateTechnique();

  // Fetch technique data
  useEffect(() => {
    const fetchTechnique = async () => {
      if (id === 'new') {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('techniques')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        setTechnique(data);
        setFormData({
          name: data.name || "",
          name_ja: data.name_ja || "",
          name_pt: data.name_pt || "",
          description: data.description || "",
          description_ja: data.description_ja || "",
          description_pt: data.description_pt || "",
          category: data.category || "",
          hashtags: data.hashtags || [],
          series_name: data.series_name || "",
          series_order: data.series_order,
          series_prefix: data.series_prefix || "",
          visibility: (data as any).visibility || "public",
        });
      } catch (error) {
        console.error('Error fetching technique:', error);
        toast.error('技術の取得に失敗しました');
        navigate('/admin/techniques');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('techniques')
        .select('category');
      
      if (!error && data) {
        const uniqueCategories = Array.from(new Set(data.map(item => item.category)));
        setAvailableCategories(uniqueCategories.sort());
      }
    };

    fetchTechnique();
    fetchCategories();
  }, [id, navigate]);

  const handleVideoUpload = async (file: File, techniqueId?: string) => {
    try {
      const result = await startCloudflareUpload(file, techniqueId || 'new');
      return result;
    } catch (error) {
      console.error("Video upload error:", error);
      throw error;
    }
  };

  const autoTranslateName = async () => {
    if (!formData.name_ja || formData.name_ja.length < 2) return;
    if (formData.name && formData.name_pt) return;
    
    setIsAutoTranslatingName(true);
    try {
      const targetLangs = [];
      if (!formData.name) targetLangs.push('en');
      if (!formData.name_pt) targetLangs.push('pt');
      
      for (const lang of targetLangs) {
        const { data, error } = await supabase.functions.invoke('translate-text', {
          body: { text: formData.name_ja, targetLang: lang }
        });
        
        if (!error && data?.translatedText) {
          if (lang === 'en') {
            setFormData(prev => ({ ...prev, name: data.translatedText }));
          } else if (lang === 'pt') {
            setFormData(prev => ({ ...prev, name_pt: data.translatedText }));
          }
        }
      }
    } catch (error) {
      console.error('Auto translate error:', error);
    } finally {
      setIsAutoTranslatingName(false);
    }
  };

  const autoTranslateDescription = async () => {
    if (!formData.description_ja || formData.description_ja.length < 5) return;
    if (formData.description && formData.description_pt) return;
    
    setIsAutoTranslatingDesc(true);
    try {
      const targetLangs = [];
      if (!formData.description) targetLangs.push('en');
      if (!formData.description_pt) targetLangs.push('pt');
      
      for (const lang of targetLangs) {
        const { data, error } = await supabase.functions.invoke('translate-text', {
          body: { text: formData.description_ja, targetLang: lang }
        });
        
        if (!error && data?.translatedText) {
          if (lang === 'en') {
            setFormData(prev => ({ ...prev, description: data.translatedText }));
          } else if (lang === 'pt') {
            setFormData(prev => ({ ...prev, description_pt: data.translatedText }));
          }
        }
      }
    } catch (error) {
      console.error('Auto translate error:', error);
    } finally {
      setIsAutoTranslatingDesc(false);
    }
  };

  const handleTranslate = async () => {
    if (!formData.name_ja.trim()) return;
    
    setIsTranslating(true);
    try {
      const { data: enData, error: enError } = await supabase.functions.invoke('translate-technique', {
        body: { 
          text: `Name: ${formData.name_ja}\nDescription: ${formData.description_ja || ''}`,
          targetLang: 'en'
        }
      });

      if (enError) throw enError;

      const { data: ptData, error: ptError } = await supabase.functions.invoke('translate-technique', {
        body: { 
          text: `Name: ${formData.name_ja}\nDescription: ${formData.description_ja || ''}`,
          targetLang: 'pt'
        }
      });

      if (ptError) throw ptError;

      const parseTranslation = (text: string) => {
        const lines = text.split('\n');
        const name = lines.find(l => l.startsWith('Name:'))?.replace('Name:', '').trim() || '';
        const description = lines.find(l => l.startsWith('Description:'))?.replace('Description:', '').trim() || '';
        return { name, description };
      };

      if (enData?.translatedText) {
        const en = parseTranslation(enData.translatedText);
        setFormData(prev => ({
          ...prev,
          name: en.name || prev.name,
          description: en.description || prev.description,
        }));
      }

      if (ptData?.translatedText) {
        const pt = parseTranslation(ptData.translatedText);
        setFormData(prev => ({
          ...prev,
          name_pt: pt.name || prev.name_pt,
          description_pt: pt.description || prev.description_pt,
        }));
      }
      
      toast.success("翻訳完了");
    } catch (error) {
      console.error('Translation error:', error);
      toast.error("翻訳エラー");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name_ja) {
      toast.error('日本語の技術名を入力してください');
      return;
    }

    setIsSaving(true);
    
    try {
      let videoUrl = technique?.video_url;
      let videoUrlJa = technique?.video_url_ja;
      let thumbnailUrl = technique?.thumbnail_url;
      let thumbnailUrlJa = technique?.thumbnail_url_ja;
      let videoMetadata = technique?.video_metadata;
      
      if (videoFile) {
        const result = await handleVideoUpload(videoFile, technique?.id);
        videoUrl = result.videoUrl;
        videoUrlJa = result.videoUrl;
        thumbnailUrl = result.thumbnailUrl;
        thumbnailUrlJa = result.thumbnailUrl;
        
        const currentMetadata = (technique?.video_metadata as Record<string, any>) || {};
        videoMetadata = {
          ...currentMetadata,
          ja: {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            video_url: result.videoUrl,
          }
        };
      }

      const techniqueData = {
        ...formData,
        video_url: videoUrl,
        video_url_ja: videoUrlJa,
        thumbnail_url: thumbnailUrl,
        thumbnail_url_ja: thumbnailUrlJa,
        video_metadata: videoMetadata,
        display_order: technique?.display_order || 0,
        hashtags: formData.hashtags,
      };

      if (technique) {
        await updateTechnique.mutateAsync({
          ...techniqueData,
          id: technique.id,
        });
        toast.success("技術を更新しました");
      } else {
        await createTechnique.mutateAsync(techniqueData);
        toast.success("技術を作成しました");
      }

      navigate('/admin/techniques');
    } catch (error) {
      console.error('Error saving technique:', error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  const isNew = id === 'new';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/techniques')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {isNew ? '新規技術追加' : '技術編集'}
            </h1>
            {technique && (
              <p className="text-sm text-muted-foreground mt-1">
                {technique.name_ja}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <FormSection icon={<Languages className="h-4 w-4" />} title="基本情報（日本語入力必須）">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                🇯🇵 技術名（日本語）*
                {isAutoTranslatingName && <Loader2 className="h-3 w-3 animate-spin" />}
              </label>
              <Input
                value={formData.name_ja}
                onChange={(e) => setFormData({...formData, name_ja: e.target.value})}
                onBlur={autoTranslateName}
                placeholder="日本語で技術名を入力（必須）"
                required
                disabled={!isAdmin}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">
                保存時に英語・ポルトガル語が空の場合は自動翻訳されます
              </p>
            </div>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    他言語の翻訳を確認・編集
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    🇺🇸 English Name
                    {isAutoTranslatingName && <Loader2 className="h-3 w-3 animate-spin" />}
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder={isAutoTranslatingName ? "翻訳中..." : "空欄時は保存時に自動翻訳"}
                    disabled={!isAdmin || isAutoTranslatingName}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    🇧🇷 Nome em Português
                    {isAutoTranslatingName && <Loader2 className="h-3 w-3 animate-spin" />}
                  </label>
                  <Input
                    value={formData.name_pt}
                    onChange={(e) => setFormData({...formData, name_pt: e.target.value})}
                    placeholder={isAutoTranslatingName ? "翻訳中..." : "空欄時は保存時に自動翻訳"}
                    disabled={!isAdmin || isAutoTranslatingName}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div>
              <label className="text-sm font-medium">公開設定</label>
              <Select
                value={formData.visibility}
                onValueChange={(value: "public" | "unlisted" | "private") => setFormData({ ...formData, visibility: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>🌍 一般公開</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="unlisted">
                    <div className="flex items-center gap-2">
                      <span>🔗 限定公開</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <span>🔒 非公開</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormSection>

          {/* 略称セクション（編集時のみ） */}
          {technique && (
            <FormSection icon={<Tags className="h-4 w-4" />} title="略称（技術分類 - 複数選択可）">
              <div className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-medium mb-3">現在紐付けられている略称:</p>
                  <NotationSelector techniqueId={technique.id} />
                </div>
                <p className="text-xs text-muted-foreground">
                  ポップオーバーから略称を検索・追加できます。位置（CG, HG等）、アクション（SW, PS等）、サブミッション等を組み合わせて技術を分類してください。
                </p>
              </div>
            </FormSection>
          )}

          {/* 説明 */}
          <FormSection icon={<BookOpen className="h-4 w-4" />} title="説明">
            <Tabs value={descriptionTab} onValueChange={(v) => setDescriptionTab(v as "ja" | "en" | "pt")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ja" className="flex items-center gap-1">
                  🇯🇵 日本語
                  {isAutoTranslatingDesc && <Loader2 className="h-3 w-3 animate-spin" />}
                </TabsTrigger>
                <TabsTrigger value="en">🇺🇸 English</TabsTrigger>
                <TabsTrigger value="pt">🇧🇷 Português</TabsTrigger>
              </TabsList>
              <TabsContent value="ja" className="mt-3">
                <Textarea
                  value={formData.description_ja}
                  onChange={(e) => setFormData({...formData, description_ja: e.target.value})}
                  onBlur={autoTranslateDescription}
                  placeholder="日本語で入力すると自動翻訳されます"
                  rows={6}
                  disabled={!isAdmin}
                />
              </TabsContent>
              <TabsContent value="en" className="mt-3">
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder={isAutoTranslatingDesc ? "翻訳中..." : "English description"}
                  rows={6}
                  disabled={!isAdmin || isAutoTranslatingDesc}
                />
              </TabsContent>
              <TabsContent value="pt" className="mt-3">
                <Textarea
                  value={formData.description_pt}
                  onChange={(e) => setFormData({...formData, description_pt: e.target.value})}
                  placeholder={isAutoTranslatingDesc ? "翻訳中..." : "Descrição em português"}
                  rows={6}
                  disabled={!isAdmin || isAutoTranslatingDesc}
                />
              </TabsContent>
            </Tabs>
          </FormSection>

          {/* 動画 */}
          {isAdmin && (
            <FormSection icon={<Film className="h-4 w-4" />} title="動画">
              <div className="space-y-3">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
                {technique?.video_url && !videoFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    現在の動画はアップロード済みです
                  </div>
                )}
              </div>
            </FormSection>
          )}

          {/* ハッシュタグ */}
          <FormSection icon={<Hash className="h-4 w-4" />} title="ハッシュタグ">
            {isAdmin && (
              <div className="flex gap-2">
                <Input
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const tag = hashtagInput.trim().replace(/^#/, '');
                      if (tag && !formData.hashtags.includes(tag)) {
                        setFormData({ ...formData, hashtags: [...formData.hashtags, tag] });
                        setHashtagInput("");
                      }
                    }
                  }}
                  placeholder="ハッシュタグを入力してEnter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const tag = hashtagInput.trim().replace(/^#/, '');
                    if (tag && !formData.hashtags.includes(tag)) {
                      setFormData({ ...formData, hashtags: [...formData.hashtags, tag] });
                      setHashtagInput("");
                    }
                  }}
                >
                  追加
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {formData.hashtags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <span>#{tag}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          hashtags: formData.hashtags.filter((t) => t !== tag),
                        });
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  )}
                </Badge>
              ))}
              {formData.hashtags.length === 0 && (
                <span className="text-sm text-muted-foreground">ハッシュタグがありません</span>
              )}
            </div>
          </FormSection>

          {/* 旧設定セクション */}
          {technique && (formData.category || formData.series_name) && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground border border-dashed">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    ⚠️ 旧設定（カテゴリ/シリーズ）- 後日削除予定
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <Card className="border-dashed">
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ これらは旧システムの設定です。今後は「略称」による分類がメインになります。
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">カテゴリ:</span>
                        <p className="font-medium">{formData.category || "未設定"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">シリーズ:</span>
                        <p className="font-medium">
                          {formData.series_name 
                            ? `${formData.series_name} (${formData.series_prefix || "?"}${formData.series_order || "?"})`
                            : "未設定"
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* フッター */}
          <div className="flex justify-between items-center pt-4 border-t sticky bottom-0 bg-background pb-4">
            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleTranslate}
                disabled={isTranslating || !formData.name_ja}
              >
                <Languages className="h-4 w-4 mr-1" />
                {isTranslating ? "翻訳中..." : "翻訳実行"}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/admin/techniques')}
              >
                キャンセル
              </Button>
              {isAdmin && (
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isNew ? '作成' : '更新'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TechniqueEdit;
