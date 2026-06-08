import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import type {
  PageObjectResponse,
  DatabaseObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

export type NotionPage = {
  id: string;
  title: string;
  type: 'page' | 'database_entry';
  lastEdited: string;
  parentTitle?: string; // nom de la database parente pour les entrées
};

function extractTitle(page: PageObjectResponse): string {
  const titleProp = Object.values(page.properties).find((p) => p.type === 'title');
  if (titleProp && titleProp.type === 'title') {
    return titleProp.title.map((t) => t.plain_text).join('').trim() || 'Sans titre';
  }
  return 'Sans titre';
}

function extractDbTitle(db: DatabaseObjectResponse): string {
  return db.title.map((t) => t.plain_text).join('').trim() || 'Base de données';
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-notion-key');
  if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 400 });

  try {
    const notion = new Client({ auth: apiKey });
    const results: NotionPage[] = [];

    // 1. Toutes les pages accessibles via l'intégration
    let cursor: string | undefined;
    do {
      const res = await notion.search({
        filter: { value: 'page', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });

      for (const item of res.results) {
        const page = item as PageObjectResponse;
        results.push({
          id: page.id,
          title: extractTitle(page),
          type: 'page',
          lastEdited: page.last_edited_time,
        });
      }

      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);

    // 2. Cherche tous les objets sans filtre pour trouver les databases
    let allCursor: string | undefined;
    const databaseIds = new Set<string>();
    do {
      const res = await notion.search({
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 100,
        ...(allCursor ? { start_cursor: allCursor } : {}),
      });

      for (const item of res.results) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((item as any).object === 'database') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          databaseIds.add((item as any).id);
        }
      }

      allCursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (allCursor);

    // 3. Pour chaque database, récupère ses entrées
    for (const dbId of databaseIds) {
      let dbTitle = 'Base de données';
      try {
        const db = await notion.databases.retrieve({ database_id: dbId }) as DatabaseObjectResponse;
        dbTitle = extractDbTitle(db);
      } catch { /* ignore si inaccessible */ }

      let entryCursor: string | undefined;
      do {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries = await (notion as any).databases.query({
          database_id: dbId,
          page_size: 100,
          ...(entryCursor ? { start_cursor: entryCursor } : {}),
        });

        for (const entry of entries.results) {
          const p = entry as PageObjectResponse;
          results.push({
            id: p.id,
            title: extractTitle(p),
            type: 'database_entry',
            lastEdited: p.last_edited_time,
            parentTitle: dbTitle,
          });
        }

        entryCursor = entries.has_more ? (entries.next_cursor ?? undefined) : undefined;
      } while (entryCursor);
    }

    // Déduplique par id (une page peut apparaître en tant que page ET entrée)
    const seen = new Set<string>();
    const deduped = results.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Trie par date décroissante
    deduped.sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime());

    return NextResponse.json({ pages: deduped });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    const status = message.includes('API token') || message.includes('unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
