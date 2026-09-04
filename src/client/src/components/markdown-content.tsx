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

  const parseInline = (text: string): React.ReactNode => {
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
            className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground font-mono"
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

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let paragraphBuffer: string[] = [];
  let quoteBuffer: string[] = [];
  let listBuffer: React.ReactNode[] = [];
  let isNumberedList = false;
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let consecutiveEmptyLines = 0;

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      elements.push(
        <p
          key={`p-${elements.length}`}
          className="text-sm text-foreground/90 leading-relaxed"
        >
          {paragraphBuffer.map((line, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <br />}
              {parseInline(line)}
            </React.Fragment>
          ))}
        </p>,
      );
      paragraphBuffer = [];
    }
  };

  const flushQuote = () => {
    if (quoteBuffer.length > 0) {
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="border-l-2 border-primary/70 pl-3.5 py-1 italic text-muted-foreground text-sm bg-muted/20 rounded-r"
        >
          {quoteBuffer.map((line, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <br />}
              {parseInline(line)}
            </React.Fragment>
          ))}
        </blockquote>,
      );
      quoteBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol
            key={`ol-${elements.length}`}
            className="list-decimal pl-5 space-y-1 text-sm text-foreground/90"
          >
            {listBuffer}
          </ol>,
        );
      } else {
        elements.push(
          <ul
            key={`ul-${elements.length}`}
            className="list-disc pl-5 space-y-1 text-sm text-foreground/90"
          >
            {listBuffer}
          </ul>,
        );
      }
      listBuffer = [];
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Code block handling
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className="rounded-lg bg-muted/60 border border-border/50 p-3 text-xs overflow-x-auto text-foreground font-mono"
          >
            <code>{codeBlockBuffer.join("\n")}</code>
          </pre>,
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        flushAll();
        inCodeBlock = true;
      }
      consecutiveEmptyLines = 0;
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    // Empty lines handling
    if (!trimmed) {
      flushAll();
      consecutiveEmptyLines++;
      // If user typed 2 or more empty lines in raw markdown, insert an intentional extra visual spacer
      if (consecutiveEmptyLines >= 2) {
        elements.push(
          <div
            key={`spacer-${elements.length}`}
            className="h-3"
            aria-hidden="true"
          />,
        );
      }
      return;
    }

    // Reset empty line count when encountering content
    consecutiveEmptyLines = 0;

    // Headings
    if (trimmed.startsWith("### ")) {
      flushAll();
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-xs font-bold uppercase tracking-wider text-foreground pt-1"
        >
          {parseInline(trimmed.slice(4))}
        </h3>,
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushAll();
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-sm font-bold text-foreground pt-1.5"
        >
          {parseInline(trimmed.slice(3))}
        </h2>,
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushAll();
      elements.push(
        <h1
          key={`h1-${elements.length}`}
          className="text-base font-bold text-foreground pt-2"
        >
          {parseInline(trimmed.slice(2))}
        </h1>,
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      quoteBuffer.push(trimmed.slice(2));
      return;
    }

    // Unordered List
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      flushQuote();
      if (isNumberedList) flushList();
      isNumberedList = false;
      listBuffer.push(<li key={`li-${i}`}>{parseInline(trimmed.slice(2))}</li>);
      return;
    }

    // Numbered List
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      flushParagraph();
      flushQuote();
      if (!isNumberedList) flushList();
      isNumberedList = true;
      listBuffer.push(<li key={`li-${i}`}>{parseInline(numMatch[2])}</li>);
      return;
    }

    // Regular paragraph line
    flushQuote();
    flushList();
    paragraphBuffer.push(line);
  });

  flushAll();

  return <div className={`space-y-3.5 ${className}`}>{elements}</div>;
};
