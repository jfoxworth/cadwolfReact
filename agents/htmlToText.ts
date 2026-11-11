// Turns a text block's HTML into plain text for the model, keeping paragraph breaks and the
// nesting of lists. Stripping tags to spaces collapses an outline like "strut system → strut,
// 2 rod ends" into one run-on line ("Strut 2 Eye bolts"), which loses exactly the structure
// the coordinators need.

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);
}

export function htmlToText(html: string): string {
  const tokens = html.match(/<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>|[^<]+|</g) ?? [];

  /** One entry per open list: ordered lists count their items. */
  const lists: { ordered: boolean; count: number }[] = [];
  const lines: string[] = [];
  let current = "";
  /** Indent and bullet/number for the list item being read; written with its first line. */
  let prefix = "";

  const flush = () => {
    const text = decodeEntities(current).replace(/[ \t\u00a0]+/g, " ").trim();
    if (text) {
      lines.push(prefix + text);
      prefix = "";
    }
    current = "";
  };

  for (const token of tokens) {
    if (!token.startsWith("<") || token === "<") {
      current += token;
      continue;
    }
    const closing = token.startsWith("</");
    const tag = token.replace(/^<\/?/, "").match(/^[a-zA-Z0-9]+/)?.[0].toLowerCase() ?? "";

    if (tag === "ul" || tag === "ol") {
      flush();
      if (closing) lists.pop();
      else lists.push({ ordered: tag === "ol", count: 0 });
    } else if (tag === "li") {
      flush();
      if (!closing && lists.length > 0) {
        const list = lists[lists.length - 1];
        list.count += 1;
        const marker = list.ordered ? `${list.count}.` : "-";
        prefix = `${"  ".repeat(lists.length - 1)}${marker} `;
      }
    } else if (tag === "br") {
      flush();
    } else if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "tr"].includes(tag)) {
      // A paragraph inside a list item keeps the item's marker: flush only when it closes.
      if (closing || lists.length === 0) flush();
    }
    // Inline tags (a, b, i, em, strong, span, ...) just disappear and their text stays.
  }
  flush();
  return lines.join("\n");
}
