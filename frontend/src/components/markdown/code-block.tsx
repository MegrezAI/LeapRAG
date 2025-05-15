import React, { type RefObject, useMemo, useRef, useState } from 'react';
import { atelierHeathLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import SyntaxHighlighter from 'react-syntax-highlighter';
import copy from 'copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Clipboard } from 'lucide-react';

// Available  https://github.com/react-syntax-highlighter/react-syntax-highlighter/blob/master/AVAILABLE_LANGUAGES_HLJS.MD
const capitalizationLangMap: Record<string, string> = {
  sql: 'SQL',
  javascript: 'JavaScript',
  java: 'Java',
  typescript: 'TypeScript',
  vbscript: 'VBScript',
  css: 'CSS',
  html: 'HTML',
  xml: 'XML',
  php: 'PHP',
  python: 'Python',
  yaml: 'Yaml',
  mermaid: 'Mermaid',
  markdown: 'MarkDown',
  makefile: 'MakeFile',
  echarts: 'ECharts',
  shell: 'Shell',
  powershell: 'PowerShell',
  json: 'JSON',
  latex: 'Latex',
  svg: 'SVG'
};

const getCorrectCapLang = (language: string) => {
  if (!language) return 'Plain';

  if (language in capitalizationLangMap) {
    return capitalizationLangMap[language];
  }

  return language.charAt(0).toUpperCase() + language.substring(1);
};

const CodeBlock: any = React.memo(({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match && match[1];
  const [isCopied, setIsCopied] = useState(false);
  const content = String(children).replace(/\n$/, '');

  const CodeBar = ({ lang }: { lang: string }) => {
    return (
      <div className="bg-white rounded-t-[10px] flex justify-between h-8 items-center p-1 pl-3 border-b border-divider-subtle">
        <div className="system-xs-semibold-uppercase text-text-secondary">
          {getCorrectCapLang(lang)}
        </div>
        <div className="flex items-center gap-1">
          <button className="ml-auto flex gap-2" onClick={copyToClipboard}>
            {isCopied ? (
              <>
                <Check size={15} />
              </>
            ) : (
              <>
                <Clipboard size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const copyToClipboard = () => {
    setIsCopied(true);
    if (content) {
      copy(content);
    }
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const renderCodeContent = useMemo(() => {
    return (
      <SyntaxHighlighter
        {...props}
        style={atelierHeathLight}
        customStyle={{
          paddingLeft: 12,
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
          backgroundColor: 'white'
        }}
        language={match?.[1]}
        showLineNumbers
        PreTag="div"
      >
        {content}
      </SyntaxHighlighter>
    );
  }, [lang, match, props, children]);

  if (inline || !lang) {
    return (
      <code {...props} className={className}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative">
      <CodeBar lang={lang} />
      {renderCodeContent}
    </div>
  );
});

export default CodeBlock;

CodeBlock.displayName = 'CodeBlock';
