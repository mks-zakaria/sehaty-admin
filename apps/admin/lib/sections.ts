/**
 * Blocks over markdown.
 *
 * The editor wants what a block editor gives you — reorder, insert a picture
 * between two paragraphs, work on one piece at a time. The database wants what
 * it already has: `body` as a single markdown string, which the landing site
 * renders, the JSON-LD reads, the FAQ extractor parses, the drafter writes and
 * the verbatim-overlap check scans.
 *
 * Storing blocks would mean rewriting all of that and migrating every existing
 * article, to gain an authoring experience markdown can already express. So the
 * blocks live here, in the editor, and markdown stays the storage.
 *
 * The split is by `## ` heading rather than by paragraph. These articles are
 * written to a mandated shape — an answer, then four to six `## ` sections,
 * then "Quand consulter un médecin" — so a heading is where an author actually
 * thinks one part ends. Splitting on every blank line would produce thirty
 * blocks and a worse editor than a textarea.
 */

export type Section =
  | { id: string; kind: 'text'; value: string }
  | { id: string; kind: 'image'; url: string; alt: string };

/** A whole line that is just a markdown image: `![alt](url)`. */
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;

let counter = 0;
const nextId = (): string => `s${(counter += 1)}`;

/** Give a fresh block, ready to drop into the list. */
export function blankText(): Section {
  return { id: nextId(), kind: 'text', value: '' };
}

export function blankImage(): Section {
  return { id: nextId(), kind: 'image', url: '', alt: '' };
}

export function toSections(body: string): Section[] {
  const sections: Section[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) sections.push({ id: nextId(), kind: 'text', value: text });
    buffer = [];
  };

  for (const line of (body ?? '').split('\n')) {
    const image = line.match(IMAGE_LINE);
    if (image) {
      flush();
      sections.push({ id: nextId(), kind: 'image', alt: image[1], url: image[2] });
      continue;
    }
    // A new heading starts a new block, but only once something precedes it —
    // otherwise an article opening on a heading gains a leading empty block.
    if (line.startsWith('## ') && buffer.join('').trim()) flush();
    buffer.push(line);
  }
  flush();

  return sections.length ? sections : [blankText()];
}

export function toMarkdown(sections: Section[]): string {
  return sections
    .map((s) =>
      s.kind === 'image' ? (s.url ? `![${s.alt}](${s.url})` : '') : s.value.trim(),
    )
    .filter(Boolean)
    .join('\n\n');
}

/** Move a block one place up or down, returning a new array. */
export function move(sections: Section[], index: number, delta: -1 | 1): Section[] {
  const target = index + delta;
  if (target < 0 || target >= sections.length) return sections;
  const next = [...sections];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** The first `## ` heading in a block, for the collapsed label. */
export function sectionLabel(section: Section): string {
  if (section.kind === 'image') return section.alt || 'Image';
  const heading = section.value.split('\n').find((l) => l.startsWith('## '));
  if (heading) return heading.replace(/^##\s*/, '');
  const first = section.value.trim().split('\n')[0] ?? '';
  return first.slice(0, 60) || 'Empty block';
}
