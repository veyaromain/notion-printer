import { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Block = BlockObjectResponse & Record<string, any>;

function richTextToMd(rich: RichTextItemResponse[]): string {
  return rich.map((t) => {
    let text = t.plain_text;
    if (t.annotations.code) text = `\`${text}\``;
    if (t.annotations.bold) text = `**${text}**`;
    if (t.annotations.italic) text = `*${text}*`;
    if (t.annotations.strikethrough) text = `~~${text}~~`;
    if ('href' in t && t.href) text = `[${text}](${t.href})`;
    return text;
  }).join('');
}

async function fetchAllBlocks(notion: Client, blockId: string): Promise<Block[]> {
  const blocks: Block[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    blocks.push(...(res.results as Block[]));
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return blocks;
}

async function blocksToMarkdown(notion: Client, blocks: Block[], depth = 0): Promise<string> {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  for (const b of blocks) {
    switch (b.type) {
      case 'paragraph': {
        const text = richTextToMd(b.paragraph.rich_text);
        lines.push(indent + (text || ''));
        break;
      }
      case 'heading_1':
        lines.push(`\n# ${richTextToMd(b.heading_1.rich_text)}\n`);
        break;
      case 'heading_2':
        lines.push(`\n## ${richTextToMd(b.heading_2.rich_text)}\n`);
        break;
      case 'heading_3':
        lines.push(`\n### ${richTextToMd(b.heading_3.rich_text)}\n`);
        break;
      case 'bulleted_list_item': {
        lines.push(`${indent}- ${richTextToMd(b.bulleted_list_item.rich_text)}`);
        if (b.has_children) {
          const children = await fetchAllBlocks(notion, b.id);
          lines.push(await blocksToMarkdown(notion, children, depth + 1));
        }
        break;
      }
      case 'numbered_list_item': {
        lines.push(`${indent}1. ${richTextToMd(b.numbered_list_item.rich_text)}`);
        if (b.has_children) {
          const children = await fetchAllBlocks(notion, b.id);
          lines.push(await blocksToMarkdown(notion, children, depth + 1));
        }
        break;
      }
      case 'to_do': {
        const checked = b.to_do.checked ? '[x]' : '[ ]';
        lines.push(`${indent}- ${checked} ${richTextToMd(b.to_do.rich_text)}`);
        break;
      }
      case 'toggle': {
        lines.push(`${indent}- ${richTextToMd(b.toggle.rich_text)}`);
        if (b.has_children) {
          const children = await fetchAllBlocks(notion, b.id);
          lines.push(await blocksToMarkdown(notion, children, depth + 1));
        }
        break;
      }
      case 'code': {
        const lang = b.code.language ?? '';
        const code = (b.code.rich_text as RichTextItemResponse[]).map((t) => t.plain_text).join('');
        lines.push(`\`\`\`${lang}\n${code}\n\`\`\``);
        break;
      }
      case 'quote':
        lines.push(`> ${richTextToMd(b.quote.rich_text)}`);
        break;
      case 'callout': {
        const emoji = b.callout.icon?.type === 'emoji' ? b.callout.icon.emoji : '💡';
        lines.push(`> ${emoji} ${richTextToMd(b.callout.rich_text)}`);
        break;
      }
      case 'divider':
        lines.push('\n---\n');
        break;
      case 'table': {
        if (b.has_children) {
          const rows = await fetchAllBlocks(notion, b.id);
          const mdRows: string[] = [];
          rows.forEach((row, i) => {
            if (row.type !== 'table_row') return;
            const cells = row.table_row.cells as RichTextItemResponse[][];
            mdRows.push('| ' + cells.map((cell) => richTextToMd(cell) || ' ').join(' | ') + ' |');
            if (i === 0) mdRows.push('| ' + cells.map(() => '---').join(' | ') + ' |');
          });
          lines.push(mdRows.join('\n'));
        }
        break;
      }
      case 'image': {
        const url = b.image.type === 'external' ? b.image.external.url : b.image.file.url;
        const caption = (b.image.caption as RichTextItemResponse[])?.map((t) => t.plain_text).join('') ?? '';
        lines.push(`![${caption}](${url})`);
        break;
      }
      case 'column_list': {
        if (b.has_children) {
          const columns = await fetchAllBlocks(notion, b.id);
          for (const col of columns) {
            if (col.has_children) {
              const colBlocks = await fetchAllBlocks(notion, col.id);
              lines.push(await blocksToMarkdown(notion, colBlocks, depth));
            }
          }
        }
        break;
      }
      case 'child_page':
        lines.push(`\n> 📄 **${b.child_page.title}** *(sous-page)*\n`);
        break;
      default:
        break;
    }
  }

  return lines.join('\n');
}

export async function notionPageToMarkdown(notion: Client, pageId: string, pageTitle: string): Promise<string> {
  const blocks = await fetchAllBlocks(notion, pageId);
  const body = await blocksToMarkdown(notion, blocks);
  return `# ${pageTitle}\n\n${body}`;
}
