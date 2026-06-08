import type { Plugin } from 'unified';
import type { Root, Content, Heading, Parent } from 'mdast';

/**
 * Chaque heading (h1/h2/h3) est enveloppé avec les blocs qui le suivent
 * jusqu'au prochain heading de MÊME niveau ou supérieur — pas de nesting.
 * H1 : saut de page forcé avant (sauf premier) + break-inside: avoid
 * H2 : break-inside: avoid (saut naturel si ne rentre pas)
 * H3 : break-inside: avoid léger
 */
const remarkSectionWrap: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const newChildren: Content[] = [];
    const nodes = tree.children;
    let i = 0;
    let firstH1 = true;

    while (i < nodes.length) {
      const node = nodes[i];

      if (node.type === 'heading' && (node as Heading).depth <= 3) {
        const depth = (node as Heading).depth;

        const classes = ['section-block', `section-h${depth}`];
        if (depth === 1 && !firstH1) classes.push('section-page-break');
        if (depth === 1) firstH1 = false;

        const section: Parent = {
          type: 'section' as never,
          data: {
            hName: 'div',
            hProperties: { className: classes.join(' ') },
          },
          children: [node as Content],
        };

        i++;

        // Avale uniquement les blocs non-heading qui suivent immédiatement
        while (i < nodes.length) {
          const next = nodes[i];
          if (next.type === 'heading') break; // stoppe dès le prochain heading quel que soit le niveau
          section.children.push(next as Content);
          i++;
        }

        newChildren.push(section as unknown as Content);
      } else {
        newChildren.push(node);
        i++;
      }
    }

    tree.children = newChildren;
  };
};

export default remarkSectionWrap;
