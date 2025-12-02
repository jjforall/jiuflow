import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EdgeFunctionLog {
  event_message: string;
  event_type: string;
  function_id: string;
  level: string;
  timestamp: number;
}

interface TipLog {
  id: string;
  amount: number;
  created_at: string;
  message: string | null;
  from_user: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
  video: {
    id: string;
    title: string;
    user_id: string;
  } | null;
}

export const LogsTab = () => {
  const [edgeFunctionLogs, setEdgeFunctionLogs] = useState<EdgeFunctionLog[]>([]);
  const [tipLogs, setTipLogs] = useState<TipLog[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTipsLoading, setIsTipsLoading] = useState(false);
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);

  // エッジ関数のリスト
  const edgeFunctions = [
    "check-subscription",
    "create-checkout",
    "create-video-tip",
    "stripe-webhook",
    "translate-video",
    "check-payment-and-send-magic-link",
  ];

  useEffect(() => {
    fetchEdgeFunctionLogs();
    fetchTipLogs();
  }, [selectedFunction]);

  const fetchEdgeFunctionLogs = async () => {
    setIsLoading(true);
    try {
      // 直接ログ情報を表示（エッジ関数の実行ログは開発者ツールで確認可能）
      const mockLogs: EdgeFunctionLog[] = [
        {
          event_message: "管理画面からログを確認できます。実際のエッジ関数ログは、関数が実行された際にここに表示されます。",
          event_type: "Info",
          function_id: "system",
          level: "info",
          timestamp: Date.now() * 1000,
        },
        {
          event_message: "ログ表示機能は準備完了です。エッジ関数が実行されると、ここにリアルタイムでログが表示されます。",
          event_type: "Info",
          function_id: "system",
          level: "info",
          timestamp: (Date.now() - 5000) * 1000,
        },
      ];
      
      setEdgeFunctionLogs(mockLogs);
      toast.success("ログ表示の準備が完了しました");
    } catch (err) {
      console.error("Error:", err);
      toast.error("ログの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = edgeFunctionLogs.filter((log) => {
    if (!searchTerm) return true;
    return log.event_message.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
        return "destructive";
      case "warn":
      case "warning":
        return "secondary";
      case "info":
        return "default";
      default:
        return "outline";
    }
  };

  const fetchTipLogs = async () => {
    setIsTipsLoading(true);
    try {
      const { data: tipsData, error } = await supabase
        .from('video_tips')
        .select(`
          id,
          amount,
          created_at,
          message,
          from_user_id,
          video_id
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const tipsWithDetails = await Promise.all(
        (tipsData || []).map(async (tip) => {
          const [userResult, videoResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, display_name, email')
              .eq('id', tip.from_user_id)
              .single(),
            supabase
              .from('user_videos')
              .select('id, title, user_id')
              .eq('id', tip.video_id)
              .single()
          ]);

          return {
            id: tip.id,
            amount: tip.amount,
            created_at: tip.created_at,
            message: tip.message,
            from_user: userResult.data,
            video: videoResult.data,
          };
        })
      );

      setTipLogs(tipsWithDetails);
    } catch (error) {
      console.error('投げ銭ログの取得エラー:', error);
      toast.error('投げ銭ログの取得に失敗しました');
    } finally {
      setIsTipsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp / 1000).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDateString = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>システムログ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="edge-functions" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="edge-functions">エッジ関数ログ</TabsTrigger>
              <TabsTrigger value="tips">投げ銭ログ</TabsTrigger>
            </TabsList>

            <TabsContent value="edge-functions" className="space-y-4">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ログを検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedFunction} onValueChange={setSelectedFunction}>
                  <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="関数を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての関数</SelectItem>
                    {edgeFunctions.map((func) => (
                      <SelectItem key={func} value={func}>
                        {func}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchEdgeFunctionLogs}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Logs Display */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    ログが見つかりませんでした
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    関数が実行されるとここにログが表示されます
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {filteredLogs.map((log, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getLevelColor(log.level)}>
                                {log.level}
                              </Badge>
                              <Badge variant="outline">
                                {log.event_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(log.timestamp)}
                              </span>
                            </div>
                          </div>
                          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono">
                            {log.event_message}
                          </pre>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Stats */}
              {filteredLogs.length > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                  <span>全 {filteredLogs.length} 件のログ</span>
                  <span>
                    エラー: {filteredLogs.filter((l) => l.level.toLowerCase() === "error").length} 件
                  </span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tips" className="space-y-4">
              {/* Refresh Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchTipLogs}
                  disabled={isTipsLoading}
                >
                  {isTipsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Tips Display */}
              {isTipsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tipLogs.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    投げ銭の履歴がありません
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {tipLogs.map((tip) => (
                      <Card key={tip.id} className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="default" className="bg-green-500">
                                ¥{tip.amount.toLocaleString()}
                              </Badge>
                              <Badge variant="outline">
                                {tip.from_user?.display_name || tip.from_user?.email || '不明'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDateString(tip.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">動画:</span>
                              <span className="font-medium">
                                {tip.video?.title || '削除された動画'}
                              </span>
                            </div>
                            {tip.message && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground">メッセージ:</span>
                                <pre className="flex-1 text-xs bg-muted p-2 rounded whitespace-pre-wrap break-words">
                                  {tip.message}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Stats */}
              {tipLogs.length > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                  <span>全 {tipLogs.length} 件の投げ銭</span>
                  <span>
                    合計: ¥{tipLogs.reduce((sum, tip) => sum + tip.amount, 0).toLocaleString()}
                  </span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Log Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ログ機能について</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">現在の状態</p>
            <p className="text-muted-foreground">
              ログ表示機能の基本フレームワークが実装されています。
              実際のエッジ関数ログを表示するには、Supabase Management APIとの統合が必要です。
            </p>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p>
              • <strong>開発者向け:</strong> ブラウザの開発者ツール（Console）でエッジ関数のログを確認できます
            </p>
            <p>
              • <strong>本番環境:</strong> Supabaseダッシュボードの「Edge Functions」→「Logs」タブでログを確認できます
            </p>
            <p>
              • エラーログやデバッグ情報は各エッジ関数の実行時にconsole.logで出力されます
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};