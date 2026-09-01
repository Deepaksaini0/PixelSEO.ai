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
  FileSpreadsheet, LayoutList, History, X, Trash2,
  ScanBarcode, KeyRound, Palette, ShieldCheck, Image,
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
interface HistoryEntry {
  id: string;          // unique key
  url: string;
  domain: string;
  score: number;
  pageCount: number;
  techScore?: number;
  onPageScore?: number;
  contentScore?: number;
  perfScore?: number;
  issueCount?: number;
  shareId?: string;
  timestamp: string;   // ISO
  source: "google" | "local" | "ai";
  localReport?: LocalSEOReport;
  aiSeoReport?: AISEOReport;
}

// ── localStorage history helpers ──────────────────────────────────────────────
const LS_KEY = "seo_audit_history";
function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function saveToHistory(entry: HistoryEntry) {
  const list = loadHistory();
  // deduplicate by id
  const filtered = list.filter(e => e.id !== entry.id);
  filtered.unshift(entry);
  localStorage.setItem(LS_KEY, JSON.stringify(filtered.slice(0, 50)));
}
function clearHistory() { localStorage.removeItem(LS_KEY); }

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

// ── Issue definitions lookup ────────────────────────────────────────────────────
const ISSUE_DEFINITIONS: { pattern: RegExp; definition: string }[] = [
  { pattern: /render.?blocking|script.*block/i,        definition: "Render-blocking resources delay the browser from displaying your page. Scripts and stylesheets loaded in the <head> without async/defer force the browser to pause rendering until they fully download and execute, directly hurting Core Web Vitals (LCP & FID)." },
  { pattern: /missing.*title|title.*missing|no title/i, definition: "The <title> tag is one of the most important on-page SEO elements. It tells search engines and users what your page is about, appears as the clickable headline in search results, and influences click-through rates." },
  { pattern: /title.*long|long.*title|title.*chars/i,   definition: "Google truncates title tags longer than ~60 characters in search results. Overly long titles get cut off with an ellipsis, reducing click-through rates and potentially diluting keyword relevance." },
  { pattern: /meta desc.*missing|missing.*meta desc/i,  definition: "The meta description is the short summary shown under your page title in search results. While not a direct ranking factor, a compelling meta description significantly improves click-through rates from Google." },
  { pattern: /meta desc.*long|long.*meta desc|meta desc.*chars/i, definition: "Google truncates meta descriptions longer than ~160 characters. Text beyond this limit won't appear in search results, wasting your opportunity to convince searchers to click through to your page." },
  { pattern: /missing.*h1|h1.*missing|no h1/i,          definition: "The H1 heading is the primary heading on your page. It signals to search engines the main topic of the page and helps establish content hierarchy. Missing H1s can confuse crawlers and weaken topical relevance." },
  { pattern: /multiple.*h1|h1.*multiple/i,              definition: "Having more than one H1 tag confuses search engines about which heading represents the main topic. Best practice is one H1 per page that clearly describes the primary content." },
  { pattern: /alt.*text|alt.*attr|image.*alt/i,         definition: "Alt text (alternative text) describes images for screen readers and search engines. Missing alt attributes mean Google cannot understand image content, missing out on image search traffic and harming accessibility." },
  { pattern: /page.*size|size.*kb|large.*page/i,        definition: "Large page sizes increase load time, especially on mobile connections. Search engines use page speed as a ranking signal. Pages over 500KB typically have significantly higher bounce rates than lighter pages." },
  { pattern: /https|ssl|http.*insecure/i,               definition: "HTTPS encrypts data between your server and visitors' browsers. Google uses HTTPS as a ranking signal since 2014. Non-HTTPS pages are flagged as 'Not Secure' in Chrome, causing users to leave before engaging." },
  { pattern: /canonical/i,                              definition: "Canonical tags tell search engines which version of a page is the 'master' copy when similar content exists at multiple URLs. Without them, search engines may split ranking signals between duplicates, diluting your authority." },
  { pattern: /robots\.txt/i,                            definition: "robots.txt instructs search engine crawlers which pages they can and cannot access. A missing or misconfigured robots.txt can result in important pages being blocked from indexing or low-value pages wasting crawl budget." },
  { pattern: /sitemap/i,                                definition: "An XML sitemap lists all important URLs on your site, helping search engines discover and index your content efficiently. Sites without sitemaps may have pages that take much longer to be found and indexed by Google." },
  { pattern: /structured.*data|schema|json.?ld/i,       definition: "Structured data (Schema markup) provides explicit context about your content to search engines. It enables rich results (star ratings, FAQs, breadcrumbs) in SERPs which significantly increase visibility and click-through rates." },
  { pattern: /slow.*load|load.*slow|page.*speed/i,      definition: "Page loading speed is a confirmed Google ranking factor for both desktop and mobile. Slow pages have higher bounce rates, lower conversion rates, and rank lower than faster equivalents with similar content quality." },
  { pattern: /duplicate.*content|content.*duplicate/i,  definition: "Duplicate content confuses search engines about which version to rank and can split link equity across multiple URLs. Google may exclude duplicated pages from its index entirely or show the wrong version in results." },
  { pattern: /open graph|og:|social/i,                  definition: "Open Graph meta tags control how your pages appear when shared on social media (Facebook, LinkedIn, Twitter/X). Without them, social platforms generate unpredictable previews — often with wrong images and titles — reducing share engagement." },
  { pattern: /viewport/i,                               definition: "The viewport meta tag instructs mobile browsers how to scale your page. Without it, mobile browsers render pages at desktop width and zoom them out, making text tiny and unreadable — directly hurting mobile UX and Google's mobile-first ranking." },
  { pattern: /word.*count|thin.*content|content.*thin/i, definition: "Thin content pages have very little substantive text. Google's Helpful Content systems devalue pages with insufficient depth. Pages under 300 words rarely rank well for competitive queries unless they serve a very specific, clear purpose." },
  { pattern: /author|eeat|expertise|trust/i,            definition: "Google's EEAT (Experience, Expertise, Authoritativeness, Trustworthiness) framework evaluates content quality signals. Missing author info, credentials, and trust signals can cause Google to rank your content lower, particularly for medical, financial, or legal topics." },
  { pattern: /internal.*link|link.*internal/i,          definition: "Internal links distribute PageRank (link equity) across your site and help search engines discover and understand your content hierarchy. Poor internal linking means important pages get less authority and may rank lower than they should." },
  { pattern: /broken.*link|link.*broken|404/i,          definition: "Broken links (leading to 404 errors) create a poor user experience and waste crawl budget. When search engines repeatedly encounter broken links, they may reduce crawl frequency and lower trust scores for your domain." },
  { pattern: /redirect/i,                               definition: "Redirect chains (A→B→C) slow down page loading and dilute link equity with each hop. Google recommends resolving to the final destination in a single redirect. Chains longer than 3 hops are often ignored by crawlers." },
  { pattern: /lcp|largest.*contentful/i,                definition: "Largest Contentful Paint (LCP) measures how long the largest visible element (image, heading, or block) takes to load. Google's Core Web Vitals threshold is under 2.5 seconds — pages exceeding this receive ranking penalties in mobile search." },
  { pattern: /cls|layout.*shift|cumulative/i,           definition: "Cumulative Layout Shift (CLS) measures visual instability — elements jumping around as the page loads. A CLS score above 0.1 indicates pages that frustrate users and are penalised by Google's Core Web Vitals algorithm." },
  { pattern: /inp|interaction.*paint/i,                 definition: "Interaction to Next Paint (INP) measures how quickly your page responds to user input (clicks, taps, key presses). Poor INP (above 200ms) signals slow JavaScript execution and is a Core Web Vitals ranking factor since March 2024." },
];

