/**
 * Préprocesseur pour le markdown exporté par Notion.
 * Convertit les syntaxes spéciales Notion en HTML/markdown compatible.
 */

const CALLOUT_EMOJIS: Record<string, string> = {
  // Info
  '💡': 'info', 'ℹ️': 'info', '📌': 'info', '📎': 'info', '🔵': 'info',
  // Warning
  '⚠️': 'warning', '🚧': 'warning', '⚡': 'warning', '🟡': 'warning', '🔔': 'warning',
  // Success
  '✅': 'success', '✔️': 'success', '🟢': 'success', '🎉': 'success', '👍': 'success',
  // Danger
  '❌': 'danger', '🚫': 'danger', '🔴': 'danger', '⛔': 'danger', '💥': 'danger',
};

function detectCalloutType(emoji: string): string {
  return CALLOUT_EMOJIS[emoji] ?? 'default';
}

/**
 * Notion exporte les callouts sous forme de blockquotes avec un émoji en premier caractère :
 *   > 💡 Ceci est une note
 *
 * On les transforme en balises HTML custom que le renderer React interceptera.
 */
function processCallouts(md: string): string {
  // Regroupe les lignes de blockquote consécutives
  return md.replace(
    /^((?:> ?.*\n?)+)/gm,
    (block) => {
      const lines = block.split('\n').filter(Boolean);
      const firstLine = lines[0].replace(/^> ?/, '').trim();

      // Détecte si la première ligne commence par un émoji
      const emojiMatch = firstLine.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
      if (!emojiMatch) return block;

      const emoji = emojiMatch[1];
      const type = detectCalloutType(emoji);
      const contentLines = lines.map((l) => l.replace(/^> ?/, '')).join('\n');
      const body = contentLines.replace(emojiMatch[0], '').trim();

      return `<div class="callout" data-type="${type}"><span class="callout-icon">${emoji}</span><div class="callout-body">\n\n${body}\n\n</div></div>`;
    }
  );
}

/**
 * Notion exporte les toggles comme des listes avec un marqueur spécial.
 * On les ouvre simplement (affichage complet pour impression).
 */
function processToggles(md: string): string {
  // Les toggles Notion exportés ressemblent à : "- [ ] texte" ou lignes indentées
  // On ne transforme pas, ils s'affichent comme des listes normales à l'impression
  return md;
}

/**
 * Notion exporte parfois des databases en tableaux markdown, rien à faire.
 * Mais il peut y avoir des blocs "📊 Database" à ignorer proprement.
 */
function cleanNotionArtifacts(md: string): string {
  return md
    .replace(/^Last edited.*$/gim, '')
    .replace(/^Created.*$/gim, '')
    // Supprime les --- qui précèdent un heading (redondants avec les sauts de page)
    .replace(/^---\s*\n(?=\s*#{1,6}\s)/gm, '')
    // Supprime les --- en fin de document
    .replace(/\n---\s*$/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function preprocessNotionMarkdown(raw: string): string {
  let md = raw;
  md = cleanNotionArtifacts(md);
  md = processCallouts(md);
  md = processToggles(md);
  return md;
}
