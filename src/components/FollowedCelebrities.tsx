import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search, UserPlus, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BeltBadge } from "@/components/ui/belt-badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FollowedPerson {
  id: string;
  display_name: string;
  avatar_url: string | null;
  belt_history: any;
  featured: boolean;
  user_id: string | null;
  is_celebrity: boolean;
}

interface SearchResult {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  belt_history: any;
  is_following: boolean;
}

interface FollowedCelebritiesProps {
  userId: string;
}

export const FollowedCelebrities = ({ userId }: FollowedCelebritiesProps) => {
  const { language } = useLanguage();
  const [followedPeople, setFollowedPeople] = useState<FollowedPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFollowedCelebrities();
  }, [userId]);

  const loadFollowedCelebrities = async () => {
    setIsLoading(true);
    try {
      const allFollowed: FollowedPerson[] = [];
      const followingSet = new Set<string>();

      // Get celebrity follows
      const { data: celebrityFollows, error: celebrityFollowsError } = await supabase
        .from('celebrity_follows')
        .select('celebrity_id')
        .eq('user_id', userId);

      if (!celebrityFollowsError && celebrityFollows && celebrityFollows.length > 0) {
        const celebrityIds = celebrityFollows.map(f => f.celebrity_id);
        
        const { data: celebs, error: celebsError } = await supabase
          .from('celebrities')
          .select('id, display_name, avatar_url, belt_history, featured, user_id')
          .in('id', celebrityIds);

        if (!celebsError && celebs) {
          allFollowed.push(...celebs.map(c => ({
            ...c,
            is_celebrity: true
          })));
        }
      }

      // Get user follows
      const { data: userFollows, error: userFollowsError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (!userFollowsError && userFollows && userFollows.length > 0) {
        const followingIds = userFollows.map(f => f.following_id);
        followingIds.forEach(id => followingSet.add(id));
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, belt_history, username')
          .in('id', followingIds);

        if (!profilesError && profiles) {
          allFollowed.push(...profiles.map(p => ({
            id: p.id,
            display_name: p.display_name || p.username || 'Unknown',
            avatar_url: p.avatar_url,
            belt_history: p.belt_history,
            featured: false,
            user_id: p.id,
            is_celebrity: false
          })));
        }
      }

      // Sort: featured first, then by name
      allFollowed.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.display_name.localeCompare(b.display_name);
      });

      setFollowedPeople(allFollowed);
      setFollowingIds(followingSet);
    } catch (error) {
      console.error('Error loading followed people:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search public profiles
      const { data, error } = await supabase
        .from('public_profiles')
        .select('id, display_name, username, avatar_url, belt_history')
        .neq('id', userId)
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      const results: SearchResult[] = (data || []).map(p => ({
        ...p,
        is_following: followingIds.has(p.id!)
      }));

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, [userId, followingIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleFollow = async (targetUserId: string) => {
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: userId,
          following_id: targetUserId
        });

      if (error) throw error;

      toast.success(language === "ja" ? "フォローしました" : "Followed successfully");
      setFollowingIds(prev => new Set([...prev, targetUserId]));
      setSearchResults(prev => prev.map(r => 
        r.id === targetUserId ? { ...r, is_following: true } : r
      ));
      loadFollowedCelebrities();
    } catch (error) {
      console.error('Error following user:', error);
      toast.error(language === "ja" ? "フォローに失敗しました" : "Failed to follow");
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', targetUserId);

      if (error) throw error;

      toast.success(language === "ja" ? "フォロー解除しました" : "Unfollowed successfully");
      setFollowingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
      setSearchResults(prev => prev.map(r => 
        r.id === targetUserId ? { ...r, is_following: false } : r
      ));
      loadFollowedCelebrities();
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error(language === "ja" ? "フォロー解除に失敗しました" : "Failed to unfollow");
    }
  };

  const getBeltName = (beltHistory: any[]) => {
    if (!beltHistory || beltHistory.length === 0) return null;
    const latestBelt = beltHistory[beltHistory.length - 1];
    return latestBelt?.belt;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5" />
            {language === "ja" ? "フォロー中の選手" : language === "pt" ? "Atletas Seguidos" : "Following Athletes"}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5" />
          {language === "ja" ? "フォロー中" : language === "pt" ? "Seguindo" : "Following"}
        </h3>
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Search className="w-4 h-4" />
              {language === "ja" ? "ユーザー検索" : "Search Users"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {language === "ja" ? "ユーザーを検索してフォロー" : "Search & Follow Users"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={language === "ja" ? "名前またはユーザー名で検索..." : "Search by name or username..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <Link
                        to={`/${user.username || user.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                        onClick={() => setSearchOpen(false)}
                      >
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-sm">
                            {(user.display_name || user.username || "U")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.display_name || user.username || "Unknown"}
                          </p>
                          {user.username && (
                            <p className="text-xs text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          )}
                          {getBeltName(user.belt_history) && (
                            <BeltBadge 
                              belt={getBeltName(user.belt_history)!} 
                              className="text-[10px] px-1.5 py-0 mt-0.5 inline-block"
                            />
                          )}
                        </div>
                      </Link>
                      <Button
                        variant={user.is_following ? "outline" : "default"}
                        size="sm"
                        onClick={() => user.is_following 
                          ? handleUnfollow(user.id!) 
                          : handleFollow(user.id!)
                        }
                        className="ml-2 shrink-0"
                      >
                        {user.is_following ? (
                          language === "ja" ? "フォロー中" : "Following"
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-1" />
                            {language === "ja" ? "フォロー" : "Follow"}
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                ) : searchQuery.length >= 2 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {language === "ja" ? "ユーザーが見つかりません" : "No users found"}
                  </p>
                ) : searchQuery.length > 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {language === "ja" ? "2文字以上入力してください" : "Enter at least 2 characters"}
                  </p>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {language === "ja" 
                      ? "公開プロフィールのユーザーを検索できます" 
                      : "Search for users with public profiles"}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {followedPeople.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground mb-4">
              {language === "ja" 
                ? "まだ誰もフォローしていません" 
                : language === "pt" 
                ? "Você ainda não segue ninguém" 
                : "You're not following anyone yet"}
            </p>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
                <Search className="w-4 h-4 mr-2" />
                {language === "ja" ? "ユーザーを探す" : "Find users"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {followedPeople.map((person) => (
            <Link
              key={person.id}
              to={person.is_celebrity ? `/athlete/${person.user_id || person.id}` : `/${person.user_id}`}
              className="group"
            >
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="relative">
                  <Avatar className="h-14 w-14 border border-border group-hover:border-primary transition-colors">
                    <AvatarImage src={person.avatar_url || undefined} />
                    <AvatarFallback className="text-sm">
                      {person.display_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {person.featured && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />
                  )}
                </div>
                <div className="text-center w-full">
                  <p className="font-medium text-xs truncate group-hover:text-primary transition-colors">
                    {person.display_name}
                  </p>
                  {getBeltName(person.belt_history) && (
                    <BeltBadge 
                      belt={getBeltName(person.belt_history)!} 
                      className="text-[10px] px-1.5 py-0 mt-0.5 inline-block"
                    />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
