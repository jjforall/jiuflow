import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StorageCheckResult {
  can_upload: boolean;
  current_usage: number;
  storage_limit: number;
  remaining: number;
  is_subscribed: boolean;
}

interface StorageInfo {
  currentUsage: number;
  storageLimit: number;
  remaining: number;
  isSubscribed: boolean;
  loading: boolean;
}

export const useStorageLimit = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    currentUsage: 0,
    storageLimit: 107374182400, // 100GB default
    remaining: 107374182400,
    isSubscribed: false,
    loading: true,
  });

  const fetchStorageInfo = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setStorageInfo(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_storage_limit', {
        p_user_id: user.id,
        p_file_size: 0
      });

      if (error) {
        console.error('Error checking storage limit:', error);
        return;
      }

      const result = data as unknown as StorageCheckResult;
      setStorageInfo({
        currentUsage: result.current_usage || 0,
        storageLimit: result.storage_limit || 107374182400,
        remaining: result.remaining || 107374182400,
        isSubscribed: result.is_subscribed || false,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching storage info:', error);
      setStorageInfo(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const checkCanUpload = useCallback(async (fileSize: number): Promise<{
    canUpload: boolean;
    currentUsage: number;
    storageLimit: number;
    remaining: number;
  }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { canUpload: false, currentUsage: 0, storageLimit: 0, remaining: 0 };
    }

    try {
      const { data, error } = await supabase.rpc('check_storage_limit', {
        p_user_id: user.id,
        p_file_size: fileSize
      });

      if (error) {
        console.error('Error checking storage limit:', error);
        return { canUpload: false, currentUsage: 0, storageLimit: 0, remaining: 0 };
      }

      const result = data as unknown as StorageCheckResult;
      return {
        canUpload: result.can_upload,
        currentUsage: result.current_usage,
        storageLimit: result.storage_limit,
        remaining: result.remaining,
      };
    } catch (error) {
      console.error('Error checking upload permission:', error);
      return { canUpload: false, currentUsage: 0, storageLimit: 0, remaining: 0 };
    }
  }, []);

  useEffect(() => {
    fetchStorageInfo();
  }, [fetchStorageInfo]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    ...storageInfo,
    checkCanUpload,
    refetch: fetchStorageInfo,
    formatBytes,
  };
};
