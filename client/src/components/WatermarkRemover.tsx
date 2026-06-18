import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Download, RefreshCw, Eraser, ImageIcon, Film, FileText, ChevronRight } from "lucide-react";

type Method = "blur" | "lighten" | "darken";
type Stage  = "upload" | "edit" | "result";
type Tab    = "image" | "video" | "pdf";

interface Box { x: number; y: number; w: number; h: number }

const METHODS: { value: Method; label: string; desc: string }[] = [
  { value: "blur",    label: "Blur",    desc: "Best for most watermarks" },
  { value: "lighten", label: "Lighten", desc: "Good for dark logo/text"  },
  { value: "darken",  label: "Darken",  desc: "Good for light/white marks" },
];

const SAMPLES = [
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=120&h=90&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&h=90&fit=crop",
  "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=120&h=90&fit=crop",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=120&h=90&fit=crop",
];

export function WatermarkRemover() {
  const { toast } = useToast();
  const fileRef  = useRef<HTMLInputElement>(null);
  const imgRef   = useRef<HTMLImageElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("image");
  const [stage,   setStage]   = useState<Stage>("upload");
  const [imgSrc,  setImgSrc]  = useState("");
  const [file,    setFile]    = useState<File | null>(null);
  const [result,  setResult]  = useState("");
  const [loading, setLoading] = useState(false);
  const [method,  setMethod]  = useState<Method>("blur");
  const [box,     setBox]     = useState<Box | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [anchor,  setAnchor]  = useState({ x: 0, y: 0 });

  // ── File handling ──────────────────────────────────────────────────────────
  const loadFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast({ title: "Please upload an image", variant: "destructive" }); return;
    }
    setFile(f); setBox(null); setResult(""); setStage("edit");
    const reader = new FileReader();
    reader.onload = e => setImgSrc(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const loadSample = async (url: string) => {
    try {
      const res  = await fetch(url);
      const blob = await res.blob();
      const f    = new File([blob], "sample.jpg", { type: "image/jpeg" });
      loadFile(f);
    } catch {
      toast({ title: "Could not load sample image", variant: "destructive" });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0]; if (f) loadFile(f);
  };

  // ── Box drawing ────────────────────────────────────────────────────────────
  const getPct = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgRef.current; if (!el) return { x: 0, y: 0 };
    const r  = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width)  * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top)  / r.height) * 100)),
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (stage !== "edit") return;
    e.preventDefault();
    const p = getPct(e); setAnchor(p);
    setBox({ x: p.x, y: p.y, w: 0, h: 0 }); setDrawing(true);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawing) return;
    const p = getPct(e);
    setBox({ x: Math.min(anchor.x, p.x), y: Math.min(anchor.y, p.y), w: Math.abs(p.x - anchor.x), h: Math.abs(p.y - anchor.y) });
  };

  const onMouseUp = () => setDrawing(false);

  // ── Removal ────────────────────────────────────────────────────────────────
  const doRemove = async (overrideMethod?: Method) => {
    if (!file) { toast({ title: "Upload an image first", variant: "destructive" }); return; }
    if (!box || box.w < 0.5 || box.h < 0.5) {
      toast({ title: "Draw a box over the watermark first", variant: "destructive" }); return;
    }
    const m = overrideMethod ?? method;
    setLoading(true);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("x", String(box.x)); fd.append("y", String(box.y));
    fd.append("w", String(box.w)); fd.append("h", String(box.h));
    fd.append("method", m);
    try {
      const res = await fetch("/api/image/remove-watermark", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Unknown" })); throw new Error(err.error); }
      const blob   = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setResult(dataUrl); setStage("result");
      toast({ title: "Watermark removed successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = result; a.download = `no-watermark-${Date.now()}.jpg`; a.click();
  };

  const reset = () => {
    setStage("upload"); setImgSrc(""); setFile(null); setResult(""); setBox(null);
  };

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: any; badge?: string }[] = [
    { id: "image", label: "Image watermark remover", icon: ImageIcon },
    { id: "video", label: "Video watermark remover", icon: Film,     badge: "New" },
    { id: "pdf",   label: "PDF watermark remover",   icon: FileText },
  ];

  return (
    <div className="rounded-2xl overflow-hidden bg-[#111118] text-white min-h-[600px]">

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-center pt-6 px-4">
        <div className="flex gap-1 bg-[#1e1e2a] rounded-full p-1 border border-white/10">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); if (t.id !== "image") reset(); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-white text-[#111118] shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
              {t.badge && (
                <span className="bg-gradient-to-r from-orange-400 to-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hero heading ─────────────────────────────────────────────────────── */}
      <div className="text-center px-6 pt-8 pb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3">
          <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">FREE</span>
          {" "}AI Online Watermark Remover
        </h1>
        <p className="text-gray-400 text-base max-w-xl mx-auto">
          Remove watermarks in seconds using an AI watermark remover while preserving the image quality to elevate your visuals.
        </p>
      </div>

      {/* ── Video / PDF placeholder ───────────────────────────────────────────── */}
      {activeTab !== "image" && (
        <div className="mx-6 mb-8 rounded-2xl border border-dashed border-white/15 bg-white/5 p-14 text-center">
          <div className="text-5xl mb-4">{activeTab === "video" ? "🎬" : "📄"}</div>
          <p className="text-gray-300 font-semibold text-lg mb-1">
            {activeTab === "video" ? "Video Watermark Remover" : "PDF Watermark Remover"}
          </p>
          <p className="text-gray-500 text-sm">Coming soon — use the Image tab for now.</p>
        </div>
      )}

      {/* ── Image tab content ────────────────────────────────────────────────── */}
      {activeTab === "image" && (
        <>
          {/* Upload zone */}
          {stage === "upload" && (
            <div className="px-6 pb-4">
              <div
                className="rounded-2xl border border-dashed border-white/15 bg-[#1a1a26] p-12 text-center cursor-pointer hover:border-orange-400/40 hover:bg-[#1e1e2f] transition-all"
                onDragOver={e => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <button
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="mx-auto flex items-center gap-2 px-7 py-3 rounded-full font-bold text-white text-base shadow-lg mb-5 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 transition-all active:scale-95"
                >
                  <Plus className="h-5 w-5" /> Upload
                </button>
                <p className="text-gray-300 text-sm mb-2">
                  Drop an image or Paste <span className="underline decoration-dotted cursor-pointer text-white font-medium">URL</span>{" "}
                  <span className="text-gray-500">(Image, PDF, or Video)</span>
                </p>
                <p className="text-gray-600 text-xs underline decoration-dotted">View Limits and Supported Formats</p>
                <p className="text-gray-600 text-[11px] mt-3">
                  By uploading a file or URL you agree to our{" "}
                  <span className="font-semibold text-gray-500">Terms of Use</span> and{" "}
                  <span className="font-semibold text-gray-500">Privacy Policy.</span>
                </p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
              </div>

              {/* Sample images */}
              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm mb-3">No Image? Try one of these</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {SAMPLES.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => loadSample(url)}
                      className="w-[72px] h-[54px] rounded-lg overflow-hidden border-2 border-transparent hover:border-orange-400 transition-all hover:scale-105 shadow-md"
                    >
                      <img src={url} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Edit stage */}
          {(stage === "edit" || stage === "result") && imgSrc && (
            <div className="px-6 pb-6 space-y-4">
              {/* Method selector */}
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(m => (
                  <button key={m.value} onClick={() => setMethod(m.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${method === m.value ? "border-orange-400 bg-orange-400/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Eraser className={`h-3.5 w-3.5 shrink-0 ${method === m.value ? "text-orange-400" : "text-gray-400"}`} />
                      <span className="text-sm font-semibold text-white">{m.label}</span>
                      {method === m.value && (
                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-400/20 text-orange-300">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 pl-5">{m.desc}</p>
                  </button>
                ))}
              </div>

              {/* Image canvas */}
              <div
                className={`relative select-none rounded-xl overflow-hidden border border-white/10 bg-black ${stage === "edit" ? "cursor-crosshair" : ""}`}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                  <span className="text-xs text-gray-400 font-medium">
                    {stage === "edit" ? "Click & drag to select the watermark area" : "Original"}
                  </span>
                  <div className="flex gap-2">
                    {stage === "edit" && box && box.w > 0.5 && (
                      <button onClick={() => setBox(null)} className="text-xs text-gray-400 hover:text-white transition-colors">Clear box</button>
                    )}
                    <button onClick={reset} className="text-xs text-gray-400 hover:text-white transition-colors">Change image</button>
                  </div>
                </div>

                <img ref={imgRef} src={imgSrc} alt="Source" draggable={false}
                  className="w-full h-auto block max-h-[420px] object-contain" />

                {box && box.w > 0.5 && box.h > 0.5 && stage === "edit" && (
                  <div className="absolute border-2 border-orange-400 bg-orange-400/15 pointer-events-none"
                    style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow">
                        WATERMARK AREA
                      </span>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 rounded-xl">
                    <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
                    <span className="text-white text-sm font-medium">Removing watermark…</span>
                  </div>
                )}
              </div>

              {stage === "edit" && (
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => doRemove()}
                    disabled={loading || !box || box.w < 0.5}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-white text-sm bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                  >
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Removing…</>
                      : <><Eraser className="h-4 w-4" />Remove Watermark</>}
                  </button>
                  {(!box || box.w < 0.5) && (
                    <p className="text-xs text-gray-500">← Draw a box over the watermark first</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Result stage */}
          {stage === "result" && result && (
            <div className="px-6 pb-6 space-y-4">
              {/* Result image */}
              <div className="rounded-xl overflow-hidden border border-white/10">
                <div className="flex items-center justify-between px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
                  <span className="text-xs text-emerald-400 font-semibold">✓ Watermark Removed</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setStage("edit"); setResult(""); }}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                      <RefreshCw className="h-3 w-3" /> Try again
                    </button>
                    <button onClick={reset} className="text-xs text-gray-400 hover:text-white transition-colors">New image</button>
                  </div>
                </div>
                <img src={result} alt="Result" className="w-full h-auto block max-h-[420px] object-contain bg-black" />
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide text-center mb-1.5">Before</p>
                  <img src={imgSrc}  alt="Before" className="w-full rounded-xl border border-white/10 object-contain max-h-[180px] bg-black" />
                </div>
                <div>
                  <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide text-center mb-1.5">After</p>
                  <img src={result} alt="After"  className="w-full rounded-xl border border-emerald-500/30 object-contain max-h-[180px] bg-black" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <button onClick={download}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-white text-sm bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 transition-all active:scale-95 shadow-lg shadow-orange-500/20">
                  <Download className="h-4 w-4" /> Download Image
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-gray-500 font-medium">Not perfect?</p>
                  {METHODS.filter(m => m.value !== method).map(m => (
                    <button key={m.value}
                      onClick={() => { setMethod(m.value); setStage("edit"); setResult(""); }}
                      className="text-xs flex items-center gap-1 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-gray-300 hover:border-white/30 hover:text-white transition-all">
                      <Eraser className="h-3 w-3" /> Try {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom section heading */}
          {stage === "upload" && (
            <div className="px-6 pb-8 text-center">
              <h2 className="text-2xl font-extrabold text-white mt-4">Free AI Watermark Removal Tool</h2>
              <p className="text-gray-500 text-sm mt-2 max-w-lg mx-auto">
                Upload any image, select the watermark region, and our AI will erase it — keeping the background intact.
                Works on logos, text overlays, copyright stamps, and more.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4 max-w-md mx-auto text-center">
                {[
                  { icon: "⚡", label: "Instant Results" },
                  { icon: "🔒", label: "100% Private" },
                  { icon: "✅", label: "No Signup Needed" },
                ].map(f => (
                  <div key={f.label} className="bg-white/5 border border-white/10 rounded-xl py-3 px-2">
                    <div className="text-xl mb-1">{f.icon}</div>
                    <p className="text-xs text-gray-400 font-medium">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
