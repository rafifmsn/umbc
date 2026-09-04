import React from "react";

interface MarkdownContentProps {
  content?: string | null;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = "",
}) => {
  if (!content || !content.trim()) {
    return null;
  }

  // Parse markdown into tokens/blocks
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let codeLanguage = "";
  let listBuffer: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (listBuffer.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol
            key={`ol-${elements.length}`}
            className="list-decimal pl-5 space-y-1 text-sm text-foreground/90 my-2"
          >
            {listBuffer}
          </ol>,
        );
      } else {
        elements.push(
          <ul
            key={`ul-${elements.length}`}
            className="list-disc pl-5 space-y-1 text-sm text-foreground/90 my-2"
          >
            {listBuffer}
          </ul>,
        );
      }
      listBuffer = [];
    }
  };

  const parseInline = (text: string): React.ReactNode => {
    // Regex for bold, italic, inline code, and links
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let idx = 0;

    while (remaining.length > 0) {
      // Inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code
            key={idx++}
            className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground"
          >
            {codeMatch[1]}
          </code>,
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Link: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={idx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
          >
            {linkMatch[1]}
          </a>,
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        parts.push(
          <strong key={idx++} className="font-semibold text-foreground">
            {parseInline(boldMatch[2])}
          </strong>,
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
      if (italicMatch) {
        parts.push(
          <em key={idx++} className="italic text-foreground/90">
            {parseInline(italicMatch[2])}
          </em>,
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Regular character up to next special char
      const nextSpecial = remaining.search(/[`*_\[]/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return parts;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="rounded-lg bg-muted/60 border border-border/50 p-3 text-xs overflow-x-auto text-foreground my-3"
          >
            <code>{codeBlockBuffer.join("\n")}</code>
          </pre>,
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    // Empty line
    if (!trimmed) {
      flushList();
      return;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-sm font-bold text-foreground mt-4 mb-1"
        >
          {parseInline(trimmed.slice(4))}
        </h3>,
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-base font-bold text-foreground mt-5 mb-1.5"
        >
          {parseInline(trimmed.slice(3))}
        </h2>,
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-lg font-bold text-foreground mt-6 mb-2"
        >
          {parseInline(trimmed.slice(2))}
        </h1>,
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-primary/60 pl-3 italic text-muted-foreground my-2 text-sm"
        >
          {parseInline(trimmed.slice(2))}
        </blockquote>,
      );
      return;
    }

    // Unordered List
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (isNumberedList) flushList();
      isNumberedList = false;
      listBuffer.push(<li key={`li-${i}`}>{parseInline(trimmed.slice(2))}</li>);
      return;
    }

    // Numbered List
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!isNumberedList) flushList();
      isNumberedList = true;
      listBuffer.push(<li key={`li-${i}`}>{parseInline(numMatch[2])}</li>);
      return;
    }

    // Paragraph
    flushList();
    elements.push(
      <p
        key={`p-${i}`}
        className="text-sm text-foreground/90 leading-relaxed my-2"
      >
        {parseInline(line)}
      </p>,
    );
  });

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
