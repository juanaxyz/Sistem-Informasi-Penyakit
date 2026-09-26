import { Stethoscope } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../react-bits/components/ui/accordion";

const FAQ_DATA = {
  "website apa ini ?":
    "Sistem Informasi Penyakit Tubuh adalah website yang membantu pengguna mencari informasi penyakit dengan cara yang mudah dan visual. Pengguna dapat menjelajahi informasi kesehatan melalui tiga cara: mengklik bagian tubuh pada peta tubuh interaktif (body map), memilih kategori sistem tubuh (seperti sistem pencernaan atau pernapasan), atau menggunakan pencarian teks langsung. Website ini bersifat informasional dan edukatif, bukan alat diagnosis medis.",
  "Cara menggunakan body map (peta tubuh)":
    "Body map adalah ilustrasi tubuh manusia yang bisa diklik. Caranya: pilih tampilan depan atau belakang tubuh, pilih tampilan pria atau wanita menggunakan tombol toggle, lalu klik bagian tubuh yang ingin diketahui (misalnya kepala, dada, atau perut). Setelah diklik, akan muncul daftar penyakit yang berkaitan dengan area tubuh tersebut. Klik salah satu penyakit di daftar itu untuk melihat informasi lengkapnya.",
  "Apakah website ini bisa mendiagnosis penyakit saya":
    "Tidak. Website ini bukan alat diagnosis dan tidak dapat menentukan penyakit yang dialami pengguna secara personal. Sistem ini murni hanya menyediakan informasi edukatif tentang berbagai penyakit berdasarkan bagian tubuh atau kategori yang dipilih pengguna, bukan menganalisis gejala spesifik pengguna untuk memberikan kesimpulan diagnosis. serta memberikan klasifikasi x-ray khusus untuk paru paru menggunakan algoritma deep learnning untuk mengetahui apakah paru paru normal atau tidak (dengan ada 7 kelas klasifikasi yaitu pneumonia, covid 19, tuberculosis, pneumonia, mass, nodule, lung opacity). Untuk mengetahui kondisi kesehatan yang sebenarnya, pengguna harus berkonsultasi langsung dengan dokter atau tenaga medis profesional.",
};

const FAQ_ENTRIES = Object.entries(FAQ_DATA);

export default function Faq() {
  return (
    <section
      aria-labelledby="faq-heading"
      className="mt-12 py-6 md:mt-16"
    >
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-pine">
          FAQ
        </p>
        <h2
          id="faq-heading"
          className="mt-3 font-display text-xl font-medium tracking-tight text-ink text-balance md:text-2xl"
        >
          Pertanyaan yang Sering Diajukan
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          Jawaban singkat seputar peta tubuh interaktif, pencarian penyakit,
          dan layanan analisis gambar.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:mt-10 lg:grid-cols-[1fr_320px] lg:gap-10">
        <Accordion
          type="single"
          defaultValue="item-1"
          collapsible
          className="max-w-2xl"
        >
          {FAQ_ENTRIES.map(([question, answer], index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="py-4 font-display text-base font-medium text-ink hover:no-underline aria-expanded:text-pine">
                {question}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground text-pretty">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <aside className="lg:sticky lg:top-20">
          <div className="rounded-lg border border-border/70 bg-card p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-pine">
              <Stethoscope className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-base font-medium text-ink">
              Butuh jawaban lebih lanjut?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Halaman ini hanya menyediakan informasi umum. Untuk kondisi
              kesehatan Anda, konsultasikan dengan dokter atau tenaga kesehatan
              profesional.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}