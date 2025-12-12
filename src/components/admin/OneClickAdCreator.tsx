import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Sparkles, 
  Rocket, 
  Loader2, 
  CheckCircle2, 
  Copy, 
  RefreshCw,
  Zap,
  Target,
  PenTool,
  Settings2
} from "lucide-react";

interface GeneratedAdContent {
  headlines: string[];
  descriptions: string[];
  callToActions: string[];
  keywords: string[];
  targetingHints: string[];
}

interface AdFormData {
  productName: string;
  productDescription: string;
  targetAudience: string;
  platform: 'google' | 'meta';
  objective: string;
  tone: string;
  dailyBudget: string;
  campaignName: string;
}

export function OneClickAdCreator() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'input' | 'preview' | 'publish'>('input');
  const [formData, setFormData] = useState<AdFormData>({
    productName: '',
    productDescription: '',
    targetAudience: '',
    platform: 'google',
    objective: 'OUTCOME_TRAFFIC',
    tone: 'professional',
    dailyBudget: '1000',
    campaignName: '',
  });
  const [generatedContent, setGeneratedContent] = useState<GeneratedAdContent | null>(null);
  const [selectedHeadline, setSelectedHeadline] = useState<number>(0);
  const [selectedDescription, setSelectedDescription] = useState<number>(0);

  // AI広告コンテンツ生成
  const generateContent = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-ad-content', {
        body: {
          productName: formData.productName,
          productDescription: formData.productDescription,
          targetAudience: formData.targetAudience,
          platform: formData.platform,
          objective: formData.objective,
          tone: formData.tone,
          language: 'ja',
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.data as GeneratedAdContent;
    },
    onSuccess: (data) => {
      setGeneratedContent(data);
      setFormData(prev => ({
        ...prev,
        campaignName: `${formData.productName} - ${new Date().toLocaleDateString('ja-JP')}`
      }));
      setStep('preview');
      toast.success('広告コンテンツを生成しました');
    },
    onError: (error: Error) => {
      toast.error(`生成に失敗しました: ${error.message}`);
    },
  });

  // キャンペーン作成（Google）
  const createGoogleCampaign = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-ads-api', {
        body: {
          action: 'createCampaign',
          data: {
            name: formData.campaignName,
            dailyBudget: parseFloat(formData.dailyBudget),
            channelType: 'SEARCH',
          }
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Google Adsキャンペーンを作成しました！');
      queryClient.invalidateQueries({ queryKey: ['google-ads-campaigns'] });
      setStep('publish');
    },
    onError: (error: Error) => {
      toast.error(`キャンペーン作成に失敗しました: ${error.message}`);
    },
  });

  // キャンペーン作成（Meta）
  const createMetaCampaign = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-api', {
        body: {
          action: 'createCampaign',
          data: {
            name: formData.campaignName,
            objective: formData.objective,
            dailyBudget: parseFloat(formData.dailyBudget),
            status: 'PAUSED',
          }
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Meta Adsキャンペーンを作成しました！');
      queryClient.invalidateQueries({ queryKey: ['meta-ads-campaigns'] });
      setStep('publish');
    },
    onError: (error: Error) => {
      toast.error(`キャンペーン作成に失敗しました: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!formData.productName || !formData.productDescription || !formData.targetAudience) {
      toast.error('すべての必須項目を入力してください');
      return;
    }
    generateContent.mutate();
  };

  const handlePublish = () => {
    if (formData.platform === 'google') {
      createGoogleCampaign.mutate();
    } else {
      createMetaCampaign.mutate();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('クリップボードにコピーしました');
  };

  const resetForm = () => {
    setStep('input');
    setGeneratedContent(null);
    setFormData({
      productName: '',
      productDescription: '',
      targetAudience: '',
      platform: 'google',
      objective: 'OUTCOME_TRAFFIC',
      tone: 'professional',
      dailyBudget: '1000',
      campaignName: '',
    });
  };

  const isPending = generateContent.isPending || createGoogleCampaign.isPending || createMetaCampaign.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-light">ワンクリック広告出稿</h2>
            <p className="text-sm text-muted-foreground">AIが広告コピーを生成し、即座に出稿</p>
          </div>
        </div>
        {step !== 'input' && (
          <Button variant="outline" onClick={resetForm}>
            <RefreshCw className="h-4 w-4 mr-2" />
            最初から
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {[
          { key: 'input', label: '情報入力', icon: PenTool },
          { key: 'preview', label: 'プレビュー', icon: Target },
          { key: 'publish', label: '出稿完了', icon: Rocket },
        ].map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
              step === s.key 
                ? 'bg-primary text-primary-foreground' 
                : ['input', 'preview', 'publish'].indexOf(step) > index
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            }`}>
              <s.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            {index < 2 && (
              <div className={`w-12 h-0.5 mx-2 ${
                ['input', 'preview', 'publish'].indexOf(step) > index
                  ? 'bg-primary'
                  : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Input */}
      {step === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              広告情報を入力
            </CardTitle>
            <CardDescription>
              商品・サービスの情報を入力すると、AIが最適な広告コピーを生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>商品・サービス名 *</Label>
                  <Input
                    value={formData.productName}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="例: JiuFlow プレミアムプラン"
                  />
                </div>

                <div className="space-y-2">
                  <Label>商品・サービスの説明 *</Label>
                  <Textarea
                    value={formData.productDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
                    placeholder="例: 柔術の技術動画が見放題。プロの技を学んで上達しよう。"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ターゲット層 *</Label>
                  <Textarea
                    value={formData.targetAudience}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                    placeholder="例: 20-40代の格闘技・柔術に興味がある男女"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>広告プラットフォーム</Label>
                  <Select 
                    value={formData.platform} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, platform: v as 'google' | 'meta' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Ads</SelectItem>
                      <SelectItem value="meta">Meta Ads (Facebook/Instagram)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>キャンペーン目的</Label>
                  <Select 
                    value={formData.objective} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, objective: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OUTCOME_TRAFFIC">トラフィック（サイト訪問）</SelectItem>
                      <SelectItem value="OUTCOME_AWARENESS">認知度向上</SelectItem>
                      <SelectItem value="OUTCOME_ENGAGEMENT">エンゲージメント</SelectItem>
                      <SelectItem value="OUTCOME_LEADS">リード獲得</SelectItem>
                      <SelectItem value="OUTCOME_SALES">売上・コンバージョン</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>広告のトーン</Label>
                  <Select 
                    value={formData.tone} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">プロフェッショナル</SelectItem>
                      <SelectItem value="casual">カジュアル・親しみやすい</SelectItem>
                      <SelectItem value="urgent">緊急・限定感</SelectItem>
                      <SelectItem value="inspirational">インスピレーション</SelectItem>
                      <SelectItem value="humorous">ユーモア</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>日予算（円）</Label>
                  <Input
                    type="number"
                    value={formData.dailyBudget}
                    onChange={(e) => setFormData(prev => ({ ...prev, dailyBudget: e.target.value }))}
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                size="lg" 
                onClick={handleGenerate}
                disabled={isPending}
              >
                {generateContent.isPending ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5 mr-2" />
                )}
                AIで広告コピーを生成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && generatedContent && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                生成された広告コンテンツ
              </CardTitle>
              <CardDescription>
                AIが生成したコンテンツを確認・編集してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="headlines" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="headlines">ヘッドライン</TabsTrigger>
                  <TabsTrigger value="descriptions">説明文</TabsTrigger>
                  <TabsTrigger value="keywords">キーワード</TabsTrigger>
                  <TabsTrigger value="targeting">ターゲティング</TabsTrigger>
                </TabsList>

                <TabsContent value="headlines" className="space-y-3">
                  {generatedContent.headlines.map((headline, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedHeadline === index 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedHeadline(index)}
                    >
                      <div className="flex items-center gap-3">
                        {selectedHeadline === index && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                        <span className={selectedHeadline === index ? 'font-medium' : ''}>{headline}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(headline); }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="descriptions" className="space-y-3">
                  {generatedContent.descriptions.map((desc, index) => (
                    <div 
                      key={index}
                      className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedDescription === index 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedDescription(index)}
                    >
                      <div className="flex items-start gap-3">
                        {selectedDescription === index && (
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                        )}
                        <span className={selectedDescription === index ? 'font-medium' : ''}>{desc}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(desc); }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="keywords" className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {generatedContent.keywords.map((keyword, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => copyToClipboard(keyword)}
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">クリックでコピー</p>
                </TabsContent>

                <TabsContent value="targeting" className="space-y-3">
                  <div className="space-y-2">
                    {generatedContent.targetingHints.map((hint, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{hint}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Campaign Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                キャンペーン設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>キャンペーン名</Label>
                  <Input
                    value={formData.campaignName}
                    onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
                    placeholder="キャンペーン名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>日予算</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.dailyBudget}
                      onChange={(e) => setFormData(prev => ({ ...prev, dailyBudget: e.target.value }))}
                    />
                    <span className="text-muted-foreground">円/日</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{formData.platform === 'google' ? 'Google Ads' : 'Meta Ads'}</Badge>
                  <Badge variant="secondary">一時停止状態で作成</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  キャンペーンは一時停止状態で作成されます。広告の詳細設定後に配信を開始してください。
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('input')}>
              戻る
            </Button>
            <Button 
              size="lg" 
              onClick={handlePublish}
              disabled={isPending}
            >
              {(createGoogleCampaign.isPending || createMetaCampaign.isPending) ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-5 w-5 mr-2" />
              )}
              ワンクリックで出稿
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 'publish' && (
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div className="inline-flex p-4 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">キャンペーンを作成しました！</h3>
              <p className="text-muted-foreground">
                キャンペーンは一時停止状態で作成されました。<br />
                広告管理画面で詳細を設定し、配信を開始してください。
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={resetForm}>
                新しい広告を作成
              </Button>
              <Button onClick={() => window.location.reload()}>
                広告管理に戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