function getDefinition(issueText: string): string {
  const match = ISSUE_DEFINITIONS.find(d => d.pattern.test(issueText));
  return match?.definition || "This issue was identified during the SEO audit. Addressing it can improve your site's visibility in search results and overall technical health.";
}

// ── Issue accordion card ────────────────────────────────────────────────────────
function IssueCard({ issue, idx }: { issue: Issue; idx: number }) {
  const [open, setOpen] = useState(false);
  const definition = getDefinition(issue.issue);

  const sevConfig = issue.severity === "critical"
    ? { icon: <XCircle className="h-4 w-4 text-red-500 shrink-0" />, badge: "text-red-600 bg-red-50 border-red-200", label: "Critical" }
    : issue.severity === "warning"
      ? { icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />, badge: "text-amber-600 bg-amber-50 border-amber-200", label: "Warning" }
      : { icon: <Info className="h-4 w-4 text-blue-500 shrink-0" />, badge: "text-blue-600 bg-blue-50 border-blue-200", label: "Notice" };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
      className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header row */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors">
        {sevConfig.icon}
        <span className="flex-1 text-sm font-semibold text-gray-800 text-left">{issue.issue}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${sevConfig.badge}`}>{sevConfig.label}</span>
          <span className="text-[10px] text-gray-400 font-medium hidden sm:inline border border-gray-200 px-2 py-0.5 rounded-full bg-gray-50">{issue.category}</span>
          <div className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="border-t border-gray-100 divide-y divide-gray-100">

              {/* What this means */}
              <div className="px-4 py-3.5 bg-gray-50/60">
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Info className="h-3 w-3 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">What this means</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{definition}</p>
                  </div>
                </div>
              </div>

              {/* AI-Recommended Fix */}
              <div className="px-4 py-3.5 bg-indigo-50/50">
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide mb-1">AI-Recommended Fix</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{issue.fix}</p>
                  </div>
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

const NAV_TABS = [
  { id: "SEO",          icon: "🔍" },
  { id: "Ads",          icon: "📢" },
  { id: "Social",       icon: "📱" },
  { id: "Email",        icon: "📧" },
  { id: "CRM",          icon: "👥" },
  { id: "Reputation",   icon: "⭐" },
  { id: "Tasks",        icon: "✅" },
  { id: "Reports",      icon: "📊" },
  { id: "Integrations", icon: "🔌" },
];

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
  const [activeNavTab, setActiveNavTab] = useState("SEO");
  const [adsSubTab, setAdsSubTab] = useState("Google");
  const [showFreeTools, setShowFreeTools] = useState(false);

  // ── Ads platform connection state ──────────────────────────────────────────
  type AdsConn = { credentials: Record<string,string>; metrics: any; syncedAt: string };
  const [adsConnections, setAdsConnections] = useState<Record<string, AdsConn>>(() => {
    try { return JSON.parse(localStorage.getItem("ads_connections") || "{}"); } catch { return {}; }
  });
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [connectForm,  setConnectForm]  = useState<Record<string,string>>({});
  const [connectError, setConnectError] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [adsRefreshing, setAdsRefreshing]   = useState(false);

  const saveAdsConn = (platform: string, conn: AdsConn) => {
    const next = { ...adsConnections, [platform]: conn };
    setAdsConnections(next);
    localStorage.setItem("ads_connections", JSON.stringify(next));
  };
  const disconnectAds = (platform: string) => {
    const next = { ...adsConnections };
    delete next[platform];
    setAdsConnections(next);
    localStorage.setItem("ads_connections", JSON.stringify(next));
  };
  const refreshAdsMetrics = async (platform: string) => {
    const conn = adsConnections[platform];
    if (!conn) return;
    setAdsRefreshing(true);
    try {
      const r = await fetch("/api/ads/metrics", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ platform, credentials: conn.credentials }) });
      const d = await r.json();
      if (d.ok) saveAdsConn(platform, { ...conn, metrics: d.metrics, syncedAt: d.syncedAt });
      else toast({ title: "Refresh failed", description: d.error, variant: "destructive" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    setAdsRefreshing(false);
  };
  const handleAdsConnect = async () => {
    if (!connectModal) return;
    setConnectError(""); setConnectLoading(true);
    try {
      const r = await fetch("/api/ads/connect", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ platform: connectModal, credentials: connectForm }) });
      const d = await r.json();
      if (d.ok) {
        saveAdsConn(connectModal, { credentials: connectForm, metrics: d.metrics, syncedAt: d.syncedAt });
        setConnectModal(null); setConnectForm({});
        toast({ title: `${connectModal} connected!`, description: "Live metrics are now loaded." });
      } else { setConnectError(d.error || "Connection failed"); }
    } catch { setConnectError("Network error — please try again"); }
    setConnectLoading(false);
  };

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

  // ── History state ──
  const [showHistory,   setShowHistory]   = useState(false);
  const [historyList,   setHistoryList]   = useState<HistoryEntry[]>(() => loadHistory());
  const [historySearch, setHistorySearch] = useState("");

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
      // save to history
      const entry: HistoryEntry = {
        id: data.shareId, url: data.url, domain: data.domain,
        score: data.score, pageCount: data.pagesCrawled,
        techScore: data.techScore, onPageScore: data.onPageScore,
        contentScore: data.contentScore, perfScore: data.perfScore,
        issueCount: data.issues?.length, shareId: data.shareId,
        timestamp: data.timestamp, source: "google",
      };
      saveToHistory(entry);
      setHistoryList(loadHistory());
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
      const entry: HistoryEntry = {
        id: `local-${Date.now()}`, url: normalized, domain: new URL(normalized).hostname,
        score: data.overallScore, pageCount: 1, timestamp: new Date().toISOString(),
        source: "local", localReport: data,
      };
      saveToHistory(entry);
      setHistoryList(loadHistory());
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
      const entry: HistoryEntry = {
        id: `ai-${Date.now()}`, url: normalized, domain: new URL(normalized).hostname,
        score: data.aiScore, pageCount: 1, timestamp: new Date().toISOString(),
        source: "ai", aiSeoReport: data,
      };
      saveToHistory(entry);
      setHistoryList(loadHistory());
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

      {/* ── History Drawer ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <>
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setShowHistory(false)} />
            {/* Drawer */}
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">

              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-500" />
                  <span className="font-bold text-gray-800">Audit History</span>
                  {historyList.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{historyList.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {historyList.length > 0 && (
                    <button onClick={() => { clearHistory(); setHistoryList([]); }}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" /> Clear all
                    </button>
                  )}
                  <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Search */}
              {historyList.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                      placeholder="Search by domain or URL…"
                      className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100" />
                  </div>
                </div>
              )}

              {/* History list */}
              <div className="flex-1 overflow-y-auto">
                {historyList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <History className="h-7 w-7 text-gray-300" />
                    </div>
                    <p className="font-semibold text-gray-500">No audits yet</p>
                    <p className="text-xs text-gray-400 max-w-xs">Run a Google SEO, Local SEO, or AI SEO analysis — it will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {historyList
                      .filter(e => !historySearch || e.domain.includes(historySearch.toLowerCase()) || e.url.toLowerCase().includes(historySearch.toLowerCase()))
                      .map(entry => {
                        const scoreColor = entry.score >= 80 ? "text-green-600 bg-green-50 border-green-200" : entry.score >= 60 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200";
                        const sourceBadge = entry.source === "google" ? "bg-green-100 text-green-700" : entry.source === "local" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";
                        const sourceLabel = entry.source === "google" ? "Google SEO" : entry.source === "local" ? "Local SEO" : "AI SEO";
                        const fmtDate = (ts: string) => {
                          const d = new Date(ts);
                          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                        };
                        return (
                          <button key={entry.id} data-testid={`history-entry-${entry.id}`}
                            onClick={() => {
                              setShowHistory(false);
                              if (entry.source === "google") {
                                setSeoSubTab("google");
                                if (entry.shareId) {
                                  setLoading(true); setReport(null);
                                  fetch(`/api/seo/audit-report/${entry.shareId}`)
                                    .then(r => r.json())
                                    .then(data => { if (!data.error) { setReport(data); setActiveTab("pages"); const u = new URL(window.location.href); u.searchParams.set("id", entry.shareId!); window.history.replaceState({}, "", u.toString()); } else toast({ title: "This report has expired. Please run a new audit.", variant: "destructive" }); })
                                    .catch(() => toast({ title: "Could not load report", variant: "destructive" }))
                                    .finally(() => setLoading(false));
                                }
                              } else if (entry.source === "local" && entry.localReport) {
                                setSeoSubTab("local");
                                setLocalReport(entry.localReport);
                              } else if (entry.source === "ai" && entry.aiSeoReport) {
                                setSeoSubTab("ai");
                                setAiSeoReport(entry.aiSeoReport);
                              }
                            }}
                            className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-start gap-3">
                              {/* Score badge */}
                              <div className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center font-black text-sm ${scoreColor}`}>
                                {entry.score}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className="font-semibold text-sm text-gray-800 truncate">{entry.domain}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sourceBadge}`}>{sourceLabel}</span>
                                </div>
                                <p className="text-xs text-gray-400 truncate mb-1">{entry.url}</p>
                                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                  <span><Clock className="h-3 w-3 inline mr-0.5" />{fmtDate(entry.timestamp)}</span>
                                  {entry.pageCount > 1 && <span>{entry.pageCount} pages</span>}
                                  {entry.issueCount !== undefined && <span className="text-red-400">{entry.issueCount} issues</span>}
                                </div>
                                {/* Mini score bars for Google audits */}
                                {entry.source === "google" && entry.techScore !== undefined && (
                                  <div className="grid grid-cols-4 gap-1 mt-2">
                                    {[
                                      { l: "Tech", v: entry.techScore },
                                      { l: "On-Page", v: entry.onPageScore ?? 0 },
                                      { l: "Content", v: entry.contentScore ?? 0 },
                                      { l: "Perf", v: entry.perfScore ?? 0 },
                                    ].map(({ l, v }) => (
                                      <div key={l} className="text-center">
                                        <div className="text-[9px] text-gray-400 mb-0.5">{l}</div>
                                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${v >= 80 ? "bg-green-400" : v >= 60 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${v}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1 transition-colors" />
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400 text-center">Last 50 audits stored locally · Google SEO reports expire after 24h</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
            <button onClick={() => setShowHistory(true)}
              className="relative flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg px-2.5 py-1.5 transition-colors border border-gray-200"
              data-testid="button-history">
              <History className="h-3.5 w-3.5 text-indigo-500" /> History
              {historyList.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {historyList.length}
                </span>
              )}
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><Bell className="h-4 w-4 text-gray-500" /></button>
            <div className="relative">
              <button
                onClick={() => setShowFreeTools((open) => !open)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg px-2.5 py-1.5 transition-colors border border-gray-200"
                aria-expanded={showFreeTools}
                aria-haspopup="menu"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Free Tools <ChevronDown className={`h-3 w-3 transition-transform ${showFreeTools ? "rotate-180" : ""}`} />
              </button>
              {showFreeTools && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl z-50" role="menu">
                  {[
                    { href: "/watermark-remover", label: "Watermark Remover", icon: Eraser, color: "text-rose-600 bg-rose-50" },
                    { href: "/barcode-generator", label: "Barcode Generator", icon: ScanBarcode, color: "text-amber-600 bg-amber-50" },
                    { href: "/password-generator", label: "Password Generator", icon: KeyRound, color: "text-blue-600 bg-blue-50" },
                    { href: "/colors-from-image", label: "Colors from Image", icon: Palette, color: "text-pink-600 bg-pink-50" },
                    { href: "/pdf-security", label: "PDF Security", icon: ShieldCheck, color: "text-green-600 bg-green-50" },
                  ].map(({ href, label, icon: Icon, color }) => (
                    <Link key={href} href={href} onClick={() => setShowFreeTools(false)}>
                      <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                        <span className={`h-7 w-7 rounded-md flex items-center justify-center ${color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {label}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold select-none">DK</div>
          </div>
        </div>
        {/* Main tab row */}
        <div className="flex items-center gap-0 px-2 overflow-x-auto scrollbar-none">
          {NAV_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveNavTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeNavTab === tab.id ? "border-green-500 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"}`}>
              <span className="text-sm">{tab.icon}</span>
              {tab.id}
            </button>
          ))}
        </div>
      </header>

      {/* ── SEO sub-tabs (only when SEO tab active) ──────────────────────────── */}
      {activeNavTab === "SEO" && (
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
      )}

      {/* ── Content area ─────────────────────────────────────────────────────── */}
      {activeNavTab === "SEO" && <div className="max-w-7xl mx-auto px-4 py-6">

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

        {/* ── More Free Tools (always visible) ─────────────────────────────── */}
        {seoSubTab === "google" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              More Free Tools
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { href: "/barcode-generator", icon: ScanBarcode, label: "Barcode Generator", color: "text-amber-600 bg-amber-50 border-amber-200" },
                { href: "/password-generator", icon: KeyRound, label: "Password Generator", color: "text-blue-600 bg-blue-50 border-blue-200" },
                { href: "/colors-from-image", icon: Palette, label: "Colors from Image", color: "text-pink-600 bg-pink-50 border-pink-200" },
                { href: "/pdf-security", icon: ShieldCheck, label: "PDF Security", color: "text-green-600 bg-green-50 border-green-200" },
                { href: "/", icon: Image, label: "Image Converter", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
                { href: "/web-tools", icon: Zap, label: "Web Tools", color: "text-violet-600 bg-violet-50 border-violet-200" },
              ].map(({ href, icon: Icon, label, color }) => (
                <Link key={href} href={href}>
                  <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${color}`}>
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-semibold">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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

      </div>}

      {/* ── Ads Tab ───────────────────────────────────────────────────────────── */}
      {activeNavTab === "Ads" && (() => {
        /* ── Sparkline bar chart helper ── */
        const Spark = ({ bars, color }: { bars: number[]; color: string }) => (
          <div className="flex items-end gap-[2px] h-7 mt-2">
            {bars.map((h, i) => (
              <div key={i} style={{ height: `${h}%`, backgroundColor: color, borderRadius: 2, width: 10 }} />
            ))}
          </div>
        );

        /* ── No audit yet — prompt ── */
        if (!report) return (
          <div className="bg-[#f5f6f8]">
            <div className="border-b border-gray-200 bg-white px-6">
              <div className="flex gap-1">
                {["Google","LSA","LinkedIn","Meta","Meta Leads"].map((tab, idx) => {
                  const dotColors = ["bg-blue-500","bg-green-500","bg-blue-700","bg-blue-600","bg-blue-400"];
                  return (
                    <button key={tab} onClick={() => setAdsSubTab(tab)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${adsSubTab === tab ? "border-blue-500 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      <span className={`h-2 w-2 rounded-full ${dotColors[idx]}`} />
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-lg font-black text-gray-800 mb-2">Run a Google SEO Audit First</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  Your Ads Intelligence dashboard is populated from your website audit data — Quality Scores, landing page analysis, ad-blocking issues, and estimated traffic are all derived from the crawl.
                </p>
                <button
                  onClick={() => { setActiveNavTab("SEO"); setSeoSubTab("google"); }}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  Go to Google SEO Audit
                </button>
              </div>
            </div>
          </div>
        );

        /* ── Derive all metrics from the audit report ── */
        const seoScore   = report.score;
        const techScore  = report.techScore ?? report.score;
        const pages      = report.pages ?? [];
        const issues     = report.issues ?? [];
        const crawled    = report.pagesCrawled ?? pages.length;
        const auditDate  = report.crawledAt ? new Date(report.crawledAt) : new Date();

        // Quality Score: derived from SEO + tech score (1–10 scale)
        const qualityScore = Math.max(1, Math.min(10, Math.round((seoScore * 0.5 + techScore * 0.5) / 10)));
        const qsColor = qualityScore >= 7 ? "text-green-600" : qualityScore >= 4 ? "text-amber-600" : "text-red-500";
        const qsNote  = qualityScore >= 7 ? "Above Average" : qualityScore >= 4 ? "Needs Work" : "Poor";

        // Estimated impressions from pages crawled × avg monthly searches per page
        const estImpressions = crawled * 820;
        const ctrRate = seoScore >= 80 ? 0.042 : seoScore >= 60 ? 0.031 : 0.019;
        const estClicks      = Math.round(estImpressions * ctrRate);
        const ctrPct         = (ctrRate * 100).toFixed(2) + "%";

        // Platform-specific multipliers (each channel gets different traffic share)
        const platformMulti: Record<string, { imprMult:number; clickMult:number; convRate:number; cpc:number; label:string }> = {
          Google:       { imprMult:1.00, clickMult:1.00, convRate:0.029, cpc:0.60,  label:"Google Search, Display & Shopping" },
          LSA:          { imprMult:0.55, clickMult:0.42, convRate:0.034, cpc:0.58,  label:"Google Local Services Ads" },
          LinkedIn:     { imprMult:1.07, clickMult:0.28, convRate:0.012, cpc:1.52,  label:"LinkedIn Sponsored Content & Text Ads" },
          Meta:         { imprMult:0.68, clickMult:0.79, convRate:0.053, cpc:0.47,  label:"Facebook & Instagram Ads" },
          "Meta Leads": { imprMult:0.61, clickMult:0.56, convRate:0.042, cpc:0.46,  label:"Facebook & Instagram Lead Generation" },
        };
        const pm = platformMulti[adsSubTab] ?? platformMulti["Google"];
        const pImpr   = Math.round(estImpressions * pm.imprMult);
        const pClicks = Math.round(estClicks * pm.clickMult);
        const pConvs  = Math.round(pClicks * pm.convRate);
        const pCPC    = pm.cpc;
        const pSpend  = (pClicks * pCPC).toFixed(0);
        const pRevenue = (pConvs * 49.31).toFixed(0);
        const pROAS    = pSpend > "0" ? (parseFloat(pRevenue) / parseFloat(pSpend)).toFixed(2) : "0";
        const pCTR     = pImpr > 0 ? ((pClicks / pImpr) * 100).toFixed(2) + "%" : "0%";
        const pCPA     = pConvs > 0 ? "US$" + (parseFloat(pSpend) / pConvs).toFixed(2) : "—";
        const activeCampaigns = Math.max(1, Math.round(crawled / 5));

        // Issue-derived ad intel
        const adIssues = issues.filter(i =>
          /speed|slow|lcp|cls|mobile|viewport|https|ssl|title|h1|meta desc|image.*alt|scripts|render.?block/i.test(i.issue)
        ).slice(0, 8);

        // Best landing pages = pages with most content & valid title
        const bestPages = [...pages]
          .filter(p => p.title && p.wordCount && p.wordCount > 100)
          .sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0))
          .slice(0, 6);

        // Sparkline seed from SEO score (realistic variation)
        const seedBars = (base: number) =>
          Array.from({ length: 14 }, (_, i) => Math.max(10, Math.min(95, base + ((i * 7 + 11) % 31) - 15)));

        const trendMonths = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun","Mon","Tue","Wed","Thu","Fri","Sat","Sun"].slice(0,8);
        const trendSpend  = Array.from({length:8},(_,i) => Math.max(20, Math.min(95, 50 + ((i*13+seoScore)%35)-17)));
        const trendConv   = Array.from({length:8},(_,i) => Math.max(15, Math.min(90, 45 + ((i*11+techScore)%30)-15)));
        const maxTrend    = Math.max(...trendSpend, ...trendConv);

        const platformIcons: Record<string, React.ReactNode> = {
          Google: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
          LSA: <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center text-white text-xs font-black">LSA</div>,
          LinkedIn: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#0077B5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
          Meta: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
          "Meta Leads": <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[10px] font-black leading-tight text-center">Meta<br/>Leads</div>,
        };

        return (
          <div className="bg-[#f5f6f8]">
            {/* Sub-tabs */}
            <div className="border-b border-gray-200 bg-white px-6">
              <div className="flex gap-1 overflow-x-auto">
                {["Google","LSA","LinkedIn","Meta","Meta Leads"].map((tab, idx) => {
                  const dotColors = ["bg-blue-500","bg-green-500","bg-blue-700","bg-blue-600","bg-blue-400"];
                  return (
                    <button key={tab} onClick={() => setAdsSubTab(tab)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${adsSubTab === tab ? "border-blue-500 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${dotColors[idx]}`} />
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-5">
              {/* Dashboard header */}
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {platformIcons[adsSubTab]}
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{adsSubTab} Ads Intelligence — <span className="text-blue-600">{report.domain}</span></h2>
                    <p className="text-xs text-gray-400">{pm.label} <span className="text-gray-300 mx-1">·</span> Based on audit of {crawled} pages · {auditDate.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {adsConnections[adsSubTab] ? (
                    <>
                      <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1.5 rounded-lg">
                        🔗 Live data · Last 30 days
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Synced {new Date(adsConnections[adsSubTab].syncedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
                      </span>
                      <button
                        onClick={() => refreshAdsMetrics(adsSubTab)}
                        disabled={adsRefreshing}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-blue-50 transition-colors disabled:opacity-50"
                        title="Refresh metrics"
                      >
                        <svg className={`h-3 w-3 ${adsRefreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {adsRefreshing ? "Refreshing…" : "Refresh"}
                      </button>
                      <button
                        onClick={() => disconnectAds(adsSubTab)}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-red-50 transition-colors"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 bg-gray-50">
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Estimated · Last 30 days
                      </span>
                      <button
                        onClick={() => { setConnectModal(adsSubTab); setConnectForm({}); setConnectError(""); }}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        Connect {adsSubTab} Ads
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── Connect Ads Modal ──────────────────────────────────────────── */}
              {connectModal && (() => {
                const isGoogle = connectModal === "Google" || connectModal === "LSA";
                const isMeta   = connectModal === "Meta" || connectModal === "Meta Leads";
                const isLI     = connectModal === "LinkedIn";
                const fields: { key: string; label: string; placeholder: string; type?: string }[] = isGoogle ? [
                  { key: "customerId",    label: "Customer ID",      placeholder: "123-456-7890" },
                  { key: "developerToken",label: "Developer Token",  placeholder: "Your Google Ads developer token", type: "password" },
                  { key: "accessToken",   label: "Access Token",     placeholder: "OAuth2 access token", type: "password" },
                ] : (isMeta ? [
                  { key: "adAccountId",  label: "Ad Account ID",    placeholder: "act_123456789 or 123456789" },
                  { key: "accessToken",  label: "Access Token",     placeholder: "Meta Graph API access token", type: "password" },
                ] : [
                  { key: "adAccountId",  label: "Ad Account ID",    placeholder: "LinkedIn sponsored account ID" },
                  { key: "accessToken",  label: "Access Token",     placeholder: "LinkedIn OAuth2 access token", type: "password" },
                ]);
                return (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setConnectModal(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                      {/* Modal header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">Connect {connectModal} Ads</h3>
                            <p className="text-xs text-gray-400">Pull live metrics into your dashboard</p>
                          </div>
                        </div>
                        <button onClick={() => setConnectModal(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {/* Modal body */}
                      <div className="px-6 py-5 space-y-4">
                        {fields.map(f => (
                          <div key={f.key} className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700">{f.label}</label>
                            <input
                              type={f.type || "text"}
                              placeholder={f.placeholder}
                              value={connectForm[f.key] || ""}
                              onChange={e => setConnectForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-300 font-mono"
                            />
                          </div>
                        ))}
                        {connectError && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                            <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-xs text-red-700">{connectError}</p>
                          </div>
                        )}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                          <p className="text-xs text-amber-700">
                            <span className="font-semibold">Credentials are stored locally</span> in your browser only — never sent to our servers except during the live API call.
                          </p>
                        </div>
                      </div>
                      {/* Modal footer */}
                      <div className="px-6 pb-5 flex gap-2">
                        <button
                          onClick={() => setConnectModal(null)}
                          className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAdsConnect}
                          disabled={connectLoading || fields.some(f => !connectForm[f.key]?.trim())}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          {connectLoading ? (
                            <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Connecting…</>
                          ) : "Connect & Load Data"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Top 6 metric cards — live data when connected */}
              {(() => {
                const live = adsConnections[adsSubTab]?.metrics;
                const isLive = !!live;
                const row1 = [
                  { label: isLive ? "Impressions"   : "Est. Impressions",  val: isLive ? parseInt(live.impressions).toLocaleString()  : pImpr.toLocaleString(),    note: isLive ? "Live · 30 days"            : `${crawled} pages crawled`,  bars: seedBars(55), color: "#818cf8" },
                  { label: isLive ? "Clicks"         : "Est. Clicks",        val: isLive ? parseInt(live.clicks).toLocaleString()       : pClicks.toLocaleString(),   note: isLive ? `CTR ${live.ctr}%`          : `CTR ${pCTR}`,               bars: seedBars(45), color: "#34d399" },
                  { label: isLive ? "Conv. Rate"     : "Est. Conv. Rate",    val: isLive ? live.convRate + "%"                          : (pm.convRate * 100).toFixed(2) + "%", note: isLive ? `${parseInt(live.conversions).toLocaleString()} convs` : `${pConvs.toLocaleString()} convs`, bars: seedBars(40), color: "#6ee7b7" },
                  { label: "Quality Score",           val: qualityScore + "/10", note: qsNote,                                          bars: seedBars(qualityScore * 8), color: "#fb923c" },
                  { label: isLive ? "ROAS"            : "ROAS Potential",    val: isLive ? live.roas + "x"                              : pROAS + "x",               note: isLive ? (parseFloat(live.roas) >= 2 ? "Profitable" : "Review") : (parseFloat(pROAS) >= 2 ? "Profitable" : "Review"), bars: seedBars(50), color: "#c084fc" },
                  { label: isLive ? "Active Campaigns": "Pages for Ads",     val: isLive ? String(live.activeCampaigns || "-")           : String(activeCampaigns),  note: isLive ? "Live campaigns"            : `of ${crawled} crawled`,     bars: seedBars(70), color: "#fbbf24" },
                ];
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                    {row1.map(m => (
                      <div key={m.label} className={`rounded-xl border px-4 py-3 ${isLive ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"}`}>
                        <p className="text-[11px] text-gray-500 font-medium">{m.label}</p>
                        <p className="text-xl font-black text-gray-900 mt-0.5 leading-tight">{m.val}</p>
                        {m.note && <p className="text-[10px] text-gray-400 mt-0.5">{m.note}</p>}
                        <Spark bars={m.bars} color={m.color} />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Second row: 5 metric cards */}
              {(() => {
                const live = adsConnections[adsSubTab]?.metrics;
                const isLive = !!live;
                const row2 = [
                  { label: "SEO Score",             val: seoScore + "/100",                        color: seoScore >= 80 ? "#22c55e" : seoScore >= 60 ? "#f59e0b" : "#ef4444", bars: seedBars(seoScore),  bold: false },
                  { label: "Tech Score",             val: techScore + "/100",                       color: "#6366f1",  bars: seedBars(techScore), bold: false },
                  { label: isLive ? "CTR"          : "Est. CTR",   val: isLive ? live.ctr + "%"   : pCTR,            color: "#3b82f6",  bars: seedBars(35), bold: true  },
                  { label: isLive ? "Avg CPC"      : "Est. Avg CPC", val: isLive ? "US$" + parseFloat(live.cpc).toFixed(2) : "US$" + pCPC.toFixed(2), color: "#f59e0b", bars: seedBars(60), bold: false },
                  { label: isLive ? "CPA"          : "Est. CPA",   val: isLive ? "US$" + parseFloat(live.cpa).toFixed(2) : pCPA,            color: "#a78bfa",  bars: seedBars(45), bold: false },
                ];
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                    {row2.map(m => (
                      <div key={m.label} className={`rounded-xl border px-4 py-3 ${isLive && ["CTR","Avg CPC","CPA"].includes(m.label) ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"}`}>
                        <p className="text-[11px] text-gray-500 font-medium">{m.label}</p>
                        <p className={`text-xl font-black mt-0.5 leading-tight ${m.bold ? "text-blue-500" : "text-gray-900"}`}>{m.val}</p>
                        <Spark bars={m.bars} color={m.color} />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Conversion Funnel */}
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-3">
                <h3 className="text-sm font-bold text-gray-800 mb-1">Conversion Funnel <span className="text-xs font-normal text-gray-400 ml-1">— estimated from {report.domain} audit</span></h3>
                <p className="text-xs text-gray-400 mb-4">Based on {crawled} pages crawled · SEO score {seoScore}/100</p>
                <div className="space-y-4">
                  {(() => {
                    const funnelData = [
                      { label: "Impressions", val: pImpr, fmt: pImpr.toLocaleString(), color: "#3b82f6" },
                      { label: "Clicks",      val: pClicks, fmt: pClicks.toLocaleString(), color: "#22c55e" },
                      { label: "Conversions", val: pConvs, fmt: pConvs.toLocaleString(), color: "#10b981" },
                      { label: "Revenue",     val: parseFloat(pRevenue), fmt: "US$" + parseInt(pRevenue).toLocaleString(), color: "#6366f1" },
                    ];
                    return funnelData.map((f, idx) => {
                      const widthPct = idx === 0 ? 100 : Math.max(2, Math.round((f.val / pImpr) * 100));
                      const dropPct  = idx > 0 ? "-" + (100 - Math.round((f.val / (funnelData[idx-1].val || 1)) * 100)) + "%" : "";
                      return (
                        <div key={f.label}>
                          <div className="flex items-center gap-6 mb-1.5">
                            <span className="text-xs text-gray-500 w-24">{f.label}</span>
                            <span className="text-sm font-bold text-gray-900">{f.fmt}</span>
                            {dropPct && <span className="text-xs text-red-500 font-medium">{dropPct}</span>}
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${widthPct}%`, backgroundColor: f.color }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* 2-col: Best Landing Pages + Ad-Blocking Issues */}
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                {/* Best landing pages from crawl */}
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">🏆 Best Landing Pages for Ads</h3>
                  {bestPages.length > 0 ? (
                    <div className="space-y-2.5">
                      {bestPages.map((p, i) => {
                        const qs = Math.max(1, Math.min(10, Math.round((qualityScore * 0.7) + (Math.min(p.wordCount || 0, 1000) / 200))));
                        return (
                          <div key={p.url} className="flex items-start gap-2.5">
                            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-700 truncate">{p.title || p.url}</p>
                              <p className="text-[10px] text-gray-400 truncate">{p.url}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-gray-400">{(p.wordCount||0).toLocaleString()} words</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${qs >= 7 ? "bg-green-50 text-green-700" : qs >= 4 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>QS {qs}/10</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No page data available. Make sure your audit crawled multiple pages.</p>
                  )}
                </div>

                {/* Issues hurting ad performance */}
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">⚠️ Issues Hurting Ad Performance</h3>
                  {adIssues.length > 0 ? (
                    <div className="space-y-2.5">
                      {adIssues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${issue.severity === "critical" ? "bg-red-50 text-red-600" : issue.severity === "warning" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"}`}>
                            {issue.severity === "critical" ? "Crit" : issue.severity === "warning" ? "Warn" : "Info"}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-gray-700">{issue.issue}</p>
                            <p className="text-[10px] text-gray-400 leading-snug">{issue.fix}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-4">
                      <span className="text-green-500 text-xl">✓</span>
                      <p className="text-sm text-green-700 font-medium">No critical ad-blocking issues found!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Spend & Conversions Trend */}
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <h3 className="text-sm font-bold text-gray-800 mb-1">Estimated Spend & Conversions Trend</h3>
                <p className="text-xs text-gray-400 mb-4">Projected 8-day performance based on audit score of {seoScore}/100</p>
                <div className="flex items-end gap-1.5" style={{height:120}}>
                  {trendMonths.map((month, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex gap-0.5 items-end" style={{ height: 100 }}>
                        <div className="flex-1 rounded-sm" style={{ height: `${(trendSpend[i] / maxTrend) * 100}%`, backgroundColor: "#818cf8" }} />
                        <div className="flex-1 rounded-sm" style={{ height: `${(trendConv[i] / maxTrend) * 100}%`, backgroundColor: "#34d399" }} />
                      </div>
                      <span className="text-[9px] text-gray-400 whitespace-nowrap">{month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#818cf8]" /><span className="text-xs text-gray-500">Est. Spend</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#34d399]" /><span className="text-xs text-gray-500">Est. Conversions</span></div>
                  <span className="text-[10px] text-gray-300 ml-auto">Estimates based on audit data · connect Google Ads for live data</span>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Social Tab ───────────────────────────────────────────────────────── */}
      {activeNavTab === "Social" && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-800">Social Media Presence</h2>
            <p className="text-sm text-gray-500 mt-1">Check your social signals, Open Graph tags, and platform presence for better shareability.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { platform: "Facebook",  icon: "🔵", handle: "@yourbrand", followers: "—",  status: "Verify" },
              { platform: "Instagram", icon: "🟣", handle: "@yourbrand", followers: "—",  status: "Verify" },
              { platform: "LinkedIn",  icon: "🔷", handle: "Company Page",followers: "—",  status: "Verify" },
              { platform: "X / Twitter",icon: "⬛", handle: "@yourbrand", followers: "—", status: "Verify" },
            ].map(p => (
              <div key={p.platform} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl mb-1">{p.icon}</div>
                <p className="text-sm font-bold text-gray-800">{p.platform}</p>
                <p className="text-xs text-gray-400 mb-2">{p.handle}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{p.status}</span>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-sm text-gray-800 mb-3">🔗 Open Graph Signals</h3>
              <div className="space-y-2.5">
                {[
                  { tag: "og:title",       status: report ? "Present" : "Unknown", ok: !!report },
                  { tag: "og:description", status: report ? "Present" : "Unknown", ok: !!report },
                  { tag: "og:image",       status: "Needs check",                  ok: false },
                  { tag: "og:url",         status: "Needs check",                  ok: false },
                  { tag: "twitter:card",   status: "Needs check",                  ok: false },
                  { tag: "twitter:image",  status: "Needs check",                  ok: false },
                ].map(t => (
                  <div key={t.tag} className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-600">{t.tag}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-sm text-gray-800 mb-3">📅 Content Calendar Ideas</h3>
              <div className="space-y-2">
                {[
                  { day: "Mon", idea: "Share a client success story or case study" },
                  { day: "Tue", idea: "Educational tip related to your niche" },
                  { day: "Wed", idea: "Behind-the-scenes team or process photo" },
                  { day: "Thu", idea: "Curated industry news or trend commentary" },
                  { day: "Fri", idea: "Promotional post with soft CTA" },
                  { day: "Sat", idea: "User-generated content or testimonial" },
                ].map(c => (
                  <div key={c.day} className="flex gap-3 items-start">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5 w-8 text-center shrink-0">{c.day}</span>
                    <span className="text-xs text-gray-600">{c.idea}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-5">
            <h3 className="font-bold text-sm text-violet-800 mb-2">💡 Social SEO Tips</h3>
            <ul className="text-sm text-violet-700 space-y-1.5 list-disc list-inside">
              <li>Run your site URL through Google's Rich Results Test to preview social cards</li>
              <li>Always include an og:image of at least 1200×630px for best display</li>
              <li>Consistent NAP (name, address, phone) across all social profiles helps Local SEO</li>
              <li>Social signals (shares, mentions) indirectly influence domain authority</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Email Tab ────────────────────────────────────────────────────────── */}
      {activeNavTab === "Email" && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-800">Email Marketing</h2>
            <p className="text-sm text-gray-500 mt-1">Email deliverability health, DNS authentication records, and list-building tips.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "SPF Record",    val: "Check DNS", status: "warning", desc: "Prevent spoofing — add v=spf1 include:... ~all to DNS" },
              { label: "DKIM Record",   val: "Check DNS", status: "warning", desc: "Email signing — required by Gmail & Yahoo for bulk senders" },
              { label: "DMARC Policy",  val: "Check DNS", status: "warning", desc: "Prevents phishing — add _dmarc TXT record to your domain" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-amber-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500">{s.label}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Verify</span>
                </div>
                <p className="text-lg font-black text-amber-600 mb-1">{s.val}</p>
                <p className="text-xs text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-sm text-gray-800 mb-3">📋 Email Capture Checklist</h3>
              <div className="space-y-2.5">
                {[
                  { item: "Email signup form above the fold",     done: false },
                  { item: "Lead magnet (ebook, checklist, tool)", done: false },
                  { item: "Exit-intent popup configured",         done: false },
                  { item: "Double opt-in confirmation enabled",   done: true  },
                  { item: "Unsubscribe link in every email",      done: true  },
                  { item: "GDPR consent checkbox present",        done: false },
                  { item: "Welcome email sequence set up",        done: false },
                  { item: "Email list segmented by interest",     done: false },
                ].map(c => (
                  <div key={c.item} className="flex items-center gap-2.5">
                    <span className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${c.done ? "bg-green-500" : "bg-gray-200"}`}>
                      {c.done && <span className="text-white text-[8px] font-bold">✓</span>}
                    </span>
                    <span className={`text-sm ${c.done ? "text-gray-700" : "text-gray-400"}`}>{c.item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-sm text-gray-800 mb-3">📧 Email Sequence Blueprint</h3>
              <div className="space-y-3">
                {[
                  { day: "Day 0",  subject: "Welcome — here's what to expect",           type: "Welcome" },
                  { day: "Day 2",  subject: "Your free resource / first value delivery",  type: "Value" },
                  { day: "Day 5",  subject: "Common mistake your audience makes",         type: "Education" },
                  { day: "Day 8",  subject: "Case study — how we helped [Client]",        type: "Social Proof" },
                  { day: "Day 12", subject: "Limited offer / main CTA",                   type: "Promo" },
                  { day: "Day 15", subject: "FAQ — answering your top questions",         type: "Nurture" },
                ].map(e => (
                  <div key={e.day} className="flex gap-3 items-start border-b border-gray-50 pb-2 last:border-0">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5 shrink-0 w-12 text-center">{e.day}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{e.subject}</p>
                      <span className="text-[10px] text-gray-400">{e.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CRM Tab ──────────────────────────────────────────────────────────── */}
      {activeNavTab === "CRM" && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-800">CRM & Lead Management</h2>
            <p className="text-sm text-gray-500 mt-1">Track, qualify and convert leads from your SEO traffic into customers.</p>
          </div>
          <div className="grid sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Monthly Visitors",  val: "—",   icon: "👥", color: "text-blue-600",   bg: "bg-blue-50" },
              { label: "Est. Leads (2%)",   val: "—",   icon: "📥", color: "text-green-600",  bg: "bg-green-50" },
              { label: "Avg. Close Rate",   val: "~12%",icon: "🤝", color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Revenue Potential", val: "—",   icon: "💰", color: "text-amber-600",  bg: "bg-amber-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl border border-gray-200 p-5`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-sm text-gray-800 mb-3">🎯 Lead Capture Improvements</h3>
              <div className="space-y-3">
                {[
                  { action: "Add live chat widget to capture warm leads instantly",       impact: "High" },
                  { action: "Create a free tool or quiz as a lead magnet",                impact: "High" },
                  { action: "Add contact form to every service/blog page",                impact: "Medium" },
                  { action: "Set up retargeting pixel (Google/Meta) for returning visitors", impact: "High" },
                  { action: "A/B test CTA button colour and copy",                        impact: "Medium" },
                  { action: "Add social proof near every CTA (reviews, logos)",           impact: "Medium" },
                ].map(a => (
                  <div key={a.action} className="flex gap-3 items-start">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${a.impact === "High" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{a.impact}</span>
                    <span className="text-xs text-gray-600">{a.action}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-sm text-gray-800 mb-3">🔗 Recommended CRM Integrations</h3>
              <div className="space-y-3">
                {[
                  { name: "HubSpot CRM",      desc: "Free CRM with email, pipeline & contact management",   badge: "Free" },
                  { name: "Zoho CRM",          desc: "Affordable full-featured CRM with automation",          badge: "Freemium" },
                  { name: "Pipedrive",         desc: "Sales-focused pipeline CRM, great for agencies",        badge: "Paid" },
                  { name: "Google Contacts",   desc: "Simple contacts sync for small teams",                  badge: "Free" },
                  { name: "Notion CRM",        desc: "Flexible database-style CRM for solo operators",        badge: "Free" },
                ].map(c => (
                  <div key={c.name} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-700">{c.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.badge === "Free" ? "bg-green-50 text-green-700" : c.badge === "Freemium" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{c.badge}</span>
                      </div>
                      <p className="text-[11px] text-gray-400">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reputation Tab ───────────────────────────────────────────────────── */}
      {activeNavTab === "Reputation" && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-800">Online Reputation</h2>
            <p className="text-sm text-gray-500 mt-1">Monitor reviews, respond to feedback, and build trust signals across the web.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { platform: "Google Reviews",    rating: "—", count: "—", icon: "🔍", color: "text-blue-600",  tip: "Run Google My Business audit in Local SEO tab" },
              { platform: "Trustpilot",        rating: "—", count: "—", icon: "⭐", color: "text-green-600", tip: "Claim your free Trustpilot company profile" },
              { platform: "Facebook Reviews",  rating: "—", count: "—", icon: "🔵", color: "text-blue-500",  tip: "Enable Facebook reviews on your business page" },
            ].map(r => (
              <div key={r.platform} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{r.icon}</span>
                  <p className="text-sm font-bold text-gray-700">{r.platform}</p>
                </div>
                <p className={`text-2xl font-black ${r.color} mb-1`}>{r.rating} <span className="text-base font-normal text-gray-400">/ 5.0</span></p>
                <p className="text-xs text-gray-400 mb-2">{r.count} reviews</p>
                <p className="text-xs text-gray-400 italic">{r.tip}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-sm text-gray-800 mb-3">⭐ Review Generation Strategy</h3>
              <div className="space-y-3">
                {[
                  { step: "1", action: "Send review request email 3 days after service delivery" },
                  { step: "2", action: "Add Google Review QR code to invoices and receipts" },
                  { step: "3", action: "Include review link in email signature" },
                  { step: "4", action: "Train team to ask verbally at end of every interaction" },
                  { step: "5", action: "Respond to every review within 24 hours (positive & negative)" },
                  { step: "6", action: "Display best reviews prominently on homepage with schema markup" },
                ].map(s => (
                  <div key={s.step} className="flex gap-3 items-start">
                    <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center shrink-0">{s.step}</span>
                    <span className="text-xs text-gray-600">{s.action}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-sm text-gray-800 mb-3">🛡️ Review Schema Checklist</h3>
              <div className="space-y-2.5">
                {[
                  { item: "AggregateRating schema on homepage",         done: false },
                  { item: "Review schema on product/service pages",     done: false },
                  { item: "FAQ schema for common questions",            done: false },
                  { item: "LocalBusiness schema with address",          done: false },
                  { item: "Google My Business profile claimed",         done: false },
                  { item: "Negative review response plan in place",     done: false },
                  { item: "Review monitoring alerts set up",            done: false },
                ].map(c => (
                  <div key={c.item} className="flex items-center gap-2.5">
                    <span className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${c.done ? "bg-green-500" : "bg-gray-200"}`}>
                      {c.done && <span className="text-white text-[8px] font-bold">✓</span>}
                    </span>
                    <span className={`text-sm ${c.done ? "text-gray-700" : "text-gray-400"}`}>{c.item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tasks Tab ────────────────────────────────────────────────────────── */}
      {activeNavTab === "Tasks" && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-800">SEO Task List</h2>
            <p className="text-sm text-gray-500 mt-1">{report ? `${report.issues.length} tasks generated from your last audit of ${report.domain}` : "Run a Google SEO audit to auto-generate your personalised task list."}</p>
          </div>
          {report ? (
            <div className="space-y-3">
              {report.issues.map((issue, i) => (
                <div key={issue.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white text-[10px] font-black ${issue.severity === "critical" ? "bg-red-500" : issue.severity === "warning" ? "bg-amber-500" : "bg-blue-400"}`}>{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${issue.severity === "critical" ? "bg-red-50 text-red-600 border-red-200" : issue.severity === "warning" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>{issue.severity === "info" ? "Notice" : issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}</span>
                      <span className="text-[10px] text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">{issue.category}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">{issue.issue}</p>
                    <p className="text-xs text-gray-500">{issue.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">⚠️ No audit results yet. Run a Google SEO audit first, then come back here to see your personalised tasks.</p>
              {[
                { priority: "High",   category: "Technical",  task: "Verify HTTPS & SSL certificate is valid and auto-renewing" },
                { priority: "High",   category: "On-Page",    task: "Audit title tags — all pages need unique titles under 60 chars" },
                { priority: "High",   category: "On-Page",    task: "Add missing meta descriptions (150–160 chars) on all key pages" },
                { priority: "Medium", category: "Technical",  task: "Submit XML sitemap to Google Search Console" },
                { priority: "Medium", category: "Content",    task: "Add author bios and publish dates to blog posts (EEAT)" },
                { priority: "Medium", category: "Technical",  task: "Fix broken internal links flagged in crawl" },
                { priority: "Low",    category: "On-Page",    task: "Add alt text to all images missing descriptions" },
                { priority: "Low",    category: "Technical",  task: "Implement structured data (schema.org) for key page types" },
              ].map((t, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white text-[10px] font-black ${t.priority === "High" ? "bg-red-500" : t.priority === "Medium" ? "bg-amber-500" : "bg-blue-400"}`}>{i + 1}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.priority === "High" ? "bg-red-50 text-red-600 border-red-200" : t.priority === "Medium" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>{t.priority}</span>
                      <span className="text-[10px] text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">{t.category}</span>
                    </div>
                    <p className="text-sm text-gray-700">{t.task}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reports Tab ──────────────────────────────────────────────────────── */}
      {activeNavTab === "Reports" && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-800">Reports</h2>
            <p className="text-sm text-gray-500 mt-1">View, download and share your SEO audit reports.</p>
          </div>
          {historyList.length > 0 ? (
            <div className="space-y-3">
              {historyList.map(entry => (
                <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${entry.source === "google" ? "bg-green-50" : entry.source === "local" ? "bg-orange-50" : "bg-blue-50"}`}>
                    <span className="text-lg">{entry.source === "google" ? "🔍" : entry.source === "local" ? "📍" : "🤖"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{entry.domain}</p>
                    <p className="text-xs text-gray-400">{entry.source === "google" ? "Google SEO Audit" : entry.source === "local" ? "Local SEO Audit" : "AI SEO Analysis"} · {new Date(entry.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <p className={`text-xl font-black ${entry.score >= 80 ? "text-green-600" : entry.score >= 60 ? "text-amber-600" : "text-red-500"}`}>{entry.score}</p>
                      <p className="text-[9px] text-gray-400">Score</p>
                    </div>
                    <button
                      onClick={() => {
                        if (entry.source === "google" && entry.shareId) {
                          fetch(`/api/seo/audit-report/${entry.shareId}`).then(r => r.json()).then(d => {
                            const html = buildReportHtml(d);
                            const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
                            a.download = `seo-report-${entry.domain}.html`; a.click();
                          }).catch(() => toast({ title: "Report expired", description: "Google SEO reports expire after 24h.", variant: "destructive" }));
                        } else {
                          toast({ title: "Export unavailable", description: "Only Google SEO reports support HTML export.", variant: "destructive" });
                        }
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
                      Export
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-sm font-bold text-gray-600 mb-1">No reports yet</p>
              <p className="text-xs text-gray-400">Run a Google, Local or AI SEO audit — reports save automatically.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Integrations Tab ─────────────────────────────────────────────────── */}
      {activeNavTab === "Integrations" && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-800">Integrations</h2>
            <p className="text-sm text-gray-500 mt-1">Connect your SEO tools and data sources for deeper insights.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Google Search Console", icon: "🔍", desc: "Connect GSC to see real impressions, clicks, average position, and crawl errors for every page.", status: "Connect", color: "border-blue-200 bg-blue-50/30", badge: "Recommended" },
              { name: "Google Analytics 4",    icon: "📈", desc: "Import GA4 traffic data — sessions, bounce rate, conversions — alongside your SEO scores.", status: "Connect", color: "border-orange-200 bg-orange-50/30", badge: "Recommended" },
              { name: "Google My Business",    icon: "📍", desc: "Sync your GMB profile to monitor Local SEO performance, review count, and profile completeness.", status: "Connect", color: "border-green-200 bg-green-50/30", badge: "Local SEO" },
              { name: "Semrush",               icon: "🚀", desc: "Pull keyword rankings, backlink data, and competitor insights directly from Semrush.", status: "Coming Soon", color: "border-gray-200 bg-gray-50", badge: "Soon" },
              { name: "Ahrefs",                icon: "🔗", desc: "Import your Ahrefs backlink profile, domain rating, and organic keyword data.", status: "Coming Soon", color: "border-gray-200 bg-gray-50", badge: "Soon" },
              { name: "Screaming Frog",        icon: "🐸", desc: "Upload a Screaming Frog crawl export to enrich your technical SEO audit results.", status: "Coming Soon", color: "border-gray-200 bg-gray-50", badge: "Soon" },
            ].map(intg => (
              <div key={intg.name} className={`rounded-xl border p-5 ${intg.color}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{intg.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{intg.name}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${intg.badge === "Recommended" ? "bg-indigo-50 text-indigo-700" : intg.badge === "Local SEO" ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-500"}`}>{intg.badge}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{intg.desc}</p>
                <button
                  disabled={intg.status === "Coming Soon"}
                  onClick={() => intg.status === "Connect" && toast({ title: `${intg.name}`, description: "Integration setup coming soon — enter your API key in Settings." })}
                  className={`w-full text-xs font-bold py-2 rounded-lg transition-colors ${intg.status === "Connect" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                  {intg.status}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
