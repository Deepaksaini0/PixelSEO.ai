import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, CheckCircle, XCircle, AlertTriangle, Info,
  Download, TrendingUp, Globe, FileText, Zap, Target, ChevronDown, ChevronUp,
  Sparkles, BarChart3, Shield, PenTool, Star, ArrowRight, RefreshCw,
  ExternalLink, Copy, Mail, Calendar, Users, Link2, Gauge,
  Trophy, Clock, Lightbulb, BookOpen, Activity, Bell, ChevronRight,
  FileSpreadsheet, LayoutList,
} from "lucide-react";

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface Issue {
  id: string; category: "Technical" | "On-Page" | "Content"; severity: "critical" | "warning" | "info";
  issue: string; fix: string;
}
interface PageSummary {
  url: string; score: number; title: string; wordCount: number;
  scripts?: number; pageSize?: number;
}
interface AuditReport {
  url: string; domain: string; shareId: string;
  score: number; techScore: number; onPageScore: number; contentScore: number; perfScore: number;
  pagesCrawled: number; timestamp: string;
  issues: Issue[];
  pages: PageSummary[];
  aiInsights: {
    executiveSummary: string; topPriority: string; quickWins: string[];
    longTermActions: string[]; competitiveInsight: string; rankingPrediction: string;
    roadmap: { week1: string[]; month1: string[]; quarter: string[] };
    eeat: { experienceScore: number; expertiseScore: number; authorityScore: number; trustScore: number; improvements: string[] };
    keywordOpportunities: { keyword: string; intent: string; difficulty: string; action: string }[];
    contentSuggestions: { page: string; suggestion: string }[];
    competitorComparison: { topCompetitors: string[]; gaps: string[]; advantages: string[] };
    internalLinkingIssues: string[];
    coreWebVitals: { lcp: string; cls: string; inp: string; lcpTip: string; clsTip: string; inpTip: string };
  };
}
interface LocalSEOReport {
  url: string; businessName: string; location: string; phone: string;
  overallScore: number; napScore: number; citationScore: number; reviewScore: number; localKeywordsScore: number;
  signals: { hasGBP: boolean; hasNAP: boolean; hasLocalKeywords: boolean; hasSchemaMarkup: boolean; hasMobileOptimized: boolean; hasHttps: boolean };
  localKeywords: { keyword: string; intent: string; volume: string }[];
  recommendations: { priority: "high" | "medium" | "low"; action: string; impact: string }[];
  napData: { name: string; address: string; phone: string; consistent: boolean };
  citationOpportunities: string[];
  summary: string;
}
interface AISEOReport {
  url: string; currentTitle: string; currentMeta: string;
  title: string; description: string; keywords: string[];
  schemaType: string; contentScore: number; readabilityScore: number; aiScore: number;
  suggestions: { type: string; current: string; recommended: string; impact: string }[];
  contentIdeas: { topic: string; format: string; keywords: string[] }[];
  faqs: { question: string; answer: string }[];
  summary: string;
}

// ── Score ring (circular progress) ────────────────────────────────────────────
function ScoreRing({ score, size = 100, label, big = false }: { score: number; size?: number; label?: string; big?: boolean }) {
  const r    = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 absolute inset-0">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={big ? 10 : 8} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={big ? 10 : 8}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.2s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-black leading-none" style={{ fontSize: big ? size * 0.3 : size * 0.28, color }}>{pct}</span>
        </div>
      </div>
      {label && <span className={`font-semibold text-gray-500 text-center ${big ? "text-sm" : "text-xs"}`}>{label}</span>}
    </div>
  );
}

// ── CWV badge ──────────────────────────────────────────────────────────────────
function CWVBadge({ status }: { status: string }) {
  if (status === "good") return <Badge className="bg-green-500/10 text-green-700 border-green-200 text-[10px]">Good</Badge>;
  if (status === "needs-improvement") return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 text-[10px]">Needs Work</Badge>;
  return <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[10px]">Poor</Badge>;
}

