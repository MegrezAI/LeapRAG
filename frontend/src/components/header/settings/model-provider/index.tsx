'use client';

import { useCallback, useMemo, useState } from 'react';
import { getLLMFactoriesApi } from '@/api/rag/llm';
import { useQuery } from '@tanstack/react-query';
import { type MyLLMFactory, type LLMFactoryInfo } from '@/types/rag/llm';
import { PendingModelProviderCard } from './pending-model-provider-card';
import { LocalLlmFactories, LLMProvider } from '@/lib/constants/rag/llm';
import { SettingsHeader } from '../settings-header';
import { useTranslations } from 'next-intl';
import { ModelApiKeyModal } from './model-setting/api-key-modal';
import { OllamaModal } from './model-setting/ollama-modal';
import { AddedModelProviderCard } from './added-model-provider-card';
import SpinLoader from '@/components/base/loader/spin-loader';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { SystemModelSettingsModal } from './system-model-settings-modal';
import { useLLMFactories, useLLMs } from '@/lib/hooks/queries/use-llm';
import { VolcengineModal } from './model-setting/volcengine-modal';
import { BedrockModal } from './model-setting/bedrock-modal';
import { HunyuanModal } from './model-setting/hunyuan-modal';
import { SparkModal } from './model-setting/spark-modal';
import { YiyanModal } from './model-setting/yiyan-modal';
import { FishAudioModal } from './model-setting/fish-audio-modal';
import { TencentCloudModal } from './model-setting/tencent-cloud-modal';
import { GoogleCloudModal } from './model-setting/google-cloud-modal';
import { AzureOpenAIModal } from './model-setting/azure-openai-modal';

interface SettingsModelsProps {
  headerTitle: string;
}

