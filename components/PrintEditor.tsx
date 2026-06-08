'use client';

import { useState, useCallback } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { preprocessNotionMarkdown } from '@/lib/notionMarkdownPreprocessor';

const PLACEHOLDER = `# Titre du document

Collez ici votre markdown exporté depuis Notion...

## Exemple de section

Voici un paragraphe avec du **texte gras**, de l'*italique* et du \`code inline\`.

### Tableau

| Colonne A | Colonne B | Colonne C |
|-----------|-----------|-----------|
| Valeur 1  | Valeur 2  | Valeur 3  |
| Valeur 4  | Valeur 5  | Valeur 6  |

### Bloc de code

\`\`\`typescript
function hello(name: string): string {
  return \`Bonjour, \${name} !\`;
}
\`\`\`

> 💡 Ceci est un callout Notion de type info.

> ⚠️ Ceci est un avertissement important.

### Liste

- Premier élément
- Deuxième élément
  - Sous-élément A
  - Sous-élément B
- Troisième élément
`;

export default function PrintEditor() {
  const [markdown, setMarkdown] = useState('');
  const [showEditor, setShowEditor] = useState(true);

  const processed = preprocessNotionMarkdown(markdown || PLACEHOLDER);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <>
      {/* Barre d'outils — masquée à l'impression via .no-print */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center gap-3">
          <span className="font-semibold text-gray-800 text-sm mr-2">Notion Printer</span>

          <button
            onClick={() => setShowEditor((v) => !v)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {showEditor ? "Masquer l'éditeur" : "Afficher l'éditeur"}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 text-sm rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer / Exporter PDF
          </button>

          {markdown && (
            <button
              onClick={() => setMarkdown('')}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors ml-auto"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Panneau éditeur — masqué à l'impression */}
      {showEditor && (
        <div className="no-print fixed top-12 left-0 bottom-0 w-1/2 border-r border-gray-200 flex flex-col bg-gray-50 z-10">
          <div className="px-4 py-2 border-b border-gray-200 bg-white">
            <p className="text-xs text-gray-500">Collez votre markdown Notion ici</p>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder={PLACEHOLDER}
            className="flex-1 p-4 font-mono text-sm resize-none outline-none bg-transparent text-gray-800 leading-relaxed"
            spellCheck={false}
          />
        </div>
      )}

      {/* Panneau preview — seul élément imprimé */}
      <div className={`${showEditor ? 'ml-[50%]' : ''} pt-12 print:ml-0 print:pt-0 bg-white min-h-screen`}>
        <div className="px-12 py-10 print:p-0">
          <MarkdownRenderer content={processed} />
        </div>
      </div>
    </>
  );
}
