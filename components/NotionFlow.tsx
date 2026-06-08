'use client';

import { useState, useCallback } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { preprocessNotionMarkdown } from '@/lib/notionMarkdownPreprocessor';

type Page = { id: string; title: string; lastEdited: string };
type Step = 'setup' | 'pages' | 'print';

export default function NotionFlow() {
  const [step, setStep] = useState<Step>('setup');
  const [apiKey, setApiKey] = useState('');
  const [pages, setPages] = useState<Page[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [search, setSearch] = useState('');

  const handleConnect = useCallback(async () => {
    if (!apiKey.trim()) return;
    setError('');
    setLoadingPages(true);
    try {
      const res = await fetch('/api/notion/pages', {
        headers: { 'x-notion-key': apiKey.trim() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPages(data.pages);
      setStep('pages');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
    } finally {
      setLoadingPages(false);
    }
  }, [apiKey]);

  const handleSelectPage = useCallback(async (page: Page) => {
    setError('');
    setLoadingPage(true);
    try {
      const res = await fetch(`/api/notion/page?id=${page.id}`, {
        headers: { 'x-notion-key': apiKey.trim() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMarkdown(data.markdown);
      setPageTitle(data.title);
      setStep('print');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement');
    } finally {
      setLoadingPage(false);
    }
  }, [apiKey]);

  const filtered = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const processed = preprocessNotionMarkdown(markdown);

  // ── Vue impression ────────────────────────────────────────────
  if (step === 'print') {
    return (
      <>
        <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center gap-3">
            <button
              onClick={() => setStep('pages')}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <span className="text-sm text-gray-600 truncate max-w-xs">{pageTitle}</span>
            <button
              onClick={() => window.print()}
              className="ml-auto px-4 py-1.5 text-sm rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer / PDF
            </button>
          </div>
        </div>
        <div className="no-print pt-12 bg-white min-h-screen px-12 py-10">
          <MarkdownRenderer content={processed} />
        </div>
        <div className="hidden print:block">
          <MarkdownRenderer content={processed} />
        </div>
      </>
    );
  }

  // ── Vue liste des pages ───────────────────────────────────────
  if (step === 'pages') {
    return (
      <div className="no-print min-h-screen bg-gray-50 pt-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Vos pages Notion</h1>
              <p className="text-sm text-gray-500 mt-1">{pages.length} pages accessibles</p>
            </div>
            <button
              onClick={() => { setStep('setup'); setPages([]); setError(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Changer de clé
            </button>
          </div>

          <input
            type="search"
            placeholder="Rechercher une page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-gray-400 transition-colors"
          />

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {loadingPage && (
            <div className="text-center py-12 text-gray-500 text-sm">Chargement de la page…</div>
          )}

          {!loadingPage && (
            <div className="space-y-1">
              {filtered.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">Aucune page trouvée</p>
              )}
              {filtered.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleSelectPage(page)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-800 font-medium truncate">{page.title}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">
                    {new Date(page.lastEdited).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vue setup (clé API) ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Notion Printer</h1>
          <p className="text-gray-500 text-sm">Imprimez vos pages Notion proprement en PDF</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-4">
          <h2 className="font-medium text-gray-800 mb-4">Connecter votre espace Notion</h2>

          <ol className="text-sm text-gray-600 space-y-3 mb-6">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-medium">1</span>
              <span>Allez sur <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">notion.so/my-integrations</span> et créez une intégration</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-medium">2</span>
              <span>Copiez le <strong>secret d&apos;intégration</strong> (commence par <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">ntn_</span> ou <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">secret_</span>)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-medium">3</span>
              <span>Sur chaque page à imprimer, cliquez <strong>⋯ → Connexions</strong> et activez votre intégration</span>
            </li>
          </ol>

          <div className="space-y-3">
            <input
              type="password"
              placeholder="ntn_xxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-mono outline-none focus:border-gray-400 transition-colors"
              autoComplete="off"
            />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              onClick={handleConnect}
              disabled={!apiKey.trim() || loadingPages}
              className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loadingPages ? 'Connexion…' : 'Connexion'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          La clé n&apos;est jamais stockée — elle est utilisée uniquement pour cette session.
        </p>
      </div>
    </div>
  );
}
