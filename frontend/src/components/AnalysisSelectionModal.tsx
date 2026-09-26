import React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Camera,
  FileImage,
  ScanLine,
  X,
} from "lucide-react";

export type AnalysisOption = {
  id: number | string;
  name: string;
  description?: string;
  type?: "xray" | "foto" | "ct_scan" | "usg";
  icon?: React.ReactNode;
  disabled?: boolean;
};

type AnalysisSelectionModalProps = {
  open: boolean;
  bodyPartName: string;
  analyses: AnalysisOption[];
  onClose: () => void;
  onSelect: (analysis: AnalysisOption) => void;
};

const defaultIcons = {
  xray: <ScanLine className="h-5 w-5" />,
  foto: <Camera className="h-5 w-5" />,
  ct_scan: <FileImage className="h-5 w-5" />,
  usg: <FileImage className="h-5 w-5" />,
};

export default function AnalysisSelectionModal({
  open,
  bodyPartName,
  analyses,
  onClose,
  onSelect,
}: AnalysisSelectionModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 12,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 12,
            }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-modal-title"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-border bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-pine/60">
                  Bagian tubuh
                </p>

                <h2
                  id="analysis-modal-title"
                  className="text-xl font-semibold text-pine"
                >
                  {bodyPartName}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Pilih jenis analisis yang ingin dilakukan.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-mint/60 hover:text-pine"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Analysis options */}
            <div className="max-h-[60vh] overflow-y-auto p-5">
              {analyses.length > 0 ? (
                <div className="space-y-3">
                  {analyses.map((analysis) => {
                    const icon =
                      analysis.icon ??
                      defaultIcons[analysis.type ?? "foto"];

                    return (
                      <button
                        key={analysis.id}
                        type="button"
                        disabled={analysis.disabled}
                        onClick={() => onSelect(analysis)}
                        className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-pine/30 hover:bg-mint/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {/* Icon */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint text-pine transition-colors group-hover:bg-pine group-hover:text-white">
                          {icon}
                        </div>

                        {/* Text */}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-pine">
                            {analysis.name}
                          </h3>

                          {analysis.description && (
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              {analysis.description}
                            </p>
                          )}
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-pine" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mint text-pine">
                    <ScanLine className="h-5 w-5" />
                  </div>

                  <h3 className="font-medium text-pine">
                    Belum ada analisis
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Belum tersedia analisis untuk bagian tubuh ini.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-mint/20 px-6 py-4">
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Analisis bersifat edukasi dan bukan merupakan diagnosis medis.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}