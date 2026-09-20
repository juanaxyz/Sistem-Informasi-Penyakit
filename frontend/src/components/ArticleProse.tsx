import Markdown from "react-markdown";

/**
 * Blog-quality prose wrapper for rendered Markdown content.
 * Inspired by editorial layouts: proper measure, typographic hierarchy,
 * generous rhythm, and subtle visual cues.
 */
export function ArticleProse({ children }: { children: string }) {
  return (
    <div className="article-prose">
      <Markdown>{children}</Markdown>
    </div>
  );
}
