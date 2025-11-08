import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: string;
  video_url: string | null;
  thumbnail_url: string | null;
  display_order: number;
}

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
  sortBy?: 'order' | 'name' | 'category';
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

      // Apply sorting
      const sortByMapping = {
        'order': 'display_order',
        'name': 'name',
        'category': 'category'
      };
      const sortColumn = sortByMapping[filters.sortBy as keyof typeof sortByMapping] || 'display_order';
      const sortDirection = filters.sortDirection || 'asc';
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
    mutationFn: async (technique: Technique) => {
      const { error } = await supabase
        .from('techniques')
        .update(technique)
        .eq('id', technique.id);

      if (error) throw error;
      return technique;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniques'] });
      toast.success("Success", {
        description: "Technique updated successfully",
      });
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
    mutationFn: async (technique: Omit<Technique, 'id'>) => {
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