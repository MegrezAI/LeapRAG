'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FormControl, FormItem, FormMessage } from '@/components/ui/form';
import { VerificationCountdown } from './verification-countdown';

interface VerificationCodeInputProps {
  onSendCode: (email: string) => Promise<void>;
  email: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}

export function VerificationCodeInput({
  onSendCode,
  email,
  value,
  onChange,
  error
}: VerificationCodeInputProps) {
  const t = useTranslations();
  const [showCountdown, setShowCountdown] = useState(false);

  const handleSendCode = async () => {
    try {
      await onSendCode(email);
      setShowCountdown(true);
      toast.success(
        t('Verification code has been successfully sent, Please check your inbox or spam'),
        { duration: 5000 }
      );
    } catch (error: any) {
      const errorMessage = error?.errorCode
        ? t(`error_code.${error.errorCode}`)
        : error?.message || error;

      toast.error(errorMessage);
    }
  };

  return (
    <div className="relative flex items-center gap-4">
      <FormItem className="flex-1">
        <FormControl>
          <Input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="py-5 dark:border-muted-foreground"
            placeholder={t('Validation Code')}
          />
        </FormControl>
        <FormMessage />
      </FormItem>

      <div className="min-w-[120px] text-center px-2">
        <VerificationCountdown
          onSend={handleSendCode}
          disabled={!email}
          duration={20}
          className="w-full"
          isCountdownVisible={showCountdown}
          onCountdownComplete={() => setShowCountdown(false)}
        />
      </div>
    </div>
  );
}
