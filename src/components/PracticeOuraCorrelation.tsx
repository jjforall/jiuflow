import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis } from "recharts";
import { BarChart3, Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface OuraData {
  sleep_data: Array<{
    day: string;
    score: number;
  }>;
  activity_data: Array<{
    day: string;
    score: number;
  }>;
  readiness_data: Array<{
    day: string;
    score: number;
  }>;
}

interface PracticeRecord {
  practice_date: string;
  success_rating: number | null;
  difficulty_rating: number | null;
  duration_minutes: number | null;
}

interface PracticeOuraCorrelationProps {
  userId: string;
  language: string;
}

export function PracticeOuraCorrelation({ userId, language }: PracticeOuraCorrelationProps) {
  const [ouraData, setOuraData] = useState<OuraData | null>(null);
  const [practiceRecords, setPracticeRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      // Check Oura connection
      const { data: tokenData } = await supabase
        .from('user_oura_tokens')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      setIsConnected(!!tokenData);

      if (tokenData) {
        // Load Oura data
        const { data: oura } = await supabase
          .from('user_oura_data')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (oura) {
          setOuraData(oura as unknown as OuraData);
        }

        // Load practice records
        const { data: records } = await supabase
          .from('practice_records')
          .select('practice_date, success_rating, difficulty_rating, duration_minutes')
          .eq('user_id', userId)
          .order('practice_date', { ascending: false })
          .limit(30);

        if (records) {
          setPracticeRecords(records);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected || !ouraData || practiceRecords.length === 0) {
    return null;
  }

  // Create correlation data
  const createCorrelationData = () => {
    const readinessMap = new Map(
      ouraData.readiness_data?.map(d => [d.day, d.score]) || []
    );
    const sleepMap = new Map(
      ouraData.sleep_data?.map(d => [d.day, d.score]) || []
    );

    return practiceRecords
      .filter(r => r.success_rating !== null)
      .map(record => {
        const readiness = readinessMap.get(record.practice_date);
        const sleep = sleepMap.get(record.practice_date);
        
        return {
          date: format(parseISO(record.practice_date), language === 'ja' ? 'M/d' : 'MMM d', {
            locale: language === 'ja' ? ja : undefined
          }),
          readiness: readiness || null,
          sleep: sleep || null,
          success: record.success_rating,
          duration: record.duration_minutes || 30,
        };
      })
      .filter(d => d.readiness !== null || d.sleep !== null);
  };

  const correlationData = createCorrelationData();

  // Calculate correlation insight
  const calculateInsight = () => {
    const withHighReadiness = correlationData.filter(d => d.readiness && d.readiness >= 70);
    const withLowReadiness = correlationData.filter(d => d.readiness && d.readiness < 70);

    const avgSuccessHighReadiness = withHighReadiness.length > 0
      ? withHighReadiness.reduce((sum, d) => sum + (d.success || 0), 0) / withHighReadiness.length
      : 0;
    const avgSuccessLowReadiness = withLowReadiness.length > 0
      ? withLowReadiness.reduce((sum, d) => sum + (d.success || 0), 0) / withLowReadiness.length
      : 0;

    const difference = avgSuccessHighReadiness - avgSuccessLowReadiness;

    return {
      highReadinessAvg: avgSuccessHighReadiness.toFixed(1),
      lowReadinessAvg: avgSuccessLowReadiness.toFixed(1),
      hasPositiveCorrelation: difference > 0.3,
      difference: difference.toFixed(1),
    };
  };

  const insight = calculateInsight();

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{data.date}</p>
        <div className="space-y-1">
          {data.readiness && (
            <p>{language === 'ja' ? 'レディネス' : 'Readiness'}: {data.readiness}</p>
          )}
          {data.sleep && (
            <p>{language === 'ja' ? '睡眠' : 'Sleep'}: {data.sleep}</p>
          )}
          <p>{language === 'ja' ? '成功度' : 'Success'}: {data.success}/5</p>
        </div>
      </div>
    );
  };

  if (correlationData.length < 3) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {language === 'ja' ? 'コンディションと練習成果' : 'Condition vs Training Performance'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insight Banner */}
        {insight.hasPositiveCorrelation && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">
                {language === 'ja' 
                  ? `レディネスが高い日は成功度が平均${insight.difference}ポイント高い傾向があります`
                  : `You tend to perform ${insight.difference} points better when readiness is high`}
              </span>
            </div>
          </div>
        )}

        {/* Bar Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={correlationData.slice(0, 10)} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="left"
                domain={[0, 100]} 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 5]}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar 
                yAxisId="left"
                dataKey="readiness" 
                name={language === 'ja' ? 'レディネス' : 'Readiness'}
                fill="#22c55e" 
                opacity={0.7}
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right"
                dataKey="success" 
                name={language === 'ja' ? '成功度' : 'Success'}
                fill="#6366f1" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">
              {language === 'ja' ? 'レディネス70+の日' : 'High Readiness Days'}
            </div>
            <div className="text-xl font-bold text-green-500">
              {insight.highReadinessAvg}
              <span className="text-sm font-normal text-muted-foreground">/5</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {language === 'ja' ? '平均成功度' : 'Avg Success'}
            </div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">
              {language === 'ja' ? 'レディネス70未満の日' : 'Low Readiness Days'}
            </div>
            <div className="text-xl font-bold text-yellow-500">
              {insight.lowReadinessAvg}
              <span className="text-sm font-normal text-muted-foreground">/5</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {language === 'ja' ? '平均成功度' : 'Avg Success'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
