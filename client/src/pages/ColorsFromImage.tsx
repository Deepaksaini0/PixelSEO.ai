import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Trash2, Lock, ArrowLeft, Palette } from "lucide-react";
import { Link } from "wouter";

interface ColorEntry {
  hex: string;
  count: number;
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Euclidean distance between two hex colours in RGB space */
function colorDistance(a: string, b: string): number {
  const ra = parseInt(a.slice(1, 3), 16);
  const ga = parseInt(a.slice(3, 5), 16);
  const ba = parseInt(a.slice(5, 7), 16);
  const rb = parseInt(b.slice(1, 3), 16);
  const gb = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ra - rb) ** 2 + (ga - gb) ** 2 + (ba - bb) ** 2);
}

function extractColors(imageData: ImageData, maxColors = 20): ColorEntry[] {
  const { data } = imageData;
  const colorMap: Map<string, number> = new Map();

  // Sample every pixel — exact colours, no rounding
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // skip transparent / near-transparent pixels
    const hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
    colorMap.set(hex, (colorMap.get(hex) ?? 0) + 1);
  }

  // Sort by frequency (most used first)
  const sorted = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]);

  // Pick up to maxColors distinct colours that are perceptually different enough
  const result: ColorEntry[] = [];
  const MIN_DISTANCE = 18; // minimum Euclidean RGB distance to keep a colour

  for (const [hex, count] of sorted) {
    if (result.length >= maxColors) break;
    const tooClose = result.some((e) => colorDistance(e.hex, hex) < MIN_DISTANCE);
    if (!tooClose) result.push({ hex, count });
  }

  return result;
}

export default function ColorsFromImage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [dominant, setDominant] = useState<string | null>(null);
  const [palette, setPalette] = useState<ColorEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Scale down for performance
        const maxDim = 300;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = extractColors(imageData, 20);
        if (colors.length > 0) {
          setDominant(colors[0].hex);
          setPalette(colors.slice(1));
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    toast({ title: "Copied!", description: `${hex} copied to clipboard.` });
  };

  const handleDelete = () => {
    setImageSrc(null);
    setDominant(null);
    setPalette([]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover-elevate">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-black flex items-center gap-2">
              <Palette className="h-7 w-7 text-primary" />
              Colors from Image
            </h1>
            <p className="text-muted-foreground">Extract dominant colors and palette from any image</p>
          </div>
        </div>

        {/* Main card */}
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
          {!imageSrc ? (
            /* ── Upload state ── */
            <div
              className={`flex flex-col items-center justify-center py-16 px-8 cursor-pointer transition-colors ${
                isDragging ? "bg-blue-50 border-blue-400" : "bg-white"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-full max-w-xl border-2 border-dashed border-gray-300 rounded-lg py-12 px-8 flex flex-col items-center gap-4 select-none">
                <p className="text-gray-500 text-sm">Drop image file here or</p>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-6 text-base font-semibold rounded-lg"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Select Image
                </Button>
                <p className="text-gray-400 text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Your files are secure
                </p>
              </div>
            </div>
          ) : (
            /* ── Results state ── */
            <div className="p-6 space-y-6">
              {/* Image preview */}
              <div className="flex justify-center">
                <img
                  src={imageSrc}
                  alt="Uploaded"
                  className="max-h-64 max-w-full rounded-lg shadow-md object-contain border border-gray-200"
                />
              </div>

              {/* Most used color */}
              {dominant && (
                <div className="space-y-3">
                  <h2 className="text-center text-sm font-medium text-gray-700">Most Used Color</h2>
                  <div className="flex justify-center">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => copyHex(dominant)}
                        className="text-gray-500 hover:text-gray-800 transition-colors"
                        title="Copy hex"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <div
                        className="h-12 w-40 rounded cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                        style={{ backgroundColor: dominant }}
                        onClick={() => copyHex(dominant)}
                        title={dominant}
                      />
                      <span className="text-sm font-mono text-gray-700">{dominant}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Palette */}
              {palette.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-center text-sm font-medium text-gray-700">Colors Palette</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {palette.map((entry) => (
                      <div key={entry.hex} className="flex items-center gap-2">
                        <button
                          onClick={() => copyHex(entry.hex)}
                          className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                          title="Copy hex"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <div
                          className="h-10 flex-1 rounded cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                          style={{ backgroundColor: entry.hex }}
                          onClick={() => copyHex(entry.hex)}
                          title={entry.hex}
                        />
                        <span className="text-xs font-mono text-gray-600 w-16 flex-shrink-0">{entry.hex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Image
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-gray-300 text-gray-500 hover:text-red-500 hover:border-red-300"
                    onClick={handleDelete}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleDelete}
                  >
                    Delete All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
