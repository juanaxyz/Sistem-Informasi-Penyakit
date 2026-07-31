import { useMemo, useState, type ReactNode } from "react";
import {
  bodyParts,
  type BodyPart as BodyPartData,
} from "../../assets/body-parts";

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
  <div className="relative w-[210px] h-[467px] mx-auto">
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
    <div className="flex-1 min-w-[220px] flex flex-col items-center">
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

  const handleClick = (id: number) => setSelectedPartId(id);
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
      <div className="mt-[18px] flex flex-wrap justify-center items-center gap-3">
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
    </div>
  );
};
