import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, MailOpen, Trash2 } from "lucide-react";
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
}

export const ContactsManagement = () => {
  const { isAdmin } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showDialog, setShowDialog] = useState(false);

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

  const unreadCount = messages.filter(msg => msg.status === 'unread').length;

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">お問い合わせ一覧</h2>
          <p className="text-muted-foreground mt-1">
            未読: {unreadCount}件 / 全{messages.length}件
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
          messages.map((message) => (
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
                    <div className="flex items-center gap-2 mb-2">
                      {message.status === 'unread' ? (
                        <Mail className="h-4 w-4 text-primary" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant={message.status === 'unread' ? 'default' : 'secondary'}>
                        {message.status === 'unread' ? '未読' : '既読'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg truncate">{message.subject}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{message.name}</span>
                      <span>{message.email}</span>
                      <span>
                        {new Date(message.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
          ))
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
                <div className="col-span-2">
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
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <h4 className="font-semibold mb-2">メッセージ内容:</h4>
              <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                {selectedMessage?.message}
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => selectedMessage && handleDelete(selectedMessage.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedMessage) {
                      window.location.href = `mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`;
                    }
                  }}
                >
                  返信
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
