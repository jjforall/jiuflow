import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";

interface TipRecord {
  id: string;
  amount: number;
  created_at: string;
  message: string | null;
  from_user: {
    id: string;
    display_name: string | null;
  } | null;
  video: {
    id: string;
    title: string;
    user_id: string;
  } | null;
}

export const TipsManagement = () => {
  const [tips, setTips] = useState<TipRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      setLoading(true);
      
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user and video details
      const tipsWithDetails = await Promise.all(
        (tipsData || []).map(async (tip) => {
          const [userResult, videoResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, display_name')
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

      setTips(tipsWithDetails);
    } catch (error) {
      console.error('投げ銭履歴の取得エラー:', error);
      toast.error('投げ銭履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>投げ銭履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">読み込み中...</p>
        ) : tips.length === 0 ? (
          <p className="text-muted-foreground">投げ銭の履歴がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>投げ銭者</TableHead>
                  <TableHead>動画</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>メッセージ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tips.map((tip) => (
                  <TableRow key={tip.id}>
                    <TableCell>
                      {format(new Date(tip.created_at), 'yyyy/MM/dd HH:mm')}
                    </TableCell>
                    <TableCell>
                      {tip.from_user?.display_name || '不明'}
                    </TableCell>
                    <TableCell>
                      {tip.video?.title || '削除された動画'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatAmount(tip.amount)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {tip.message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
