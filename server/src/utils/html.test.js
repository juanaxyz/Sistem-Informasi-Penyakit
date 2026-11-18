const {
  sanitizeArtikelHtml,
  htmlToPlainText,
  isEmptyArtikelHtml,
  isAllowedImageSrc,
} = require("./html");

describe("sanitizeArtikelHtml", () => {
  it("membuang <script> beserta isinya", () => {
    const out = sanitizeArtikelHtml("<p>aman<script>alert(1)</script></p>");
    expect(out).toBe("<p>aman</p>");
    expect(out).not.toContain("script");
    expect(out).not.toContain("alert");
  });

  it("membuang atribut event handler (onerror)", () => {
    const out = sanitizeArtikelHtml(
      '<img src="/uploads/a.png" onerror="alert(1)" alt="x">',
    );
    expect(out).not.toContain("onerror");
    expect(out).toContain('src="/uploads/a.png"');
  });

  it("menolak href javascript:", () => {
    const out = sanitizeArtikelHtml(
      '<a href="javascript:alert(1)">klik</a>',
    );
    expect(out).not.toContain("javascript:");
    expect(out).toContain("klik");
  });

  it("membuang img dengan data: URI", () => {
    const out = sanitizeArtikelHtml(
      '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="x"></p>',
    );
    expect(out).toBe("<p></p>");
  });

  it("membuang img dari domain luar", () => {
    const out = sanitizeArtikelHtml(
      '<img src="https://evil.example/tracker.png">',
    );
    expect(out).toBe("");
  });

  it("mempertahankan img dari /uploads dan paksa rel/target pada <a>", () => {
    const out = sanitizeArtikelHtml(
      '<p><img src="/uploads/artikel/abc.png" alt="paru"> <a href="https://www.who.int/x">WHO</a></p>',
    );
    expect(out).toContain('src="/uploads/artikel/abc.png"');
    expect(out).toContain('alt="paru"');
    expect(out).toContain('href="https://www.who.int/x"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("menerima img absolut dari host PUBLIC_BASE_URL", () => {
    const out = sanitizeArtikelHtml(
      '<img src="http://localhost:4000/uploads/artikel/abc.webp">',
    );
    expect(out).toContain("abc.webp");
  });

  it("membuang tag di luar whitelist tapi mempertahankan teksnya", () => {
    const out = sanitizeArtikelHtml(
      "<div><h1>Judul</h1><span>teks</span><table><tr><td>sel</td></tr></table></div>",
    );
    expect(out).toBe("Judultekssel");
  });

  it("h1 turun menjadi teks (whitelist hanya h2/h3)", () => {
    const out = sanitizeArtikelHtml("<h1>Judul</h1><h2>Bagian</h2>");
    expect(out).toBe("Judul<h2>Bagian</h2>");
  });

  it("allowlist atribut: hanya href/target/rel/title pada <a>", () => {
    const out = sanitizeArtikelHtml(
      '<a href="https://x.id" class="x" download>link</a>',
    );
    expect(out).not.toContain("class");
    expect(out).not.toContain("download");
  });

  it("menangani input null/undefined", () => {
    expect(sanitizeArtikelHtml(undefined)).toBe("");
    expect(sanitizeArtikelHtml(null)).toBe("");
  });
});

describe("htmlToPlainText", () => {
  it("mengubah h2/h3/p/br menjadi baris baru", () => {
    const out = htmlToPlainText(
      "<h2>Gejala</h2><p>batuk</p><p>demam<br>berdarah</p>",
    );
    expect(out).toBe("Gejala\nbatuk\ndemam\nberdarah");
  });

  it("mengawali item list dengan '- '", () => {
    const out = htmlToPlainText(
      "<ul><li>batuk</li><li>demam</li></ul>",
    );
    expect(out).toBe("- batuk\n- demam");
  });

  it("membuang semua tag dan mendekode entitas", () => {
    const out = htmlToPlainText(
      "<p>a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;</p>",
    );
    expect(out).toBe("a & b <c> \"d\" 'e'");
  });

  it("merapikan spasi dan baris baru berlebih", () => {
    const out = htmlToPlainText("<p>  teks   \n  acak  </p><p></p><p>lanjut</p>");
    expect(out).toBe("teks acak\nlanjut");
  });

  it("membuang isi tag script/style dari teks (parity dengan service Python)", () => {
    expect(htmlToPlainText("<p>aman<script>alert(1)</script></p>")).toBe("aman");
    expect(htmlToPlainText("<p>a</p><style>x{color:red}</style><p>b</p>")).toBe("a\nb");
  });

  it("menangani input null/undefined", () => {
    expect(htmlToPlainText(undefined)).toBe("");
    expect(htmlToPlainText(null)).toBe("");
  });
});

describe("isEmptyArtikelHtml", () => {
  it("menganggap HTML 'kosong' editor (<p><br></p>) sebagai kosong", () => {
    expect(isEmptyArtikelHtml("<p><br></p>")).toBe(true);
    expect(isEmptyArtikelHtml("<p></p><h2><br></h2>")).toBe(true);
  });

  it("menganggap HTML dengan teks sebagai tidak kosong", () => {
    expect(isEmptyArtikelHtml("<p>batuk</p>")).toBe(false);
    expect(isEmptyArtikelHtml("<h2>Gejala</h2><p></p>")).toBe(false);
  });
});

describe("isAllowedImageSrc", () => {
  it("hanya menerima path /uploads pada host sendiri", () => {
    expect(isAllowedImageSrc("/uploads/a.png")).toBe(true);
    expect(isAllowedImageSrc("http://localhost:4000/uploads/a.png")).toBe(true);
    expect(isAllowedImageSrc("https://evil.example/uploads/a.png")).toBe(false);
    expect(isAllowedImageSrc("data:image/png;base64,AAAA")).toBe(false);
    expect(isAllowedImageSrc("javascript:alert(1)")).toBe(false);
  });
});
