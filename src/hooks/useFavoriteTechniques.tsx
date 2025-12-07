import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useFavoriteTechniques = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorite_techniques')
        .select('technique_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites(data?.map(f => f.technique_id) || []);
    } catch (error) {
      console.error('Error fetching favorite techniques:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = useCallback(async (techniqueId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('favorite_techniques')
        .insert({
          user_id: user.id,
          technique_id: techniqueId,
        });

      if (error) throw error;

      setFavorites(prev => [...prev, techniqueId]);
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      return false;
    }
  }, [user]);

  const removeFavorite = useCallback(async (techniqueId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('favorite_techniques')
        .delete()
        .eq('user_id', user.id)
        .eq('technique_id', techniqueId);

      if (error) throw error;

      setFavorites(prev => prev.filter(id => id !== techniqueId));
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
  }, [user]);

  const toggleFavorite = useCallback(async (techniqueId: string, showToast = true) => {
    const isFavorited = favorites.includes(techniqueId);
    
    if (isFavorited) {
      const success = await removeFavorite(techniqueId);
      if (success && showToast) {
        toast.success('お気に入りから削除しました');
      }
      return !success; // Return new state
    } else {
      const success = await addFavorite(techniqueId);
      if (success && showToast) {
        toast.success('お気に入りに追加しました');
      }
      return success; // Return new state
    }
  }, [favorites, addFavorite, removeFavorite]);

  const isFavorite = useCallback((techniqueId: string) => {
    return favorites.includes(techniqueId);
  }, [favorites]);

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
};
