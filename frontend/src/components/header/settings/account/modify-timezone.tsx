'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { updateTimezoneApi } from '@/api/account';
import useUserStore from '@/store/account';
import { toast } from 'sonner';
import { timezones } from '@/lib/utils/timezone';
import { useEffect, useRef, useState } from 'react';
import { type ModifyTimezoneSchema, modifyTimezoneSchema } from '@/lib/schema/account/account';

export function ModifyTimezone() {
  const [open, setOpen] = useState(false);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();
  const userInfo = useUserStore((state) => state.userInfo);
  const setUserInfo = useUserStore((state) => state.setUserInfo);

  const form = useForm<ModifyTimezoneSchema>({
    resolver: zodResolver(modifyTimezoneSchema),
    defaultValues: {
      timezone: ''
    }
  });

  const {
    control,
    formState: { isSubmitting }
  } = form;

  useEffect(() => {
    form.setValue('timezone', userInfo?.account?.timezone ?? 'Asia/Shanghai');
  }, [userInfo?.account?.timezone]);

  const onTimezoneChange = async (value: string) => {
    if (value === userInfo?.account?.timezone) return;

    try {
      const response = await updateTimezoneApi(value);
      setUserInfo(response);
      toast.success(t('Timezone updated successfully'));
    } catch (error) {}
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    if (open) {
      timeoutId = setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({
          behavior: 'auto',
          block: 'start'
        });
      }, 100);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [open]);
  return (
    <Form {...form}>
      <FormField
        control={control}
        name="timezone"
        render={({ field }) => (
          <FormItem className="flex flex-col space-y-2">
            <Label>{t('Timezone')}</Label>
            <Popover open={open} onOpenChange={setOpen} modal={true}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                      'w-full justify-between',
                      !field.value && 'text-muted-foreground'
                    )}
                    disabled={isSubmitting}
                  >
                    {field.value
                      ? timezones.find((timezone) => timezone.value === field.value)?.value
                      : t('Select timezone')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('Search timezone')} />
                  <CommandList>
                    <CommandEmpty>{t('No timezone found')}</CommandEmpty>
                    <CommandGroup>
                      {timezones.map((timezone) => (
                        <CommandItem
                          ref={timezone.value === field.value ? selectedItemRef : null}
                          key={timezone.value}
                          value={timezone.value}
                          onSelect={(currentValue) => {
                            field.onChange(currentValue);
                            onTimezoneChange(currentValue);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              field.value === timezone.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {timezone.value}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormItem>
        )}
      />
    </Form>
  );
}
