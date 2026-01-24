import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Technique = Tables<'techniques'>;
export type TechniqueInsert = TablesInsert<'techniques'>;
export type TechniqueUpdate = TablesUpdate<'techniques'>;

interface PaginatedResponse {
  data: Technique[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface TechniqueFilters {
  search?: string;
  category?: string;
  series?: string;
  seriesType?: 'regular' | 'special' | 'all';
  sortBy?: 'order' | 'name' | 'category' | 'series' | 'created';
  sortDirection?: 'asc' | 'desc';
}

export const usePaginatedTechniques = (
  page: number = 1,
  pageSize: number = 50,
  filters: TechniqueFilters = {}
) => {
  const queryKey = ['techniques', page, pageSize, filters];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedResponse> => {
      let query = supabase
        .from('techniques')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,name_ja.ilike.%${filters.search}%,name_pt.ilike.%${filters.search}%`
        );
      }

      // Apply category filter
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      // Apply series filter
      if (filters.series && filters.series !== 'all') {
        query = query.eq('series_prefix', filters.series);
      }

      // Apply series type filter (regular vs special)
      if (filters.seriesType === 'special') {
        query = query.or('series_prefix.is.null,series_prefix.eq.');
      } else if (filters.seriesType === 'regular') {
        query = query.not('series_prefix', 'is', null).neq('series_prefix', '');
      }

      // Apply sorting
      const sortByMapping = {
        'order': 'display_order',
        'name': 'name',
        'category': 'category',
        'series': 'series_prefix',
        'created': 'created_at'
      };
      const sortColumn = sortByMapping[filters.sortBy as keyof typeof sortByMapping] || 'display_order';
      // For created_at, default to descending (newest first)
      const sortDirection = filters.sortBy === 'created' 
        ? (filters.sortDirection || 'desc')
        : (filters.sortDirection || 'asc');
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

export const useUpdateTechnique = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (technique: TechniqueUpdate & { id: string }) => {
      const { id, ...updateData } = technique;
      const { error } = await supabase
        .from('techniques')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return technique;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniques'] });
    },
    onError: (error) => {
      toast.error("Error", {
        description: `Failed to update technique: ${error.message}`,
      });
    },
  });
};

export const useDeleteTechnique = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('techniques')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniques'] });
      toast.success("Success", {
        description: "Technique deleted successfully",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: `Failed to delete technique: ${error.message}`,
      });
    },
  });
};

export const useCreateTechnique = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (technique: TechniqueInsert) => {
      const { data, error } = await supabase
        .from('techniques')
        .insert([technique])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniques'] });
      toast.success("Success", {
        description: "Technique created successfully",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: `Failed to create technique: ${error.message}`,
      });
    },
  });
};
