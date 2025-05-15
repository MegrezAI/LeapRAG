import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Editor, { loader } from '@monaco-editor/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import SpinLoader from '@/components/base/loader/spin-loader';

loader.config({ paths: { vs: '/vs' } });

interface SetMetaModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  onOk: (meta: string) => void;
  metadata?: Record<string, any>;
}

const formSchema = z.object({
  meta_fields: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    {
      params: { i18n: 'validation.json_invalid' }
    }
  )
});

const SetMetadataModal = ({ isOpen, onClose, onOk, metadata }: SetMetaModalProps) => {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      meta_fields: ''
    }
  });

  useEffect(() => {
    form.setValue('meta_fields', JSON.stringify(metadata, null, 4));
  }, [form, metadata]);

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      const metaFieldsString = JSON.stringify(values.meta_fields);
      onOk(metaFieldsString);
      onClose(false);
    },
    [onOk, onClose]
  );
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Setting Metadata')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="meta_fields"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Metadata')}</FormLabel>
                  <FormControl>
                    <Editor
                      height={200}
                      options={{
                        minimap: {
                          enabled: false
                        },
                        domReadOnly: true,
                        quickSuggestions: false,
                        lineNumbersMinChars: 1,
                        wordWrap: 'on',
                        unicodeHighlight: {
                          ambiguousCharacters: false
                        }
                      }}
                      loading={<SpinLoader />}
                      defaultLanguage="json"
                      theme="vs-light"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => onClose(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit">{t('Save')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SetMetadataModal;
