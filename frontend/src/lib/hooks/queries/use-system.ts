import { useQuery } from '@tanstack/react-query';
import { getSystemStatusApi } from '@/api/rag/sys';
import type { SystemStatus } from '@/types/sys';
import { createQueryKeys } from '@/lib/utils/query';

const QUERY_KEYS = createQueryKeys('system');

export const useSystemStatus = () => {
  return useQuery<SystemStatus>({
    queryKey: QUERY_KEYS.all(),
    queryFn: () => getSystemStatusApi(),
    refetchInterval: 5000
  });
};

export default useSystemStatus;
