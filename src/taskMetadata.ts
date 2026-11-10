const EMOJI = /\p{Extended_Pictographic}/u;
const EMOJI_PART = /(\p{Extended_Pictographic}[\uFE0E\uFE0F]?)/u;
const BLOCK_ID = /(?:^|\s)(\^[a-zA-Z0-9-]+)\s*$/;

/**
 * Descriptions are emoji-free: the first emoji starts the configuration tail.
 * A standalone block ID is metadata only if it also ends the source Markdown,
 * not when it is the visible label of a link or part of inline code.
 */
export function taskMetadataStart(text: string, markdown = text): number {
  const emoji = text.search(EMOJI);
  if (emoji !== -1) return emoji;

  const sourceBlock = BLOCK_ID.exec(markdown)?.[1];
  const visibleBlock = BLOCK_ID.exec(text);
  if (!sourceBlock || visibleBlock?.[1] !== sourceBlock) return -1;
  return visibleBlock.index + visibleBlock[0].indexOf("^");
}

/**
 * Decorate native Markdown after rendering. Only text nodes are replaced, so
 * links, formatting and their existing event handlers stay intact.
 */
export function dimTaskMetadata(target: HTMLElement, markdown: string): void {
  for (const tag of Array.from(target.querySelectorAll("a.tag"))) {
    tag.classList.add("eye-task-metadata");
  }

  const start = taskMetadataStart(target.textContent ?? "", markdown);
  if (start === -1) return;

  const doc = target.ownerDocument;
  const walker = doc.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  let offset = 0;
  for (const node of nodes) {
    const localStart = Math.max(0, start - offset);
    offset += node.length;
    if (localStart >= node.length) continue;

    const fragment = createFragment();
    fragment.appendChild(doc.createTextNode(node.data.slice(0, localStart)));
    const metadata = createSpan({ cls: "eye-task-metadata" });
    for (const part of node.data.slice(localStart).split(EMOJI_PART)) {
      if (!part) continue;
      if (EMOJI.test(part)) {
        const emoji = createSpan({ cls: "eye-task-metadata-emoji" });
        emoji.textContent = part;
        metadata.appendChild(emoji);
      } else {
        metadata.appendChild(doc.createTextNode(part));
      }
    }
    fragment.appendChild(metadata);
    node.replaceWith(fragment);
  }
}
