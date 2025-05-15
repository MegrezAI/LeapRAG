import * as React from 'react';
import { toast } from 'sonner';
import { type AxiosProgressEvent } from 'axios';
import { useTranslations } from 'next-intl';

interface SuccessfulUpload {
  file: File;
  responseFilename: string;
}

interface UseUploadFileOptions {
  onUpload?: (
    files: File[],
    onProgress: (progressEvent: AxiosProgressEvent) => void
  ) => Promise<any>;
  maxFiles?: number;
  maxSizeMB?: number;
  onUploadSuccess?: (successfulUploads: SuccessfulUpload[]) => void;
  onUploadError?: (failedUploads: File[]) => void;
  onUploadProgress?: (file: File, progress: number) => void;
}

export function useUploadFile({
  onUpload,
  maxFiles = 10,
  maxSizeMB = 50,
  onUploadSuccess,
  onUploadError,
  onUploadProgress
}: UseUploadFileOptions) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [progresses, setProgresses] = React.useState<Record<string, number>>({});
  const t = useTranslations();

  const onUploadFiles = React.useCallback(
    async (files: File[]) => {
      if (files.length > maxFiles) {
        toast.error(t('Maximum number of files exceeded'));
        return;
      }

      const maxSize = maxSizeMB * 1024 * 1024;
      const isFileSizeTooLarge = files.some((file) => file.size > maxSize);
      if (isFileSizeTooLarge) {
        toast.error(t('File size limit exceeded'));
        return;
      }

      setIsUploading(true);
      try {
        const response = await onUpload?.(files, (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgresses((prev) => {
              const newProgresses: Record<string, number> = {};
              files.forEach((file) => {
                newProgresses[file.name] = progress;
                onUploadProgress?.(file, progress);
              });
              return newProgresses;
            });
          }
        });

        const successfulUploads = files.map((file, index) => ({
          file,
          responseFilename: response?.[index]?.filename || file.name
        }));

        onUploadSuccess?.(successfulUploads);
        toast.success(t('Uploaded Successfully'));
      } catch (error) {
        console.error(error);
        onUploadError?.(files);
        toast.error(t('Upload failed'));
        throw error;
      } finally {
        setProgresses({});
        setIsUploading(false);
      }
    },
    [maxFiles, maxSizeMB, onUpload, onUploadSuccess, onUploadError, onUploadProgress]
  );

  return {
    onUpload: onUploadFiles,
    progresses,
    isUploading
  };
}
