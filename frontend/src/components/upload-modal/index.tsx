'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useUploadFile } from '@/lib/hooks/use-upload-file';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { FileUploader } from '@/components/file-uploader';
import { cn } from '@/lib/utils';
import { type DropzoneProps } from 'react-dropzone';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { type AxiosProgressEvent } from 'axios';

export interface UploadedFile {
  filename: string;
  url?: string;
}

export interface UploadModalProps {
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Maximum size per file in MB */
  maxSizeMB?: number;
  /** Accepted file types */
  accept?: DropzoneProps['accept'];
  /** Label text for the upload area */
  label?: string;
  /** Upload button text */
  buttonText?: string;
  /** Custom class name */
  className?: string;
  /** Callback on successful upload */
  onSuccess?: (files: UploadedFile[]) => void;
  /** Callback on upload error */
  onError?: (error: Error) => void;
  /** Callback on upload progress */
  onProgress?: (file: File, progress: number) => void;
  /** Callback when dialog open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Dialog trigger button text */
  triggerText?: string;
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Dialog title */
  dialogTitle?: string;
  /** Custom upload implementation */
  onUpload?: (
    files: File[],
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
  ) => Promise<void>;
  /** Custom content */
  children?: React.ReactNode;
}

const schema = z.object({
  files: z.array(z.instanceof(File))
});

type Schema = z.infer<typeof schema>;

export function UploadModal({
  maxFiles = 10,
  maxSizeMB = 50,
  accept,
  label,
  buttonText,
  className,
  onSuccess,
  onError,
  onProgress,
  trigger,
  triggerText,
  dialogTitle,
  children,
  onUpload,
  onOpenChange
}: UploadModalProps) {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const t = useTranslations();
  const {
    onUpload: handleUpload,
    progresses,
    isUploading
  } = useUploadFile({
    onUpload: async (files, onUploadProgress) => {
      try {
        if (onUpload) {
          await onUpload(files, onUploadProgress);
        }
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },
    maxFiles,
    maxSizeMB,
    onUploadSuccess: (successfulUploads) => {
      const newFiles = successfulUploads.map((upload) => ({
        filename: upload.responseFilename
      }));
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      onSuccess?.(newFiles);
    },
    onUploadError: (failedFiles) => {
      onError?.(new Error('Some files failed to upload'));
    },
    onUploadProgress: onProgress
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      files: []
    }
  });

  const handleSubmit = async (values: Schema) => {
    if (values.files.length === 0) {
      toast.error(t('Please select at least one file'));
      return;
    }
    try {
      setLoading(true);
      await handleUpload(values.files);
      form.reset();
      setIsOpen(false);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      form.reset();
      setUploadedFiles([]);
      setLoading(false);
    }
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">{triggerText || t('Upload Files')}</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle || t('Upload Files')}</DialogTitle>
        </DialogHeader>
        {children}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className={cn('rounded-lg', className)}>
              <FormField
                control={form.control}
                name="files"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label || t('Files')}</FormLabel>
                    <FormControl>
                      <FileUploader
                        value={field.value}
                        onValueChange={field.onChange}
                        maxFileCount={maxFiles}
                        maxSize={maxSizeMB * 1024 * 1024}
                        accept={accept as DropzoneProps['accept']}
                        progresses={progresses}
                        disabled={isUploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700">{t('Uploaded Files')}</h3>
                  <ul className="mt-2 divide-y divide-gray-200">
                    {uploadedFiles.map((file, index) => (
                      <li key={index} className="flex items-center justify-between py-2 text-sm">
                        <span className="truncate text-gray-600">{file.filename}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t('Cancel')}</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={loading || isUploading}
                loading={loading || isUploading}
              >
                {buttonText || t('OK')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
