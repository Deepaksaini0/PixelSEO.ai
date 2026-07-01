import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Archive, Upload, X, Download, Loader2, FileText, Image, Film, Music, FileCode, File } from "lucide-react";

interface QueuedFile {
  id: string;
  file: File;
  sizeLabel: string;
}

function fmtBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext)) return <Image className="h-4 w-4 text-blue-500" />;
  if (["mp4","mov","avi","mkv","webm"].includes(ext)) return <Film className="h-4 w-4 text-purple-500" />;
  if (["mp3","wav","ogg","flac","aac"].includes(ext)) return <Music className="h-4 w-4 text-green-500" />;
  if (["html","css","js","ts","jsx","tsx","json","xml","php","py"].includes(ext)) return <FileCode className="h-4 w-4 text-orange-500" />;
  if (["txt","pdf","doc","docx","xls","xlsx","csv","md"].includes(ext)) return <FileText className="h-4 w-4 text-gray-500" />;
  return <File className="h-4 w-4 text-gray-400" />;
}

export function ZipCompressor() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles]           = useState<QueuedFile[]>([]);
  const [level, setLevel]           = useState(6);
  const [zipName, setZipName]       = useState("compressed");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<{ url: string; size: string; originalSize: string; savings: string } | null>(null);
  const [dragging, setDragging]     = useState(false);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const newItems: QueuedFile[] = Array.from(incoming).map(f => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      sizeLabel: fmtBytes(f.size),
    }));
    setFiles(prev => {
      const existingNames = new Set(prev.map(p => p.file.name));
      return [...prev, ...newItems.filter(n => !existingNames.has(n.file.name))];
    });
    setResult(null);
  }, []);

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
  const clearAll   = () => { setFiles([]); setResult(null); };

  const totalBytes = files.reduce((s, f) => s + f.file.size, 0);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const compress = async () => {
    if (files.length === 0) return;
    setLoading(true); setResult(null);
    try {
      const form = new FormData();
      files.forEach(f => form.append("files", f.file));
      form.append("level", String(level));
      form.append("zipName", zipName.trim() || "compressed");

      const res = await fetch("/api/tools/zip-compress", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Compression failed");
      }
      const blob = await res.blob();
      const compressedSize = blob.size;
      const url = URL.createObjectURL(blob);
      const savings = totalBytes > 0 ? Math.max(0, Math.round((1 - compressedSize / totalBytes) * 100)) : 0;
      setResult({
        url,
        size: fmtBytes(compressedSize),
        originalSize: fmtBytes(totalBytes),
        savings: savings + "%",
      });
      toast({ title: "ZIP ready!", description: `${fmtBytes(compressedSize)} · saved ${savings}% vs original` });
    } catch (err: any) {
      toast({ title: "Compression failed", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = (zipName.trim() || "compressed") + ".zip";
    a.click();
  };

  const levelLabel = level <= 1 ? "Fastest (minimal)" : level <= 3 ? "Fast" : level <= 6 ? "Balanced" : level <= 8 ? "High" : "Maximum (slowest)";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Archive className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">ZIP Compressor</h2>
          <p className="text-sm text-gray-500">Bundle and compress any files into a ZIP archive</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className={`h-8 w-8 mx-auto mb-3 ${dragging ? "text-indigo-500" : "text-gray-300"}`} />
        <p className="text-sm font-semibold text-gray-700">Drop files here or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">Any file type · Multiple files supported</p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">
              {files.length} file{files.length !== 1 ? "s" : ""} · {fmtBytes(totalBytes)} total
            </span>
            <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium">
              Clear all
            </button>
          </div>
          <ul className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {files.map(f => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                {fileIcon(f.file.name)}
                <span className="flex-1 text-sm text-gray-700 truncate">{f.file.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{f.sizeLabel}</span>
                <button onClick={() => removeFile(f.id)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Options */}
      {files.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-5 bg-white border border-gray-200 rounded-xl p-5">
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Compression Level</Label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">1</span>
              <Slider value={[level]} min={1} max={9} step={1} onValueChange={([v]) => setLevel(v)} className="flex-1" />
              <span className="text-xs text-gray-400">9</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-indigo-600">{level}</span>
              <span className="text-sm text-gray-500">{levelLabel}</span>
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Output Filename</Label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={zipName}
                onChange={e => setZipName(e.target.value)}
                placeholder="compressed"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-sm text-gray-400 font-mono">.zip</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex gap-3">
          <Button
            onClick={compress}
            disabled={loading || files.length === 0}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 gap-2"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Compressing…</> : <><Archive className="h-4 w-4" />Create ZIP</>}
          </Button>
          {result && (
            <Button onClick={download} variant="outline" className="gap-2 h-11 font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Archive className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-green-800">ZIP created successfully</p>
            <p className="text-xs text-green-600 mt-0.5">{(zipName || "compressed")}.zip</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Original</p>
              <p className="text-sm font-bold text-gray-900">{result.originalSize}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Compressed</p>
              <p className="text-sm font-bold text-indigo-700">{result.size}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Savings</p>
              <p className="text-sm font-bold text-green-600">{result.savings}</p>
            </div>
          </div>
          <Badge className="bg-green-600 text-white cursor-pointer hover:bg-green-700 px-4 py-2 text-xs font-semibold" onClick={download}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download ZIP
          </Badge>
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && !result && (
        <div className="text-center py-8 text-gray-400">
          <Archive className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Add files above to get started</p>
          <p className="text-xs mt-1">Supports any file type — docs, images, code, archives</p>
        </div>
      )}
    </div>
  );
}
