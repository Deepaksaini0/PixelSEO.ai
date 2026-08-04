import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import FAQPage from "@/pages/FAQ";
import LLMPage from "@/pages/LLM";
import SEOAuditPage from "@/pages/SEOAudit";
import SEOAuditToolsPage from "@/pages/SEOAuditTools";
import TextToHTMLPage from "@/pages/TextToHTML";
import WebToolsPage from "@/pages/WebTools";
import AISEOAuditPage from "@/pages/AISEOAudit";
import WatermarkRemoverPage from "@/pages/WatermarkRemoverPage";
import ColorsFromImagePage from "@/pages/ColorsFromImage";
import PDFSecurityPage from "@/pages/PDFSecurity";
import NotFound from "@/pages/not-found";

// ── Per-page SEO metadata ──────────────────────────────────────────────────────
const PAGE_META: Record<string, { title: string; description: string; canonical: string }> = {
  "/": {
    title: "Free SEO Audit Tool — AI SEO Checker, Technical SEO Audit & Website Analysis",
    description: "Get a free SEO audit with our AI-powered SEO checker. Run technical SEO audits, on-page SEO analysis, keyword gap analysis, competitor SEO analysis, and improve your website SEO score. Best free alternative to Ahrefs & SEMrush.",
    canonical: "https://imageconvert.tools/",
  },
  "/free-seo-audit": {
    title: "Free AI SEO Audit Tool — SEO Score Checker, Technical Audit & 90-Day Roadmap",
    description: "Run a free AI-powered SEO audit instantly. Get your SEO score, technical SEO audit, on-page SEO checker, Core Web Vitals, EEAT analysis, keyword gap analysis, competitor comparison, and a downloadable white-label report — 100% free.",
    canonical: "https://imageconvert.tools/free-seo-audit",
  },
  "/seo-audit": {
    title: "Full SEO Audit Dashboard — Website SEO Analysis & SEO Rank Checker Tool",
    description: "Comprehensive SEO audit dashboard with 25+ tools. Check your website SEO score, analyse rankings, run broken link checks, page speed tests, keyword research, and more. Free website SEO analysis tool.",
    canonical: "https://imageconvert.tools/seo-audit",
  },
  "/seo-tools": {
    title: "Best Free SEO Tools — SEO Rank Checker, Keyword Gap Analysis & More",
    description: "25+ free SEO tools in one place: SEO rank checker tool, keyword gap analysis, on-page SEO checker, meta tag generator, readability analyser, social preview, broken link checker, and competitor SEO analysis tool.",
    canonical: "https://imageconvert.tools/seo-tools",
  },
  "/text-to-html": {
    title: "Text to HTML Converter — Free Online HTML Editor & Code Generator",
    description: "Convert plain text to clean, valid HTML instantly. Free online text to HTML converter with live preview. Supports headings, lists, tables, links and formatting.",
    canonical: "https://imageconvert.tools/text-to-html",
  },
  "/web-tools": {
    title: "Free Web Tools — HTML Minifier, CSS Minifier, JSON Formatter & More",
    description: "Free web developer tools: HTML minifier, CSS minifier, JavaScript minifier, JSON formatter, Base64 encoder, and more. Boost your website performance in seconds.",
    canonical: "https://imageconvert.tools/web-tools",
  },
  "/faq": {
    title: "FAQ Schema Generator — Create Structured FAQ JSON-LD for Google Rich Results",
    description: "Generate FAQ schema markup (JSON-LD) for your website. Add structured FAQ data to earn Google rich results and boost your click-through rate from search.",
    canonical: "https://imageconvert.tools/faq",
  },
  "/watermark-remover": {
    title: "Free AI Watermark Remover — Remove Watermarks from Images Online",
    description: "Remove watermarks from images for free using AI. Automatically detects and removes text watermarks, logo stamps and overlays. Before/after slider, no signup needed.",
    canonical: "https://imageconvert.tools/watermark-remover",
  },
  "/colors-from-image": {
    title: "Colors from Image — Extract Color Palette & Dominant Colors Online",
    description: "Upload any image to instantly extract its dominant color and full color palette. Copy hex codes with one click. Free online color picker tool.",
    canonical: "https://imageconvert.tools/colors-from-image",
  },
  "/pdf-security": {
    title: "PDF Security — Protect & Unlock PDF Files Online Free",
    description: "Password-protect your PDF with 256-bit AES encryption or remove password protection from any PDF instantly. Free, secure, and no signup needed.",
    canonical: "https://imageconvert.tools/pdf-security",
  },
};

function useSEO(path: string) {
  useEffect(() => {
    const meta = PAGE_META[path] || PAGE_META["/"];

    // Title
    document.title = meta.title;

    // Meta description
    let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!desc) { desc = document.createElement("meta"); desc.name = "description"; document.head.appendChild(desc); }
    desc.content = meta.description;

    // Canonical
    let can = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!can) { can = document.createElement("link"); can.rel = "canonical"; document.head.appendChild(can); }
    can.href = meta.canonical;

    // OG title
    let ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (!ogTitle) { ogTitle = document.createElement("meta"); ogTitle.setAttribute("property", "og:title"); document.head.appendChild(ogTitle); }
    ogTitle.content = meta.title;

    // OG description
    let ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    if (!ogDesc) { ogDesc = document.createElement("meta"); ogDesc.setAttribute("property", "og:description"); document.head.appendChild(ogDesc); }
    ogDesc.content = meta.description;

    // OG url
    let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (!ogUrl) { ogUrl = document.createElement("meta"); ogUrl.setAttribute("property", "og:url"); document.head.appendChild(ogUrl); }
    ogUrl.content = meta.canonical;

    // Twitter title
    let twTitle = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement | null;
    if (!twTitle) { twTitle = document.createElement("meta"); twTitle.name = "twitter:title"; document.head.appendChild(twTitle); }
    twTitle.content = meta.title;

    // Twitter description
    let twDesc = document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement | null;
    if (!twDesc) { twDesc = document.createElement("meta"); twDesc.name = "twitter:description"; document.head.appendChild(twDesc); }
    twDesc.content = meta.description;
  }, [path]);
}

const FULL_PAGE_ROUTES = ["/free-seo-audit", "/watermark-remover"];

function Router() {
  const [location] = useLocation();
  useSEO(location);

  const isFullPage = FULL_PAGE_ROUTES.some(r => location.startsWith(r));

  return (
    <div className={isFullPage ? "" : "min-h-screen bg-background text-foreground pb-20"}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/faq" component={FAQPage} />
        <Route path="/llms" component={LLMPage} />
        <Route path="/seo-audit" component={SEOAuditPage} />
        <Route path="/seo-tools" component={SEOAuditToolsPage} />
        <Route path="/free-seo-audit" component={AISEOAuditPage} />
        <Route path="/watermark-remover" component={WatermarkRemoverPage} />
        <Route path="/text-to-html" component={TextToHTMLPage} />
        <Route path="/web-tools" component={WebToolsPage} />
        <Route path="/colors-from-image" component={ColorsFromImagePage} />
        <Route path="/pdf-security" component={PDFSecurityPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
