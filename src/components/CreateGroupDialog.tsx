import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Loader2, Users, Search } from 'lucide-react';
import { toast } from 'sonner';

interface FollowedUser {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: (groupId: string) => void;
}

export const CreateGroupDialog = ({
  open,
  onOpenChange,
  onGroupCreated
}: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    const loadFollowedUsers = async () => {
      setIsLoading(true);

      // Get users this user is following
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (follows && follows.length > 0) {
        const followingIds = follows.map(f => f.following_id);

        // Get profiles for followed users
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('id, display_name, avatar_url')
          .in('id', followingIds);

        if (profiles) {
          setFollowedUsers(
            profiles.map(p => ({
              id: p.id || '',
              user_id: p.id || '',
              display_name: p.display_name,
              avatar_url: p.avatar_url
            }))
          );
        }
      }

      setIsLoading(false);
    };

    loadFollowedUsers();
    setGroupName('');
    setSelectedUserIds(new Set());
    setSearchQuery('');
  }, [open, user]);

  const filteredUsers = followedUsers.filter(u => 
    !searchQuery || 
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleCreate = async () => {
    if (!user || !groupName.trim() || selectedUserIds.size === 0) return;

    setIsCreating(true);

    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('message_groups')
        .insert({
          name: groupName.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as member
      const members = [
        { group_id: group.id, user_id: user.id },
        ...Array.from(selectedUserIds).map(userId => ({
          group_id: group.id,
          user_id: userId
        }))
      ];

      const { error: membersError } = await supabase
        .from('message_group_members')
        .insert(members);

      if (membersError) throw membersError;

      toast.success(t('groupCreated', 'グループを作成しました'));
      onOpenChange(false);
      onGroupCreated?.(group.id);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(t('groupCreateError', 'グループの作成に失敗しました'));
    }

    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('createGroup', 'グループを作成')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="groupName">{t('groupName', 'グループ名')}</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('enterGroupName', 'グループ名を入力...')}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{t('selectMembers', 'メンバーを選択')}</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchUsers', 'ユーザーを検索...')}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-[200px] border rounded-lg p-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                {searchQuery 
                  ? t('noUsersFound', '該当するユーザーがいません')
                  : t('noFollowing', 'フォロー中のユーザーがいません')
                }
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => toggleUser(user.user_id)}
                  >
                    <Checkbox
                      checked={selectedUserIds.has(user.user_id)}
                      onCheckedChange={() => toggleUser(user.user_id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {user.display_name || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedUserIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedUserIds.size} {t('usersSelected', '人選択中')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            {t('cancel', 'キャンセル')}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedUserIds.size === 0 || isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {t('create', '作成')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
