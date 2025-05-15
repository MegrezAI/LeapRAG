import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';

interface ExampleInputProps {
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  placeholder?: string;
}

export function ExampleInput({ value = [], onChange, placeholder }: ExampleInputProps) {
  const t = useTranslations();
  const [examples, setExamples] = useState<string[]>(value || ['']);

  // Update example at specified index
  const handleExampleChange = (index: number, text: string) => {
    let newExamples = [...examples];
    newExamples[index] = text;

    // Add a new empty input if the last one has content
    if (index === examples.length - 1 && text.trim()) {
      newExamples.push('');
    }

    // Clean up empty inputs except the last one
    if (!text.trim()) {
      newExamples = newExamples.filter((ex, i) => {
        if (i === newExamples.length - 1) return true; // Keep the last one
        return ex.trim() !== ''; // Others must have content
      });
      // Ensure at least one input exists
      if (newExamples.length === 0) {
        newExamples = [''];
      }
    }

    setExamples(newExamples);

    // Update parent component with non-empty values only
    const filteredExamples = newExamples.filter((ex) => ex.trim());
    onChange(filteredExamples.length ? filteredExamples : null);
  };

  return (
    <div className="space-y-2">
      {examples.map((example, index) => (
        <div key={`example-${index}`} className="flex gap-2 items-center">
          <Textarea
            className="example-input flex-1 min-h-[60px]"
            value={example}
            onChange={(e) => handleExampleChange(index, e.target.value)}
            placeholder={placeholder || t('Type an example')}
          />
        </div>
      ))}
    </div>
  );
}
