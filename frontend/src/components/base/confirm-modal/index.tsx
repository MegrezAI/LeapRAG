import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useTranslations } from 'next-intl';

interface ConfirmModalProps {
  isShow: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  showConfirm?: boolean;
  showCancel?: boolean;
  maskClosable?: boolean;
  type?: 'default' | 'destructive';
}

export function ConfirmModal({
  isShow,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText,
  cancelText,
  showConfirm = true,
  showCancel = true,
  maskClosable = true,
  type = 'default'
}: ConfirmModalProps) {
  const t = useTranslations();
  const _title = title || t('Confirm');
  const _description =
    description ||
    (type === 'default'
      ? t('Are you sure you want to confirm this action?')
      : t('Are you sure you want to delete this item?'));
  const _confirmText = confirmText || (type === 'default' ? t('OK') : t('Yes'));
  const _cancelText = cancelText || t('Cancel');

  return (
    <AlertDialog
      open={isShow}
      onOpenChange={(open) => {
        if (!open && maskClosable) {
          onCancel();
        }
      }}
    >
      <AlertDialogContent maskClosable={false}>
        <AlertDialogHeader>
          <AlertDialogTitle>{_title}</AlertDialogTitle>
          <AlertDialogDescription>{_description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {showCancel && <AlertDialogCancel onClick={onCancel}>{_cancelText}</AlertDialogCancel>}
          {showConfirm && (
            <AlertDialogAction variant={type} onClick={onConfirm}>
              {_confirmText}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
