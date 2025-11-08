// Admin dashboard related type definitions

export interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: string;
  video_url: string | null;
  display_order: number;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
}

export interface Profile {
  id: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  stripe_customer_id: string | null;
  user_roles?: Array<{ role: string }>;
}

export interface Plan {
  id: string;
  stripe_price_id: string;
  price_jpy: number;
  interval: string;
  display_order: number;
  features_en: string[];
  features_ja: string[];
  features_pt: string[];
  name_en: string;
  name_ja: string;
  name_pt: string;
  is_active: boolean;
}

export interface TechniqueFormData {
  name: string;
  name_ja: string;
  name_pt: string;
  description: string;
  description_ja: string;
  description_pt: string;
  category: "pull" | "control" | "submission" | "guard-pass";
}

export interface NewUserData {
  email: string;
  password: string;
  role: "admin" | "user";
}