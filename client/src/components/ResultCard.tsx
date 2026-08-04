import { ProcessedResult } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowRight, CheckCircle2 } from "lucide-react";
import bytes from "bytes";
import { motion } from "framer-motion";
import { ShareButton } from "./ShareButton";

interface ResultCardProps {
  result: ProcessedResult;
  index: number;
}

export function ResultCard({ result, index }: ResultCardProps) {
  const percentSaved = Math.round(((result.originalSize - result.newSize) / result.originalSize) * 100);
  const isReduction = percentSaved > 0;
  const ext = result.filename.split(".").pop()?.toLowerCase() ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="glass-panel overflow-hidden p-0 h-full flex flex-col group hover:border-primary/50 transition-colors">
        <div className="aspect-[4/3] w-full relative bg-black/40 overflow-hidden">
          <img 
            src={result.url} 
            alt={result.filename}
            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" 
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <ShareButton url={result.url} title={`Check out this image I processed: ${result.filename}`} />
            {isReduction ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-md">
                -{percentSaved}%
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 backdrop-blur-md">
                +{(Math.abs(percentSaved))}%
              </span>
            )}
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground truncate max-w-[180px]" title={result.filename}>
                  {result.filename}
                </h4>
                {ext && (
                  <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                    {ext}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {result.width} x {result.height}px
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          </div>

          <div className="mt-auto space-y-4">
            <div className="flex items-center justify-between text-sm bg-secondary/50 p-3 rounded-lg border border-white/5">
              <div className="text-muted-foreground line-through decoration-destructive/50">
                {bytes(result.originalSize)}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
              <div className="font-bold text-primary">
                {bytes(result.newSize)}
              </div>
            </div>

            <Button 
              className="w-full gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-none border border-white/10"
              onClick={() => {
                const link = document.createElement('a');
                link.href = result.url;
                link.download = result.filename;
                link.click();
              }}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
