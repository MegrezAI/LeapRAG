import { z } from 'zod';

const passwordValidation = z.string().min(8);

export const updatePasswordSchema = z
  .object({
    password: passwordValidation,
    new_password: passwordValidation,
    repeat_new_password: passwordValidation
  })
  .refine((data) => data.new_password === data.repeat_new_password, {
    params: { i18n: 'validation.password_mismatch' },
    path: ['repeat_new_password']
  });

export const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    password: passwordValidation,
    confirm_password: passwordValidation,
    hash: z.string()
  })
  .refine((data) => data.password === data.confirm_password, {
    params: { i18n: 'validation.password_mismatch' },
    path: ['confirm_password']
  });

export const emailSchema = z.object({
  email: z.string().email()
});

export const modifyEmailSchema = z.object({
  email: z.string().email(),
  newEmail: z.string().email()
});

export const modifyPasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

export const modifyUsernameSchema = z.object({
  username: z.string().min(3).max(30)
});

export const modifyInterfaceLanguageSchema = z.object({
  interface_language: z.string()
});

export const modifyInterfaceThemeSchema = z.object({
  interface_theme: z.string()
});

export const modifyTimezoneSchema = z.object({
  timezone: z.string()
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordValidation,
  validationCode: z.string()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: passwordValidation
});

export const languageFormSchema = z.object({
  language: z.string().min(1)
});

export const avatarFormSchema = z.object({
  avatar: z
    .any()
    .refine((files) => !files || files instanceof FileList)
    .transform((files) => files?.[0])
});

export type AvatarFormSchema = z.infer<typeof avatarFormSchema>;
export type UpdatePasswordSchema = z.infer<typeof updatePasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
export type EmailSchema = z.infer<typeof emailSchema>;
export type ModifyEmailSchema = z.infer<typeof modifyEmailSchema>;
export type ModifyPasswordSchema = z.infer<typeof modifyPasswordSchema>;
export type ModifyUsernameSchema = z.infer<typeof modifyUsernameSchema>;
export type ModifyInterfaceLanguageSchema = z.infer<typeof modifyInterfaceLanguageSchema>;
export type ModifyInterfaceThemeSchema = z.infer<typeof modifyInterfaceThemeSchema>;
export type ModifyTimezoneSchema = z.infer<typeof modifyTimezoneSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
export type LanguageFormSchema = z.infer<typeof languageFormSchema>;
