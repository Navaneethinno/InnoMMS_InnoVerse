import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Links in a document open in a new tab, away from the portal.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

const RICH =
  "text-sm leading-6 text-slate-600 [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_blockquote]:border-s-4 [&_blockquote]:border-slate-200 [&_blockquote]:ps-3 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-ink [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-bold [&_h3]:text-ink [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mt-2 [&_table]:w-full [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:p-2 [&_ul]:list-disc [&_ul]:ps-5 [&>*:first-child]:mt-0";

// A document's text as the institution wrote it: Markdown and HTML are
// rendered (cleaned of scripts and the like), plain text keeps its line breaks.
export default function DocumentContent({ doc }) {
  const html = useMemo(() => {
    const content = doc?.content ?? "";
    if (doc?.content_format === "PLAIN") return null;
    return DOMPurify.sanitize(doc?.content_format === "HTML" ? content : marked.parse(content, { async: false }));
  }, [doc]);
  if (html === null) return <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{doc.content}</p>;
  return <div className={RICH} dangerouslySetInnerHTML={{ __html: html }} />;
}
