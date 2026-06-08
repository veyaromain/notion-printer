import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { notionPageToMarkdown } from '@/lib/notionToMarkdown';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-notion-key');
  const pageId = req.nextUrl.searchParams.get('id');

  if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 400 });
  if (!pageId) return NextResponse.json({ error: 'ID de page manquant' }, { status: 400 });

  try {
    const notion = new Client({ auth: apiKey });
    const page = await notion.pages.retrieve({ page_id: pageId }) as PageObjectResponse;

    const titleProp = Object.values(page.properties).find((p) => p.type === 'title');
    let title = 'Sans titre';
    if (titleProp && titleProp.type === 'title') {
      title = titleProp.title.map((t) => t.plain_text).join('') || 'Sans titre';
    }

    const markdown = await notionPageToMarkdown(notion, pageId, title);
    return NextResponse.json({ markdown, title });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
