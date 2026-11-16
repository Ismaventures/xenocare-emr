const ALLOWED_TAGS = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'CAPTION',
  'CODE',
  'DIV',
  'EM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HR',
  'I',
  'LI',
  'OL',
  'P',
  'PRE',
  'S',
  'SPAN',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
]);

const BLOCK_TAGS = new Set([
  'BLOCKQUOTE',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'OL',
  'P',
  'PRE',
  'TABLE',
  'TR',
  'UL',
]);

const DROP_WITH_CONTENT = new Set([
  'IFRAME',
  'LINK',
  'META',
  'OBJECT',
  'SCRIPT',
  'STYLE',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title']),
  OL: new Set(['start']),
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan']),
};

function sanitizeNode(node: Node): void {
  if (node.nodeType === Node.COMMENT_NODE) {
    node.parentNode?.removeChild(node);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;
  const tag = element.tagName.toUpperCase();

  if (DROP_WITH_CONTENT.has(tag)) {
    element.remove();
    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
    return;
  }

  const allowed = ALLOWED_ATTRS[tag];
  Array.from(element.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim();
    if (!allowed?.has(name) || name.startsWith('on')) {
      element.removeAttribute(attribute.name);
      return;
    }
    if (
      name === 'href' &&
      !/^(https?:|mailto:|tel:|#)/i.test(value)
    ) {
      element.removeAttribute(attribute.name);
    }
  });

  Array.from(element.childNodes).forEach(sanitizeNode);
}

export function sanitizeClinicalHtml(html: string): string {
  if (!html) return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  Array.from(document.body.childNodes).forEach(sanitizeNode);
  return document.body.innerHTML;
}

export function clinicalHtmlToPlainText(html: string): string {
  if (!html) return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  const blocks: string[] = [];

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.replace(/\u00a0/g, ' ') || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const element = node as HTMLElement;
    const tag = element.tagName.toUpperCase();
    if (tag === 'BR') return '\n';
    if (DROP_WITH_CONTENT.has(tag)) return '';
    const content = Array.from(element.childNodes).map(walk).join('');
    return BLOCK_TAGS.has(tag) ? `${content}\n` : content;
  };

  Array.from(document.body.childNodes).forEach((node) => {
    const value = walk(node).replace(/[ \t]+/g, ' ').trim();
    if (value) blocks.push(value);
  });

  return blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function plainTextToClinicalHtml(text: string): string {
  if (!text) return '';
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'),
    )
    .map((line) => (line ? `<p>${line}</p>` : '<p><br></p>'))
    .join('');
}
