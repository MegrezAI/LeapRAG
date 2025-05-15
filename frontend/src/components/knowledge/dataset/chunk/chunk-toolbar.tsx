'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ChunkBatchOperations } from './chunk-batch-operations';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenuButton } from '@/components/base/dropdown-menu-button';

interface ChunkToolbarProps {
  keywords: string;
  onSearch: (value: string) => void;
  onReset: () => void;
  selectedChunks: string[];
  docId: string;
  onBatchOperationSuccess: () => void;
  onSelectAll: () => void;
  isAllSelected?: boolean;
  totalItems: number;
  availableInt: number;
  onAvailableChange: (value: number) => void;
}

export function ChunkToolbar({
  keywords,
  onSearch,
  onReset,
  selectedChunks,
  docId,
  onBatchOperationSuccess,
  onSelectAll,
  isAllSelected,
  totalItems,
  availableInt,
  onAvailableChange
}: ChunkToolbarProps) {
  const t = useTranslations();

  const filterItems = [
    {
      label: t('All'),
      type: 'checkbox' as const,
      checked: availableInt === -1,
      onCheckedChange: () => onAvailableChange(-1)
    },
    {
      label: t('Enabled'),
      type: 'checkbox' as const,
      checked: availableInt === 1,
      onCheckedChange: () => onAvailableChange(1)
    },
    {
      label: t('Disabled'),
      type: 'checkbox' as const,
      checked: availableInt === 0,
      onCheckedChange: () => onAvailableChange(0)
    }
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center flex-1 gap-2">
        <Input
          placeholder={t('Search')}
          value={keywords}
          onChange={(e) => onSearch(e.target.value)}
          className="flex-1"
        />
        <ChunkBatchOperations
          selectedChunks={selectedChunks}
          docId={docId}
          onSuccess={onBatchOperationSuccess}
          onSelectAll={onSelectAll}
          isAllSelected={isAllSelected}
        />
        <DropdownMenuButton
          items={filterItems}
          triggerIcon={<Filter className="h-4 w-4" />}
          buttonProps={{
            variant: 'outline',
            size: 'icon'
          }}
        ></DropdownMenuButton>

        <Button type="button" variant="outline" size="icon" onClick={onReset}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
