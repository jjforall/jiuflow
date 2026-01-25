import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, MailOpen, Trash2, Send, Copy, Clock, Reply, AlertCircle, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
  replied_at?: string | null;
  reply_content?: string | null;
}

// Complete ready-to-send reply templates
const REPLY_TEMPLATES = {
  delayed: {
    label: "遅延お詫び",
    getContent: (name: string) => `${name}様

お問い合わせいただきありがとうございます。
お返事が遅くなり、大変申し訳ございません。

`,
  },
  search: {
    label: "検索方法",
    getContent: (name: string) => `${name}様

お問い合わせいただきありがとうございます。

技マップの検索についてご案内いたします。

【技マップの使い方】
JiuFlowにログイン後、画面上部メニューの「技マップ」からアクセスできます。

1. 検索バーに技名を入力してください（例：「腕十字」「アームロック」など）
2. 日本語・英語・ポルトガル語で検索可能です
3. 左側のシリーズ名をクリックすると、そのシリーズの全技一覧が表示されます

【すべての動画を見る方法】
サブスクリプション会員の方は、すべての技動画をご視聴いただけます。
「入会当初に設定した技」という制限はございません。全ての動画がご覧いただけます。

もし特定の動画が見られない場合は、以下をお試しください：
1. 一度ログアウトして、再度ログインする
2. ブラウザのキャッシュをクリアする
3. 別のブラウザ（Chrome推奨）でアクセスする

それでも解決しない場合は、お気軽にご連絡ください。

どうぞよろしくお願いいたします。

JiuFlow サポート`,
  },
  cancel: {
    label: "解約方法",
    getContent: (name: string) => `${name}様

お問い合わせいただきありがとうございます。
解約方法についてご案内いたします。

【解約手順】
1. JiuFlow（https://jiuflow.art）にログインしてください
2. 右上のプロフィールアイコンをクリック
3. 「マイページ」を選択
4. ページ下部の「サブスクリプション設定」セクションへスクロール
5. 「解約する」ボタンをクリック

解約後も、現在の課金期間の終了日までは引き続きサービスをご利用いただけます。

ご不明な点がございましたら、お気軽にお問い合わせください。

どうぞよろしくお願いいたします。

JiuFlow サポート`,
  },
  referral_done: {
    label: "紹介コード適用完了",
    getContent: (name: string) => `${name}様

お問い合わせいただきありがとうございます。

ご依頼いただいた紹介コード「MURATABJJ」の適用処理が完了いたしました。

【変更内容】
・旧プラン：通常プラン（¥1,900/月）
・新プラン：村田良蔵アソシエーションプラン（¥1,480/月）

次回の課金から新しい料金が適用されます。

今後ともJiuFlowをよろしくお願いいたします。

JiuFlow サポート`,
  },
  referral: {
    label: "紹介コード",
    getContent: (name: string) => `${name}様

お問い合わせいただきありがとうございます。
紹介コードの適用について対応いたします。

こちらで手動にて紹介コードの適用処理を行います。
お手数をおかけしますが、このままお待ちください。

適用が完了しましたら、改めてご連絡いたします。

どうぞよろしくお願いいたします。

JiuFlow サポート`,
  },
  login: {
    label: "ログイン方法",
    getContent: (name: string) => `${name}様

お問い合わせいただきありがとうございます。

ログイン方法と動画再生についてご案内いたします。

【ログイン手順】
1. JiuFlow（https://jiuflow.art）にアクセス
2. 右上の「ログイン」ボタンをクリック
3. 「Googleでログイン」を選択してサインイン
4. ログイン完了後、自動的にマイページに移動します

【ログイン済みの確認方法】
ログインが成功すると、右上にプロフィールアイコンが表示されます。
アイコンが表示されていれば、ログイン完了です。

【動画が再生できない場合】
1. ブラウザのキャッシュをクリアしてください
2. 別のブラウザ（Chrome推奨）でお試しください
3. 広告ブロッカーやVPNを無効にしてください
4. Wi-Fiではなくモバイル回線でお試しください

【サブスクリプションについて】
動画を視聴するには、サブスクリプションへのお申し込みが必要です。
ログイン後、「入会」ページからプランをお選びください。

ご不明な点がございましたら、お気軽にお問い合わせください。

どうぞよろしくお願いいたします。

JiuFlow サポート`,
  },
};

