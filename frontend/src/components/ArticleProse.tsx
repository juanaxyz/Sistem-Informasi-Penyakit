import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type ArticleProseProps = {
  /** Sumber Markdown yang sudah disimpan (isi `artikel_bagian.konten`). */
  children: string;
  /** Override per-elemen, dipakai halaman detail untuk merapikan tabel. */
  components?: Components;
  className?: string;
};

/**
 * Blog-quality prose wrapper for rendered Markdown content.
 * Inspired by editorial layouts: proper measure, typographic hierarchy,
 * generous rhythm, and subtle visual cues.
 *
 * Styling-nya hidup di `.article-prose` (src/index.css). Komponen ini adalah
 * satu-satunya tempat yang memakai kelas itu — sebelumnya halaman detail
 * merender `<Markdown>` polos dengan kelas `prose` dari plugin typography yang
 * tidak terpasang, sehingga heading/list/tabel di artikel nyaris tanpa style.
 */
export function ArticleProse({ children, components, className }: ArticleProseProps) {
  return (
    <div className={className ? `article-prose ${className}` : "article-prose"}>
      <Markdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        components={components}
      >
        {children}
      </Markdown>
    </div>
  );
}
