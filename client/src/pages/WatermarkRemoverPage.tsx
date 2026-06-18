import { useRef } from "react";
import { Link } from "wouter";
import { WatermarkRemover } from "@/components/WatermarkRemover";
import {
  Wand2, Shield, Zap, Layers, Clock, Lock, Monitor, Code2,
  CheckCircle2, ArrowRight, Star, Upload, Cpu, Download,
  ChevronRight, ImageIcon, Users, BarChart3, Timer
} from "lucide-react";

// ── Section: Hero ─────────────────────────────────────────────────────────────
function Hero({ toolRef }: { toolRef: React.RefObject<HTMLDivElement> }) {
  return (
    <section className="relative overflow-hidden bg-white pt-16 pb-0">
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-100 to-violet-100 opacity-60 blur-3xl" />
        <div className="absolute -top-20 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-purple-100 to-blue-50 opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 shadow-sm">
          <Zap className="h-3.5 w-3.5 text-blue-500" />
          Powered by GPT-4o Vision AI — No Signup Required
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Remove Watermarks from{" "}
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Images Instantly
          </span>{" "}
          with AI
        </h1>

        {/* Subheadline */}
        <p className="max-w-2xl mx-auto text-lg text-gray-500 leading-relaxed mb-10" style={{ fontFamily: "'Inter', sans-serif" }}>
          Upload your image and let our AI automatically detect and remove watermarks
          while preserving full image quality. Free, fast, and private.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <button
            onClick={() => toolRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            <Upload className="h-5 w-5" />
            Remove Watermark Free
            <ChevronRight className="h-4 w-4" />
          </button>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-gray-700 text-base bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
          >
            See How It Works
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-14 text-sm text-gray-400 font-medium">
          {["No signup needed", "100% Free", "Secure uploads", "PNG · JPG · WEBP · HEIC"].map(b => (
            <span key={b} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Stats ─────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { icon: ImageIcon, value: "10M+",   label: "Images Processed",    color: "text-blue-600",   bg: "bg-blue-50" },
    { icon: Users,     value: "1M+",    label: "Happy Users",         color: "text-violet-600", bg: "bg-violet-50" },
    { icon: BarChart3, value: "99%",    label: "Removal Accuracy",    color: "text-emerald-600",bg: "bg-emerald-50" },
    { icon: Timer,     value: "<5s",    label: "Average Processing",  color: "text-orange-600", bg: "bg-orange-50" },
  ];
  return (
    <section className="bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <span className={`text-3xl font-extrabold ${s.color}`} style={{ fontFamily: "'Poppins', sans-serif" }}>{s.value}</span>
              <span className="text-sm text-gray-500 font-medium leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Tool (the actual functional uploader) ────────────────────────────
function ToolSection({ toolRef }: { toolRef: React.RefObject<HTMLDivElement> }) {
  return (
    <section ref={toolRef} className="py-16 bg-gradient-to-b from-gray-950 to-[#111118]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Try It Right Now — It's Free
          </h2>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            Upload any image. AI detects and removes the watermark automatically. No account needed.
          </p>
        </div>
        <WatermarkRemover />
      </div>
    </section>
  );
}

// ── Section: How It Works ──────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: Upload,
      title: "Upload Your Image",
      desc: "Drag & drop or click to upload. Supports PNG, JPG, JPEG, WEBP, and HEIC. Max 20 MB.",
      color: "from-blue-500 to-blue-600",
      glow: "shadow-blue-200",
    },
    {
      step: "02",
      icon: Cpu,
      title: "AI Detects Watermark",
      desc: "Our GPT-4o Vision AI scans the image, pinpoints watermark regions with bounding-box precision.",
      color: "from-violet-500 to-purple-600",
      glow: "shadow-violet-200",
    },
    {
      step: "03",
      icon: Download,
      title: "Download Clean Image",
      desc: "The watermark is removed and edges blended seamlessly. Download your clean image instantly.",
      color: "from-emerald-500 to-teal-600",
      glow: "shadow-emerald-200",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Three steps to a{" "}
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">watermark-free</span>{" "}
            image
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-14 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 to-emerald-200 z-0" />

          {steps.map((s, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center text-center group">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} shadow-xl ${s.glow} flex items-center justify-center mb-5 group-hover:-translate-y-1 transition-transform`}>
                <s.icon className="h-7 w-7 text-white" />
              </div>
              <span className="text-xs font-black text-gray-300 tracking-[0.2em] mb-2">{s.step}</span>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Features ─────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: Wand2,
      title: "AI-Powered Removal",
      desc: "GPT-4o Vision identifies and removes watermarks with human-level accuracy.",
      color: "text-blue-600", bg: "bg-blue-50",
    },
    {
      icon: Cpu,
      title: "Auto Detection",
      desc: "No manual selection needed — AI finds watermark regions automatically.",
      color: "text-violet-600", bg: "bg-violet-50",
    },
    {
      icon: Shield,
      title: "Quality Preserved",
      desc: "Smart edge blending ensures the image looks natural after removal.",
      color: "text-emerald-600", bg: "bg-emerald-50",
    },
    {
      icon: Layers,
      title: "Batch Processing",
      desc: "Process hundreds of images at once via API or batch upload mode.",
      color: "text-orange-600", bg: "bg-orange-50",
    },
    {
      icon: Clock,
      title: "Fast — Under 5s",
      desc: "Cloud-powered AI processes your image in seconds, not minutes.",
      color: "text-teal-600", bg: "bg-teal-50",
    },
    {
      icon: Lock,
      title: "Secure & Private",
      desc: "Uploads are encrypted. Files are auto-deleted after 30 minutes.",
      color: "text-rose-600", bg: "bg-rose-50",
    },
    {
      icon: Monitor,
      title: "Any Device",
      desc: "Fully responsive — works on desktop, tablet, and mobile browsers.",
      color: "text-indigo-600", bg: "bg-indigo-50",
    },
    {
      icon: Code2,
      title: "Developer API",
      desc: "Integrate watermark removal into your own apps via REST API.",
      color: "text-purple-600", bg: "bg-purple-50",
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4">
            FEATURES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">remove watermarks</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Professional-grade AI tools without the professional price tag.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={i} className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all hover:-translate-y-1">
              <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Benefits ─────────────────────────────────────────────────────────
function Benefits() {
  const benefits = [
    { title: "No Photoshop Skills Required",  desc: "Our AI does the heavy lifting. Anyone can remove watermarks in seconds — no design experience needed." },
    { title: "Instant Results",               desc: "Upload, process, download — all within 5 seconds. No waiting, no queues." },
    { title: "High Accuracy",                 desc: "99% accuracy rate on text, logo, and pattern watermarks across all image types." },
    { title: "Multiple Format Support",       desc: "Works with PNG, JPG, JPEG, WEBP, and HEIC. Output in the format you choose." },
    { title: "Free to Try",                   desc: "Start for free with no credit card. No signup. Full AI watermark removal, no strings attached." },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Left: copy */}
          <div>
            <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6">
              WHY CHOOSE US
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              The smartest way to{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                clean your images
              </span>
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Whether you're a photographer, designer, marketer, or just someone who downloaded a watermarked stock photo — our tool gets the job done instantly.
            </p>
            <div className="space-y-4">
              {benefits.map((b, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>{b.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: visual card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-violet-100 rounded-3xl blur-2xl opacity-50 scale-105" />
            <div className="relative bg-white rounded-3xl border border-gray-100 shadow-2xl p-8 space-y-5">
              {/* Mini before/after mockup */}
              <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-video flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-100" />
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="flex gap-4 items-center">
                    <div className="bg-white rounded-xl p-3 shadow-md">
                      <div className="w-16 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-gray-500 opacity-80 rotate-[-15deg]">WATERMARK</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-500" />
                    <div className="bg-white rounded-xl p-3 shadow-md ring-2 ring-emerald-400 ring-offset-1">
                      <div className="w-16 h-12 bg-gradient-to-br from-blue-200 to-violet-200 rounded-lg" />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Watermark removed ✓</span>
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { v: "99%", l: "Accuracy", c: "text-blue-600" },
                  { v: "<5s", l: "Speed",    c: "text-violet-600" },
                  { v: "Free", l: "Always",  c: "text-emerald-600" },
                ].map(s => (
                  <div key={s.l} className="bg-gray-50 rounded-xl py-3 border border-gray-100">
                    <p className={`text-xl font-extrabold ${s.c}`} style={{ fontFamily: "'Poppins', sans-serif" }}>{s.v}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Review */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-xs text-gray-600 italic leading-relaxed">
                  "Removed a Getty Images watermark in under 3 seconds. The result was indistinguishable from the original. Incredible."
                </p>
                <p className="text-xs text-gray-400 font-semibold mt-2">— Sarah M., Graphic Designer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: CTA Banner ───────────────────────────────────────────────────────
function CTABanner({ toolRef }: { toolRef: React.RefObject<HTMLDivElement> }) {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Ready to remove your watermark?
        </h2>
        <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
          Free, instant, and no account required. Upload your image and get a clean result in seconds.
        </p>
        <button
          onClick={() => toolRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-blue-700 text-base bg-white hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Upload className="h-5 w-5" />
          Upload Image — It's Free
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

// ── Section: FAQ ──────────────────────────────────────────────────────────────
function FAQ() {
  const faqs = [
    {
      q: "Is this watermark remover really free?",
      a: "Yes — completely free. No account, no credit card, no usage limits during our open beta. Just upload and download.",
    },
    {
      q: "Which image formats are supported?",
      a: "We support PNG, JPG, JPEG, WEBP, and HEIC. Output can be downloaded as a high-quality JPG.",
    },
    {
      q: "How does the AI detect watermarks?",
      a: "We use GPT-4o Vision to analyse the image and identify watermark bounding boxes with percentage coordinates. Sharp then applies content-aware fill and edge blending to remove them.",
    },
    {
      q: "Is my image kept private?",
      a: "Yes. All uploads are encrypted in transit. Images are automatically deleted from our servers after 30 minutes and are never used for training.",
    },
    {
      q: "What if the AI misses part of the watermark?",
      a: "Use the 'Manual Edit' mode — draw a box over any remaining marks and click Remove. You can also hit 'Edit it with AI' for a second AI pass.",
    },
    {
      q: "Can I process multiple images at once?",
      a: "Batch mode is coming soon. For now, images are processed one at a time. Sign up for early access to batch processing.",
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4">
            FAQ
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Frequently asked questions
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer font-semibold text-gray-900 text-sm list-none hover:bg-gray-50 transition-colors" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {f.q}
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Footer ───────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Wand2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white text-sm">WatermarkAI</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Free AI-powered watermark removal. Instant, private, and no signup needed.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white text-xs mb-3 uppercase tracking-wider">Tools</p>
            <ul className="space-y-2 text-xs">
              <li><Link href="/watermark-remover" className="hover:text-white transition-colors">Image Watermark Remover</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Image Converter</Link></li>
              <li><Link href="/seo-audit" className="hover:text-white transition-colors">SEO Audit</Link></li>
              <li><Link href="/seo-tools" className="hover:text-white transition-colors">SEO Tools</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white text-xs mb-3 uppercase tracking-wider">Support</p>
            <ul className="space-y-2 text-xs">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              <li><Link href="/free-seo-audit" className="hover:text-white transition-colors">Free SEO Audit</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white text-xs mb-3 uppercase tracking-wider">Formats</p>
            <ul className="space-y-2 text-xs">
              {["PNG", "JPG / JPEG", "WEBP", "HEIC"].map(f => (
                <li key={f} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <span>© {new Date().getFullYear()} WatermarkAI. All rights reserved.</span>
          <span>Built with GPT-4o Vision + Sharp image processing</span>
        </div>
      </div>
    </footer>
  );
}

// ── Root Page ──────────────────────────────────────────────────────────────────
export default function WatermarkRemoverPage() {
  const toolRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>WatermarkAI</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 font-medium">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
            <Link href="/" className="hover:text-gray-900 transition-colors">More Tools</Link>
          </div>

          <button
            onClick={() => toolRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-sm transition-all"
          >
            <Upload className="h-3.5 w-3.5" />
            Remove Watermark
          </button>
        </div>
      </nav>

      {/* Sections */}
      <Hero toolRef={toolRef} />
      <Stats />
      <ToolSection toolRef={toolRef} />
      <div id="how-it-works"><HowItWorks /></div>
      <div id="features"><Features /></div>
      <Benefits />
      <CTABanner toolRef={toolRef} />
      <FAQ />
      <Footer />
    </div>
  );
}
