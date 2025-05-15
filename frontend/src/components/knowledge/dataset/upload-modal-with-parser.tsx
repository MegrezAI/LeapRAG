import { UploadModal, type UploadModalProps } from '@/components/upload-modal';
import { useState } from 'react';
import { ParserSelect } from './parser-select';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { DocumentParserType } from '@/lib/constants/rag/knowledge';
import { Switch } from '@/components/ui/switch';

interface UploadModalWithParserProps extends Omit<UploadModalProps, 'onUpload'> {
  onUpload: (files: File[], type: DocumentParserType) => Promise<void>;
}

export function UploadModalWithParser({ onUpload, ...props }: UploadModalWithParserProps) {
  const [type, setType] = useState<DocumentParserType>(DocumentParserType.General); // 默认使用自动解析
  const [isAutoParser, setIsAutoParser] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const t = useTranslations();

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setType(DocumentParserType.General);
      setIsAutoParser(true);
    }
    props.onOpenChange?.(open);
  };

  return (
    <UploadModal
      {...props}
      onOpenChange={handleOpenChange}
      onUpload={async (files) => {
        setIsUploading(true);
        try {
          await onUpload(files, isAutoParser ? DocumentParserType.General : type);
        } finally {
          setIsUploading(false);
        }
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label className="font-medium shrink-0">{t('Auto Parser')}</Label>
          <Switch checked={isAutoParser} onCheckedChange={setIsAutoParser} disabled={isUploading} />
        </div>

        {!isAutoParser && (
          <div>
            <Label className="font-medium shrink-0 mb-2 block">{t('Parser Mode')}</Label>
            <div className="w-full">
              <ParserSelect parserId={type} onParserChange={setType} disabled={isUploading} />
            </div>
          </div>
        )}
      </div>
    </UploadModal>
  );
}
