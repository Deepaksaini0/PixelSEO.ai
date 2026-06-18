import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Loader2, Download, Eraser, Upload, ChevronRight,
  Check, Film as FilmIcon, Wand2, ZoomIn, X, RotateCcw
} from "lucide-react";

type Stage = "upload" | "processing" | "result" | "manual";
type Tab   = "image" | "video" | "pdf";
interface Box { x: number; y: number; w: number; h: number }

const STEPS = [
  "Uploading image…",
  "Analysing image for watermarks…",
  "Detecting watermark regions…",
  "Removing watermarks…",
  "Blending edges…",
  "Finalising result…",
];

const SAMPLES = [
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=120&h=90&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&h=90&fit=crop",
  "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=120&h=90&fit=crop",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=120&h=90&fit=crop",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

// ── Before/After Slider ───────────────────────────────────────────────────────
// Uses clip-path so it works perfectly regardless of image aspect ratio.
function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos]   = useState(50);
  const [drag, setDrag] = useState(false);
  const [ratio, setRatio] = useState("16/9");
  const boxRef = useRef<HTMLDivElement>(null);

  const calcPos = useCallback((clientX: number) => {
    const el = boxRef.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  }, []);

  useEffect(() => {
    if (!drag) return;
    const mv = (e: MouseEvent | TouchEvent) => calcPos("touches" in e ? e.touches[0].clientX : e.clientX);
    const up = () => setDrag(false);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", mv);
      window.removeEventListener("touchend", up);
    };
  }, [drag, calcPos]);

  return (
    <div
      ref={boxRef}
      className="relative select-none overflow-hidden rounded-xl bg-black w-full cursor-col-resize"
      style={{ aspectRatio: ratio, touchAction: "none" }}
      onMouseDown={e => { setDrag(true); calcPos(e.clientX); }}
      onTouchStart={e => { setDrag(true); calcPos(e.touches[0].clientX); }}
    >
      {/* AFTER — full image underneath */}
      <img
        src={after}
        alt="After"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* BEFORE — clipped from left using clip-path */}
      <img
        src={before}
        alt="Before"
        onLoad={e => {
          const img = e.target as HTMLImageElement;
          if (img.naturalWidth && img.naturalHeight) {
            setRatio(`${img.naturalWidth}/${img.naturalHeight}`);
          }
        }}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_12px_rgba(255,255,255,1)] pointer-events-none z-10"
        style={{ left: `calc(${pos}% - 1px)` }}
      />

      {/* Drag handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-2xl border-2 border-gray-200 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-none"
        style={{ left: `${pos}%` }}
      >
        <span className="text-gray-700 text-sm font-bold select-none">◁▷</span>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-md pointer-events-none z-10">Before</div>
      <div className="absolute top-3 right-3 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-md pointer-events-none z-10">After</div>
    </div>
  );
}

// ── Processing Screen ─────────────────────────────────────────────────────────
function ProcessingScreen({ imgSrc, step }: { imgSrc: string; step: number }) {
  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    <div className="px-6 pb-8">
      <div className="rounded-2xl border border-white/10 bg-[#1a1a26] overflow-hidden">
        <div className="relative">
          <img src={imgSrc} alt="Processing" className="w-full max-h-72 object-contain block bg-black opacity-50" />
          {/* Scan line */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-orange-400 to-transparent opacity-80 pointer-events-none transition-all duration-700"
            style={{ left: `${pct}%` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="w-3/4 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center gap-2.5 bg-black/60 px-4 py-2 rounded-full">
              <Loader2 className="h-4 w-4 text-orange-400 animate-spin" />
              <span className="text-white text-sm font-medium">{STEPS[step]}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-2.5">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${i < step ? "text-emerald-400" : i === step ? "text-white font-semibold" : "text-gray-600"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${i < step ? "bg-emerald-500" : i === step ? "bg-orange-500" : "bg-white/10"}`}>
                {i < step
                  ? <Check className="h-3 w-3 text-white" />
                  : i === step
                    ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                    : <span className="text-[10px] text-gray-500 font-bold">{i + 1}</span>}
              </div>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function WatermarkRemover() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef  = useRef<HTMLImageElement>(null);

  const [activeTab,    setActiveTab]    = useState<Tab>("image");
  const [stage,        setStage]        = useState<Stage>("upload");
  const [imgSrc,       setImgSrc]       = useState("");      // original image data URL
  const [file,         setFile]         = useState<File | null>(null);
  const [result,       setResult]       = useState("");      // processed image data URL
  const [editBase,     setEditBase]     = useState("");      // base for manual edit (= result after auto)
  const [procStep,     setProcStep]     = useState(0);
  const [rating,       setRating]       = useState<"good" | "bad" | null>(null);
  const [removeText,   setRemoveText]   = useState(false);
  const [removeLogo,   setRemoveLogo]   = useState(true);
  const [reprocessing, setReprocessing] = useState(false);

  // Manual edit
  const [box,        setBox]        = useState<Box | null>(null);
  const [drawing,    setDrawing]    = useState(false);
  const [anchor,     setAnchor]     = useState({ x: 0, y: 0 });
  const [manLoading, setManLoading] = useState(false);

  // ── Auto-removal (animation + fetch run in parallel) ──────────────────────
  const runAutoRemoval = async (f: File) => {
    setStage("processing"); setProcStep(0);

    // Animate steps in parallel with the actual fetch
    const animPromise = (async () => {
      for (let i = 0; i < STEPS.length - 1; i++) {
        await new Promise(r => setTimeout(r, 900 + Math.random() * 500));
        setProcStep(i + 1);
      }
    })();

    const fetchPromise = (async () => {
      const fd = new FormData(); fd.append("image", f);
      const res = await fetch("/api/image/auto-remove-watermark", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Server error");
      }
      const blob  = await res.blob();
      const found = res.headers.get("X-Watermarks-Found");
      return { blob, found };
    })();

    try {
      // Wait for BOTH animation AND fetch to complete
      const [, { blob, found }] = await Promise.all([animPromise, fetchPromise]);
      const dataUrl = await blobToDataUrl(blob);
      setProcStep(STEPS.length - 1);
      await new Promise(r => setTimeout(r, 300));
      setResult(dataUrl);
      setEditBase(dataUrl);   // manual edit starts from the processed result
      setStage("result");
      setRating(null);
      toast({ title: found === "0" ? "No watermarks detected — showing original" : "✅ Watermark removed successfully!" });
    } catch (err: any) {
      toast({ title: "Removal failed", description: err.message, variant: "destructive" });
      setStage("upload");
    }
  };

  const loadFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast({ title: "Please upload an image", variant: "destructive" }); return;
    }
    setFile(f); setBox(null); setResult(""); setEditBase("");
    const reader = new FileReader();
    reader.onload = e => { setImgSrc(e.target?.result as string); };
    reader.readAsDataURL(f);
    runAutoRemoval(f);
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

  // ── "Edit it with AI" — re-runs auto-removal on current result ───────────
  const editWithAI = async () => {
    if (!editBase) return;
    setReprocessing(true);
    try {
      // Convert current result dataUrl back to File for re-processing
      const blob    = await fetch(editBase).then(r => r.blob());
      const newFile = new File([blob], "for-reprocess.jpg", { type: "image/jpeg" });
      const fd      = new FormData(); fd.append("image", newFile);
      toast({ title: "AI re-analysing image…" });
      const res = await fetch("/api/image/auto-remove-watermark", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Re-process failed");
      const outBlob  = await res.blob();
      const dataUrl  = await blobToDataUrl(outBlob);
      setResult(dataUrl);
      setEditBase(dataUrl);
      toast({ title: "✅ AI re-edit applied!" });
    } catch (err: any) {
      toast({ title: "Re-edit failed", description: err.message, variant: "destructive" });
    } finally {
      setReprocessing(false);
    }
  };

  // ── Manual edit box drawing ───────────────────────────────────────────────
  const getPct = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgRef.current; if (!el) return { x: 0, y: 0 };
    const r  = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width)  * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top)  / r.height) * 100)),
    };
  };
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); const p = getPct(e); setAnchor(p);
    setBox({ x: p.x, y: p.y, w: 0, h: 0 }); setDrawing(true);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawing) return; const p = getPct(e);
    setBox({ x: Math.min(anchor.x, p.x), y: Math.min(anchor.y, p.y), w: Math.abs(p.x - anchor.x), h: Math.abs(p.y - anchor.y) });
  };
  const onMouseUp = () => setDrawing(false);

  const doManualRemove = async () => {
    if (!box || box.w < 0.5 || box.h < 0.5) {
      toast({ title: "Draw a selection box over the watermark", variant: "destructive" }); return;
    }
    // Build a File from the current edit base (the result image, not the original)
    let sourceFile: File;
    try {
      const blob = await fetch(editBase || imgSrc).then(r => r.blob());
      sourceFile = new File([blob], "edit-base.jpg", { type: "image/jpeg" });
    } catch {
      toast({ title: "Could not read source image", variant: "destructive" }); return;
    }
    setManLoading(true);
    const fd = new FormData();
    fd.append("image", sourceFile);
    fd.append("x", String(box.x)); fd.append("y", String(box.y));
    fd.append("w", String(box.w)); fd.append("h", String(box.h));
    fd.append("method", "blur");
    try {
      const res = await fetch("/api/image/remove-watermark", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Removal failed");
      const blob    = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      setResult(dataUrl);
      setEditBase(dataUrl);  // next edit builds on this result
      setStage("result");
      setBox(null);
      toast({ title: "✅ Manual edit applied!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setManLoading(false);
    }
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = result; a.download = `no-watermark-${Date.now()}.jpg`; a.click();
  };

  const reset = () => {
    setStage("upload"); setImgSrc(""); setFile(null);
    setResult(""); setEditBase(""); setBox(null); setRating(null);
  };

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
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === t.id ? "bg-white text-[#111118] shadow" : "text-gray-400 hover:text-white"}`}
            >
              {t.label}
              {t.badge && <span className="bg-gradient-to-r from-orange-400 to-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      {(stage === "upload" || stage === "processing") && (
        <div className="text-center px-6 pt-8 pb-6">
          {stage === "upload" ? (
            <>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3">
                <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">FREE</span>
                {" "}AI Online Watermark Remover
              </h1>
              <p className="text-gray-400 text-base max-w-xl mx-auto">
                Upload any image — AI automatically detects and removes watermarks, logos, text overlays and stamps. No signup needed.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-white">AI is removing your watermark…</p>
              <p className="text-gray-400 text-sm mt-1">This usually takes 10–20 seconds</p>
            </>
          )}
        </div>
      )}

      {/* ── Non-image tabs ────────────────────────────────────────────────────── */}
      {activeTab !== "image" && (
        <div className="mx-6 mb-8 rounded-2xl border border-dashed border-white/15 bg-white/5 p-14 text-center">
          <div className="text-5xl mb-4">{activeTab === "video" ? "🎬" : "📄"}</div>
          <p className="text-gray-300 font-semibold text-lg mb-1">{activeTab === "video" ? "Video Watermark Remover" : "PDF Watermark Remover"}</p>
          <p className="text-gray-500 text-sm">Coming soon — use the Image tab for now.</p>
        </div>
      )}

      {activeTab === "image" && (
        <>
          {/* ── Upload ──────────────────────────────────────────────────────── */}
          {stage === "upload" && (
            <div className="px-6 pb-6">
              <div
                className="rounded-2xl border-2 border-dashed border-white/20 bg-[#1a1a26] p-12 text-center cursor-pointer hover:border-orange-400/50 hover:bg-[#1e1e2f] transition-all"
                onDragOver={e => e.preventDefault()} onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <button
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="mx-auto flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-white text-base shadow-lg shadow-orange-500/30 mb-5 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 transition-all active:scale-95"
                >
                  <Plus className="h-5 w-5" /> Upload
                </button>
                <p className="text-gray-300 text-sm mb-2">
                  Drop an image or paste a <span className="underline text-white font-medium">URL</span>
                  <span className="text-gray-500"> (JPG, PNG, WebP · max 20 MB)</span>
                </p>
                <p className="text-gray-600 text-[11px] mt-3">
                  By uploading you agree to our <span className="text-gray-500 font-semibold">Terms of Use</span> and <span className="text-gray-500 font-semibold">Privacy Policy.</span>
                </p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
              </div>

              {/* Samples */}
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

              {/* Feature strip */}
              <div className="mt-8 grid grid-cols-3 gap-3 max-w-sm mx-auto text-center">
                {[{ e: "⚡", l: "Instant AI" }, { e: "🔒", l: "100% Private" }, { e: "✅", l: "Free Forever" }].map(f => (
                  <div key={f.l} className="bg-white/5 border border-white/10 rounded-xl py-3 px-2">
                    <div className="text-xl mb-1">{f.e}</div>
                    <p className="text-xs text-gray-400 font-medium">{f.l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Processing ──────────────────────────────────────────────────── */}
          {stage === "processing" && imgSrc && <ProcessingScreen imgSrc={imgSrc} step={procStep} />}

          {/* ── Result ──────────────────────────────────────────────────────── */}
          {stage === "result" && result && (
            <>
              <div className="flex flex-col lg:flex-row gap-5 px-6 pb-4 pt-5">

                {/* Left: Before/After slider */}
                <div className="flex-1 min-w-0">
                  <BeforeAfterSlider before={imgSrc} after={result} />
                  <p className="text-center text-xs text-gray-500 mt-2">Drag the slider to compare before &amp; after</p>
                </div>

                {/* Right: Controls */}
                <div className="w-full lg:w-72 flex flex-col gap-3">

                  {/* Manual edit hint */}
                  <div className="bg-[#1e1e2a] border border-white/10 rounded-xl p-3.5 text-center">
                    <p className="text-xs text-gray-400 mb-1.5">Results still has watermark?</p>
                    <button
                      onClick={() => { setStage("manual"); setBox(null); }}
                      className="text-sm text-orange-400 font-semibold hover:text-orange-300 transition-colors flex items-center gap-1.5 mx-auto"
                    >
                      <Eraser className="h-3.5 w-3.5" /> Try Manual Edit
                    </button>
                  </div>

                  {/* Model selector */}
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1.5">Watermark Model</p>
                    <select className="w-full bg-[#1e1e2a] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-400/50">
                      <option>Fast Remove — AI Vision</option>
                      <option>Quality Remove — Deep Inpaint</option>
                    </select>
                  </div>

                  {/* Download */}
                  <button onClick={download}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-base bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                    <Download className="h-5 w-5" /> Download Image
                  </button>

                  {/* Success */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><Check className="h-3 w-3 text-white" /></span>
                    <span className="text-emerald-400 text-xs font-semibold">Watermark removed successfully</span>
                  </div>

                  {/* Checkboxes */}
                  <div className="flex items-center gap-5">
                    {[{ label: "Remove Text", val: removeText, set: setRemoveText }, { label: "Remove Logo", val: removeLogo, set: setRemoveLogo }].map(c => (
                      <label key={c.label} className="flex items-center gap-2 cursor-pointer group" onClick={() => c.set(!c.val)}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${c.val ? "bg-orange-500 border-orange-500" : "border-gray-500 hover:border-gray-300"}`}>
                          {c.val && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-gray-300 select-none group-hover:text-white transition-colors">{c.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Upload next */}
                  <button onClick={reset}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all flex items-center justify-center gap-2">
                    <Upload className="h-4 w-4" /> Upload Next Image
                  </button>

                  <div className="border-t border-white/10" />

                  {/* Action tiles */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <button
                      onClick={() => toast({ title: "Convert to Video — coming soon!" })}
                      className="bg-[#1e1e2a] hover:bg-[#2a2a38] border border-white/10 rounded-xl py-3 px-1 flex flex-col items-center gap-2 transition-all group">
                      <FilmIcon className="h-5 w-5 text-gray-400 group-hover:text-orange-400 transition-colors" />
                      <span className="text-[10px] text-gray-400 leading-tight">Convert to{"\n"}Video</span>
                    </button>
                    <button
                      onClick={editWithAI}
                      disabled={reprocessing}
                      className="bg-[#1e1e2a] hover:bg-[#2a2a38] border border-white/10 rounded-xl py-3 px-1 flex flex-col items-center gap-2 transition-all group disabled:opacity-50">
                      {reprocessing
                        ? <Loader2 className="h-5 w-5 text-orange-400 animate-spin" />
                        : <Wand2 className="h-5 w-5 text-gray-400 group-hover:text-orange-400 transition-colors" />}
                      <span className="text-[10px] text-gray-400 leading-tight">Edit it{"\n"}with AI</span>
                    </button>
                    <button
                      onClick={() => toast({ title: "Upscale — coming soon!" })}
                      className="bg-[#1e1e2a] hover:bg-[#2a2a38] border border-white/10 rounded-xl py-3 px-1 flex flex-col items-center gap-2 transition-all group">
                      <ZoomIn className="h-5 w-5 text-gray-400 group-hover:text-orange-400 transition-colors" />
                      <span className="text-[10px] text-gray-400 leading-tight">Upscale{"\n"}Image</span>
                    </button>
                  </div>

                  {/* Rating */}
                  <div className="border-t border-white/10 pt-3 text-center">
                    <p className="text-xs text-gray-400 mb-2 font-medium">Rate this result:</p>
                    <div className="flex items-center justify-center gap-3">
                      {[{ e: "😏", v: "good" as const }, { e: "😐", v: "bad" as const }].map(r => (
                        <button key={r.v} onClick={() => setRating(r.v)}
                          className={`text-2xl transition-all hover:scale-125 ${rating === r.v ? "scale-125 opacity-100" : "opacity-50 hover:opacity-100"}`}>
                          {r.e}
                        </button>
                      ))}
                    </div>
                    {rating && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        {rating === "good" ? "Thanks! Glad it worked 🎉" : "Sorry — click Manual Edit or try AI re-edit above."}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Batch banner */}
              <div className="mx-6 mb-6 mt-1 rounded-xl bg-[#1a0d00] border border-orange-500/30 px-5 py-3 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-300">Want to remove watermarks from hundreds of images at once?</p>
                <button onClick={() => toast({ title: "Batch Mode — coming soon!" })}
                  className="flex items-center gap-1 text-orange-400 font-semibold text-sm whitespace-nowrap hover:text-orange-300 transition-colors">
                  Try Batch Mode <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* ── Manual Edit ─────────────────────────────────────────────────── */}
          {stage === "manual" && (
            <div className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Manual Watermark Selection</p>
                  <p className="text-xs text-gray-400 mt-0.5">Click and drag on the image to select the watermark area, then click Remove.</p>
                </div>
                <button onClick={() => { setStage(result ? "result" : "upload"); setBox(null); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20">
                  <X className="h-3.5 w-3.5" /> {result ? "Back to result" : "Cancel"}
                </button>
              </div>

              {/* Canvas */}
              <div
                className="relative select-none rounded-xl overflow-hidden border border-white/10 bg-black cursor-crosshair"
                onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              >
                <img
                  ref={imgRef}
                  src={editBase || imgSrc}
                  alt="Edit"
                  draggable={false}
                  className="w-full h-auto block max-h-[460px] object-contain"
                />
                {/* Selection box */}
                {box && box.w > 0.5 && box.h > 0.5 && (
                  <div className="absolute border-2 border-orange-400 bg-orange-400/15 pointer-events-none"
                    style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">SELECTED AREA</span>
                    </div>
                  </div>
                )}
                {manLoading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
                    <span className="text-white text-sm font-medium">Removing selected area…</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 items-center flex-wrap">
                <button onClick={doManualRemove} disabled={manLoading || !box || box.w < 0.5}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-white text-sm bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-orange-500/20">
                  {manLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Removing…</> : <><Eraser className="h-4 w-4" />Remove Selected Area</>}
                </button>
                {box && box.w > 0.5 && (
                  <button onClick={() => setBox(null)} className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <RotateCcw className="h-3 w-3 inline mr-1" />Clear selection
                  </button>
                )}
                {(!box || box.w < 0.5) && <p className="text-xs text-gray-500">← Click and drag over the watermark to select it</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
