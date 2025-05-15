'use client';
import { redirect } from 'next/navigation';
import { useCurrentAccount } from '@/lib/hooks/queries/use-current-accout';

const Page = () => {
  const { data } = useCurrentAccount();
  if (data) {
    redirect('/knowledge');
  }
  return <></>;
};

export default Page;
