import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

interface PromptLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
}

const PromptLogModal = ({ isOpen, onClose, prompt }: PromptLogModalProps) => {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80dvh]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{t('Prompt Log')}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto bg-muted p-4 rounded-lg max-h-[500px] whitespace-pre-wrap">
          {prompt}
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default PromptLogModal;
