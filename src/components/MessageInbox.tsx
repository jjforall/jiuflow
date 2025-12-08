import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { MessageCircle, Users, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { MessageDialog } from './MessageDialog';
import { GroupMessageDialog } from './GroupMessageDialog';
import { CreateGroupDialog } from './CreateGroupDialog';

interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  recipientId?: string;
  groupId?: string;
}

export const MessageInbox = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDM, setSelectedDM] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    if (!user) return;

    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Load DM conversations
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .is('group_id', null)
        .order('created_at', { ascending: false });

      // Group by conversation partner
      const conversationMap = new Map<string, any>();
      
      for (const msg of messages || []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: msg.receiver_id === user.id && !msg.read_at ? 1 : 0
          });
        } else if (msg.receiver_id === user.id && !msg.read_at) {
          conversationMap.get(partnerId).unreadCount++;
        }
      }

      // Get partner profiles
      const partnerIds = Array.from(conversationMap.keys());
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('id, display_name, avatar_url')
          .in('id', partnerIds);

        const convos: Conversation[] = [];
        for (const [partnerId, data] of conversationMap) {
          const profile = profiles?.find(p => p.id === partnerId);
          convos.push({
            id: partnerId,
            type: 'dm',
            name: profile?.display_name || 'Unknown',
            avatar: profile?.avatar_url || undefined,
            lastMessage: data.lastMessage,
            lastMessageAt: data.lastMessageAt,
            unreadCount: data.unreadCount,
            recipientId: partnerId
          });
        }

        // Sort by last message
        convos.sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });

        setConversations(convos);
      }

      // Load group conversations
      const { data: memberData } = await supabase
        .from('message_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberData && memberData.length > 0) {
        const groupIds = memberData.map(m => m.group_id);

        const { data: groupsData } = await supabase
          .from('message_groups')
          .select('*')
          .in('id', groupIds);

        // Get last message for each group
        const groupConvos: Conversation[] = [];
        for (const group of groupsData || []) {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread (messages without read receipt from this user)
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .neq('sender_id', user.id)
            .not('id', 'in', `(SELECT message_id FROM message_read_receipts WHERE user_id = '${user.id}')`);

          groupConvos.push({
            id: group.id,
            type: 'group',
            name: group.name,
            avatar: group.avatar_url || undefined,
            lastMessage: lastMsg?.content,
            lastMessageAt: lastMsg?.created_at,
            unreadCount: unreadCount || 0,
            groupId: group.id
          });
        }

        groupConvos.sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });

        setGroups(groupConvos);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }

    setIsLoading(false);
  };

  const renderConversationItem = (convo: Conversation) => (
    <div
      key={convo.id}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
      onClick={() => {
        if (convo.type === 'dm') {
          setSelectedDM({ id: convo.recipientId!, name: convo.name, avatar: convo.avatar });
        } else {
          setSelectedGroup({ id: convo.groupId!, name: convo.name, avatar: convo.avatar });
        }
      }}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          {convo.type === 'group' && !convo.avatar ? (
            <AvatarFallback>
              <Users className="h-4 w-4" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={convo.avatar} />
              <AvatarFallback>{convo.name.charAt(0).toUpperCase()}</AvatarFallback>
            </>
          )}
        </Avatar>
        {convo.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
            {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`font-medium truncate ${convo.unreadCount > 0 ? 'text-foreground' : 'text-foreground'}`}>
            {convo.name}
          </span>
          {convo.lastMessageAt && (
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {format(new Date(convo.lastMessageAt), 'MM/dd')}
            </span>
          )}
        </div>
        {convo.lastMessage && (
          <p className={`text-sm truncate ${convo.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            {convo.lastMessage}
          </p>
        )}
      </div>
    </div>
  );

  if (!user) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {t('messages', 'メッセージ')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dm">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="dm" className="flex-1">
                <MessageCircle className="h-4 w-4 mr-2" />
                DM
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                {t('groups', 'グループ')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dm">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {t('noConversations', 'まだ会話はありません')}
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {conversations.map(renderConversationItem)}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="groups">
              <Button
                variant="outline"
                className="w-full mb-4"
                onClick={() => setShowCreateGroup(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('createGroup', 'グループを作成')}
              </Button>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {t('noGroups', 'グループはありません')}
                </div>
              ) : (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-1">
                    {groups.map(renderConversationItem)}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* DM Dialog */}
      {selectedDM && (
        <MessageDialog
          open={!!selectedDM}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDM(null);
              loadConversations();
            }
          }}
          recipientId={selectedDM.id}
          recipientName={selectedDM.name}
          recipientAvatar={selectedDM.avatar}
        />
      )}

      {/* Group Dialog */}
      {selectedGroup && (
        <GroupMessageDialog
          open={!!selectedGroup}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedGroup(null);
              loadConversations();
            }
          }}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          groupAvatar={selectedGroup.avatar}
        />
      )}

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onGroupCreated={() => loadConversations()}
      />
    </>
  );
};
