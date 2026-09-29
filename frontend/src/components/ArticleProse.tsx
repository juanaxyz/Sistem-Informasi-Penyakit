import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { useEffect, useRef } from "react";

type ArticleProseProps = {
  /** Sumber Markdown yang sudah disimpan (isi `artikel_bagian.konten`). */
  children: string;
  /** Override per-elemen, dipakai halaman detail untuk merapikan tabel. */
  components?: Components;
  className?: string;
  /** Enable table of contents generation */
  enableToc?: boolean;
  /** Callback when TOC is generated */
  onTocChange?: (toc: TocItem[]) => void;
};

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

function extractToc(content: string): TocItem[] {
  const headingRegex = /^#{2,3}\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[0].match(/^#+/)?.[0].length ?? 2;
    const text = match[1].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    toc.push({ id, text, level });
  }
  return toc;
}

export function ArticleProse({
  children,
  components,
  className,
  enableToc = false,
  onTocChange,
}: ArticleProseProps) {
  const tocRef = useRef<TocItem[]>([]);

  useEffect(() => {
    if (enableToc) {
      const toc = extractToc(children);
      tocRef.current = toc;
      onTocChange?.(toc);
    }
  }, [children, enableToc, onTocChange]);

  return (
    <div className={className ? `article-prose ${className}` : "article-prose"}>
      <Markdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
        ]}
        components={components}
      >
        {children}
      </Markdown>
    </div>
  );
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav className="toc sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-1.5 pr-2" aria-label="Daftar isi">
      <h4 className="text-ui font-body font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Daftar Isi
      </h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: item.level === 3 ? "1rem" : 0 }}>
            <a
              href={`#${item.id}`}
              className="toc-link block text-body-sm font-body text-muted-foreground hover:text-pine transition-colors py-0.5 truncate"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}