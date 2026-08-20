import { useBodyParts } from "@/hooks/useBodyParts";

export default function Statistics() {
  const { data: bodyParts } = useBodyParts();

  const stats = [
    {
      value: bodyParts != null ? String(bodyParts.length) : "–",
      label: "Bagian tubuh",
    },
    { value: "3", label: "Tingkat urgensi" },
    { value: "2", label: "Tampilan peta" },
    { value: "3", label: "Sumber acuan" },
  ];

  return (
    <section
      aria-label="Statistik Peta Kesehatan"
      className="mt-2 border-y border-border py-6 md:mt-6"
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="mt-1.5 font-display text-3xl font-medium text-ink">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}