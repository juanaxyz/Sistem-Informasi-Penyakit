import { useMemo, useState, type ReactNode } from "react";
import {
  bodyParts,
  type BodyPart as BodyPartData,
} from "../../assets/body-parts";
import { useDiseasesByBodyPart } from "../../hooks/useDiseasesByBodyPart";

// --- Konstanta visual --------------------------------------------------

/** Area gambar SVG yang dipakai kedua sisi body map. */
const SVG_VIEWBOX = "0 0 375.42 832.97";

/** Warna isian tiap bagian tubuh berdasarkan status interaksinya. */
const PART_COLORS = {
  default: "rgba(203, 213, 225, 0.85)",
  hovered: "rgba(96, 165, 250, 0.9)",
  selected: "rgba(37, 99, 235, 1)",
} as const;

/** Perangkat touch tidak punya event hover, jadi highlight hover dimatikan. */
const IS_TOUCH_DEVICE =
  typeof window !== "undefined" && "ontouchstart" in window;

// --- Sub-komponen -------------------------------------------------------

type BodyPartProps = {
  part: BodyPartData;
  fill: string;
  onClick: (id: number) => void;
  onMouseEnter: (id: number) => void;
  onMouseLeave: () => void;
};

/** Satu area tubuh interaktif di dalam SVG (`<path>` + tooltip nama bawaan browser). */
const BodyPart = ({
  part,
  fill,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: BodyPartProps) => (
  <path
    id={`body-part-${part.id}`}
    d={part.d}
    fill={fill}
    className="cursor-pointer [-webkit-tap-highlight-color:transparent]"
    onClick={() => onClick(part.id)}
    onMouseEnter={() => onMouseEnter(part.id)}
    onMouseLeave={onMouseLeave}
  >
    <title>{part.name}</title>
  </path>
);

type BodyContainerProps = {
  children: ReactNode;
  imageSrc?: string;
};

/** Wadah body map satu sisi: overlay gambar realistis + SVG area interaktif. */
const BodyContainer = ({ children, imageSrc }: BodyContainerProps) => (
  <div className="relative w-52.5 h-116.75 mx-auto">
    {imageSrc ? (
      <img
        src={imageSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
      />
    ) : null}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={SVG_VIEWBOX}
      className="relative w-full h-full block"
    >
      <g>{children}</g>
    </svg>
  </div>
);

type BodySideProps = {
  title: string;
  imageSrc: string;
  parts: BodyPartData[];
  selectedPartId: number | null;
  hoveredPartId: number | null;
  onClick: (id: number) => void;
  onMouseEnter: (id: number) => void;
  onMouseLeave: () => void;
};

/** Kolom body map satu sisi (depan/belakang) lengkap dengan judulnya. */
const BodySide = ({
  title,
  imageSrc,
  parts,
  selectedPartId,
  hoveredPartId,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: BodySideProps) => {
  const partColor = (id: number): string => {
    if (selectedPartId === id) return PART_COLORS.selected;
    if (hoveredPartId === id) return PART_COLORS.hovered;
    return PART_COLORS.default;
  };

  return (
    <div className="flex-1 min-w-55 flex flex-col items-center">
      <p className="text-center text-[12px] uppercase text-[#303030] mb-2">
        {title}
      </p>
      <BodyContainer imageSrc={imageSrc}>
        {parts.map((part) => (
          <BodyPart
            key={part.id}
            part={part}
            fill={partColor(part.id)}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          />
        ))}
      </BodyContainer>
    </div>
  );
};

// --- Komponen utama -----------------------------------------------------

const URGENCY_STYLES = {
  normal: "bg-emerald-100 text-emerald-700",
  waspada: "bg-yellow-100 text-yellow-700",
  darurat: "bg-red-100 text-red-700",
} as const;

const URGENCY_LABELS: Record<string, string> = {
  normal: "Normal",
  waspada: "Waspada",
  darurat: "Darurat",
};

/** Badge kecil untuk tingkat urgensi penyakit (normal/waspada/darurat). */
const DiseaseUrgencyBadge = ({ level }: { level?: string }) => {
  const key = level && level in URGENCY_STYLES ? level : "normal";
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full ${
        URGENCY_STYLES[key as keyof typeof URGENCY_STYLES]
      }`}
    >
      {URGENCY_LABELS[key] ?? "Normal"}
    </span>
  );
};

export const BodyMap = () => {
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<number | null>(null);

  const antParts = useMemo(
    () => bodyParts.filter((part) => part.face === "ant"),
    [],
  );
  const postParts = useMemo(
    () => bodyParts.filter((part) => part.face === "post"),
    [],
  );

  const selectedPartName = useMemo(() => {
    if (selectedPartId === null) return null;
    return bodyParts.find((part) => part.id === selectedPartId)?.name ?? null;
  }, [selectedPartId]);

  const { data: diseases, loading, error } = useDiseasesByBodyPart(selectedPartId);

  const handleClick = (id: number) => {
    const part = bodyParts.find((p) => p.id === id);
    if (part) console.log("Body part diklik:", part);
    setSelectedPartId(id);
  };
  const handleMouseEnter = (id: number) => {
    if (IS_TOUCH_DEVICE) return;
    setHoveredPartId(id);
  };
  const handleMouseLeave = () => {
    if (IS_TOUCH_DEVICE) return;
    setHoveredPartId(null);
  };

  return (
    <div className="pt-24">
      <h2 className="text-center text-[13px] font-medium uppercase text-[#ff3b30]">
        {selectedPartName ?? "Klik pada bagian tubuh"}
      </h2>
      <div className="mt-4.5 flex flex-wrap justify-center items-center gap-3">
        <BodySide
          title="Depan"
          imageSrc="/images/front.png"
          parts={antParts}
          selectedPartId={selectedPartId}
          hoveredPartId={hoveredPartId}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
        <BodySide
          title="Belakang"
          imageSrc="/images/back.png"
          parts={postParts}
          selectedPartId={selectedPartId}
          hoveredPartId={hoveredPartId}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      <div className="mt-6 w-full max-w-md mx-auto px-4">
        {selectedPartId === null ? (
          <p className="text-center text-sm text-gray-500">
            Klik pada bagian tubuh untuk melihat penyakit terkait.
          </p>
        ) : loading ? (
          <p className="text-center text-sm text-gray-500">Memuat penyakit...</p>
        ) : error ? (
          <p className="text-center text-sm text-red-500">
            Gagal memuat data: {error}
          </p>
        ) : diseases.length === 0 ? (
          <p className="text-center text-sm text-gray-500">
            Tidak ada penyakit terkait bagian ini.
          </p>
        ) : (
          <ul className="space-y-3">
            {diseases.map((d) => (
              <li
                key={d.id}
                className="border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-[15px]">{d.nama}</h3>
                  <DiseaseUrgencyBadge level={d.tingkat_urgensi} />
                </div>
                {d.deskripsi ? (
                  <p className="text-[13px] text-gray-600 mt-1">
                    {d.deskripsi}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
