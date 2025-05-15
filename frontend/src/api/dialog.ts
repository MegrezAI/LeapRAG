import { type Dialog } from '@/types/dialog';
import { GET, POST, PUT } from '@/lib/utils/request';
import { type DialogParamsSchema } from '@/lib/schema/dialog';

const DIALOG_PREFIX = '/rag/dialog';

/**
 * 创建对话
 */
export const createDialogApi = async (params: DialogParamsSchema) => {
  return POST<Dialog>(`${DIALOG_PREFIX}`, params);
};

/**
 * 获取对话列表
 */
export const getDialogsApi = async () => {
  return GET<Dialog[]>(`${DIALOG_PREFIX}`);
};

/**
 * 获取对话详情
 */
export const getDialogApi = async (dialogId: string) => {
  return GET<Dialog>(`${DIALOG_PREFIX}/${dialogId}`);
};

/**
 * 更新对话
 */
export const updateDialogApi = async (params: DialogParamsSchema) => {
  const { id, ...rest } = params;
  return PUT<Dialog>(`${DIALOG_PREFIX}/${id}`, rest);
};
