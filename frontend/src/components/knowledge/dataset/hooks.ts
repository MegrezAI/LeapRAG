import { useCurrentAccount } from '@/lib/hooks/queries/use-current-accout';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

export const useSelectParserList = (): Array<{
  value: string;
  label: string;
}> => {
  const { data: userInfo } = useCurrentAccount();
  const { tenant_info } = userInfo || {};
  const t = useTranslations();

  const parserList = useMemo(() => {
    const parserArray: Array<string> = tenant_info?.parser_ids?.split(',') ?? [];
    return parserArray.map((x) => {
      const arr = x.split(':');
      const parserKey = arr[0];
      return {
        value: parserKey,
        label: t(`${parserKey}`)
      };
    });
  }, [tenant_info]);

  return parserList;
};
