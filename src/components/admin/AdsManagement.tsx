import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Eye, 
  MousePointerClick, 
  Target,
  RefreshCw,
  Pause,
  Play,
  ExternalLink,
  BarChart3,
  Loader2,
  Plus
} from "lucide-react";

type DateRange = 'today' | 'last7days' | 'last30days' | 'thisMonth';

interface GoogleCampaign {
  campaign: {
    id: string;
    name: string;
    status: string;
    advertisingChannelType: string;
  };
  campaignBudget?: {
    amountMicros: string;
  };
  metrics: {
    impressions: string;
    clicks: string;
    costMicros: string;
    conversions: number;
    conversionsValue: number;
  };
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: {
    data: Array<{
      impressions: string;
      clicks: string;
      spend: string;
      reach: string;
      cpc: string;
      ctr: string;
    }>;
  };
}

const formatCurrency = (amount: number, currency: string = 'JPY') => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ja-JP').format(num);
};

const getStatusBadge = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'enabled' || statusLower === 'active') {
    return <Badge className="bg-green-500">配信中</Badge>;
  } else if (statusLower === 'paused') {
    return <Badge variant="secondary">一時停止</Badge>;
  } else {
    return <Badge variant="outline">{status}</Badge>;
  }
};

export function AdsManagement() {
  const [dateRange, setDateRange] = useState<DateRange>('last30days');
  const [activeTab, setActiveTab] = useState<'overview' | 'google' | 'meta'>('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createPlatform, setCreatePlatform] = useState<'google' | 'meta'>('google');
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    dailyBudget: '',
    objective: 'OUTCOME_TRAFFIC',
    channelType: 'SEARCH',
  });
  const queryClient = useQueryClient();

  // Google Ads データ取得
  const { data: googleCampaigns, isLoading: googleLoading, error: googleError, refetch: refetchGoogle } = useQuery({
    queryKey: ['google-ads-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-ads-api', {
        body: { action: 'getCampaigns' }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.data as GoogleCampaign[];
    },
    retry: false,
  });

  const { data: googlePerformance, isLoading: googlePerfLoading, refetch: refetchGooglePerf } = useQuery({
    queryKey: ['google-ads-performance', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-ads-api', {
        body: { action: 'getPerformance', data: { dateRange } }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.data;
    },
    retry: false,
  });

  // Meta Ads データ取得
  const { data: metaCampaigns, isLoading: metaLoading, error: metaError, refetch: refetchMeta } = useQuery({
    queryKey: ['meta-ads-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-api', {
        body: { action: 'getCampaigns' }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.data as MetaCampaign[];
    },
    retry: false,
  });

  const { data: metaInsights, isLoading: metaInsightsLoading, refetch: refetchMetaInsights } = useQuery({
    queryKey: ['meta-ads-insights', dateRange],
    queryFn: async () => {
      const datePreset = dateRange === 'today' ? 'today' : 
                        dateRange === 'last7days' ? 'last_7d' :
                        dateRange === 'thisMonth' ? 'this_month' : 'last_30d';
      const { data, error } = await supabase.functions.invoke('meta-ads-api', {
        body: { action: 'getInsights', data: { datePreset } }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.data;
    },
    retry: false,
  });

  // キャンペーンステータス更新
  const updateGoogleStatus = useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: 'ENABLED' | 'PAUSED' }) => {
      const { data, error } = await supabase.functions.invoke('google-ads-api', {
        body: { action: 'updateCampaignStatus', data: { campaignId, status } }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('キャンペーンステータスを更新しました');
      queryClient.invalidateQueries({ queryKey: ['google-ads-campaigns'] });
    },
    onError: (error: Error) => {
      toast.error(`更新に失敗しました: ${error.message}`);
    },
  });

  const updateMetaStatus = useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-api', {
        body: { action: 'updateCampaignStatus', data: { campaignId, status } }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('キャンペーンステータスを更新しました');
      queryClient.invalidateQueries({ queryKey: ['meta-ads-campaigns'] });
    },
    onError: (error: Error) => {
      toast.error(`更新に失敗しました: ${error.message}`);
    },
  });

  // キャンペーン作成
  const createGoogleCampaign = useMutation({
    mutationFn: async (data: { name: string; dailyBudget: number; channelType: string }) => {
      const { data: result, error } = await supabase.functions.invoke('google-ads-api', {
        body: { action: 'createCampaign', data }
      });
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Google Adsキャンペーンを作成しました');
      queryClient.invalidateQueries({ queryKey: ['google-ads-campaigns'] });
      setShowCreateDialog(false);
      setNewCampaign({ name: '', dailyBudget: '', objective: 'OUTCOME_TRAFFIC', channelType: 'SEARCH' });
    },
    onError: (error: Error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  const createMetaCampaign = useMutation({
    mutationFn: async (data: { name: string; dailyBudget: number; objective: string }) => {
      const { data: result, error } = await supabase.functions.invoke('meta-ads-api', {
        body: { action: 'createCampaign', data }
      });
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Meta Adsキャンペーンを作成しました');
      queryClient.invalidateQueries({ queryKey: ['meta-ads-campaigns'] });
      setShowCreateDialog(false);
      setNewCampaign({ name: '', dailyBudget: '', objective: 'OUTCOME_TRAFFIC', channelType: 'SEARCH' });
    },
    onError: (error: Error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  const handleCreateCampaign = () => {
    const budget = parseFloat(newCampaign.dailyBudget);
    if (!newCampaign.name || isNaN(budget) || budget <= 0) {
      toast.error('キャンペーン名と日予算を入力してください');
      return;
    }

    if (createPlatform === 'google') {
      createGoogleCampaign.mutate({
        name: newCampaign.name,
        dailyBudget: budget,
        channelType: newCampaign.channelType,
      });
    } else {
      createMetaCampaign.mutate({
        name: newCampaign.name,
        dailyBudget: budget,
        objective: newCampaign.objective,
      });
    }
  };

  const handleRefresh = () => {
    refetchGoogle();
    refetchGooglePerf();
    refetchMeta();
    refetchMetaInsights();
    toast.success('データを更新しました');
  };

  // 集計データ計算
  const googleTotals = googleCampaigns?.reduce((acc, c) => ({
    impressions: acc.impressions + parseInt(c.metrics?.impressions || '0'),
    clicks: acc.clicks + parseInt(c.metrics?.clicks || '0'),
    cost: acc.cost + parseInt(c.metrics?.costMicros || '0') / 1000000,
    conversions: acc.conversions + (c.metrics?.conversions || 0),
  }), { impressions: 0, clicks: 0, cost: 0, conversions: 0 });

  const metaTotals = metaInsights ? {
    impressions: parseInt(metaInsights.impressions || '0'),
    clicks: parseInt(metaInsights.clicks || '0'),
    cost: parseFloat(metaInsights.spend || '0'),
    reach: parseInt(metaInsights.reach || '0'),
  } : { impressions: 0, clicks: 0, cost: 0, reach: 0 };

  const totalSpend = (googleTotals?.cost || 0) + metaTotals.cost;
  const totalImpressions = (googleTotals?.impressions || 0) + metaTotals.impressions;
  const totalClicks = (googleTotals?.clicks || 0) + metaTotals.clicks;
  const totalCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-light">広告管理</h2>
          <p className="text-sm text-muted-foreground">Google Ads & Meta Ads</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="last7days">過去7日</SelectItem>
              <SelectItem value="last30days">過去30日</SelectItem>
              <SelectItem value="thisMonth">今月</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                キャンペーン作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規キャンペーン作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>プラットフォーム</Label>
                  <Select value={createPlatform} onValueChange={(v) => setCreatePlatform(v as 'google' | 'meta')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Ads</SelectItem>
                      <SelectItem value="meta">Meta Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>キャンペーン名</Label>
                  <Input
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="キャンペーン名を入力"
                  />
                </div>
                <div className="space-y-2">
                  <Label>日予算 (円)</Label>
                  <Input
                    type="number"
                    value={newCampaign.dailyBudget}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, dailyBudget: e.target.value }))}
                    placeholder="1000"
                  />
                </div>
                {createPlatform === 'google' ? (
                  <div className="space-y-2">
                    <Label>キャンペーンタイプ</Label>
                    <Select value={newCampaign.channelType} onValueChange={(v) => setNewCampaign(prev => ({ ...prev, channelType: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEARCH">検索</SelectItem>
                        <SelectItem value="DISPLAY">ディスプレイ</SelectItem>
                        <SelectItem value="SHOPPING">ショッピング</SelectItem>
                        <SelectItem value="VIDEO">動画</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>キャンペーン目的</Label>
                    <Select value={newCampaign.objective} onValueChange={(v) => setNewCampaign(prev => ({ ...prev, objective: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OUTCOME_TRAFFIC">トラフィック</SelectItem>
                        <SelectItem value="OUTCOME_AWARENESS">認知度</SelectItem>
                        <SelectItem value="OUTCOME_ENGAGEMENT">エンゲージメント</SelectItem>
                        <SelectItem value="OUTCOME_LEADS">リード</SelectItem>
                        <SelectItem value="OUTCOME_SALES">売上</SelectItem>
                        <SelectItem value="OUTCOME_APP_PROMOTION">アプリプロモーション</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  キャンセル
                </Button>
                <Button 
                  onClick={handleCreateCampaign}
                  disabled={createGoogleCampaign.isPending || createMetaCampaign.isPending}
                >
                  {(createGoogleCampaign.isPending || createMetaCampaign.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  作成
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総広告費</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <p className="text-xs text-muted-foreground">
              Google: {formatCurrency(googleTotals?.cost || 0)} / Meta: {formatCurrency(metaTotals.cost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">インプレッション</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalImpressions)}</div>
            <p className="text-xs text-muted-foreground">
              Google: {formatNumber(googleTotals?.impressions || 0)} / Meta: {formatNumber(metaTotals.impressions)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">クリック数</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalClicks)}</div>
            <p className="text-xs text-muted-foreground">
              CTR: {totalCTR.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">コンバージョン</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(googleTotals?.conversions || 0)}</div>
            <p className="text-xs text-muted-foreground">
              CPA: {(googleTotals?.conversions || 0) > 0 ? formatCurrency((googleTotals?.cost || 0) / (googleTotals?.conversions || 1)) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="google">Google Ads</TabsTrigger>
          <TabsTrigger value="meta">Meta Ads</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Google Ads Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <img src="https://www.gstatic.com/images/branding/product/1x/ads_48dp.png" alt="Google Ads" className="h-5 w-5" />
                  Google Ads
                </CardTitle>
                <CardDescription>
                  {googleCampaigns?.filter(c => c.campaign.status === 'ENABLED').length || 0} キャンペーン配信中
                </CardDescription>
              </CardHeader>
              <CardContent>
                {googleLoading ? (
                  <Skeleton className="h-24" />
                ) : googleError ? (
                  <p className="text-sm text-destructive">{(googleError as Error).message}</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">広告費</span>
                      <span className="font-medium">{formatCurrency(googleTotals?.cost || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">クリック</span>
                      <span className="font-medium">{formatNumber(googleTotals?.clicks || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CV</span>
                      <span className="font-medium">{formatNumber(googleTotals?.conversions || 0)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meta Ads Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <img src="https://static.xx.fbcdn.net/rsrc.php/yD/r/d4ZIVX-5C-b.ico" alt="Meta" className="h-5 w-5" />
                  Meta Ads
                </CardTitle>
                <CardDescription>
                  {metaCampaigns?.filter(c => c.status === 'ACTIVE').length || 0} キャンペーン配信中
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metaLoading ? (
                  <Skeleton className="h-24" />
                ) : metaError ? (
                  <p className="text-sm text-destructive">{(metaError as Error).message}</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">広告費</span>
                      <span className="font-medium">{formatCurrency(metaTotals.cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">クリック</span>
                      <span className="font-medium">{formatNumber(metaTotals.clicks)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">リーチ</span>
                      <span className="font-medium">{formatNumber(metaTotals.reach)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>外部管理画面</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button variant="outline" asChild>
                <a href="https://ads.google.com/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Google Ads
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://business.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Meta Ads Manager
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Ads キャンペーン</CardTitle>
            </CardHeader>
            <CardContent>
              {googleLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : googleError ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-2">{(googleError as Error).message}</p>
                  <Button variant="outline" size="sm" onClick={() => refetchGoogle()}>
                    再試行
                  </Button>
                </div>
              ) : !googleCampaigns?.length ? (
                <p className="text-center py-8 text-muted-foreground">キャンペーンがありません</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>キャンペーン名</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">費用</TableHead>
                      <TableHead className="text-right">クリック</TableHead>
                      <TableHead className="text-right">CV</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {googleCampaigns.map((campaign) => (
                      <TableRow key={campaign.campaign.id}>
                        <TableCell className="font-medium">{campaign.campaign.name}</TableCell>
                        <TableCell>{getStatusBadge(campaign.campaign.status)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(parseInt(campaign.metrics?.costMicros || '0') / 1000000)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(parseInt(campaign.metrics?.clicks || '0'))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.metrics?.conversions || 0)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updateGoogleStatus.isPending}
                            onClick={() => updateGoogleStatus.mutate({
                              campaignId: campaign.campaign.id,
                              status: campaign.campaign.status === 'ENABLED' ? 'PAUSED' : 'ENABLED'
                            })}
                          >
                            {updateGoogleStatus.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : campaign.campaign.status === 'ENABLED' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meta Ads キャンペーン</CardTitle>
            </CardHeader>
            <CardContent>
              {metaLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : metaError ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-2">{(metaError as Error).message}</p>
                  <Button variant="outline" size="sm" onClick={() => refetchMeta()}>
                    再試行
                  </Button>
                </div>
              ) : !metaCampaigns?.length ? (
                <p className="text-center py-8 text-muted-foreground">キャンペーンがありません</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>キャンペーン名</TableHead>
                      <TableHead>目的</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">費用</TableHead>
                      <TableHead className="text-right">クリック</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metaCampaigns.map((campaign) => {
                      const insights = campaign.insights?.data?.[0];
                      return (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{campaign.objective}</TableCell>
                          <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(insights?.spend || '0'))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(parseInt(insights?.clicks || '0'))}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateMetaStatus.isPending}
                              onClick={() => updateMetaStatus.mutate({
                                campaignId: campaign.id,
                                status: campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                              })}
                            >
                              {updateMetaStatus.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : campaign.status === 'ACTIVE' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