export function SettingsModelProvider({ headerTitle }: SettingsModelsProps) {
  const t = useTranslations();
  const [selectedLlmFactory, setSelectedLlmFactory] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [showSystemSettingsModal, setShowSystemSettingsModal] = useState(false);

  const [activeModelModal, setActiveModelModal] = useState<LLMProvider | 'NONE'>('NONE');

  const [selectedModelTypes, setSelectedModelTypes] = useState<string[]>([]);

  const ModalMap = useMemo(
    () => ({
      VolcEngine: () => setActiveModelModal(LLMProvider.VOLC_ENGINE),
      Bedrock: () => setActiveModelModal(LLMProvider.BEDROCK),
      'Tencent Hunyuan': () => setActiveModelModal(LLMProvider.HUNYUAN),
      'XunFei Spark': () => setActiveModelModal(LLMProvider.SPARK),
      BaiduYiyan: () => setActiveModelModal(LLMProvider.YIYAN),
      'Fish Audio': () => setActiveModelModal(LLMProvider.FISH_AUDIO),
      'Tencent Cloud': () => setActiveModelModal(LLMProvider.TENCENT_CLOUD),
      'Google Cloud': () => setActiveModelModal(LLMProvider.GOOGLE_CLOUD),
      'Azure-OpenAI': () => setActiveModelModal(LLMProvider.AZURE_OPENAI)
    }),
    [activeModelModal, setActiveModelModal]
  );

  const isLocalLlmFactory = useCallback(
    (llmFactory: string) => LocalLlmFactories.some((x) => x === llmFactory),
    []
  );

  const closeModelModal = useCallback(() => {
    setActiveModelModal('NONE');
  }, []);

  const openModelModal = useCallback((provider: LLMProvider) => {
    setActiveModelModal(provider);
  }, []);

  const handleAddModel = useCallback(
    (llmFactory: LLMProvider, modelTypes: string[]) => {
      setSelectedLlmFactory(llmFactory);
      setSelectedModelTypes(modelTypes);

      const modalHandler = ModalMap[llmFactory as keyof typeof ModalMap];
      if (modalHandler) {
        modalHandler();
      } else if (isLocalLlmFactory(llmFactory)) {
        setActiveModelModal(LLMProvider.OLLAMA);
      } else {
        setActiveModelModal(LLMProvider.OPENAI);
      }
    },
    [isLocalLlmFactory, ModalMap]
  );
  const { data: myLLMs, isLoading: isMyLLMsLoading } = useLLMs();
  const { data: llmFactories, isLoading: isLLMFactoriesLoading } = useLLMFactories();

  if (isMyLLMsLoading || isLLMFactoriesLoading) return <SpinLoader />;
  if (!myLLMs || !llmFactories) return null;

  const factoryList = Object.entries(llmFactories).map(([name, factory]) => factory);
  return (
    <div className="space-y-6">
      <SettingsHeader title={headerTitle} />
      <div className="flex justify-between items-center">
        <h1 className="text-sm font-medium">{t('Model List')}</h1>
        <Button variant="outline" size="xs" onClick={() => setShowSystemSettingsModal(true)}>
          <Settings className="size-4" />
          {t('System Model Settings')}
        </Button>
      </div>
      <div className="space-y-4 mt-4">
        {Object.entries(myLLMs).map(([name, config]) => (
          <AddedModelProviderCard
            key={name}
            name={name as LLMProvider}
            tags={config.tags}
            models={config.llm}
          />
        ))}
      </div>
      <div className="space-y-2">
        <h1 className="text-sm font-medium">{t('Pending Model Provider')}</h1>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {factoryList.map((factory: LLMFactoryInfo) => (
          <PendingModelProviderCard
            key={factory.name}
            name={factory.name}
            tags={factory.tags}
            provider={factory.name as LLMProvider}
            onAdd={() => handleAddModel(factory.name, factory.model_types)}
          />
        ))}
      </div>

      <SystemModelSettingsModal
        open={showSystemSettingsModal}
        onOpenChange={setShowSystemSettingsModal}
      />

      <ModelApiKeyModal
        open={activeModelModal === LLMProvider.OPENAI}
        onOpenChange={(open) => (open ? openModelModal(LLMProvider.OPENAI) : closeModelModal())}
        llmFactory={selectedLlmFactory}
      />

      <OllamaModal
        open={activeModelModal === LLMProvider.OLLAMA}
        onOpenChange={(open) => (open ? openModelModal(LLMProvider.OLLAMA) : closeModelModal())}
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />

      <VolcengineModal
        open={activeModelModal === LLMProvider.VOLC_ENGINE}
        onOpenChange={(open) =>
          open ? openModelModal(LLMProvider.VOLC_ENGINE) : closeModelModal()
        }
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />

      <BedrockModal
        open={activeModelModal === LLMProvider.BEDROCK}
        onOpenChange={(open) => (open ? openModelModal(LLMProvider.BEDROCK) : closeModelModal())}
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />

      <HunyuanModal
        open={activeModelModal === LLMProvider.HUNYUAN}
        onOpenChange={(open) => (open ? openModelModal(LLMProvider.HUNYUAN) : closeModelModal())}
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />

      <SparkModal
        open={activeModelModal === LLMProvider.SPARK}
        onOpenChange={(open) => (open ? openModelModal(LLMProvider.SPARK) : closeModelModal())}
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />

      <YiyanModal
        open={activeModelModal === LLMProvider.YIYAN}
        onOpenChange={(open) => (open ? openModelModal(LLMProvider.YIYAN) : closeModelModal())}
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />

      <FishAudioModal
        open={activeModelModal === LLMProvider.FISH_AUDIO}
        onOpenChange={(open) => (open ? openModelModal(LLMProvider.FISH_AUDIO) : closeModelModal())}
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />

      <TencentCloudModal
        open={activeModelModal === LLMProvider.TENCENT_CLOUD}
        onOpenChange={(open) =>
          open ? openModelModal(LLMProvider.TENCENT_CLOUD) : closeModelModal()
        }
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />

      <GoogleCloudModal
        open={activeModelModal === LLMProvider.GOOGLE_CLOUD}
        onOpenChange={(open) =>
          open ? openModelModal(LLMProvider.GOOGLE_CLOUD) : closeModelModal()
        }
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />

      <AzureOpenAIModal
        open={activeModelModal === LLMProvider.AZURE_OPENAI}
        onOpenChange={(open) =>
          open ? openModelModal(LLMProvider.AZURE_OPENAI) : closeModelModal()
        }
        llmFactory={selectedLlmFactory}
        modelTypes={selectedModelTypes}
      />
    </div>
  );
}
