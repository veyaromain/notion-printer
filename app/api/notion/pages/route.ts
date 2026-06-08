import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import type { PageObjectResponse, DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-notion-key');
  if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 400 });

  try {
    const notion = new Client({ auth: apiKey });
    const results: { id: string; title: string; type: string; lastEdited: string }[] = [];
    let cursor: string | undefined;

    do {
      const res = await notion.search({
        filter: { value: 'page', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });

      for (const item of res.results) {
        const page = item as PageObjectResponse | DatabaseObjectResponse;
        let title = 'Sans titre';

        if (page.object === 'page') {
          const p = page as PageObjectResponse;
          const titleProp = Object.values(p.properties).find((prop) => prop.type === 'title');
          if (titleProp && titleProp.type === 'title') {
            title = titleProp.title.map((t) => t.plain_text).join('') || 'Sans titre';
          }
        }

        results.push({
          id: page.id,
          title,
          type: page.object,
          lastEdited: (page as PageObjectResponse).last_edited_time,
        });
      }

      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return NextResponse.json({ pages: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    const status = message.includes('API token') || message.includes('unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
