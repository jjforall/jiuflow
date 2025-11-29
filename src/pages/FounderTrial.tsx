import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function FounderTrial() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("メールアドレスを入力してください");
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("create-founder-trial-link", {
        body: { email }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success("支払いページを開きました");
      } else {
        throw new Error("URLが取得できませんでした");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Founder Plan 3ヶ月無料トライアル</CardTitle>
          <CardDescription>
            ¥980/月のFounder Planを3ヶ月間無料でお試しいただけます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                "申し込む"
              )}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>3ヶ月間無料でご利用いただけます</li>
              <li>トライアル終了後は月額¥980が請求されます</li>
              <li>いつでもキャンセル可能です</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
