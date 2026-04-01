"use client";

import katex from "katex";
import { useMemo } from "react";

interface KatexSpanProps {
  tex: string;
  displayMode?: boolean;
  className?: string;
}

export default function KatexSpan({ tex, displayMode = false, className }: KatexSpanProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode,
        throwOnError: false,
        output: "html",
      });
    } catch {
      return `<span style="color:red">${tex}</span>`;
    }
  }, [tex, displayMode]);

  return (
    <span
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
