import { Fragment, type ReactNode } from "react";

/**
 * A deliberately tiny markdown renderer for the report prose (headings, lists,
 * bold, italics, inline code, blockquotes).
 *
 * It builds React elements rather than HTML strings — model output is never
 * fed to dangerouslySetInnerHTML.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-i${i++}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-accent-soft px-1 py-0.5 text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export default function Markdown({ source }: { source: string }) {
  const lines = (source ?? "").split(/\r?\n/);
  const blocks: ReactNode[] = [];

  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushList = (key: string) => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={key}>
        {list.items.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  const flushParagraph = (key: string) => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ");
    blocks.push(<p key={key}>{renderInline(text, key)}</p>);
    paragraph = [];
  };

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    const key = `b${index}`;

    if (!line.trim()) {
      flushParagraph(key);
      flushList(`${key}-l`);
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph(`${key}-p`);
      flushList(`${key}-l`);
      blocks.push(<h3 key={key}>{renderInline(heading[2], key)}</h3>);
      return;
    }

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (bullet || numbered) {
      flushParagraph(`${key}-p`);
      const ordered = Boolean(numbered);
      const content = (bullet ?? numbered)![1];
      if (list && list.ordered !== ordered) flushList(`${key}-l`);
      if (!list) list = { ordered, items: [] };
      list.items.push(content);
      return;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph(`${key}-p`);
      flushList(`${key}-l`);
      blocks.push(
        <blockquote
          key={key}
          className="border-l-2 border-accent pl-3 italic text-muted"
        >
          {renderInline(quote[1], key)}
        </blockquote>,
      );
      return;
    }

    flushList(`${key}-l`);
    paragraph.push(line.trim());
  });

  flushParagraph("b-final-p");
  flushList("b-final-l");

  return <div className="prose-report text-sm">{blocks.map((b, i) => (
    <Fragment key={i}>{b}</Fragment>
  ))}</div>;
}
