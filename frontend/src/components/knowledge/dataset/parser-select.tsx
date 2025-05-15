'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { useSelectParserList } from './hooks';
import { type DocumentParserType } from '@/lib/constants/rag/knowledge';

interface ParserSelectProps {
  documentExtension?: string;
  parserId: DocumentParserType;
  disabled: boolean;
  onParserChange: (value: DocumentParserType) => void;
}

export function ParserSelect({
  documentExtension,
  parserId,
  onParserChange,
  disabled
}: ParserSelectProps) {
  const t = useTranslations();
  const parserList = useSelectParserList();
  const availableParsers = React.useMemo(() => {
    return parserList.filter(
      (parser) =>
        parser.value !== 'picture' &&
        parser.value !== 'audio' &&
        parser.value !== 'video' &&
        parser.value !== 'email'
    );
  }, [parserList]);

  return (
    <Select value={parserId} onValueChange={onParserChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {availableParsers.map((parser) => (
            <SelectItem key={parser.value} value={parser.value}>
              {parser.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
