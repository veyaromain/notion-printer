'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkSectionWrap from '@/lib/remarkSectionWrap';
import type { Components } from 'react-markdown';
import type { ReactNode } from 'react';

interface Props {
  content: string;
}

const components: Components = {
  // Tableaux — enveloppés pour break-inside: avoid
  table: ({ children }) => (
    <div className="table-wrapper">
      <table>{children}</table>
    </div>
  ),

  // Blocs de code avec label de langage
  pre: ({ children, ...props }) => {
    // Récupère l'info de langage depuis l'enfant <code>
    const codeEl = (children as React.ReactElement<{ className?: string; children?: ReactNode }>);
    const className = codeEl?.props?.className ?? '';
    const langMatch = className.match(/language-(\w+)/);
    const lang = langMatch?.[1];

    return (
      <div className="code-block">
        {lang && <span className="code-lang">{lang}</span>}
        <pre {...props}>{children}</pre>
      </div>
    );
  },

  // Images enveloppées
  img: ({ src, alt }) => (
    <div className="image-wrapper">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ''} />
      {alt && <p className="image-caption">{alt}</p>}
    </div>
  ),
};

export default function MarkdownRenderer({ content }: Props) {
  return (
    <div className="print-area">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkSectionWrap]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
