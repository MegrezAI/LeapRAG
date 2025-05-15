import { GET } from '@/lib/utils/request';
import type { SystemStatus } from '@/types/sys';

const RAG_SYS_PREFIX = '/rag/sys';

export const getSystemInfoApi = () => GET<Record<string, any>>(`${RAG_SYS_PREFIX}/info`);

export const getSystemStatusApi = () => GET<SystemStatus>(`${RAG_SYS_PREFIX}/status`);

export const getSystemConfigApi = () => GET<Record<string, any>>(`${RAG_SYS_PREFIX}/config`);
