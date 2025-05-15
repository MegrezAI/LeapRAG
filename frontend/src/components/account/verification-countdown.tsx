'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface VerificationCountdownProps {
  onSend: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  isCountdownVisible: boolean;
  onCountdownComplete: () => void;
  duration?: number;
}

export function VerificationCountdown({
  onSend,
  disabled,
  className,
  isCountdownVisible,
  onCountdownComplete,
  duration = 20
}: VerificationCountdownProps) {
  const [isSending, setIsSending] = useState(false);
  const [seconds, setSeconds] = useState(duration);
  const t = useTranslations();

  useEffect(() => {
    if (!isCountdownVisible) {
      setSeconds(duration);
      return;
    }

    if (seconds === 0) {
      onCountdownComplete();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, isCountdownVisible, onCountdownComplete, duration]);

  const handleSend = async () => {
    if (isSending) return;

    setIsSending(true);
    try {
      await onSend();
    } catch (error: any) {
      console.error('Send code error:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (time: number) => {
    const seconds = time % 60;
    const formattedSeconds = seconds.toString().padStart(2, '0');
    return t('Resend Countdown', { time: formattedSeconds });
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleSend}
      disabled={isCountdownVisible || isSending || disabled}
      loading={isSending}
      className={className}
    >
      {isCountdownVisible ? (
        <span className="cursor-not-allowed">{formatTime(seconds)}</span>
      ) : (
        <span>{t('Verify')}</span>
      )}
    </Button>
  );
}
