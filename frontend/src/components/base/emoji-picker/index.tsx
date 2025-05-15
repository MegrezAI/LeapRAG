'use client';

import { useState } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  defaultEmoji?: string;
}

export function EmojiPicker({ onSelect, defaultEmoji = '🤖' }: EmojiPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(defaultEmoji);

  const handleEmojiSelect = (emoji: any) => {
    const emojiString = emoji.native;
    setSelectedEmoji(emojiString);
    onSelect(emojiString);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="w-12 h-12 rounded-lg bg-background hover:bg-muted"
        >
          <span className="text-2xl">{selectedEmoji}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="start" side="right">
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme="light"
          set="native"
          autoFocus={true}
          skinTonePosition="none"
          emojiButtonSize={32}
          emojiSize={24}
          maxFrequentRows={4}
          perLine={8}
          previewPosition="none"
          categories={[
            'people',
            'nature',
            'foods',
            'activity',
            'places',
            'objects',
            'symbols',
            'flags'
          ]}
        />
      </PopoverContent>
    </Popover>
  );
}
