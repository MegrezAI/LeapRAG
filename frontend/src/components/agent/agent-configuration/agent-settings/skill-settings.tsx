'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { type AgentCreateSchema } from '@/lib/schema/agent';
import SkillFormModal from '@/components/agents/skill-form-modal';
import { useState } from 'react';

type Skill = NonNullable<AgentCreateSchema['skills']>[number];

interface SkillSettingsProps {
  isPending?: boolean;
}

export function SkillSettings({ isPending = false }: SkillSettingsProps) {
  const { control } = useFormContext<any>();
  const t = useTranslations();
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | undefined>(undefined);

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'skills'
  });

  const handleSkillSubmit = (skill: Skill) => {
    const skillIndex = fields.findIndex((field) => field.id === skill.id);
    if (skillIndex >= 0) {
      update(skillIndex, skill);
    } else {
      append(skill);
    }
    setEditingSkill(undefined);
  };

  const handleDeleteSkill = (skillId: string) => {
    const skillIndex = fields.findIndex((field) => field.id === skillId);
    if (skillIndex >= 0) {
      remove(skillIndex);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">{t('Skills')}</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsSkillModalOpen(true)}
          disabled={isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Skill')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">{t('No skills added yet')}</div>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => {
            const skill = field as unknown as Skill;
            return (
              <div
                key={field.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h5 className="font-medium">{skill.name || t('Unnamed Skill')}</h5>
                  <p className="text-sm text-muted-foreground">
                    {skill.description || t('No description')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingSkill(skill);
                      setIsSkillModalOpen(true);
                    }}
                    disabled={isPending}
                  >
                    {t('Edit')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSkill(field.id)}
                    disabled={isPending}
                  >
                    {t('Delete')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SkillFormModal
        open={isSkillModalOpen}
        onOpenChange={setIsSkillModalOpen}
        onSubmit={handleSkillSubmit}
        initialData={editingSkill}
      />
    </div>
  );
}
