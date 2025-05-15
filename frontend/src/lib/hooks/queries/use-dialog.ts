import { useQuery, useMutation } from '@tanstack/react-query';
import { type DialogParamsSchema } from '@/lib/schema/dialog';
import { createDialogApi, getDialogsApi, getDialogApi, updateDialogApi } from '@/api/dialog';
import { createQueryKeys } from '@/lib/utils/query';
import { useInvalidateQuery } from './use-base';
import { type Dialog } from '@/types/dialog';

const QUERY_KEYS = createQueryKeys('dialogs');

export function useDialogs() {
  return useQuery({
    queryKey: QUERY_KEYS.list(),
    queryFn: () => getDialogsApi()
  });
}

export function useDialog(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => getDialogApi(id),
    enabled: !!id
  });
}

export const useInvalidateDialogs = () => {
  return useInvalidateQuery(QUERY_KEYS.list());
};

export const useInvalidateDialog = (dialogId: string) => {
  return useInvalidateQuery(QUERY_KEYS.detail(dialogId));
};

export function useCreateDialog({
  onSuccess,
  onError
}: {
  onSuccess?: (dialog: Dialog) => void;
  onError?: (error: any) => void;
}) {
  return useMutation({
    mutationFn: (params: DialogParamsSchema) => createDialogApi(params),
    onSuccess,
    onError
  });
}

export function useUpdateDialog({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) {
  return useMutation({
    mutationFn: (params: DialogParamsSchema) => updateDialogApi(params),
    onSuccess,
    onError
  });
}
