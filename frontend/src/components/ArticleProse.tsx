import { useEffect, useRef } from "react";
import { sanitizeArtikelHtml, type TocItem } from "@/lib/artikel";

export type { TocItem };

type ArticleProseProps = {
  /** HTML artikel hasil editor Quill (akan disanitasi lagi di klien). */
  children: string;
  className?: string;
  /** Callback ketika daftar isi (dari <h2>/<h3>) berhasil dibangun. */
  onTocChange?: (toc: TocItem[]) => void;
};

/**
 * Render HTML artikel aman: DOMPurify hanya mengizinkan tag/atribut kontrak
 * (pertahanan berlapis; backend tetap sumber kebenaran saat menyimpan).
 * Styling pakai `.article-prose` (index.css) yang juga dipakai editor Quill
 * supaya tampilan publik sama dengan di editor.
 */
export function ArticleProse({ children, className, onTocChange }: ArticleProseProps) {
  const tocKeyRef = useRef("");
  const { html, toc } = sanitizeArtikelHtml(children ?? "");
  // Bandingkan kunci id agar onTocChange tidak memicu loop render.
  const tocKey = toc.map((t) => `${t.id}@${t.level}`).join("|");

  useEffect(() => {
    if (tocKey !== tocKeyRef.current) {
      tocKeyRef.current = tocKey;
      onTocChange?.(toc);
    }
  }, [tocKey, toc, onTocChange]);

  return (
    <div
      className={className ? `article-prose ${className}` : "article-prose"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;

  const header = document.querySelector("header");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const offset = headerHeight + 24;

  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: elementPosition - offset, behavior: "smooth" });
}

export function TableOfContents({
  items,
  onNavigate,
}: {
  items: TocItem[];
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <nav className="toc space-y-1.5" aria-label="Daftar isi">
      <h4 className="text-ui font-body font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Daftar Isi
      </h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: item.level === 3 ? "1rem" : 0 }}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.id);
                history.pushState(null, "", `#${item.id}`);
                onNavigate?.();
              }}
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