// Calculate elapsed time
const getElapsedTime = (createdAt: string): { text: string; isDelayed: boolean; days: number } => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return { text: "今日", isDelayed: false, days };
  if (days === 1) return { text: "昨日", isDelayed: false, days };
  if (days < 3) return { text: `${days}日前`, isDelayed: false, days };
  if (days < 7) return { text: `${days}日前`, isDelayed: true, days };
  if (days < 30) return { text: `${Math.floor(days / 7)}週間前`, isDelayed: true, days };
  return { text: `${Math.floor(days / 30)}ヶ月前`, isDelayed: true, days };
};

export const ContactsManagement = () => {
  const { isAdmin } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages((data || []).map(msg => ({
        ...msg,
        status: msg.status as 'read' | 'unread'
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error("メッセージの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = async (message: ContactMessage) => {
    setSelectedMessage(message);
    setShowDialog(true);

    // Mark as read if unread
    if (message.status === 'unread') {
      try {
        const { error } = await supabase
          .from('contact_messages')
          .update({ status: 'read' })
          .eq('id', message.id);

        if (error) throw error;

        // Update local state
        setMessages(prev =>
          prev.map(msg =>
            msg.id === message.id ? { ...msg, status: 'read' as const } : msg
          )
        );
      } catch (error) {
        console.error('Error updating message status:', error);
      }
    }
  };

  const handleMarkAsUnread = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'unread' })
        .eq('id', id);

      if (error) throw error;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === id ? { ...msg, status: 'unread' as const } : msg
        )
      );
      setSelectedMessage(prev => prev ? { ...prev, status: 'unread' as const } : null);
      toast.success("未読に戻しました");
    } catch (error) {
      console.error('Error marking message as unread:', error);
      toast.error("未読への変更に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error("削除権限がありません");
      return;
    }

    if (!confirm("このメッセージを削除してもよろしいですか？")) return;

    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== id));
      toast.success("メッセージを削除しました");
      setShowDialog(false);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error("削除に失敗しました");
    }
  };

  const handleOpenReplyDialog = () => {
    if (!selectedMessage) return;
    
    const elapsed = getElapsedTime(selectedMessage.created_at);
    
    // Auto-insert delayed apology if more than 3 days
    if (elapsed.days >= 3) {
      setReplyContent(REPLY_TEMPLATES.delayed.getContent(selectedMessage.name.replace('様', '')));
    } else {
      setReplyContent(`${selectedMessage.name.replace('様', '')}様

お問い合わせいただきありがとうございます。

`);
    }
    
    setShowReplyDialog(true);
  };

  const handleApplyTemplate = (templateKey: keyof typeof REPLY_TEMPLATES) => {
    if (!selectedMessage) return;
    const template = REPLY_TEMPLATES[templateKey];
    const name = selectedMessage.name.replace('様', '');
    
    // If it's delayed template, append to existing content
    if (templateKey === 'delayed') {
      setReplyContent(template.getContent(name) + replyContent.replace(new RegExp(`^${name}様[\\s\\S]*?申し訳ございません。\\n\\n`, 'm'), ''));
    } else {
      // Replace the content with the new template
      setReplyContent(template.getContent(name));
    }
  };

  const handleCopyReply = async () => {
    try {
      await navigator.clipboard.writeText(replyContent);
      toast.success("クリップボードにコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };


  const handleSendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      toast.error("返信内容を入力してください");
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("ログインが必要です");
        return;
      }

      const response = await supabase.functions.invoke('send-reply-email', {
        body: {
          to: selectedMessage.email,
          name: selectedMessage.name,
          subject: selectedMessage.subject,
          content: replyContent,
          originalMessageId: selectedMessage.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "送信に失敗しました");
      }

      toast.success("返信メールを送信しました");
      
      // Update local state
      setMessages(prev =>
        prev.map(msg =>
          msg.id === selectedMessage.id
            ? { ...msg, replied_at: new Date().toISOString(), reply_content: replyContent }
            : msg
        )
      );
      
      setShowReplyDialog(false);
      setShowDialog(false);
      setReplyContent("");
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error instanceof Error ? error.message : "返信の送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  const unreadCount = messages.filter(msg => msg.status === 'unread').length;
  const unrepliedCount = messages.filter(msg => !msg.replied_at).length;

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">お問い合わせ一覧</h2>
          <p className="text-sm text-muted-foreground mt-1">
            未読: {unreadCount}件 / 未返信: {unrepliedCount}件 / 全{messages.length}件
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              お問い合わせはまだありません
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => {
            const elapsed = getElapsedTime(message.created_at);
            return (
              <Card
                key={message.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  message.status === 'unread' ? 'border-l-4 border-l-primary' : ''
                }`}
                onClick={() => handleViewMessage(message)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {message.status === 'unread' ? (
                          <Mail className="h-4 w-4 text-primary" />
                        ) : (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Badge variant={message.status === 'unread' ? 'default' : 'secondary'}>
                          {message.status === 'unread' ? '未読' : '既読'}
                        </Badge>
                        {message.replied_at ? (
                          <Badge variant="secondary" className="border">
                            <Check className="h-3 w-3 mr-1" />
                            返信済
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            未返信
                          </Badge>
                        )}
                        {elapsed.isDelayed && !message.replied_at && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            対応遅延
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base sm:text-lg truncate">{message.subject}</CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="truncate">{message.name}</span>
                        <span className="truncate">{message.email}</span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {elapsed.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {message.message}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Message Detail Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMessage?.status === 'unread' ? (
                <Mail className="h-5 w-5 text-primary" />
              ) : (
                <MailOpen className="h-5 w-5 text-muted-foreground" />
              )}
              {selectedMessage?.subject}
            </DialogTitle>
            <DialogDescription className="space-y-2 text-left">
              <div className="grid grid-cols-2 gap-2 pt-4">
                <div>
                  <span className="font-semibold">送信者:</span> {selectedMessage?.name}
                </div>
                <div>
                  <span className="font-semibold">メール:</span> {selectedMessage?.email}
                </div>
                <div>
                  <span className="font-semibold">送信日時:</span>{' '}
                  {selectedMessage &&
                    new Date(selectedMessage.created_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                </div>
                <div>
                  <span className="font-semibold">経過時間:</span>{' '}
                  {selectedMessage && (
                    <>
                      {getElapsedTime(selectedMessage.created_at).text}
                      {getElapsedTime(selectedMessage.created_at).isDelayed && !selectedMessage.replied_at && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          対応遅延
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
              {selectedMessage?.replied_at && (
                <div className="pt-2">
                  <Badge variant="secondary">
                    <Check className="h-3 w-3 mr-1" />
                    返信済: {new Date(selectedMessage.replied_at).toLocaleDateString('ja-JP', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <h4 className="font-semibold mb-2">メッセージ内容:</h4>
              <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                {selectedMessage?.message}
              </div>
            </div>

            {selectedMessage?.reply_content && (
              <div>
                <h4 className="font-semibold mb-2">送信済み返信:</h4>
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm border border-border">
                  {selectedMessage.reply_content}
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="flex justify-end gap-2 pt-4 border-t flex-wrap">
                {selectedMessage?.status === 'read' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedMessage && handleMarkAsUnread(selectedMessage.id)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    未読に戻す
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => selectedMessage && handleDelete(selectedMessage.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  対応不要
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenReplyDialog}
                >
                  <Reply className="h-4 w-4 mr-2" />
                  返信作成
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="h-5 w-5" />
              返信作成
            </DialogTitle>
            <DialogDescription>
              宛先: {selectedMessage?.name} ({selectedMessage?.email})
              {selectedMessage && getElapsedTime(selectedMessage.created_at).isDelayed && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {getElapsedTime(selectedMessage.created_at).text} - 対応遅延
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <h4 className="font-semibold mb-2 text-sm">テンプレート選択:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(REPLY_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyTemplate(key as keyof typeof REPLY_TEMPLATES)}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">返信内容:</h4>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={15}
                className="font-mono text-sm"
                placeholder="返信内容を入力..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReply}
              >
                <Copy className="h-4 w-4 mr-2" />
                クリップボードにコピー
              </Button>
              <Button
                size="sm"
                onClick={handleSendReply}
                disabled={isSending || !replyContent.trim()}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Resendで送信
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
