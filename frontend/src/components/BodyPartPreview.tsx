import { BodyMap } from "./bodyMap/BodyMap";
import { Card, CardContent } from "@/components/ui/card";

interface BodyPartPreviewProps {
  /** id bagian_tubuh yang ingin disorot (dari detail.bagian_tubuh). */
  ids: number[];
}

export function BodyPartPreview({ ids }: BodyPartPreviewProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <h2 className="font-display text-lg font-semibold text-ink mb-3">
          Bagian tubuh terkait
        </h2>
        {ids.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tidak ada bagian tubuh yang tercatat untuk penyakit ini.
          </p>
        ) : (
          <BodyMap
            selectedPartId={null}
            onSelectPart={() => {}}
            highlightedIds={ids}
            interactive={false}
          />
        )}
      </CardContent>
    </Card>
  );
}
