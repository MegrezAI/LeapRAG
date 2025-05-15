'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import useUserStore from '@/store/account';
import { transformFile2Base64 } from '@/lib/utils/file';
import { toast } from 'sonner';
import { updateAvatarApi } from '@/api/account';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { type AvatarFormSchema, avatarFormSchema } from '@/lib/schema/account/account';
export function ModifyAvatar() {
  const t = useTranslations();
  const userInfo = useUserStore((state) => state.userInfo);
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const form = useForm<AvatarFormSchema>({
    resolver: zodResolver(avatarFormSchema)
  });

  const onSubmit = async (data: AvatarFormSchema) => {
    if (!data.avatar) return;

    try {
      const base64 = await transformFile2Base64(data.avatar);
      const response = await updateAvatarApi(base64);
      setUserInfo(response);
      toast.success(t('Updated Successfully'));
    } catch (error) {}
  };

  return (
    <div className="py-6 rounded-md flex items-center gap-4">
      <Form {...form}>
        <form onChange={form.handleSubmit(onSubmit)} className="contents">
          <FormField
            control={form.control}
            name="avatar"
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Avatar className="size-14 hover:opacity-80 transition-opacity">
                    {userInfo?.account?.avatar ? (
                      <AvatarImage src={userInfo.account.avatar} alt={userInfo.account.username} />
                    ) : (
                      <AvatarFallback>
                        {userInfo?.account?.username?.[0]?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </label>
                <FormControl>
                  <Input
                    id="avatar-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      onChange(e.target.files);
                    }}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
      <div>
        <div className="font-medium text-lg">{userInfo?.account?.username}</div>
        <div className="text-muted-foreground">{userInfo?.account?.email}</div>
      </div>
    </div>
  );
}
