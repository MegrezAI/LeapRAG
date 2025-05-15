'use client';

import { useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import useUserStore from '@/store/account';

dayjs.extend(utc);
dayjs.extend(timezone);

export const useISOTime = () => {
  const userInfo = useUserStore((state) => state.userInfo);

  const userTimezone = userInfo?.account.timezone;

  const formatISOString = useCallback(
    (isoString: string, format: string = 'DD/MM/YYYY HH:mm:ss') => {
      if (!isoString) return '';
      const targetTimezone = userTimezone;

      return dayjs.utc(isoString).tz(targetTimezone).format(format);
    },
    [userTimezone]
  );

  return {
    formatISOString
  };
};

export default useISOTime;
