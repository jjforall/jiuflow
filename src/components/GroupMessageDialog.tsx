import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Send, Loader2, Paperclip, X, Image, FileText, Download, Check, CheckCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  group_id: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

interface GroupMember {
  user_id: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string;
}

interface GroupMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  groupAvatar?: string;
}

export const GroupMessageDialog = ({
  open,
  onOpenChange,
  groupId,
  groupName,
  groupAvatar
}: GroupMessageDialogProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user || !groupId) return;

    const loadData = async () => {
      setIsLoading(true);

      // Load members
      const { data: membersData } = await supabase
        .from('message_group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (membersData) {
        const memberProfiles = await Promise.all(
          membersData.map(async (m) => {
            const { data: profile } = await supabase
              .from('public_profiles')
              .select('display_name, avatar_url')
              .eq('id', m.user_id)
              .single();
            return { user_id: m.user_id, profile: profile || undefined };
          })
        );
        setMembers(memberProfiles);
      }

      // Load messages
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
      } else {
        setMessages(messagesData || []);

        // Load read receipts
        const messageIds = (messagesData || []).map(m => m.id);
        if (messageIds.length > 0) {
          const { data: receipts } = await supabase
            .from('message_read_receipts')
            .select('*')
            .in('message_id', messageIds);
          setReadReceipts(receipts || []);
        }

        // Mark messages as read
        const unreadMessageIds = (messagesData || [])
          .filter(m => m.sender_id !== user.id)
          .map(m => m.id);

        for (const msgId of unreadMessageIds) {
          const existingReceipt = readReceipts.find(
            r => r.message_id === msgId && r.user_id === user.id
          );
          if (!existingReceipt) {
            await supabase.from('message_read_receipts').upsert({
              message_id: msgId,
              user_id: user.id
            }, { onConflict: 'message_id,user_id' });
          }
        }
      }

      setIsLoading(false);
    };

    loadData();

    // Subscribe to realtime
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read if from someone else
          if (newMsg.sender_id !== user.id) {
            supabase.from('message_read_receipts').upsert({
              message_id: newMsg.id,
              user_id: user.id
            }, { onConflict: 'message_id,user_id' });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts'
        },
        (payload) => {
          const newReceipt = payload.new as ReadReceipt;
          setReadReceipts(prev => {
            if (prev.some(r => r.message_id === newReceipt.message_id && r.user_id === newReceipt.user_id)) {
              return prev;
            }
            return [...prev, newReceipt];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user, groupId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('fileTooLarge', 'ファイルサイズは10MB以下にしてください'));
      return;
    }

    setSelectedFile(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string; name: string } | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: signedData } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    return {
      url: signedData?.signedUrl || '',
      type: file.type,
      name: file.name
    };
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || !user || isSending) return;

    setIsSending(true);

    try {
      let attachmentData: { url: string; type: string; name: string } | null = null;

      if (selectedFile) {
        attachmentData = await uploadFile(selectedFile);
      }

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        group_id: groupId,
        content: newMessage.trim(),
        attachment_url: attachmentData?.url || null,
        attachment_type: attachmentData?.type || null,
        attachment_name: attachmentData?.name || null
      });

      if (error) {
        console.error('Error sending message:', error);
        toast.error(t('messageSendError', 'メッセージの送信に失敗しました'));
      } else {
        setNewMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('messageSendError', 'メッセージの送信に失敗しました'));
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isImageType = (type: string | null | undefined) => {
    return type?.startsWith('image/');
  };

  const getSenderInfo = (senderId: string) => {
    const member = members.find(m => m.user_id === senderId);
    return {
      name: member?.profile?.display_name || 'Unknown',
      avatar: member?.profile?.avatar_url || undefined
    };
  };

  const getReadCount = (messageId: string) => {
    return readReceipts.filter(r => r.message_id === messageId).length;
  };

  const renderAttachment = (message: Message, isOwn: boolean) => {
    if (!message.attachment_url) return null;

    if (isImageType(message.attachment_type)) {
      return (
        <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img
            src={message.attachment_url}
            alt={message.attachment_name || 'Image'}
            className="max-w-full max-h-48 rounded-lg object-cover"
          />
        </a>
      );
    }

    return (
      <a
        href={message.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 mt-2 p-2 rounded transition-colors ${
          isOwn ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' : 'bg-background/50 hover:bg-background/80'
        }`}
      >
        <FileText className="h-4 w-4" />
        <span className="text-sm truncate flex-1">{message.attachment_name || 'File'}</span>
        <Download className="h-4 w-4" />
      </a>
    );
  };

  const renderReadStatus = (message: Message) => {
    if (message.sender_id !== user?.id) return null;

    const readCount = getReadCount(message.id);
    const totalMembers = members.length - 1; // Exclude sender

    if (readCount >= totalMembers && totalMembers > 0) {
      return (
        <div className="flex items-center gap-1">
          <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
          <span className="text-[10px] text-primary-foreground/70">{readCount}</span>
        </div>
      );
    } else if (readCount > 0) {
      return (
        <div className="flex items-center gap-1">
          <Check className="h-3 w-3 text-primary-foreground/50" />
          <span className="text-[10px] text-primary-foreground/50">{readCount}</span>
        </div>
      );
    }
    return <Check className="h-3 w-3 text-primary-foreground/30" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[75vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {groupAvatar ? (
                <AvatarImage src={groupAvatar} />
              ) : (
                <AvatarFallback>
                  <Users className="h-4 w-4" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <span>{groupName}</span>
              <p className="text-xs text-muted-foreground font-normal">
                {members.length} {t('members', 'メンバー')}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t('noMessages', 'メッセージはまだありません')}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                const senderInfo = getSenderInfo(message.sender_id);
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwn && (
                      <Avatar className="h-6 w-6 mr-2 mt-1 shrink-0">
                        <AvatarImage src={senderInfo.avatar} />
                        <AvatarFallback className="text-xs">
                          {senderInfo.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {senderInfo.name}
                        </p>
                      )}
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}
                      {renderAttachment(message, isOwn)}
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                        <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {format(new Date(message.created_at), 'MM/dd HH:mm')}
                        </span>
                        {renderReadStatus(message)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {selectedFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={removeSelectedFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-[60px] w-[50px] shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('typeMessage', 'メッセージを入力...')}
            className="min-h-[60px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedFile) || isSending}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
