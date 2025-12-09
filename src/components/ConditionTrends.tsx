import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { TrendingUp, Loader2 } from "lucide-react";

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

interface ConditionTrendsProps {
  userId: string;
  language: string;
}

export function ConditionTrends({ userId, language }: ConditionTrendsProps) {
  const [ouraData, setOuraData] = useState<OuraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [period, setPeriod] = useState<'7d' | '14d' | '30d'>('7d');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected || !ouraData) {
    return null;
  }

  const getPeriodDays = () => {
    switch (period) {
      case '7d': return 7;
      case '14d': return 14;
      case '30d': return 30;
      default: return 7;
    }
  };

  const prepareChartData = () => {
    const days = getPeriodDays();
    const cutoffDate = subDays(new Date(), days);
    
    // Create a map of dates to scores
    const sleepMap = new Map(
      ouraData.sleep_data?.map(d => [d.day, d.score]) || []
    );
    const activityMap = new Map(
      ouraData.activity_data?.map(d => [d.day, d.score]) || []
    );
    const readinessMap = new Map(
      ouraData.readiness_data?.map(d => [d.day, d.score]) || []
    );

    // Generate data for each day in the period
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      chartData.push({
        date: dateStr,
        displayDate: format(date, language === 'ja' ? 'M/d' : 'MMM d', { 
          locale: language === 'ja' ? ja : undefined 
        }),
        sleep: sleepMap.get(dateStr) || null,
        activity: activityMap.get(dateStr) || null,
        readiness: readinessMap.get(dateStr) || null,
      });
    }

    return chartData;
  };

  const chartData = prepareChartData();

  const calculateAverages = () => {
    const validSleep = chartData.filter(d => d.sleep !== null);
    const validActivity = chartData.filter(d => d.activity !== null);
    const validReadiness = chartData.filter(d => d.readiness !== null);

    return {
      sleep: validSleep.length > 0 
        ? Math.round(validSleep.reduce((sum, d) => sum + (d.sleep || 0), 0) / validSleep.length)
        : null,
      activity: validActivity.length > 0
        ? Math.round(validActivity.reduce((sum, d) => sum + (d.activity || 0), 0) / validActivity.length)
        : null,
      readiness: validReadiness.length > 0
        ? Math.round(validReadiness.reduce((sum, d) => sum + (d.readiness || 0), 0) / validReadiness.length)
        : null,
    };
  };

  const averages = calculateAverages();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}: </span>
            <span className="font-medium">{entry.value || '-'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {language === 'ja' ? 'コンディション推移' : 'Condition Trends'}
          </CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as '7d' | '14d' | '30d')}>
            <TabsList className="h-8">
              <TabsTrigger value="7d" className="text-xs px-2">
                {language === 'ja' ? '7日' : '7D'}
              </TabsTrigger>
              <TabsTrigger value="14d" className="text-xs px-2">
                {language === 'ja' ? '14日' : '14D'}
              </TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2">
                {language === 'ja' ? '30日' : '30D'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="sleep" 
                name={language === 'ja' ? '睡眠' : 'Sleep'}
                stroke="#6366f1" 
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="readiness" 
                name={language === 'ja' ? 'レディネス' : 'Readiness'}
                stroke="#22c55e" 
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="activity" 
                name={language === 'ja' ? 'アクティビティ' : 'Activity'}
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Averages */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {language === 'ja' ? '平均睡眠' : 'Avg Sleep'}
            </div>
            <div className="text-lg font-bold text-indigo-500">
              {averages.sleep ?? '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {language === 'ja' ? '平均レディネス' : 'Avg Readiness'}
            </div>
            <div className="text-lg font-bold text-green-500">
              {averages.readiness ?? '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {language === 'ja' ? '平均アクティビティ' : 'Avg Activity'}
            </div>
            <div className="text-lg font-bold text-orange-500">
              {averages.activity ?? '-'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
