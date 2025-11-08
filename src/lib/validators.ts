import { z } from "zod";

// Password validation schema
export const passwordSchema = z
  .string()
  .min(12, "パスワードは12文字以上である必要があります")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "パスワードには大文字、小文字、数字、特殊文字を含める必要があります"
  );

// Email validation schema
export const emailSchema = z
  .string()
  .email("有効なメールアドレスを入力してください");

// Login form schema
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "パスワードを入力してください"),
});

// Signup form schema
export const signupFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

// Admin login schema (can have different requirements)
export const adminLoginSchema = z.object({
  password: z.string().min(1, "パスワードを入力してください"),
});

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "新しいパスワードが一致しません",
  path: ["confirmNewPassword"],
});

// Validate password strength
export const getPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  
  if (/[a-z]/.test(password)) score++;
  else feedback.push("小文字を含めてください");
  
  if (/[A-Z]/.test(password)) score++;
  else feedback.push("大文字を含めてください");
  
  if (/\d/.test(password)) score++;
  else feedback.push("数字を含めてください");
  
  if (/[@$!%*?&]/.test(password)) score++;
  else feedback.push("特殊文字（@$!%*?&）を含めてください");

  return { score, feedback };
};