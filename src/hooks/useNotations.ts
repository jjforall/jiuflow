import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BJJNotation, NotationCategory, TechniqueNotation } from '@/types/notation';

// Fetch all notations with technique counts
export const useNotations = (category?: NotationCategory) => {
  return useQuery({
    queryKey: ['bjj_notations', category],
    queryFn: async (): Promise<BJJNotation[]> => {
      // Get notations
      let query = supabase
        .from('bjj_notations')
        .select('*')
        .order('category')
        .order('display_order');

      if (category) {
        query = query.eq('category', category);
      }

      const { data: notations, error } = await query;
      if (error) throw error;

      // Get technique counts
      const { data: counts, error: countError } = await supabase
        .from('technique_notations')
        .select('notation_id');
      
      if (countError) throw countError;

      // Count occurrences per notation
      const countMap: Record<string, number> = {};
      counts?.forEach(item => {
        countMap[item.notation_id] = (countMap[item.notation_id] || 0) + 1;
      });

      // Merge counts into notations and sort by technique_count descending
      const withCounts = (notations || []).map(n => ({
        ...n,
        technique_count: countMap[n.id] || 0,
      })) as BJJNotation[];
      
      // Sort by technique_count descending (most videos first)
      withCounts.sort((a, b) => (b.technique_count || 0) - (a.technique_count || 0));
      
      return withCounts;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Create notation
export const useCreateNotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notation: Omit<BJJNotation, 'id' | 'created_at' | 'updated_at' | 'technique_count'>) => {
      const { data, error } = await supabase
        .from('bjj_notations')
        .insert([notation])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bjj_notations'] });
      toast.success('略称を作成しました');
    },
    onError: (error: Error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });
};

// Update notation
export const useUpdateNotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notation: Partial<BJJNotation> & { id: string }) => {
      const { id, technique_count, ...updateData } = notation;
      const { data, error } = await supabase
        .from('bjj_notations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bjj_notations'] });
      toast.success('略称を更新しました');
    },
    onError: (error: Error) => {
      toast.error(`更新に失敗しました: ${error.message}`);
    },
  });
};

// Delete notation
export const useDeleteNotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bjj_notations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bjj_notations'] });
      toast.success('略称を削除しました');
    },
    onError: (error: Error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });
};

// Fetch notations for a specific technique
export const useTechniqueNotations = (techniqueId: string | undefined) => {
  return useQuery({
    queryKey: ['technique_notations', techniqueId],
    queryFn: async (): Promise<TechniqueNotation[]> => {
      if (!techniqueId) return [];

      const { data, error } = await supabase
        .from('technique_notations')
        .select(`
          *,
          notation:bjj_notations(*)
        `)
        .eq('technique_id', techniqueId);

      if (error) throw error;
      return (data || []) as unknown as TechniqueNotation[];
    },
    enabled: !!techniqueId,
  });
};

// Add notation to technique
export const useAddTechniqueNotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ techniqueId, notationId, context = 'general' }: { 
      techniqueId: string; 
      notationId: string; 
      context?: string 
    }) => {
      const { data, error } = await supabase
        .from('technique_notations')
        .insert([{ technique_id: techniqueId, notation_id: notationId, context }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['technique_notations', variables.techniqueId] });
      queryClient.invalidateQueries({ queryKey: ['bjj_notations'] });
    },
    onError: (error: Error) => {
      toast.error(`追加に失敗しました: ${error.message}`);
    },
  });
};

// Remove notation from technique
export const useRemoveTechniqueNotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, techniqueId }: { id: string; techniqueId: string }) => {
      const { error } = await supabase
        .from('technique_notations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, techniqueId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['technique_notations', variables.techniqueId] });
      queryClient.invalidateQueries({ queryKey: ['bjj_notations'] });
    },
    onError: (error: Error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });
};

// Get category statistics
export const useNotationStats = () => {
  return useQuery({
    queryKey: ['notation_stats'],
    queryFn: async () => {
      const { data: notations, error } = await supabase
        .from('bjj_notations')
        .select('category, id');

      if (error) throw error;

      const { data: links, error: linkError } = await supabase
        .from('technique_notations')
        .select('notation_id');

      if (linkError) throw linkError;

      const stats: Record<NotationCategory, { total: number; linked: number }> = {
        position: { total: 0, linked: 0 },
        action: { total: 0, linked: 0 },
        submission: { total: 0, linked: 0 },
        grip: { total: 0, linked: 0 },
        movement: { total: 0, linked: 0 },
        takedown: { total: 0, linked: 0 },
        outcome: { total: 0, linked: 0 },
      };

      const linkedNotationIds = new Set(links?.map(l => l.notation_id) || []);

      notations?.forEach(n => {
        const cat = n.category as NotationCategory;
        stats[cat].total++;
        if (linkedNotationIds.has(n.id)) {
          stats[cat].linked++;
        }
      });

      return stats;
    },
  });
};
