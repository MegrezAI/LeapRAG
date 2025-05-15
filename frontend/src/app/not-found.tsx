import { ErrorCard } from '@/components/base/error-card';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/base/shell';
export default function PageNotFound() {
  const t = useTranslations();
  return (
    <Shell variant="centered">
      <ErrorCard
        title={t('Page Not Found')}
        description={t('The page you are trying to access does not exist, Please check the link')}
        showReset
        className="border-none shadow-none"
      />
    </Shell>
  );
}
