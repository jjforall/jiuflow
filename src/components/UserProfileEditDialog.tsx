import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Upload, X } from "lucide-react";

interface UserProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export const UserProfileEditDialog = ({ open, onOpenChange, userId, onSuccess }: UserProfileEditDialogProps) => {
  const { language } = useLanguage();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const [education, setEducation] = useState<Array<{school: string; degree?: string; period?: string}>>([]);
  const [workExperience, setWorkExperience] = useState<Array<{company: string; position: string; period?: string; description?: string}>>([]);
  const [titles, setTitles] = useState<Array<{title: string; rank?: string; organization?: string; customTitle?: string; weight_class?: string}>>([]);
  const [favoriteTechniques, setFavoriteTechniques] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [organizations, setOrganizations] = useState<Array<{id: string; name: string; name_ja: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadProfile();
      loadOrganizations();
    }
  }, [open, userId]);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, name_ja')
        .order('name_ja');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, username, education, work_experience, titles, organization_id, favorite_techniques')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setDisplayName(data?.display_name || "");
      setBio(data?.bio || "");
      setAvatarUrl(data?.avatar_url || "");
      setUsername(data?.username || "");
      setEducation((data?.education as any) || []);
      setWorkExperience((data?.work_experience as any) || []);
      setTitles((data?.titles as any) || []);
      setOrganizationId(data?.organization_id || "");
      setFavoriteTechniques((data?.favorite_techniques as string[]) || []);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === "ja" ? "画像は2MB以下にしてください" : "Image must be less than 2MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === "ja" ? "画像ファイルを選択してください" : "Please select an image file");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-videos')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success(language === "ja" ? "画像をアップロードしました" : "Image uploaded");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(language === "ja" ? "アップロードに失敗しました" : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if username is taken (if changed)
      if (username.trim()) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim())
          .neq('id', userId)
          .maybeSingle();

        if (existingUser) {
          toast.error(language === "ja" ? "このURLは既に使用されています" : "This URL is already taken");
          setIsLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          username: username.trim() || null,
          education: education.filter(e => e.school.trim()),
          work_experience: workExperience.filter(w => w.company.trim() && w.position.trim()),
          titles: titles.filter(t => (t.title && t.title !== "custom") || (t.title === "custom" && t.customTitle?.trim())),
          organization_id: organizationId || null,
          favorite_techniques: favoriteTechniques.filter(t => t.trim()),
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(language === "ja" ? "プロフィールを更新しました" : "Profile updated");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(language === "ja" ? "更新に失敗しました" : "Update failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {language === "ja" ? "プロフィール編集" : "Edit Profile"}
          </DialogTitle>
          <DialogDescription>
            {language === "ja" 
              ? "公開プロフィールに表示される情報を編集します" 
              : "Edit information shown on your public profile"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="space-y-2">
            <Label>
              {language === "ja" ? "プロフィール画像" : "Profile Picture"}
            </Label>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <div className="relative">
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {language === "ja" ? "2MB以下のJPG, PNG, GIF" : "JPG, PNG, GIF up to 2MB"}
                </p>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">
              {language === "ja" ? "表示名" : "Display Name"}
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={language === "ja" ? "山田太郎" : "John Doe"}
              maxLength={50}
            />
          </div>

          {/* Username (Custom URL) */}
          <div className="space-y-2">
            <Label htmlFor="username">
              {language === "ja" ? "カスタムURL" : "Custom URL"}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {window.location.origin}/
              </span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder={language === "ja" ? "your-username" : "your-username"}
                maxLength={30}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {language === "ja" 
                ? "英数字、ハイフン、アンダースコアのみ使用可能" 
                : "Only lowercase letters, numbers, hyphens and underscores"}
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">
              {language === "ja" ? "自己紹介" : "Bio"}
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={language === "ja" 
                ? "柔術歴や得意な技について書いてください..." 
                : "Write about your BJJ journey..."}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/500
            </p>
          </div>

          {/* Education Section */}
          <div className="space-y-2">
            <Label>
              {language === "ja" ? "学歴" : "Education"}
            </Label>
            {education.map((edu, index) => (
              <div key={index} className="space-y-2 p-3 border border-border rounded-md">
                <Input
                  placeholder={language === "ja" ? "学校名（例：東京理科大学 理工学部）" : "School name"}
                  value={edu.school}
                  onChange={(e) => {
                    const newEducation = [...education];
                    newEducation[index].school = e.target.value;
                    setEducation(newEducation);
                  }}
                />
                <Input
                  placeholder={language === "ja" ? "学位・専攻（任意）" : "Degree/Major (optional)"}
                  value={edu.degree || ""}
                  onChange={(e) => {
                    const newEducation = [...education];
                    newEducation[index].degree = e.target.value;
                    setEducation(newEducation);
                  }}
                />
                <Input
                  placeholder={language === "ja" ? "期間（任意、例：2010年 - 2014年）" : "Period (optional)"}
                  value={edu.period || ""}
                  onChange={(e) => {
                    const newEducation = [...education];
                    newEducation[index].period = e.target.value;
                    setEducation(newEducation);
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newEducation = education.filter((_, i) => i !== index);
                    setEducation(newEducation);
                  }}
                >
                  {language === "ja" ? "削除" : "Remove"}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setEducation([...education, { school: "" }])}
            >
              {language === "ja" ? "学歴を追加" : "Add Education"}
            </Button>
          </div>

          {/* Work Experience Section */}
          <div className="space-y-2">
            <Label>
              {language === "ja" ? "職歴" : "Work Experience"}
            </Label>
            {workExperience.map((work, index) => (
              <div key={index} className="space-y-2 p-3 border border-border rounded-md">
                <Input
                  placeholder={language === "ja" ? "会社名（例：株式会社メルカリ）" : "Company name"}
                  value={work.company}
                  onChange={(e) => {
                    const newWork = [...workExperience];
                    newWork[index].company = e.target.value;
                    setWorkExperience(newWork);
                  }}
                />
                <Input
                  placeholder={language === "ja" ? "役職（例：取締役）" : "Position"}
                  value={work.position}
                  onChange={(e) => {
                    const newWork = [...workExperience];
                    newWork[index].position = e.target.value;
                    setWorkExperience(newWork);
                  }}
                />
                <Input
                  placeholder={language === "ja" ? "期間（任意、例：2014年12月 - 2021年7月）" : "Period (optional)"}
                  value={work.period || ""}
                  onChange={(e) => {
                    const newWork = [...workExperience];
                    newWork[index].period = e.target.value;
                    setWorkExperience(newWork);
                  }}
                />
                <Textarea
                  placeholder={language === "ja" ? "説明（任意）" : "Description (optional)"}
                  value={work.description || ""}
                  rows={2}
                  onChange={(e) => {
                    const newWork = [...workExperience];
                    newWork[index].description = e.target.value;
                    setWorkExperience(newWork);
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newWork = workExperience.filter((_, i) => i !== index);
                    setWorkExperience(newWork);
                  }}
                >
                  {language === "ja" ? "削除" : "Remove"}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setWorkExperience([...workExperience, { company: "", position: "" }])}
            >
              {language === "ja" ? "職歴を追加" : "Add Work Experience"}
            </Button>
          </div>

          {/* Titles Section */}
          <div className="space-y-2">
            <Label>
              {language === "ja" ? "タイトル・実績" : "Titles & Achievements"}
            </Label>
            {titles.map((titleItem, index) => (
              <div key={index} className="space-y-2 p-3 border border-border rounded-md bg-muted/20">
                <select
                  value={titleItem.title || ""}
                  onChange={(e) => {
                    const newTitles = [...titles];
                    newTitles[index].title = e.target.value;
                    setTitles(newTitles);
                  }}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="">{language === "ja" ? "大会を選択" : "Select Tournament"}</option>
                  <option value="世界柔術選手権">{language === "ja" ? "世界柔術選手権（ムンジアル）" : "World Championship (Mundials)"}</option>
                  <option value="パンアメリカン選手権">{language === "ja" ? "パンアメリカン選手権" : "Pan American Championship"}</option>
                  <option value="ヨーロピアン選手権">{language === "ja" ? "ヨーロピアン選手権" : "European Championship"}</option>
                  <option value="アジア選手権">{language === "ja" ? "アジア選手権" : "Asian Championship"}</option>
                  <option value="全日本柔術選手権">{language === "ja" ? "全日本柔術選手権" : "All Japan Championship"}</option>
                  <option value="ADCC">{language === "ja" ? "ADCC世界選手権" : "ADCC World Championship"}</option>
                  <option value="アブダビプロ">{language === "ja" ? "アブダビプロ" : "Abu Dhabi Pro"}</option>
                  <option value="custom">{language === "ja" ? "カスタム" : "Custom"}</option>
                </select>

                {titleItem.title === "custom" && (
                  <Input
                    placeholder={language === "ja" ? "カスタムタイトル名（例：東京大会 優勝）" : "Custom title name"}
                    value={titleItem.customTitle || ""}
                    onChange={(e) => {
                      const newTitles = [...titles];
                      newTitles[index].customTitle = e.target.value;
                      setTitles(newTitles);
                    }}
                  />
                )}

                <Input
                  placeholder={language === "ja" ? "主催団体（任意、例：IBJJF）" : "Organization (optional, e.g. IBJJF)"}
                  value={titleItem.organization || ""}
                  onChange={(e) => {
                    const newTitles = [...titles];
                    newTitles[index].organization = e.target.value;
                    setTitles(newTitles);
                  }}
                />

                <select
                  value={titleItem.rank || ""}
                  onChange={(e) => {
                    const newTitles = [...titles];
                    newTitles[index].rank = e.target.value;
                    setTitles(newTitles);
                  }}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="">{language === "ja" ? "順位を選択（任意）" : "Select Rank (optional)"}</option>
                  <option value="優勝">{language === "ja" ? "優勝" : "Champion"}</option>
                  <option value="準優勝">{language === "ja" ? "準優勝" : "Runner-up"}</option>
                  <option value="3位">{language === "ja" ? "3位" : "3rd Place"}</option>
                  <option value="ベスト8">{language === "ja" ? "ベスト8" : "Quarter-finalist"}</option>
                  <option value="ベスト16">{language === "ja" ? "ベスト16" : "Round of 16"}</option>
                </select>

                <select
                  value={titleItem.weight_class || ""}
                  onChange={(e) => {
                    const newTitles = [...titles];
                    newTitles[index].weight_class = e.target.value;
                    setTitles(newTitles);
                  }}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="">{language === "ja" ? "階級を選択（任意）" : "Select Weight Class (optional)"}</option>
                  <option value="ルースター">{language === "ja" ? "ルースター" : "Rooster"}</option>
                  <option value="ライトフェザー">{language === "ja" ? "ライトフェザー" : "Light Feather"}</option>
                  <option value="フェザー">{language === "ja" ? "フェザー" : "Feather"}</option>
                  <option value="ライト">{language === "ja" ? "ライト" : "Light"}</option>
                  <option value="ミディアム">{language === "ja" ? "ミディアム" : "Medium"}</option>
                  <option value="ミディアムヘビー">{language === "ja" ? "ミディアムヘビー" : "Medium Heavy"}</option>
                  <option value="ヘビー">{language === "ja" ? "ヘビー" : "Heavy"}</option>
                  <option value="スーパーヘビー">{language === "ja" ? "スーパーヘビー" : "Super Heavy"}</option>
                  <option value="ウルトラヘビー">{language === "ja" ? "ウルトラヘビー" : "Ultra Heavy"}</option>
                  <option value="オープンクラス">{language === "ja" ? "オープンクラス" : "Absolute"}</option>
                </select>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newTitles = titles.filter((_, i) => i !== index);
                    setTitles(newTitles);
                  }}
                >
                  {language === "ja" ? "削除" : "Remove"}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setTitles([...titles, { title: "", customTitle: "" }])}
            >
              {language === "ja" ? "タイトルを追加" : "Add Title"}
            </Button>
          </div>

          {/* Favorite Techniques Section */}
          <div className="space-y-2">
            <Label>
              {language === "ja" ? "好きな技" : "Favorite Techniques"}
            </Label>
            {favoriteTechniques.map((technique, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={language === "ja" ? "技名（例：三角絞め）" : "Technique name (e.g. Triangle Choke)"}
                  value={technique}
                  onChange={(e) => {
                    const newTechniques = [...favoriteTechniques];
                    newTechniques[index] = e.target.value;
                    setFavoriteTechniques(newTechniques);
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    const newTechniques = favoriteTechniques.filter((_, i) => i !== index);
                    setFavoriteTechniques(newTechniques);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setFavoriteTechniques([...favoriteTechniques, ""])}
            >
              {language === "ja" ? "技を追加" : "Add Technique"}
            </Button>
          </div>

          {/* Organization Section */}
          <div className="space-y-2">
            <Label htmlFor="organization">
              {language === "ja" ? "所属団体" : "Organization"}
            </Label>
            <select
              id="organization"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">
                {language === "ja" ? "選択してください" : "Select organization"}
              </option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {language === "ja" ? org.name_ja : org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {language === "ja" ? "キャンセル" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? (language === "ja" ? "更新中..." : "Updating...") 
                : (language === "ja" ? "更新" : "Update")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
