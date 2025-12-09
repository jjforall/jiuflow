import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Moon, Activity, Zap, Link2, Unlink, Eye, EyeOff, Loader2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface OuraData {
  sleep_data: Array<{
    day: string;
    score: number;
    contributors?: {
      deep_sleep?: number;
      efficiency?: number;
      latency?: number;
      rem_sleep?: number;
      restfulness?: number;
      timing?: number;
      total_sleep?: number;
    };
  }>;
  activity_data: Array<{
    day: string;
    score: number;
    active_calories?: number;
    steps?: number;
    equivalent_walking_distance?: number;
    contributors?: {
      meet_daily_targets?: number;
      move_every_hour?: number;
      recovery_time?: number;
      stay_active?: number;
      training_frequency?: number;
      training_volume?: number;
    };
  }>;
  readiness_data: Array<{
    day: string;
    score: number;
    contributors?: {
      activity_balance?: number;
      body_temperature?: number;
      hrv_balance?: number;
      previous_day_activity?: number;
      previous_night?: number;
      recovery_index?: number;
      resting_heart_rate?: number;
      sleep_balance?: number;
    };
  }>;
  last_synced_at: string | null;
}

interface OuraRingDataProps {
  userId: string;
  language: string;
}

export function OuraRingData({ userId, language }: OuraRingDataProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [ouraData, setOuraData] = useState<OuraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOuraConnection();
  }, [userId]);

  const loadOuraConnection = async () => {
    setLoading(true);
    try {
      // Check if user has Oura token
      const { data: tokenData } = await supabase
        .from('user_oura_tokens')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      setIsConnected(!!tokenData);

      // Load cached data
      const { data: ouraDataResult } = await supabase
        .from('user_oura_data')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (ouraDataResult) {
        setOuraData(ouraDataResult as unknown as OuraData);
      }
    } catch (error) {
      console.error('Error loading Oura connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!accessToken.trim()) {
      toast.error(language === 'ja' ? 'アクセストークンを入力してください' : 'Please enter access token');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_oura_tokens')
        .upsert({
          user_id: userId,
          access_token: accessToken.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setIsConnected(true);
      setConnectDialogOpen(false);
      setAccessToken("");
      toast.success(language === 'ja' ? 'Oura Ringを連携しました' : 'Connected to Oura Ring');

      // Sync data immediately
      await syncOuraData();
    } catch (error) {
      console.error('Error connecting Oura:', error);
      toast.error(language === 'ja' ? '連携に失敗しました' : 'Failed to connect');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await supabase.from('user_oura_tokens').delete().eq('user_id', userId);
      await supabase.from('user_oura_data').delete().eq('user_id', userId);
      
      setIsConnected(false);
      setOuraData(null);
      toast.success(language === 'ja' ? 'Oura Ringの連携を解除しました' : 'Disconnected from Oura Ring');
    } catch (error) {
      console.error('Error disconnecting Oura:', error);
      toast.error(language === 'ja' ? '解除に失敗しました' : 'Failed to disconnect');
    }
  };

  const syncOuraData = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(language === 'ja' ? 'ログインしてください' : 'Please log in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-oura-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.data) {
        setOuraData({
          sleep_data: data.data.sleep || [],
          activity_data: data.data.activity || [],
          readiness_data: data.data.readiness || [],
          last_synced_at: data.data.lastSynced
        });
        toast.success(language === 'ja' ? 'データを同期しました' : 'Data synced successfully');
      }
    } catch (error: any) {
      console.error('Error syncing Oura data:', error);
      toast.error(error.message || (language === 'ja' ? '同期に失敗しました' : 'Failed to sync'));
    } finally {
      setSyncing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLatestData = () => {
    if (!ouraData) return null;

    const latestSleep = ouraData.sleep_data?.[ouraData.sleep_data.length - 1];
    const latestActivity = ouraData.activity_data?.[ouraData.activity_data.length - 1];
    const latestReadiness = ouraData.readiness_data?.[ouraData.readiness_data.length - 1];

    return { sleep: latestSleep, activity: latestActivity, readiness: latestReadiness };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const latest = getLatestData();

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                {language === 'ja' ? 'Oura Ring' : 'Oura Ring'}
              </CardTitle>
              {isConnected && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {language === 'ja' ? '連携中' : 'Connected'}
                </Badge>
              )}
            </div>
            {isConnected ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncOuraData}
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                  {language === 'ja' ? '同期' : 'Sync'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-red-600 hover:text-red-700"
                >
                  <Unlink className="h-4 w-4 mr-1" />
                  {language === 'ja' ? '解除' : 'Disconnect'}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConnectDialogOpen(true)}
              >
                <Link2 className="h-4 w-4 mr-1" />
                {language === 'ja' ? '連携する' : 'Connect'}
              </Button>
            )}
          </div>
          {ouraData?.last_synced_at && (
            <CardDescription>
              {language === 'ja' ? '最終同期: ' : 'Last synced: '}
              {format(new Date(ouraData.last_synced_at), 'PPp', { locale: language === 'ja' ? ja : undefined })}
            </CardDescription>
          )}
        </CardHeader>

        {isConnected && latest && (
          <CardContent className="space-y-4">
            {/* Sleep Score */}
            {latest.sleep && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900">
                  <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {language === 'ja' ? '睡眠スコア' : 'Sleep Score'}
                    </span>
                    <span className={`text-lg font-bold ${getScoreColor(latest.sleep.score)}`}>
                      {latest.sleep.score}
                    </span>
                  </div>
                  <Progress value={latest.sleep.score} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{latest.sleep.day}</p>
                </div>
              </div>
            )}

            {/* Activity Score */}
            {latest.activity && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                  <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {language === 'ja' ? 'アクティビティスコア' : 'Activity Score'}
                    </span>
                    <span className={`text-lg font-bold ${getScoreColor(latest.activity.score)}`}>
                      {latest.activity.score}
                    </span>
                  </div>
                  <Progress value={latest.activity.score} className="h-2" />
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{latest.activity.steps?.toLocaleString() || 0} {language === 'ja' ? '歩' : 'steps'}</span>
                    <span>{latest.activity.active_calories || 0} kcal</span>
                  </div>
                </div>
              </div>
            )}

            {/* Readiness Score */}
            {latest.readiness && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {language === 'ja' ? 'レディネススコア' : 'Readiness Score'}
                    </span>
                    <span className={`text-lg font-bold ${getScoreColor(latest.readiness.score)}`}>
                      {latest.readiness.score}
                    </span>
                  </div>
                  <Progress value={latest.readiness.score} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{latest.readiness.day}</p>
                </div>
              </div>
            )}
          </CardContent>
        )}

        {!isConnected && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {language === 'ja' 
                ? 'Oura Ringを連携すると、睡眠・アクティビティ・レディネスのデータを表示できます。' 
                : 'Connect your Oura Ring to display sleep, activity, and readiness data.'}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ja' ? 'Oura Ringを連携' : 'Connect Oura Ring'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ja' 
                ? 'Personal Access Tokenを入力してください。トークンはOura Cloudの設定から取得できます。' 
                : 'Enter your Personal Access Token. You can get it from Oura Cloud settings.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oura-token">Personal Access Token</Label>
              <div className="relative">
                <Input
                  id="oura-token"
                  type={showToken ? "text" : "password"}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="XXXXXXXX..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <a
              href="https://cloud.ouraring.com/personal-access-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {language === 'ja' ? 'トークンを取得する' : 'Get your token'}
              <ExternalLink className="h-3 w-3" />
            </a>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                {language === 'ja' ? 'キャンセル' : 'Cancel'}
              </Button>
              <Button onClick={handleConnect} disabled={saving || !accessToken.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {language === 'ja' ? '連携' : 'Connect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
