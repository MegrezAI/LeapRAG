import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import supersub from 'remark-supersub';
import RemarkBreaks from 'remark-breaks';

import { PhotoProvider, PhotoView } from 'react-photo-view';
import { visitParents } from 'unist-util-visit-parents';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import CodeBlock from './code-block';
import { cn } from '@/lib/utils';
import { flow } from 'lodash-es';
import ThinkBlock from './think-block';
import { replaceTextByOldReg } from '@/lib/utils/chat';
import { Info } from 'lucide-react';
import { type Reference } from '@/types/conversation';
import reactStringReplace from 'react-string-replace';
import { HoverCard } from '../base/hover-card';
import SvgIcon from '../icon/svg-Icon';
import { getExtension } from '@/lib/utils/document';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
interface ContentProps {
  content: string;
  reference?: Reference;
}

type ImgProps = {
  children: React.ReactNode;
  src: string;
};

type ImageFlagType = {
  isLoading: boolean;
  isError?: boolean;
};

const preprocessThinkTag = (content: string) => {
  if (typeof content !== 'string') return content;
  return flow([
    (str: string) => str.replace('<think>', '<details data-think=true>'),
    (str: string) => str.replace('</think>', '</details>')
  ])(content);
};

const rehypeWrapReference = () => {
  return function wrapTextTransform(tree: any) {
    visitParents(tree, 'text', (node, ancestors) => {
      const latestAncestor = ancestors.at(-1);
      if (latestAncestor.tagName !== 'custom-reference' && latestAncestor.tagName !== 'code') {
        node.type = 'element';
        node.tagName = 'custom-reference';
        node.properties = {};
        node.children = [{ type: 'text', value: node.value }];
      }
    });
  };
};
const getChunkIndex = (match: string) => Number(match.slice(2, -2));
const reg = /(~{2}\d+={2})/g;
const curReg = /(~{2}\d+\${2})/g;

const MarkdownContent = React.memo(({ content, reference }: ContentProps) => {
  const t = useTranslations();

  const getPopoverContent = (chunkIndex: number) => {
    const chunks = reference?.chunks ?? [];
    const chunkItem = chunks[chunkIndex];
    const document = reference?.doc_aggs?.find((x) => x?.doc_id === chunkItem?.document_id);
    const documentId = document?.doc_id;
    return (
      <div className="p-2 w-full max-w-3xl">
        <div className="text-sm text-muted-foreground mb-2">{t('Cite sources')}</div>
        <div className="text-sm max-h-60 overflow-y-auto">
          {chunkItem?.content?.replace(/\n/g, '')}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <SvgIcon name={`file-icon/${getExtension(chunkItem?.document_name)}`} width={24} />
          <Button variant="link" size="sm" className="p-0 font-normal">
            {chunkItem?.document_name}
          </Button>
        </div>
      </div>
    );
  };
  const renderReference = useCallback(
    (text: string) => {
      let replacedText = reactStringReplace(text, reg, (match, i) => {
        const chunkIndex = getChunkIndex(match);
        return (
          <span key={i} className="inline-block">
            <HoverCard content={getPopoverContent(chunkIndex)} className="w-full">
              <Info className="size-4 text-muted-foreground" />
            </HoverCard>
          </span>
        );
      });

      replacedText = reactStringReplace(replacedText, curReg, (match, i) => <span key={i}></span>);

      return replacedText;
    },
    [getPopoverContent]
  );
  const newContent = replaceTextByOldReg(content);
  const processedContent = flow([preprocessThinkTag])(newContent);
  const rehypePlugins: any = [
    [rehypeWrapReference],
    [rehypeKatex, { output: 'mathml' }],
    [rehypeRaw]
  ];

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }], RemarkBreaks]}
        rehypePlugins={rehypePlugins}
        components={
          {
            'custom-reference': ({ children }: { children: string }) => renderReference(children),
            details: ThinkBlock,
            code: CodeBlock,
            p,
            img,
            script: ScriptBlock
          } as {
            [nodeType: string]: React.ElementType;
          }
        }
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

const ScriptBlock = React.memo(({ node }: any) => {
  const scriptContent = node.children[0]?.value || '';
  return `<script>${scriptContent}</script>`;
});

const p = React.memo(({ children }: { children: React.ReactNode }) => {
  return <p className="whitespace-pre-wrap">{children}</p>;
});

const img = React.memo((props: ImgProps) => {
  const { src } = props;
  const [isImageFlag, setIsImageFlag] = useState<ImageFlagType>({
    isLoading: false,
    isError: false
  });

  return (
    <>
      <div
        className={cn(
          'group relative overflow-hidden',
          isImageFlag.isError || isImageFlag.isLoading ? 'pointer-events-none' : ''
        )}
      >
        <PhotoProvider>
          <PhotoView src={src}>
            <img
              src={src}
              alt="Image"
              className={cn('hover:cursor-pointer')}
              style={{
                objectFit: 'contain'
              }}
            />
          </PhotoView>
        </PhotoProvider>
      </div>
    </>
  );
});

ScriptBlock.displayName = 'ScriptBlock';
MarkdownContent.displayName = 'Content';
p.displayName = 'p';
img.displayName = 'img';

export default MarkdownContent;
