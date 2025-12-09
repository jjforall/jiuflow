import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, Moon, Activity, AlertTriangle, CheckCircle2, 
  TrendingUp, TrendingDown, Minus, Dumbbell, Coffee
} from "lucide-react";

interface OuraData {
  sleep_data: Array<{
    day: string;
    score: number;
  }>;
  activity_data: Array<{
    day: string;
    score: number;
    steps?: number;
    active_calories?: number;
  }>;
  readiness_data: Array<{
    day: string;
    score: number;
  }>;
  last_synced_at: string | null;
}

interface TodayConditionProps {
  userId: string;
  language: string;
}

export function TodayCondition({ userId, language }: TodayConditionProps) {
  const [ouraData, setOuraData] = useState<OuraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      // Check connection
      const { data: tokenData } = await supabase
        .from('user_oura_tokens')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      setIsConnected(!!tokenData);

      if (tokenData) {
        const { data } = await supabase
          .from('user_oura_data')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (data) {
          setOuraData(data as unknown as OuraData);
        }
      }
    } catch (error) {
      console.error('Error loading Oura data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isConnected || !ouraData) {
    return null;
  }

  const getLatestScores = () => {
    const sleep = ouraData.sleep_data?.[ouraData.sleep_data.length - 1];
    const activity = ouraData.activity_data?.[ouraData.activity_data.length - 1];
    const readiness = ouraData.readiness_data?.[ouraData.readiness_data.length - 1];
    return { sleep, activity, readiness };
  };

  const getTrainingRecommendation = (readinessScore: number, sleepScore: number) => {
    const avgScore = (readinessScore + sleepScore) / 2;
    
    if (avgScore >= 85) {
      return {
        level: 'optimal',
        icon: Dumbbell,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950',
        borderColor: 'border-green-200 dark:border-green-800',
        title: language === 'ja' ? '最高のコンディション！' : 'Optimal Condition!',
        description: language === 'ja' 
          ? '今日はハードな練習に最適です。新しい技を試したり、スパーリングを増やしましょう。'
          : 'Perfect day for intense training. Try new techniques or increase sparring.',
        intensity: language === 'ja' ? '高強度' : 'High Intensity'
      };
    } else if (avgScore >= 70) {
      return {
        level: 'good',
        icon: CheckCircle2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        borderColor: 'border-blue-200 dark:border-blue-800',
        title: language === 'ja' ? '良好なコンディション' : 'Good Condition',
        description: language === 'ja' 
          ? '通常の練習が可能です。テクニック練習を中心にしましょう。'
          : 'Normal training is fine. Focus on technique drills.',
        intensity: language === 'ja' ? '中強度' : 'Medium Intensity'
      };
    } else if (avgScore >= 55) {
      return {
        level: 'moderate',
        icon: Coffee,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        title: language === 'ja' ? '回復が必要' : 'Recovery Needed',
        description: language === 'ja' 
          ? '軽めの練習を推奨します。ドリルや動画学習を中心にしましょう。'
          : 'Light training recommended. Focus on drills or video study.',
        intensity: language === 'ja' ? '低強度' : 'Low Intensity'
      };
    } else {
      return {
        level: 'rest',
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950',
        borderColor: 'border-red-200 dark:border-red-800',
        title: language === 'ja' ? '休養日を推奨' : 'Rest Day Recommended',
        description: language === 'ja' 
          ? '疲労が蓄積しています。今日は休息を取るか、ストレッチのみにしましょう。'
          : 'Fatigue is accumulating. Take a rest day or do light stretching only.',
        intensity: language === 'ja' ? '休養' : 'Rest'
      };
    }
  };

  const getTrend = (data: Array<{ score: number }> | undefined) => {
    if (!data || data.length < 2) return 'stable';
    const recent = data.slice(-3);
    const older = data.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, d) => sum + d.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.score, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const latest = getLatestScores();
  if (!latest.readiness || !latest.sleep) return null;

  const recommendation = getTrainingRecommendation(
    latest.readiness.score, 
    latest.sleep.score
  );
  const RecommendationIcon = recommendation.icon;

  const sleepTrend = getTrend(ouraData.sleep_data);
  const activityTrend = getTrend(ouraData.activity_data);
  const readinessTrend = getTrend(ouraData.readiness_data);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {language === 'ja' ? '今日のコンディション' : "Today's Condition"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Training Recommendation Alert */}
        <Alert className={`${recommendation.bgColor} ${recommendation.borderColor} border`}>
          <RecommendationIcon className={`h-5 w-5 ${recommendation.color}`} />
          <AlertTitle className={recommendation.color}>
            {recommendation.title}
            <Badge variant="outline" className="ml-2">
              {recommendation.intensity}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            {recommendation.description}
          </AlertDescription>
        </Alert>

        {/* Score Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Sleep */}
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Moon className="h-4 w-4 text-indigo-500" />
              <TrendIcon trend={sleepTrend} />
            </div>
            <div className="text-2xl font-bold">{latest.sleep?.score || '-'}</div>
            <div className="text-xs text-muted-foreground">
              {language === 'ja' ? '睡眠' : 'Sleep'}
            </div>
            <Progress 
              value={latest.sleep?.score || 0} 
              className="h-1 mt-2"
            />
          </div>

          {/* Readiness */}
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-4 w-4 text-green-500" />
              <TrendIcon trend={readinessTrend} />
            </div>
            <div className="text-2xl font-bold">{latest.readiness?.score || '-'}</div>
            <div className="text-xs text-muted-foreground">
              {language === 'ja' ? 'レディネス' : 'Readiness'}
            </div>
            <Progress 
              value={latest.readiness?.score || 0} 
              className="h-1 mt-2"
            />
          </div>

          {/* Activity */}
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-4 w-4 text-orange-500" />
              <TrendIcon trend={activityTrend} />
            </div>
            <div className="text-2xl font-bold">{latest.activity?.score || '-'}</div>
            <div className="text-xs text-muted-foreground">
              {language === 'ja' ? 'アクティビティ' : 'Activity'}
            </div>
            <Progress 
              value={latest.activity?.score || 0} 
              className="h-1 mt-2"
            />
          </div>
        </div>

        {/* Additional Stats */}
        {latest.activity && (
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <span>{latest.activity.steps?.toLocaleString() || 0} {language === 'ja' ? '歩' : 'steps'}</span>
            <span>{latest.activity.active_calories || 0} kcal</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
