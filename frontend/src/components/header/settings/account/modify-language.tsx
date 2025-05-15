'use client';

import { useCallback } from 'react';
import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { updateInterfaceLanguageApi } from '@/api/account';
import useUserStore from '@/store/account';
import { defaultLocale, LanguageEnum, type Locale } from '@/lib/constants/language';
import { useTranslations } from 'next-intl';
import { setUserLocale } from '@/server/actions/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { type LanguageFormSchema, languageFormSchema } from '@/lib/schema/account/account';

export function ModifyLanguage() {
  const t = useTranslations();
  const userInfo = useUserStore((state) => state.userInfo);
  const setUserInfo = useUserStore((state) => state.setUserInfo);

  const form = useForm<LanguageFormSchema>({
    resolver: zodResolver(languageFormSchema),
    defaultValues: {
      language: userInfo?.account?.interface_language ?? defaultLocale
    }
  });

  const {
    control,
    formState: { isSubmitting }
  } = form;

  const onLanguageChange = useCallback(
    async (value: string) => {
      try {
        const response = await updateInterfaceLanguageApi(value);
        setUserLocale(value as Locale);
        setUserInfo(response);
        toast.success(t('Language updated successfully'));
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {}
    },
    [setUserInfo]
  );

  return (
    <Form {...form}>
      <FormField
        control={control}
        name="language"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <Label>{t('Language')}</Label>
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onLanguageChange(value);
              }}
              disabled={isSubmitting}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(LanguageEnum).map((option) => (
                  <SelectItem key={option} value={option}>
                    <div className="flex items-center justify-between w-full">
                      <span>{t(option)}</span>
                      {field.value === option && <Check className="w-4 h-4 ml-2" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </Form>
  );
}
