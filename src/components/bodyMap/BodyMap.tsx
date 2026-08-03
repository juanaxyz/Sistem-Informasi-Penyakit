import { useMemo, useState, type ReactNode } from "react";
import {
  bodyParts,
  type BodyPart as BodyPartData,
} from "../../assets/body-parts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SVG_VIEWBOX = "0 0 375.42 832.97";

const IS_TOUCH_DEVICE =
  typeof window !== "undefined" && "ontouchstart" in window;

const PART_DEFAULTS = {
  default: "var(--part-default)",
  hovered: "var(--part-hovered)",
  selected: "var(--part-selected)",
  highlighted: "var(--part-highlighted)",
} as const;

type BodyPartProps = {
  part: BodyPartData;
  fill: string;
  interactive: boolean;
  onClick?: (id: number) => void;
  onMouseEnter?: (id: number) => void;
  onMouseLeave?: () => void;
};

const BodyPart = ({
  part,
  fill,
  interactive,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: BodyPartProps) => (
  <path
    id={`body-part-${part.id}`}
    d={part.d}
    fill={fill}
    className={[
      interactive ? "cursor-pointer" : "cursor-default",
      "[-webkit-tap-highlight-color:transparent]",
    ].join(" ")}
    onClick={interactive ? () => onClick?.(part.id) : undefined}
    onMouseEnter={
      interactive && !IS_TOUCH_DEVICE ? () => onMouseEnter?.(part.id) : undefined
    }
    onMouseLeave={interactive && !IS_TOUCH_DEVICE ? onMouseLeave : undefined}
  >
    <title>{part.name}</title>
  </path>
);

const CROSSHAIR_SIZE = 14;

const CrosshairMarks = () => (
  <g stroke="var(--border)" strokeWidth="1.5" fill="none">
    <path d={`M 0 ${CROSSHAIR_SIZE} V 0 H ${CROSSHAIR_SIZE}`} />
    <path d={`M ${375.42 - CROSSHAIR_SIZE} 0 H ${375.42} V ${CROSSHAIR_SIZE}`} />
    <path d={`M ${375.42} ${832.97 - CROSSHAIR_SIZE} V ${832.97} H ${375.42 - CROSSHAIR_SIZE}`} />
    <path d={`M 0 ${832.97 - CROSSHAIR_SIZE} V ${832.97} H ${CROSSHAIR_SIZE}`} />
  </g>
);

type BodyContainerProps = {
  children: ReactNode;
  imageSrc?: string;
};

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
      <CrosshairMarks />
    </svg>
  </div>
);

type BodySideProps = {
  parts: BodyPartData[];
  imageSrc: string;
  selectedPartId: number | null;
  hoveredPartId: number | null;
  highlightedIds: number[];
  interactive: boolean;
  onClick: (id: number) => void;
  onMouseEnter: (id: number) => void;
  onMouseLeave: () => void;
};

const BodySide = ({
  parts,
  imageSrc,
  selectedPartId,
  hoveredPartId,
  highlightedIds,
  interactive,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: BodySideProps) => {
  const partColor = (id: number): string => {
    if (selectedPartId === id) return PART_DEFAULTS.selected;
    if (hoveredPartId === id) return PART_DEFAULTS.hovered;
    if (highlightedIds.includes(id)) return PART_DEFAULTS.highlighted;
    return PART_DEFAULTS.default;
  };

  return (
    <BodyContainer imageSrc={imageSrc}>
      {parts.map((part) => (
        <BodyPart
          key={part.id}
          part={part}
          fill={partColor(part.id)}
          interactive={interactive}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      ))}
    </BodyContainer>
  );
};

interface BodyMapProps {
  selectedPartId: number | null;
  onSelectPart: (id: number) => void;
  /** Bagian yang disorot tanpa "memilih" (multi-highlight, mis. di preview detail). */
  highlightedIds?: number[];
  /** false = tampilan pasif tanpa hover/klik dan tanpa legenda interaktif. */
  interactive?: boolean;
}

export const BodyMap = ({
  selectedPartId,
  onSelectPart,
  highlightedIds = [],
  interactive = true,
}: BodyMapProps) => {
  const [hoveredPartId, setHoveredPartId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"ant" | "post">("ant");

  const antParts = useMemo(
    () => bodyParts.filter((part) => part.face === "ant"),
    [],
  );
  const postParts = useMemo(
    () => bodyParts.filter((part) => part.face === "post"),
    [],
  );

  const handleClick = (id: number) => {
    onSelectPart(id);
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
    <div className="flex flex-col items-center gap-4">
      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as "ant" | "post")}
        className="w-full max-w-xs"
      >
        <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg">
          <TabsTrigger value="ant" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Depan
          </TabsTrigger>
          <TabsTrigger value="post" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Belakang
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ant" className="pt-0">
          <BodySide
            parts={antParts}
            imageSrc="/images/front.png"
            selectedPartId={selectedPartId}
            hoveredPartId={hoveredPartId}
            highlightedIds={highlightedIds}
            interactive={interactive}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        </TabsContent>
        <TabsContent value="post" className="pt-0">
          <BodySide
            parts={postParts}
            imageSrc="/images/back.png"
            selectedPartId={selectedPartId}
            hoveredPartId={hoveredPartId}
            highlightedIds={highlightedIds}
            interactive={interactive}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        </TabsContent>
      </Tabs>

      {interactive ? (
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground font-mono px-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: PART_DEFAULTS.default }} />
            <span>Default</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: PART_DEFAULTS.hovered }} />
            <span>Hover</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: PART_DEFAULTS.selected }} />
            <span>Terpilih</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono px-2">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: PART_DEFAULTS.highlighted }} />
          <span>Bagian tubuh terkait</span>
        </div>
      )}
    </div>
  );
};
