import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Barcode, Download, RefreshCw, Copy, Check } from "lucide-react";
import { Link } from "wouter";
import JsBarcode from "jsbarcode";

const FORMATS = [
  { value: "CODE128", label: "CODE 128", hint: "Any text or numbers" },
  { value: "EAN13", label: "EAN-13", hint: "13 digits (e.g. 5901234123457)" },
  { value: "EAN8", label: "EAN-8", hint: "8 digits" },
  { value: "UPC", label: "UPC-A", hint: "12 digits" },
  { value: "CODE39", label: "CODE 39", hint: "Uppercase letters & numbers" },
  { value: "ITF14", label: "ITF-14", hint: "14 digits" },
  { value: "MSI", label: "MSI", hint: "Numbers only" },
  { value: "pharmacode", label: "Pharmacode", hint: "Number 3–131070" },
];

const DEFAULTS: Record<string, string> = {
  CODE128: "Hello, World!",
  EAN13: "5901234123457",
  EAN8: "96385074",
  UPC: "123456789012",
  CODE39: "CODE39",
  ITF14: "12345678901231",
  MSI: "1234567",
  pharmacode: "1234",
};

export default function BarcodeGenerator() {
  const [format, setFormat] = useState("CODE128");
  const [value, setValue] = useState("Hello, World!");
  const [lineColor, setLineColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [showText, setShowText] = useState(true);
  const [width, setWidth] = useState(2);
  const [height, setHeight] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [copiedSvg, setCopiedSvg] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();

  const renderBarcode = useCallback(() => {
    if (!svgRef.current || !value.trim()) return;
    setError(null);
    try {
      JsBarcode(svgRef.current, value, {
        format,
        lineColor,
        background: bgColor,
        displayValue: showText,
        width,
        height,
        margin: 12,
        fontOptions: "",
        font: "monospace",
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 6,
        fontSize: 14,
        valid: (valid: boolean) => {
          if (!valid) setError(`"${value}" is not valid for ${format}.`);
        },
      });
    } catch (e: any) {
      setError(e?.message || "Invalid barcode input.");
    }
  }, [value, format, lineColor, bgColor, showText, width, height]);

  useEffect(() => { renderBarcode(); }, [renderBarcode]);

  const handleFormatChange = (f: string) => {
    setFormat(f);
    setValue(DEFAULTS[f] ?? "");
    setError(null);
  };

  const downloadPNG = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 3;
      canvas.width = svg.viewBox.baseVal.width * scale || svg.clientWidth * scale;
      canvas.height = svg.viewBox.baseVal.height * scale || svg.clientHeight * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `barcode-${format.toLowerCase()}.png`;
      a.click();
    };
    img.src = url;
  };

  const downloadSVG = () => {
    if (!svgRef.current) return;
    const svgStr = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `barcode-${format.toLowerCase()}.svg`;
    a.click();
  };

  const copySVGCode = () => {
    if (!svgRef.current) return;
    const svgStr = new XMLSerializer().serializeToString(svgRef.current);
    navigator.clipboard.writeText(svgStr).then(() => {
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    });
  };

  const selectedFormat = FORMATS.find((f) => f.value === format);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover-elevate">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-black flex items-center gap-2">
              <Barcode className="h-7 w-7 text-primary" />
              Barcode Generator
            </h1>
            <p className="text-muted-foreground">Generate barcodes in multiple formats, download as PNG or SVG</p>
          </div>
        </div>

        {/* Format picker */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-5 space-y-4">
            <Label className="text-sm font-semibold text-gray-700">Barcode Format</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => handleFormatChange(f.value)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all text-left ${
                    format === f.value
                      ? "bg-blue-50 border-blue-400 text-blue-700"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div>{f.label}</div>
                  <div className="font-normal opacity-60 mt-0.5 text-[10px]">{f.hint}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-5 space-y-4">
            {/* Value input */}
            <div className="space-y-1.5">
              <Label htmlFor="barcode-value" className="text-sm font-semibold text-gray-700">
                Value
                {selectedFormat && <span className="ml-2 text-xs font-normal text-muted-foreground">{selectedFormat.hint}</span>}
              </Label>
              <Input
                id="barcode-value"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                placeholder={DEFAULTS[format]}
                className={`font-mono ${error ? "border-red-400 focus-visible:ring-red-300" : ""}`}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">Bar color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    className="h-9 w-12 rounded border border-gray-200 cursor-pointer p-0.5 bg-white"
                  />
                  <Input
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    className="font-mono text-sm h-9"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">Background</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-9 w-12 rounded border border-gray-200 cursor-pointer p-0.5 bg-white"
                  />
                  <Input
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="font-mono text-sm h-9"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Width & Height sliders */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-700">Bar Width</Label>
                  <span className="text-xs font-mono text-blue-600">{width}px</span>
                </div>
                <input
                  type="range" min={1} max={5} step={0.5} value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-700">Height</Label>
                  <span className="text-xs font-mono text-blue-600">{height}px</span>
                </div>
                <input
                  type="range" min={40} max={300} step={10} value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            {/* Show text toggle */}
            <button
              onClick={() => setShowText((v) => !v)}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                showText
                  ? "bg-blue-50 border-blue-300 text-blue-800"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              <span>Show text label below barcode</span>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${showText ? "bg-blue-500" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showText ? "translate-x-4" : ""}`} />
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-700">Preview</Label>
              <Button variant="ghost" size="sm" onClick={renderBarcode} className="gap-1 text-xs text-muted-foreground h-7">
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>
            <div
              className="flex items-center justify-center rounded-xl border border-gray-200 p-6 min-h-[160px]"
              style={{ backgroundColor: bgColor }}
            >
              {error ? (
                <p className="text-sm text-red-400 text-center">{error}</p>
              ) : (
                <svg ref={svgRef} />
              )}
            </div>

            {/* Download actions */}
            {!error && (
              <div className="flex gap-2 flex-wrap">
                <Button onClick={downloadPNG} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <Download className="h-4 w-4" />
                  Download PNG
                </Button>
                <Button onClick={downloadSVG} variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Download SVG
                </Button>
                <Button onClick={copySVGCode} variant="outline" className="gap-2">
                  {copiedSvg ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copiedSvg ? "Copied!" : "Copy SVG"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
