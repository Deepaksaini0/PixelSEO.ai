import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Download, Eraser, ImageIcon, Film, FileText, Upload, ChevronRight, Check, Smile, Frown, Meh, Film as FilmIcon, Wand2, ZoomIn, X } from "lucide-react";

type Method  = "blur" | "lighten" | "darken";
type Stage   = "upload" | "edit" | "result";
type Tab     = "image" | "video" | "pdf";
type Model   = "fast" | "quality";
interface Box { x: number; y: number; w: number; h: number }

const SAMPLES = [
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=120&h=90&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&h=90&fit=crop",
  "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=120&h=90&fit=crop",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=120&h=90&fit=crop",
];

const METHODS: { value: Method; label: string; desc: string }[] = [
  { value: "blur",    label: "Blur",    desc: "Best for most watermarks" },
  { value: "lighten", label: "Lighten", desc: "Good for dark logo/text"  },
  { value: "darken",  label: "Darken",  desc: "Good for light/white marks" },
];

// ── Before/After Slider ──────────────────────────────────────────────────────
function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos]   = useState(50);
  const [drag, setDrag] = useState(false);
  const containerRef    = useRef<HTMLDivElement>(null);

  const updatePos = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setPos(p);
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      updatePos(clientX);
    };
    const onUp = () => setDrag(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
  }, [drag, updatePos]);

  return (
    <div
      ref={containerRef}
      className="relative select-none overflow-hidden rounded-xl bg-black cursor-col-resize"
      style={{ touchAction: "none" }}
      onMouseDown={e => { setDrag(true); updatePos(e.clientX); }}
      onTouchStart={e => { setDrag(true); updatePos(e.touches[0].clientX); }}
    >
      {/* After image (full) */}
      <img src={after} alt="After" className="w-full h-auto block max-h-[460px] object-contain" draggable={false} />

      {/* Before image (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={before} alt="Before" className="w-full h-auto block max-h-[460px] object-contain" draggable={false}
          style={{ width: `${100 / (pos / 100)}%`, maxWidth: "none" }} />
      </div>

      {/* Divider line */}
      <div className="absolute inset-y-0 pointer-events-none" style={{ left: `calc(${pos}% - 1px)` }}>
        <div className="w-0.5 h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      </div>

      {/* Handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing z-10 border-2 border-gray-200"
        style={{ left: `${pos}%` }}
      >
        <span className="text-gray-600 font-bold text-sm select-none">◁▷</span>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-[11px] font-semibold px-2 py-0.5 rounded">Before</div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-[11px] font-semibold px-2 py-0.5 rounded">After</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function WatermarkRemover() {
  const { toast } = useToast();
  const fileRef   = useRef<HTMLInputElement>(null);
  const imgRef    = useRef<HTMLImageElement>(null);

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
  const [model,   setModel]   = useState<Model>("fast");
  const [removeText, setRemoveText] = useState(false);
  const [removeLogo, setRemoveLogo] = useState(true);
  const [rating,  setRating]  = useState<"good" | "bad" | null>(null);

  // ── File handling ──────────────────────────────────────────────────────────
  const loadFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast({ title: "Please upload an image", variant: "destructive" }); return;
    }
    setFile(f); setBox(null); setResult(""); setStage("edit"); setRating(null);
    const reader = new FileReader();
    reader.onload = e => setImgSrc(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const loadSample = async (url: string) => {
    try {
      const res  = await fetch(url);
      const blob = await res.blob();
      loadFile(new File([blob], "sample.jpg", { type: "image/jpeg" }));
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
  const doRemove = async () => {
    if (!file) { toast({ title: "Upload an image first", variant: "destructive" }); return; }
    if (!box || box.w < 0.5 || box.h < 0.5) {
      toast({ title: "Draw a box over the watermark first", variant: "destructive" }); return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("x", String(box.x)); fd.append("y", String(box.y));
    fd.append("w", String(box.w)); fd.append("h", String(box.h));
    fd.append("method", method);
    try {
      const res = await fetch("/api/image/remove-watermark", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Unknown" })); throw new Error(err.error); }
      const blob    = await res.blob();
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
    const a = document.createElement("a"); a.href = result;
    a.download = `no-watermark-${Date.now()}.jpg`; a.click();
  };

  const reset = () => { setStage("upload"); setImgSrc(""); setFile(null); setResult(""); setBox(null); setRating(null); };

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const tabs = [
    { id: "image" as Tab, label: "Image watermark remover" },
    { id: "video" as Tab, label: "Video watermark remover", badge: "New" },
    { id: "pdf"   as Tab, label: "PDF watermark remover" },
  ];

  return (
    <div className="rounded-2xl overflow-hidden bg-[#111118] text-white min-h-[600px]">

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-center pt-6 px-4">
        <div className="flex gap-1 bg-[#1e1e2a] rounded-full p-1 border border-white/10">
          {tabs.map(t => (
            <button key={t.id}
              onClick={() => { setActiveTab(t.id); if (t.id !== "image") reset(); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === t.id ? "bg-white text-[#111118] shadow" : "text-gray-400 hover:text-white"
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

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      {stage !== "result" && (
        <div className="text-center px-6 pt-8 pb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3">
            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">FREE</span>
            {" "}AI Online Watermark Remover
          </h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            Remove watermarks in seconds using an AI watermark remover while preserving the image quality to elevate your visuals.
          </p>
        </div>
      )}

      {/* ── Non-image tabs ───────────────────────────────────────────────────── */}
      {activeTab !== "image" && (
        <div className="mx-6 mb-8 rounded-2xl border border-dashed border-white/15 bg-white/5 p-14 text-center">
          <div className="text-5xl mb-4">{activeTab === "video" ? "🎬" : "📄"}</div>
          <p className="text-gray-300 font-semibold text-lg mb-1">
            {activeTab === "video" ? "Video Watermark Remover" : "PDF Watermark Remover"}
          </p>
          <p className="text-gray-500 text-sm">Coming soon — use the Image tab for now.</p>
        </div>
      )}

      {activeTab === "image" && (
        <>
          {/* ── Upload stage ──────────────────────────────────────────────── */}
          {stage === "upload" && (
            <div className="px-6 pb-4">
              <div
                className="rounded-2xl border border-dashed border-white/15 bg-[#1a1a26] p-12 text-center cursor-pointer hover:border-orange-400/40 hover:bg-[#1e1e2f] transition-all"
                onDragOver={e => e.preventDefault()} onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <button
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="mx-auto flex items-center gap-2 px-7 py-3 rounded-full font-bold text-white text-base shadow-lg mb-5 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 transition-all active:scale-95"
                >
                  <Plus className="h-5 w-5" /> Upload
                </button>
                <p className="text-gray-300 text-sm mb-2">
                  Drop an image or Paste <span className="underline decoration-dotted text-white font-medium">URL</span>{" "}
                  <span className="text-gray-500">(Image, PDF, or Video)</span>
                </p>
                <p className="text-gray-600 text-xs underline decoration-dotted">View Limits and Supported Formats</p>
                <p className="text-gray-600 text-[11px] mt-3">
                  By uploading a file or URL you agree to our <span className="font-semibold text-gray-500">Terms of Use</span> and <span className="font-semibold text-gray-500">Privacy Policy.</span>
                </p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm mb-3">No Image? Try one of these</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {SAMPLES.map((url, i) => (
                    <button key={i} onClick={() => loadSample(url)}
                      className="w-[72px] h-[54px] rounded-lg overflow-hidden border-2 border-transparent hover:border-orange-400 transition-all hover:scale-105 shadow-md">
                      <img src={url} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 text-center">
                <h2 className="text-2xl font-extrabold text-white">Free AI Watermark Removal Tool</h2>
                <p className="text-gray-500 text-sm mt-2 max-w-lg mx-auto">
                  Upload any image, select the watermark region, and our AI will erase it while keeping the background intact.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-4 max-w-md mx-auto">
                  {[{ icon: "⚡", label: "Instant Results" }, { icon: "🔒", label: "100% Private" }, { icon: "✅", label: "No Signup Needed" }].map(f => (
                    <div key={f.label} className="bg-white/5 border border-white/10 rounded-xl py-3 px-2 text-center">
                      <div className="text-xl mb-1">{f.icon}</div>
                      <p className="text-xs text-gray-400 font-medium">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Edit stage ────────────────────────────────────────────────── */}
          {stage === "edit" && imgSrc && (
            <div className="px-6 pb-6 space-y-4">
              {/* Method row */}
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(m => (
                  <button key={m.value} onClick={() => setMethod(m.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${method === m.value ? "border-orange-400 bg-orange-400/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Eraser className={`h-3.5 w-3.5 shrink-0 ${method === m.value ? "text-orange-400" : "text-gray-400"}`} />
                      <span className="text-sm font-semibold text-white">{m.label}</span>
                      {method === m.value && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-400/20 text-orange-300">Active</span>}
                    </div>
                    <p className="text-xs text-gray-500 pl-5">{m.desc}</p>
                  </button>
                ))}
              </div>

              {/* Canvas */}
              <div
                className="relative select-none rounded-xl overflow-hidden border border-white/10 bg-black cursor-crosshair"
                onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                  <span className="text-xs text-gray-400 font-medium">Click & drag to select the watermark area</span>
                  <div className="flex gap-3">
                    {box && box.w > 0.5 && <button onClick={() => setBox(null)} className="text-xs text-gray-400 hover:text-white transition-colors">Clear box</button>}
                    <button onClick={reset} className="text-xs text-gray-400 hover:text-white transition-colors">Change image</button>
                  </div>
                </div>
                <img ref={imgRef} src={imgSrc} alt="Source" draggable={false} className="w-full h-auto block max-h-[420px] object-contain" />
                {box && box.w > 0.5 && box.h > 0.5 && (
                  <div className="absolute border-2 border-orange-400 bg-orange-400/15 pointer-events-none"
                    style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">WATERMARK AREA</span>
                    </div>
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
                    <span className="text-white text-sm font-medium">Removing watermark…</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 items-center">
                <button onClick={doRemove} disabled={loading || !box || box.w < 0.5}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-white text-sm bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-orange-500/20">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Removing…</> : <><Eraser className="h-4 w-4" />Remove Watermark</>}
                </button>
                {(!box || box.w < 0.5) && <p className="text-xs text-gray-500">← Draw a box over the watermark first</p>}
              </div>
            </div>
          )}

          {/* ── Result stage — split layout ──────────────────────────────── */}
          {stage === "result" && result && (
            <div className="flex flex-col lg:flex-row gap-0 px-6 pb-4 pt-4">

              {/* Left — Before/After slider */}
              <div className="flex-1 min-w-0">
                <BeforeAfterSlider before={imgSrc} after={result} />
              </div>

              {/* Right — Control panel */}
              <div className="w-full lg:w-72 lg:ml-5 flex flex-col gap-3 mt-4 lg:mt-0">

                {/* Manual edit hint */}
                <div className="bg-[#1e1e2a] border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Results still has watermark?</p>
                  <button
                    onClick={() => { setStage("edit"); setResult(""); }}
                    className="text-sm text-orange-400 font-semibold hover:text-orange-300 flex items-center gap-1 mx-auto transition-colors"
                  >
                    ↗ Try Manual Edit
                  </button>
                </div>

                {/* Model selector */}
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1.5">Choose Watermark Model</p>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value as Model)}
                    className="w-full bg-[#1e1e2a] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-orange-400/50"
                  >
                    <option value="fast">Fast Remove - Pixelbin</option>
                    <option value="quality">Quality Remove - Deep AI</option>
                  </select>
                </div>

                {/* Download button */}
                <button onClick={download}
                  className="w-full py-3 rounded-xl font-bold text-white text-base bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2">
                  <Download className="h-5 w-5" /> Download Image
                </button>

                {/* Success badge */}
                <div className="flex items-center justify-center gap-1.5">
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                    Watermark removed successfully
                  </span>
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-4">
                  {[{ label: "Remove Text", state: removeText, set: setRemoveText }, { label: "Remove Logo", state: removeLogo, set: setRemoveLogo }].map(c => (
                    <label key={c.label} className="flex items-center gap-2 cursor-pointer group">
                      <div
                        onClick={() => c.set(!c.state)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${c.state ? "bg-orange-500 border-orange-500" : "border-gray-500 hover:border-gray-300"}`}
                      >
                        {c.state && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{c.label}</span>
                    </label>
                  ))}
                </div>

                {/* Upload next */}
                <button onClick={reset}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" /> Upload Next Image
                </button>

                {/* Divider */}
                <div className="border-t border-white/10" />

                {/* Action icons */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { icon: <FilmIcon className="h-5 w-5" />, label: "Convert to Video" },
                    { icon: <Wand2   className="h-5 w-5" />, label: "Edit it with AI" },
                    { icon: <ZoomIn  className="h-5 w-5" />, label: "Upscale Image" },
                  ].map(a => (
                    <button key={a.label}
                      className="bg-[#1e1e2a] hover:bg-[#2a2a38] border border-white/10 rounded-xl py-3 px-2 flex flex-col items-center gap-2 transition-all group"
                      onClick={() => toast({ title: `${a.label} — coming soon!` })}
                    >
                      <span className="text-gray-400 group-hover:text-orange-400 transition-colors">{a.icon}</span>
                      <span className="text-[10px] text-gray-400 leading-tight">{a.label}</span>
                    </button>
                  ))}
                </div>

                {/* Rating */}
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-gray-400 font-medium">Rate this result:</span>
                    <button onClick={() => setRating("good")}
                      className={`text-2xl transition-all hover:scale-125 ${rating === "good" ? "opacity-100" : "opacity-50 hover:opacity-100"}`}>😏</button>
                    <button onClick={() => setRating("bad")}
                      className={`text-2xl transition-all hover:scale-125 ${rating === "bad" ? "opacity-100" : "opacity-50 hover:opacity-100"}`}>😐</button>
                  </div>
                  {rating && (
                    <p className="text-center text-xs text-gray-500 mt-1">
                      {rating === "good" ? "Thanks for your feedback! 🎉" : "Sorry it wasn't perfect — try Manual Edit above."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Batch banner (result stage only) ──────────────────────────── */}
          {stage === "result" && (
            <div className="mx-6 mb-6 mt-2 rounded-xl bg-[#1a0f00] border border-orange-500/30 px-5 py-3 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-300">Want to remove watermark from hundreds of images in seconds?</p>
              <button className="flex items-center gap-1 text-orange-400 font-semibold text-sm whitespace-nowrap hover:text-orange-300 transition-colors">
                Try Batch Mode <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