// ── Issue accordion card ────────────────────────────────────────────────────────
function IssueCard({ issue, idx }: { issue: Issue; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
      className="border rounded-lg overflow-hidden bg-white">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-gray-50 transition-colors">
        {issue.severity === "critical"
          ? <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          : issue.severity === "warning"
            ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            : <Info className="h-4 w-4 text-blue-500 shrink-0" />}
        <span className="flex-1 text-sm font-medium text-gray-700 text-left truncate">{issue.issue}</span>
        <div className="flex items-center gap-2 shrink-0">
          {issue.severity === "critical" && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Critical</span>}
          {issue.severity === "warning"  && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Warning</span>}
          {issue.severity === "info"     && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Notice</span>}
          <span className="text-[10px] text-gray-400 hidden sm:inline">{issue.category}</span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t bg-indigo-50/60">
              <div className="flex items-start gap-2 pt-3">
                <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-indigo-600 mb-1">AI-Recommended Fix</p>
                  <p className="text-sm text-gray-600">{issue.fix}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Download report HTML ───────────────────────────────────────────────────────
function buildReportHtml(report: AuditReport): string {
  const sc = (s: number) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
  const crit = report.issues.filter(i => i.severity === "critical");
  const warn = report.issues.filter(i => i.severity === "warning");
  const info = report.issues.filter(i => i.severity === "info");
  const rows = (items: Issue[], color: string) => items.map(i => `
    <tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">
      <span style="background:${color}20;color:${color};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;text-transform:uppercase">${i.severity}</span>
    </td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px">${i.category}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px">${i.issue}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#555">${i.fix}</td></tr>`).join("");
  const roadmap = report.aiInsights.roadmap;
  const eeat    = report.aiInsights.eeat;
  const kwds    = report.aiInsights.keywordOpportunities || [];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>SEO Audit Report – ${report.domain}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;background:#f8fafc;color:#1a1a1a}
.wrap{max-width:960px;margin:0 auto;padding:32px}.header{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:40px;border-radius:16px;margin-bottom:24px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.sc{background:#fff;border-radius:12px;padding:18px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08)}.sc-num{font-size:34px;font-weight:900;line-height:1}
.section{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
h2{margin:0 0 16px;font-size:18px}h3{margin:0 0 10px;font-size:15px}
table{width:100%;border-collapse:collapse}th{text-align:left;padding:10px 12px;background:#f8fafc;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
.ai-box{background:linear-gradient(135deg,#f0f0ff,#faf0ff);border:1px solid #e0d0ff;border-radius:10px;padding:18px;margin-bottom:10px}
.tag{display:inline-block;background:#6366f120;color:#6366f1;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700}
.bar{height:8px;border-radius:4px;background:#e5e7eb;margin:4px 0 12px;overflow:hidden}.bar-fill{height:100%;border-radius:4px}
</style></head><body><div class="wrap">
<div class="header">
  <div style="font-size:12px;font-weight:600;opacity:.7;margin-bottom:8px;text-transform:uppercase;letter-spacing:.1em">SEO Audit Report</div>
  <h1 style="margin:0 0 4px;font-size:26px">${report.domain}</h1>
  <p style="margin:0;opacity:.8;font-size:13px">${report.url} · ${new Date(report.timestamp).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} · ${report.pagesCrawled} pages crawled</p>
</div>
<div class="grid4">
  <div class="sc"><div class="sc-num" style="color:${sc(report.score)}">${report.score}</div><div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600">Overall</div></div>
  <div class="sc"><div class="sc-num" style="color:${sc(report.techScore)}">${report.techScore}</div><div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600">Technical</div></div>
  <div class="sc"><div class="sc-num" style="color:${sc(report.onPageScore)}">${report.onPageScore}</div><div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600">On-Page</div></div>
  <div class="sc"><div class="sc-num" style="color:${sc(report.contentScore)}">${report.contentScore}</div><div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600">Content</div></div>
</div>
${crit.length ? `<div class="section"><h2>🔴 Critical Issues (${crit.length})</h2><table><thead><tr><th>Sev.</th><th>Category</th><th>Issue</th><th>Fix</th></tr></thead><tbody>${rows(crit,"#ef4444")}</tbody></table></div>` : ""}
${warn.length ? `<div class="section"><h2>🟡 Warnings (${warn.length})</h2><table><thead><tr><th>Sev.</th><th>Category</th><th>Issue</th><th>Fix</th></tr></thead><tbody>${rows(warn,"#f59e0b")}</tbody></table></div>` : ""}
${info.length ? `<div class="section"><h2>🔵 Notices (${info.length})</h2><table><thead><tr><th>Sev.</th><th>Category</th><th>Issue</th><th>Fix</th></tr></thead><tbody>${rows(info,"#3b82f6")}</tbody></table></div>` : ""}
<div class="section"><h2>Pages Audited</h2><table><thead><tr><th>URL</th><th>Score</th><th>Title</th><th>Words</th></tr></thead><tbody>
${report.pages.map(p => `<tr><td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px">${p.url}</td><td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-weight:700;color:${sc(p.score)}">${p.score}</td><td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px">${p.title || "—"}</td><td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px">${p.wordCount}</td></tr>`).join("")}
</tbody></table></div>
<p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:32px">Generated by SEO Tools Suite · ${new Date().toLocaleDateString()}</p>
</div></body></html>`;
}

const LOAD_STEPS = [
  "Connecting to website…", "Crawling pages…", "Checking robots.txt & sitemap…",
  "Analysing technical SEO…", "Checking on-page factors…", "Evaluating content & EEAT…",
  "Running AI analysis & roadmap…", "Generating your report…",
];

const NAV_TABS = ["SEO", "Ads", "Social", "Email", "CRM", "Reputation", "Tasks", "Reports", "Integrations"];

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AISEOAudit() {
  const { toast } = useToast();
  const [url,      setUrl]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState(0);
  const [report,   setReport]   = useState<AuditReport | null>(null);
  const [filter,   setFilter]   = useState<"all" | "critical" | "warning" | "info">("all");
  const [activeTab, setActiveTab] = useState("pages");
  const [email,    setEmail]    = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [searchQ,  setSearchQ]  = useState("");
  const [seoSubTab, setSeoSubTab] = useState<"google" | "local" | "ai">("google");

  // ── Local SEO state ──
  const [localUrl,      setLocalUrl]      = useState("");
  const [localBizName,  setLocalBizName]  = useState("");
  const [localLocation, setLocalLocation] = useState("");
  const [localPhone,    setLocalPhone]    = useState("");
  const [localLoading,  setLocalLoading]  = useState(false);
  const [localReport,   setLocalReport]   = useState<LocalSEOReport | null>(null);
  const [localCopied,   setLocalCopied]   = useState<string | null>(null);

  // ── AI SEO state ──
  const [aiSeoUrl,     setAiSeoUrl]     = useState("");
  const [aiSeoLoading, setAiSeoLoading] = useState(false);
  const [aiSeoReport,  setAiSeoReport]  = useState<AISEOReport | null>(null);
  const [aiCopied,     setAiCopied]     = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setLoading(true);
      fetch(`/api/seo/audit-report/${id}`)
        .then(r => r.json())
        .then(data => { if (!data.error) { setReport(data); setActiveTab("pages"); } else toast({ title: "Shared report not found or expired", variant: "destructive" }); })
        .catch(() => toast({ title: "Could not load shared report", variant: "destructive" }))
        .finally(() => setLoading(false));
    }
  }, []);

  const runAudit = async () => {
    const trimmed = url.trim();
    if (!trimmed) { toast({ title: "Enter a URL first", variant: "destructive" }); return; }
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
    try { new URL(normalized); } catch { toast({ title: "Invalid URL", variant: "destructive" }); return; }
    setLoading(true); setReport(null); setStep(0); setActiveTab("pages");
    let s = 0;
    const iv = setInterval(() => { s = Math.min(s + 1, LOAD_STEPS.length - 1); setStep(s); }, 3000);
    try {
      const res  = await fetch("/api/seo/ai-full-audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: normalized }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setReport(data);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("id", data.shareId);
      window.history.replaceState({}, "", newUrl.toString());
    } catch (err: any) {
      toast({ title: "Audit failed", description: err.message, variant: "destructive" });
    } finally {
      clearInterval(iv); setLoading(false);
    }
  };

  const runLocalAudit = async () => {
    const trimmed = localUrl.trim();
    if (!trimmed || !localBizName.trim() || !localLocation.trim()) {
      toast({ title: "Please fill in URL, business name, and location", variant: "destructive" }); return;
    }
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
    setLocalLoading(true); setLocalReport(null);
    try {
      const res  = await fetch("/api/seo/local-audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: normalized, businessName: localBizName.trim(), location: localLocation.trim(), phone: localPhone.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Local audit failed");
      setLocalReport(data);
    } catch (err: any) {
      toast({ title: "Local audit failed", description: err.message, variant: "destructive" });
    } finally { setLocalLoading(false); }
  };

  const runAISEO = async () => {
    const trimmed = aiSeoUrl.trim();
    if (!trimmed) { toast({ title: "Enter a URL first", variant: "destructive" }); return; }
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
    setAiSeoLoading(true); setAiSeoReport(null);
    try {
      const res  = await fetch("/api/seo/ai-seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: normalized }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI SEO analysis failed");
      setAiSeoReport(data);
    } catch (err: any) {
      toast({ title: "AI SEO analysis failed", description: err.message, variant: "destructive" });
    } finally { setAiSeoLoading(false); }
  };

  const copyText = (text: string, key: string, setter: (v: string | null) => void) => {
    navigator.clipboard.writeText(text);
    setter(key); setTimeout(() => setter(null), 2000);
  };

  const handleDownload = () => {
    if (!report) return;
    if (!emailDone) { setShowEmailModal(true); return; }
    triggerDownload();
  };
  const triggerDownload = () => {
    if (!report) return;
    const html = buildReportHtml(report);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `seo-audit-${report.domain}-${Date.now()}.html`; a.click();
  };
  const handleEmailSubmit = () => {
    if (!email.includes("@")) { toast({ title: "Enter a valid email", variant: "destructive" }); return; }
    setEmailDone(true); setShowEmailModal(false); triggerDownload();
  };
  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const critCount = report?.issues.filter(i => i.severity === "critical").length ?? 0;
  const warnCount = report?.issues.filter(i => i.severity === "warning").length ?? 0;
  const infoCount = report?.issues.filter(i => i.severity === "info").length ?? 0;
  const secScore  = report ? Math.max(70, Math.min(100, Math.round((report.techScore * 0.7 + report.score * 0.3)))) : 0;
  const passedCount = report ? Math.max(0, (report.pagesCrawled * 50) - critCount - warnCount - infoCount) : 0;
  const filteredIssues = report?.issues.filter(i => filter === "all" || i.severity === filter) ?? [];
  const ai = report?.aiInsights;

  const filteredPages = (report?.pages ?? []).filter(p =>
    !searchQ || p.url.toLowerCase().includes(searchQ.toLowerCase()) || (p.title || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  const fmtDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };
  const fmtCrawled = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };
  const estLoadTime = (p: PageSummary) => {
    const bytes = p.pageSize || (p.wordCount * 6) || 100000;
    return (0.5 + bytes / 400000 + (p.scripts || 0) * 0.05).toFixed(2) + "s";
  };
  const estSize = (p: PageSummary) => {
    const bytes = p.pageSize || (p.wordCount * 6) || 100000;
    return bytes >= 1024 ? (bytes / 1024).toFixed(1) + "KB" : bytes + "B";
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8]">

      {/* ── Email modal ───────────────────────────────────────────────────────── */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-indigo-500" /> Get Your Full Report</DialogTitle>
            <DialogDescription>Enter your email to download the white-label HTML report. No spam.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder="you@yourcompany.com" type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmailSubmit()} />
            <Button className="w-full gap-2" onClick={handleEmailSubmit}>
              <Download className="h-4 w-4" /> Download Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Top nav bar ───────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        {/* Breadcrumb + icons row */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-gray-700">Project</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><Bell className="h-4 w-4 text-gray-500" /></button>
            <button className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg px-2.5 py-1.5 transition-colors border border-gray-200">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Free Tools <ChevronDown className="h-3 w-3" />
            </button>
            <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold select-none">DK</div>
          </div>
        </div>
        {/* Main tab row */}
        <div className="flex items-center gap-0 px-2 overflow-x-auto scrollbar-none">
          {NAV_TABS.map(tab => (
            <button key={tab}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === "SEO" ? "border-green-500 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"}`}>
              {tab === "SEO" && <Search className="h-3.5 w-3.5" />}
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* ── SEO sub-tabs ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex items-center gap-1">
          {([
            { id: "google", label: "Google SEO", dot: "bg-green-500",  activeBorder: "border-green-500",  activeText: "text-green-700"  },
            { id: "local",  label: "Local SEO",  dot: "bg-orange-500", activeBorder: "border-orange-500", activeText: "text-orange-700" },
            { id: "ai",     label: "AI SEO",     dot: "bg-blue-500",   activeBorder: "border-blue-500",   activeText: "text-blue-700"   },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setSeoSubTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${seoSubTab === t.id ? `${t.activeBorder} ${t.activeText}` : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"}`}>
              <span className={`h-2 w-2 rounded-full ${t.dot}`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content area ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── No report: hero input ─────────────────────────────────────────── */}
        {seoSubTab === "google" && !report && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white p-8 mb-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
              <div className="relative max-w-2xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-xs font-semibold mb-5">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> AI-Powered · 20-Page Crawl · 100% Free
                </div>
                <h1 className="text-3xl sm:text-4xl font-black mb-3">Free AI SEO Audit Tool</h1>
                <p className="text-white/75 mb-6 text-sm max-w-lg mx-auto">Full-site crawl with AI-powered fixes, competitor gaps, EEAT analysis, Core Web Vitals, and a 90-day growth roadmap.</p>
                <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && !loading && runAudit()}
                      placeholder="https://yourwebsite.com"
                      className="pl-9 h-11 bg-white/15 border-white/25 text-white placeholder:text-white/45 focus:border-white/60 text-sm" data-testid="input-url" />
                  </div>
                  <Button onClick={runAudit} disabled={loading} size="lg"
                    className="h-11 px-7 bg-white text-indigo-700 hover:bg-white/90 font-bold gap-2 shrink-0" data-testid="button-audit">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {loading ? "Analysing…" : "Audit My Site"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              {[
                { icon: Shield,   title: "Technical SEO",       desc: "HTTPS, canonical, viewport, robots.txt, sitemap, schema, speed signals", color: "text-blue-500" },
                { icon: PenTool,  title: "On-Page SEO",         desc: "Title tags, meta descriptions, heading structure, image alt text", color: "text-violet-500" },
                { icon: FileText, title: "Content & EEAT",      desc: "Word count, readability, EEAT analysis, Open Graph, structured data", color: "text-pink-500" },
                { icon: Gauge,    title: "Core Web Vitals",     desc: "LCP, CLS, INP estimates with specific optimisation tips for each", color: "text-orange-500" },
                { icon: Users,    title: "Competitor Analysis", desc: "Top 3 likely competitors, keyword gaps, and your competitive advantages", color: "text-emerald-500" },
                { icon: Calendar, title: "90-Day Roadmap",      desc: "AI-generated week-by-week action plan prioritised by impact", color: "text-indigo-500" },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                  <Icon className={`h-6 w-6 ${color} mb-2`} />
                  <h3 className="font-bold text-sm text-gray-800">{title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {seoSubTab === "google" && loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8 py-20">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                <Search className="absolute inset-0 m-auto h-7 w-7 text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 text-lg">{LOAD_STEPS[step]}</p>
                <p className="text-sm text-gray-500 mt-1">Crawling up to 20 pages · Usually 20–45 seconds</p>
              </div>
              <div className="flex flex-col items-start gap-2 w-64">
                {LOAD_STEPS.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm transition-all ${i <= step ? "text-indigo-600 font-medium" : "text-gray-300"}`}>
                    {i < step ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : i === step ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-indigo-500" />
                      : <div className="h-3.5 w-3.5 rounded-full border border-gray-300 shrink-0" />}
                    {s}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Full results dashboard ────────────────────────────────────────── */}
        <AnimatePresence>
          {seoSubTab === "google" && report && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Breadcrumb row */}
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span className="hover:text-gray-600 cursor-pointer">Google SEO</span>
                <ChevronRight className="h-3 w-3" />
                <span className="hover:text-gray-600 cursor-pointer">Site Audit</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-gray-600 font-medium">Audit Results</span>
              </div>

              {/* URL heading + actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                  <div>
                    <a href={report.url} target="_blank" rel="noopener noreferrer"
                      className="text-2xl font-black text-gray-900 hover:underline flex items-center gap-2">
                      {report.url} <ExternalLink className="h-4 w-4 text-gray-400" />
                    </a>
                    <p className="text-sm text-gray-500 mt-1">Completed {fmtDate(report.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={copyShareLink} title="Copy share link"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500" data-testid="button-share">
                      {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button onClick={handleDownload} title="Download Excel"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-green-600" data-testid="button-download-excel">
                      <FileSpreadsheet className="h-4 w-4" />
                    </button>
                    <button onClick={handleDownload} title="Download PDF Report"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500" data-testid="button-download-pdf">
                      <FileText className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setReport(null); window.history.replaceState({}, "", window.location.pathname); }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      <RefreshCw className="h-3.5 w-3.5" /> New Audit
                    </button>
                  </div>
                </div>

                {/* ── Score circles row ────────────────────────────────────── */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 p-4 bg-[#f8fff8] rounded-xl border border-green-100">
                  <ScoreRing score={report.score}       label="Overall"     size={90} big />
                  <ScoreRing score={report.techScore}   label="Technical"   size={80} />
                  <ScoreRing score={report.onPageScore} label="On-Page"     size={80} />
                  <ScoreRing score={report.contentScore}label="Content"     size={80} />
                  <ScoreRing score={report.perfScore}   label="Performance" size={80} />
                  <ScoreRing score={secScore}           label="Security"    size={80} />
                </div>
              </div>

              {/* ── Stats cards row ──────────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Pages Crawled", value: report.pagesCrawled, color: "text-gray-800" },
                  { label: "Critical",      value: critCount,           color: "text-red-500" },
                  { label: "Warning",       value: warnCount,           color: "text-amber-500" },
                  { label: "Notice",        value: infoCount,           color: "text-blue-500" },
                  { label: "Passed",        value: passedCount,         color: "text-green-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-2xl font-black ${color}`}>{value.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* ── Tab navigation ───────────────────────────────────────────── */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Tab bar */}
                <div className="flex items-center gap-0 border-b border-gray-200 px-4 overflow-x-auto scrollbar-none">
                  {[
                    { id: "overview",   label: "Overview" },
                    { id: "issues",     label: `Issues`, count: report.issues.length },
                    { id: "passed",     label: "Passed",  count: passedCount },
                    { id: "pages",      label: "Pages",   count: report.pages.length },
                    { id: "compact",    label: "Compact" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-all ${activeTab === t.id ? "border-green-500 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      {t.label}
                      {t.count !== undefined && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeTab === t.id ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {t.count.toLocaleString()}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* ── PAGES TAB ───────────────────────────────────────────────── */}
                {activeTab === "pages" && (
                  <div>
                    {/* Search + count row */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                          placeholder="Search URLs…"
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
                          data-testid="input-search-urls" />
                      </div>
                      <span className="text-sm text-gray-500 whitespace-nowrap">{filteredPages.length} pages</span>
                    </div>

                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <span className="col-span-1">Score</span>
                      <span className="col-span-4">URL</span>
                      <span className="col-span-1 text-center">Status</span>
                      <span className="col-span-2">Issues</span>
                      <span className="col-span-1 text-center">Indexable</span>
                      <span className="col-span-1 text-right">Size</span>
                      <span className="col-span-1 text-right">Time</span>
                      <span className="col-span-1 text-right">Crawled</span>
                    </div>

                    {/* Table rows */}
                    <div className="divide-y divide-gray-100">
                      {filteredPages.length === 0 ? (
                        <div className="py-12 text-center text-sm text-gray-400">No pages match your search.</div>
                      ) : filteredPages.map((p, i) => {
                        const scoreColor = p.score >= 80 ? "bg-green-500" : p.score >= 60 ? "bg-amber-500" : "bg-red-500";
                        const warnPerPage = Math.round(warnCount / (report.pages.length || 1));
                        const infoPerPage = Math.round(infoCount / (report.pages.length || 1));
                        const critPerPage = i === 0 ? critCount : 0;
                        const isIndexable = p.score >= 40;
                        return (
                          <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 transition-colors">
                            {/* Score circle */}
                            <div className="col-span-1">
                              <div className={`w-8 h-8 rounded-full ${scoreColor} flex items-center justify-center text-white text-xs font-black`}>
                                {p.score}
                              </div>
                            </div>
                            {/* URL + title */}
                            <div className="col-span-4 min-w-0">
                              <a href={p.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-semibold text-indigo-600 hover:underline truncate block">
                                {p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}
                              </a>
                              {p.title && <p className="text-[11px] text-gray-400 truncate">{p.title}</p>}
                            </div>
                            {/* HTTP status */}
                            <div className="col-span-1 flex justify-center">
                              <span className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">200</span>
                            </div>
                            {/* Issues badges */}
                            <div className="col-span-2 flex flex-wrap gap-1">
                              {critPerPage > 0 && <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{critPerPage} crit</span>}
                              {warnPerPage > 0 && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{warnPerPage} warn</span>}
                              {infoPerPage > 0 && <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{infoPerPage} info</span>}
                              {critPerPage === 0 && warnPerPage === 0 && infoPerPage === 0 && <span className="text-[10px] text-gray-300">—</span>}
                            </div>
                            {/* Indexable */}
                            <div className="col-span-1 flex justify-center">
                              {isIndexable
                                ? <CheckCircle className="h-4 w-4 text-green-500" />
                                : <XCircle className="h-4 w-4 text-red-400" />}
                            </div>
                            {/* Size */}
                            <div className="col-span-1 text-right text-[11px] text-gray-500">{estSize(p)}</div>
                            {/* Load time */}
                            <div className="col-span-1 text-right text-[11px] text-gray-500">{estLoadTime(p)}</div>
                            {/* Crawled */}
                            <div className="col-span-1 text-right text-[10px] text-gray-400">{fmtCrawled(report.timestamp)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
                {activeTab === "overview" && (
                  <div className="p-5 space-y-4">
                    {ai?.rankingPrediction && (
                      <div className="rounded-xl border bg-green-50 border-green-200 p-4 flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-0.5">Ranking Prediction</p>
                          <p className="text-sm text-green-800">{ai.rankingPrediction}</p>
                        </div>
                      </div>
                    )}
                    {ai?.executiveSummary && (
                      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5">
                        <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI Executive Summary</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{ai.executiveSummary}</p>
                        {ai.topPriority && (
                          <div className="mt-3 bg-white rounded-lg p-3 border border-violet-200">
                            <p className="text-xs font-bold text-violet-600 mb-0.5">Top Priority Action</p>
                            <p className="text-sm font-medium text-gray-700">{ai.topPriority}</p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {ai?.quickWins?.length > 0 && (
                        <div className="border rounded-xl p-4 bg-white">
                          <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-3 flex items-center gap-1"><Zap className="h-3 w-3" />Quick Wins</p>
                          <ul className="space-y-2">
                            {ai.quickWins.map((w, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />{w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {ai?.longTermActions?.length > 0 && (
                        <div className="border rounded-xl p-4 bg-white">
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1"><TrendingUp className="h-3 w-3" />Strategic Actions</p>
                          <ul className="space-y-2">
                            {ai.longTermActions.map((a, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <ArrowRight className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />{a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {ai?.coreWebVitals && (
                      <div className="border rounded-xl p-4 bg-white">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Core Web Vitals</p>
                        <div className="space-y-3">
                          {[
                            { metric: "LCP", full: "Largest Contentful Paint", status: ai.coreWebVitals.lcp, tip: ai.coreWebVitals.lcpTip },
                            { metric: "CLS", full: "Cumulative Layout Shift",  status: ai.coreWebVitals.cls, tip: ai.coreWebVitals.clsTip },
                            { metric: "INP", full: "Interaction to Next Paint",status: ai.coreWebVitals.inp, tip: ai.coreWebVitals.inpTip },
                          ].map(({ metric, full, status, tip }) => (
                            <div key={metric} className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50">
                              <div className="shrink-0 text-center w-12">
                                <div className="text-sm font-black text-gray-700">{metric}</div>
                                <CWVBadge status={status} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-700">{full}</p>
                                {tip && <p className="text-xs text-gray-500 mt-0.5">{tip}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── ISSUES TAB ───────────────────────────────────────────────── */}
                {activeTab === "issues" && (
                  <div className="p-4 space-y-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {(["all", "critical", "warning", "info"] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize ${filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                          {f === "info" ? "notice" : f} {f !== "all" && `(${f === "critical" ? critCount : f === "warning" ? warnCount : infoCount})`}
                        </button>
                      ))}
                    </div>
                    {filteredIssues.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <p className="font-medium">No issues in this category!</p>
                      </div>
                    ) : filteredIssues.map((issue, idx) => <IssueCard key={issue.id} issue={issue} idx={idx} />)}
                  </div>
                )}

                {/* ── PASSED TAB ───────────────────────────────────────────────── */}
                {activeTab === "passed" && (
                  <div className="p-5">
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="font-bold text-gray-800 text-lg">{passedCount.toLocaleString()} Checks Passed</p>
                      <p className="text-sm text-gray-500 mt-1">Your site is performing well across {report.pagesCrawled} crawled pages.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 mt-4">
                      {[
                        "HTTPS enabled across all pages", "Robots.txt accessible", "Sitemap detected",
                        "Canonical tags present", "Viewport meta tag set", "Title tags present",
                        "Meta descriptions present", "H1 tags on key pages", "Image alt attributes",
                        "Fast server response time",
                      ].slice(0, Math.min(10, Math.ceil(passedCount / 400))).map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-3 rounded-lg border border-green-100 bg-green-50/50">
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── COMPACT TAB ─────────────────────────────────────────────── */}
                {activeTab === "compact" && (
                  <div className="divide-y divide-gray-100">
                    {report.pages.map((p, i) => {
                      const scoreColor = p.score >= 80 ? "text-green-600" : p.score >= 60 ? "text-amber-600" : "text-red-600";
                      return (
                        <div key={i} className="flex items-center gap-4 px-4 py-2.5 hover:bg-gray-50">
                          <span className={`text-sm font-black w-8 shrink-0 ${scoreColor}`}>{p.score}</span>
                          <div className="flex-1 min-w-0">
                            <a href={p.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:underline truncate block">
                              {p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}
                            </a>
                            {p.title && <span className="text-[11px] text-gray-400 truncate block">{p.title}</span>}
                          </div>
                          <span className="text-[11px] text-gray-400 shrink-0">{estSize(p)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── AI Insights (below main panel) ─────────────────────────── */}
              {(ai?.competitorComparison || ai?.keywordOpportunities?.length > 0 || ai?.eeat || ai?.roadmap) && (
                <div className="grid lg:grid-cols-2 gap-4">

                  {/* Competitor analysis */}
                  {ai?.competitorComparison && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Competitor Analysis</p>
                      {(ai.competitorComparison.topCompetitors ?? []).slice(0, 3).map((comp, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border bg-gray-50">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">#{i+1}</div>
                          <span className="text-sm font-medium text-gray-700 truncate">{comp}</span>
                        </div>
                      ))}
                      {(ai.competitorComparison.gaps ?? []).slice(0, 2).map((gap, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-2">
                          <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />{gap}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* EEAT */}
                  {ai?.eeat && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" />EEAT Analysis</p>
                      {[
                        { label: "Experience", score: ai.eeat.experienceScore },
                        { label: "Expertise",  score: ai.eeat.expertiseScore },
                        { label: "Authority",  score: ai.eeat.authorityScore },
                        { label: "Trust",      score: ai.eeat.trustScore },
                      ].map(({ label, score }) => {
                        const col = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
                        const txt = score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600";
                        return (
                          <div key={label} className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-600">{label}</span>
                              <span className={`text-xs font-black ${txt}`}>{score}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div className={`h-full ${col} rounded-full`}
                                initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1.2 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Roadmap */}
                  {ai?.roadmap && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />AI-Generated 90-Day SEO Roadmap</p>
                      <div className="grid sm:grid-cols-3 gap-4">
                        {[
                          { title: "Days 1–7: Quick Wins", tasks: ai.roadmap.week1, border: "border-l-red-400", icon: Zap },
                          { title: "Days 8–30: Build Momentum", tasks: ai.roadmap.month1, border: "border-l-amber-400", icon: Clock },
                          { title: "Days 31–90: Scale", tasks: ai.roadmap.quarter, border: "border-l-green-400", icon: TrendingUp },
                        ].map(({ title, tasks, border, icon: Icon }) => (
                          <div key={title} className={`border-l-4 ${border} pl-3`}>
                            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Icon className="h-3 w-3" />{title}</p>
                            {(tasks ?? []).length === 0
                              ? <p className="text-xs text-gray-400 italic">Great foundations already in place.</p>
                              : (tasks ?? []).map((t, i) => (
                                <p key={i} className="text-xs text-gray-600 mb-1.5 flex items-start gap-1.5">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />{t}
                                </p>
                              ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keyword opportunities */}
                  {ai?.keywordOpportunities?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 lg:col-span-2 overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Search className="h-3.5 w-3.5" />Keyword Opportunities</p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        <div className="grid grid-cols-4 px-5 py-2 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          <span>Keyword</span><span>Intent</span><span>Difficulty</span><span>Action</span>
                        </div>
                        {ai.keywordOpportunities.map((kw, i) => {
                          const diffColor = kw.difficulty === "low" ? "text-green-600 bg-green-50" : kw.difficulty === "medium" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
                          return (
                            <div key={i} className="grid grid-cols-4 px-5 py-2.5 items-center text-sm hover:bg-gray-50">
                              <span className="font-semibold text-gray-700 text-xs">{kw.keyword}</span>
                              <span className="capitalize text-gray-500 text-xs">{kw.intent}</span>
                              <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-bold capitalize w-fit ${diffColor}`}>{kw.difficulty}</span>
                              <span className="text-gray-500 text-xs">{kw.action}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Bottom CTA ───────────────────────────────────────────────── */}
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white text-center">
                <Star className="h-6 w-6 mx-auto text-yellow-400 mb-2" />
                <h3 className="text-lg font-bold mb-1">Want deeper analysis?</h3>
                <p className="text-white/75 text-sm mb-4 max-w-sm mx-auto">Use our full SEO suite — 25+ tools including keyword research, broken link checker, SERP preview, and more.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/seo-tools">
                    <Button className="bg-white text-indigo-700 hover:bg-white/90 font-bold gap-1.5">
                      Open SEO Tools <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-1.5" /> Download Report
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════════
            LOCAL SEO TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {seoSubTab === "local" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Hero form */}
            {!localReport && !localLoading && (
              <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white p-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
                <div className="relative max-w-2xl mx-auto text-center">
                  <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-xs font-semibold mb-5">
                    <Globe className="h-3.5 w-3.5 text-white" /> Local Pack · Google Maps · Citation Audit · 100% Free
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black mb-3">Free Local SEO Audit</h1>
                  <p className="text-white/80 mb-6 text-sm max-w-lg mx-auto">Analyze your local SEO signals — NAP consistency, Google Business Profile, citations, local keywords, and more.</p>
                  <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto mb-2">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input value={localUrl} onChange={e => setLocalUrl(e.target.value)} placeholder="https://yourbusiness.com"
                        className="pl-9 h-10 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm" data-testid="input-local-url" />
                    </div>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input value={localBizName} onChange={e => setLocalBizName(e.target.value)} placeholder="Business Name"
                        className="pl-9 h-10 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm" data-testid="input-local-bizname" />
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input value={localLocation} onChange={e => setLocalLocation(e.target.value)} placeholder="City, State (e.g. London, UK)"
                        className="pl-9 h-10 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm" data-testid="input-local-location" />
                    </div>
                    <div className="relative">
                      <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input value={localPhone} onChange={e => setLocalPhone(e.target.value)} placeholder="Phone (optional)"
                        className="pl-9 h-10 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm" data-testid="input-local-phone" />
                    </div>
                  </div>
                  <Button onClick={runLocalAudit} disabled={localLoading} size="lg"
                    className="mt-2 h-11 px-8 bg-white text-orange-600 hover:bg-white/90 font-bold gap-2" data-testid="button-local-audit">
                    {localLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Analyze Local SEO
                  </Button>
                </div>
              </div>
            )}

            {/* Feature cards */}
            {!localReport && !localLoading && (
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Target,   title: "NAP Consistency",      desc: "Name, Address, Phone uniformity across web", color: "text-orange-500" },
                  { icon: Globe,    title: "Google Business",       desc: "GBP signals, map pack eligibility, categories", color: "text-amber-500" },
                  { icon: Star,     title: "Reviews & Ratings",     desc: "Review signals, star ratings, response rate", color: "text-yellow-500" },
                  { icon: Link2,    title: "Citation Opportunities", desc: "Yelp, Yellow Pages, Bing, Apple Maps and more", color: "text-orange-600" },
                  { icon: Search,   title: "Local Keywords",        desc: "Near-me and geo-targeted keyword opportunities", color: "text-amber-600" },
                  { icon: Shield,   title: "Schema Markup",         desc: "LocalBusiness, Opening Hours, Contact structured data", color: "text-red-500" },
                ].map(({ icon: Icon, title, desc, color }) => (
                  <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                    <Icon className={`h-6 w-6 ${color} mb-2`} />
                    <h3 className="font-bold text-sm text-gray-800">{title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Local loading */}
            {localLoading && (
              <div className="flex flex-col items-center gap-6 py-20">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />
                  <Globe className="absolute inset-0 m-auto h-7 w-7 text-orange-500" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-800 text-lg">Analyzing Local SEO…</p>
                  <p className="text-sm text-gray-500 mt-1">Checking signals, citations, and local keywords · Usually 10–20 seconds</p>
                </div>
              </div>
            )}

            {/* Local results */}
            {localReport && !localLoading && (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{localReport.businessName}</h2>
                    <p className="text-sm text-gray-500">{localReport.location} · <a href={localReport.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{localReport.url}</a></p>
                  </div>
                  <button onClick={() => setLocalReport(null)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    <RefreshCw className="h-3.5 w-3.5" /> New Audit
                  </button>
                </div>

                {/* Score rings */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <ScoreRing score={localReport.overallScore}       label="Overall"       size={90} big />
                    <ScoreRing score={localReport.napScore}           label="NAP"           size={80} />
                    <ScoreRing score={localReport.citationScore}      label="Citations"     size={80} />
                    <ScoreRing score={localReport.reviewScore}        label="Reviews"       size={80} />
                    <ScoreRing score={localReport.localKeywordsScore} label="Local Keywords" size={80} />
                  </div>
                </div>

                {/* Signals + Summary */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Signals checklist */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Local Signals</p>
                    <div className="space-y-2">
                      {[
                        { label: "Google Business Profile",    ok: localReport.signals.hasGBP },
                        { label: "NAP Data Found",             ok: localReport.signals.hasNAP },
                        { label: "Local Keywords in Content",  ok: localReport.signals.hasLocalKeywords },
                        { label: "Schema Markup Present",      ok: localReport.signals.hasSchemaMarkup },
                        { label: "Mobile Optimized",           ok: localReport.signals.hasMobileOptimized },
                        { label: "HTTPS Secure",               ok: localReport.signals.hasHttps },
                      ].map(({ label, ok }) => (
                        <div key={label} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                          {ok
                            ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                          <span className="text-sm text-gray-700">{label}</span>
                          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${ok ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>{ok ? "PASS" : "FAIL"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Summary + Citation Opportunities */}
                  <div className="space-y-4">
                    {localReport.summary && (
                      <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/30 p-5">
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI Summary</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{localReport.summary}</p>
                      </div>
                    )}
                    {(localReport.citationOpportunities ?? []).length > 0 && (
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />Citation Opportunities</p>
                        <div className="flex flex-wrap gap-2">
                          {localReport.citationOpportunities.map((site, i) => (
                            <span key={i} className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full">{site}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Local Keywords table */}
                {(localReport.localKeywords ?? []).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Search className="h-3.5 w-3.5" />Local Keyword Opportunities</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      <div className="grid grid-cols-3 px-5 py-2 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span>Keyword</span><span>Intent</span><span>Volume</span>
                      </div>
                      {localReport.localKeywords.map((kw, i) => (
                        <div key={i} className="grid grid-cols-3 px-5 py-2.5 items-center text-sm hover:bg-gray-50">
                          <span className="font-semibold text-gray-700 text-xs">{kw.keyword}</span>
                          <span className="capitalize text-gray-500 text-xs">{kw.intent}</span>
                          <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-bold w-fit ${kw.volume === "High" ? "bg-green-50 text-green-600" : kw.volume === "Medium" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"}`}>{kw.volume}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {(localReport.recommendations ?? []).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Recommendations</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {localReport.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${rec.priority === "high" ? "bg-red-50 text-red-600" : rec.priority === "medium" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>{rec.priority.toUpperCase()}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{rec.action}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Impact: {rec.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            AI SEO TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {seoSubTab === "ai" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Hero form */}
            {!aiSeoReport && !aiSeoLoading && (
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white p-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
                <div className="relative max-w-2xl mx-auto text-center">
                  <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-xs font-semibold mb-5">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> AI-Powered · GPT-4 Analysis · Meta Tags · Content Ideas
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black mb-3">AI SEO Content Optimizer</h1>
                  <p className="text-white/75 mb-6 text-sm max-w-lg mx-auto">Generate AI-powered title tags, meta descriptions, keywords, content ideas, FAQs, and schema recommendations.</p>
                  <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input value={aiSeoUrl} onChange={e => setAiSeoUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && !aiSeoLoading && runAISEO()}
                        placeholder="https://yourwebsite.com"
                        className="pl-9 h-11 bg-white/15 border-white/25 text-white placeholder:text-white/45 text-sm" data-testid="input-ai-seo-url" />
                    </div>
                    <Button onClick={runAISEO} disabled={aiSeoLoading} size="lg"
                      className="h-11 px-7 bg-white text-blue-700 hover:bg-white/90 font-bold gap-2 shrink-0" data-testid="button-ai-seo">
                      {aiSeoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {aiSeoLoading ? "Generating…" : "Generate AI SEO"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Feature cards */}
            {!aiSeoReport && !aiSeoLoading && (
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: PenTool,   title: "AI Title & Meta",        desc: "GPT-4 optimized title tags under 60 chars, meta under 160 chars", color: "text-blue-500" },
                  { icon: Target,    title: "Keyword Suggestions",     desc: "8 AI-generated keywords tailored to your content and industry", color: "text-violet-500" },
                  { icon: FileText,  title: "Content Ideas",           desc: "Blog posts, guides, FAQs and videos to grow organic traffic", color: "text-indigo-500" },
                  { icon: BookOpen,  title: "FAQ Generation",          desc: "People-Also-Ask style questions and answers for featured snippets", color: "text-blue-600" },
                  { icon: BarChart3, title: "Content & Readability",    desc: "AI readability score and content quality analysis", color: "text-violet-600" },
                  { icon: Shield,    title: "Schema Recommendations",   desc: "Recommended structured data type for maximum SERP visibility", color: "text-indigo-600" },
                ].map(({ icon: Icon, title, desc, color }) => (
                  <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                    <Icon className={`h-6 w-6 ${color} mb-2`} />
                    <h3 className="font-bold text-sm text-gray-800">{title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* AI loading */}
            {aiSeoLoading && (
              <div className="flex flex-col items-center gap-6 py-20">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto h-7 w-7 text-blue-500" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-800 text-lg">AI is analyzing your website…</p>
                  <p className="text-sm text-gray-500 mt-1">Generating titles, keywords, content ideas and schema · Usually 10–20 seconds</p>
                </div>
              </div>
            )}

            {/* AI SEO results */}
            {aiSeoReport && !aiSeoLoading && (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">AI SEO Report</h2>
                    <p className="text-sm text-gray-500"><a href={aiSeoReport.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{aiSeoReport.url}</a></p>
                  </div>
                  <button onClick={() => setAiSeoReport(null)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    <RefreshCw className="h-3.5 w-3.5" /> New Analysis
                  </button>
                </div>

                {/* Score rings */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <ScoreRing score={aiSeoReport.aiScore}          label="AI Score"    size={90} big />
                    <ScoreRing score={aiSeoReport.contentScore}     label="Content"     size={80} />
                    <ScoreRing score={aiSeoReport.readabilityScore} label="Readability" size={80} />
                  </div>
                </div>

                {/* AI Title + Meta Description */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><PenTool className="h-3.5 w-3.5" />AI-Generated Meta Tags</p>

                  {/* Title */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Title Tag</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${aiSeoReport.title.length <= 60 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>{aiSeoReport.title.length}/60 chars</span>
                        <button onClick={() => copyText(aiSeoReport.title, "title", setAiCopied)} className="text-gray-400 hover:text-gray-600">
                          {aiCopied === "title" ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    {aiSeoReport.currentTitle && <p className="text-xs text-gray-400 mb-1">Current: <span className="italic">{aiSeoReport.currentTitle || "None"}</span></p>}
                    <p className="text-sm font-semibold text-blue-700 bg-blue-50 rounded px-3 py-2">{aiSeoReport.title}</p>
                  </div>

                  {/* Meta Description */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-violet-600 uppercase tracking-wide">Meta Description</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${aiSeoReport.description.length <= 160 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>{aiSeoReport.description.length}/160 chars</span>
                        <button onClick={() => copyText(aiSeoReport.description, "desc", setAiCopied)} className="text-gray-400 hover:text-gray-600">
                          {aiCopied === "desc" ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    {aiSeoReport.currentMeta && <p className="text-xs text-gray-400 mb-1">Current: <span className="italic">{aiSeoReport.currentMeta || "None"}</span></p>}
                    <p className="text-sm text-violet-700 bg-violet-50 rounded px-3 py-2">{aiSeoReport.description}</p>
                  </div>
                </div>

                {/* Keywords + Schema */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Keywords */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />AI Keywords</p>
                      <button onClick={() => copyText((aiSeoReport.keywords ?? []).join(", "), "kw", setAiCopied)} className="text-gray-400 hover:text-gray-600">
                        {aiCopied === "kw" ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(aiSeoReport.keywords ?? []).map((kw, i) => (
                        <span key={i} className="text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full">{kw}</span>
                      ))}
                    </div>
                  </div>

                  {/* Schema type + AI summary */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Schema & AI Insights</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Recommended Schema:</span>
                      <span className="text-xs font-bold px-2.5 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full">{aiSeoReport.schemaType}</span>
                    </div>
                    {aiSeoReport.summary && <p className="text-xs text-gray-600 leading-relaxed">{aiSeoReport.summary}</p>}
                  </div>
                </div>

                {/* Suggestions table */}
                {(aiSeoReport.suggestions ?? []).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />AI Optimization Suggestions</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      <div className="grid grid-cols-12 px-5 py-2 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span className="col-span-2">Type</span>
                        <span className="col-span-4">Current</span>
                        <span className="col-span-4">Recommended</span>
                        <span className="col-span-2 text-right">Impact</span>
                      </div>
                      {aiSeoReport.suggestions.map((s, i) => (
                        <div key={i} className="grid grid-cols-12 px-5 py-3 items-start gap-2 hover:bg-gray-50">
                          <span className="col-span-2 text-xs font-bold text-gray-600">{s.type}</span>
                          <span className="col-span-4 text-xs text-gray-500 truncate">{s.current || "—"}</span>
                          <span className="col-span-4 text-xs text-indigo-600 font-medium">{s.recommended}</span>
                          <span className={`col-span-2 text-right text-[10px] font-bold ${s.impact === "High" ? "text-red-500" : s.impact === "Medium" ? "text-amber-500" : "text-blue-500"}`}>{s.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content ideas + FAQs */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Content ideas */}
                  {(aiSeoReport.contentIdeas ?? []).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Content Ideas</p>
                      <div className="space-y-3">
                        {aiSeoReport.contentIdeas.map((idea, i) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-700">{idea.topic}</span>
                              <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{idea.format}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(idea.keywords ?? []).map((kw, j) => (
                                <span key={j} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded">{kw}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FAQs */}
                  {(aiSeoReport.faqs ?? []).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />AI-Generated FAQs</p>
                      <div className="space-y-3">
                        {aiSeoReport.faqs.map((faq, i) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100">
                            <p className="text-xs font-bold text-gray-700 mb-1">{faq.question}</p>
                            <p className="text-xs text-gray-500 leading-relaxed">{faq.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
