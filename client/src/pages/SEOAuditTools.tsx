import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Search, FileCode, BarChart3, Loader2, Globe, Share2,
  Link2, Star, BookOpen, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  Code2, Tag, ArrowRight, Server, Zap, Image, FileText, MonitorSmartphone,
  TrendingDown, Trophy, RefreshCw, Loader, AlertCircle
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AuditHistoryCompare } from "@/components/AuditHistoryCompare";
import { SitemapGenerator } from "@/components/SitemapGenerator";
import { AIMetaTagGenerator } from "@/components/AIMetaTagGenerator";
import { CoreWebVitals } from "@/components/CoreWebVitals";
import { WordCountChecker } from "@/components/WordCountChecker";
import { URLSlugGenerator } from "@/components/URLSlugGenerator";
import { KeywordGapAnalyzer } from "@/components/KeywordGapAnalyzer";
import { GSCImporter } from "@/components/GSCImporter";
import { ContentMatchTool } from "@/components/ContentMatchTool";
import { WatermarkRemover } from "@/components/WatermarkRemover";
import { ZipCompressor } from "@/components/ZipCompressor";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

interface PageAuditItem {
  name: string; status: "pass" | "warning" | "fail"; message: string; severity: "critical" | "warning" | "info";
}
interface PageAudit {
  url: string; score: number;
  checks: { category: string; items: PageAuditItem[] }[];
  recommendations: string[];
}
interface AuditResult {
  url: string; score: number; timestamp: string; pages: PageAudit[]; recommendations: string[];
}

export default function SEOAuditTools() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Site Audit State
  const [auditUrl, setAuditUrl] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  // Sitemap State
  const [sitemapXml, setSitemapXml] = useState("");
  const [sitemapResult, setSitemapResult] = useState<{ count: number; urls: string[] } | null>(null);

  // Keyword Density State
  const [keywordText, setKeywordText] = useState("");
  const [keywordResult, setKeywordResult] = useState<{ totalWords: number; density: { word: string; count: number; percentage: string }[] } | null>(null);

  // Robots.txt State
  const [robotsSitemap, setRobotsSitemap] = useState("");
  const [robotsRules, setRobotsRules] = useState([{ agent: "*", allow: true, path: "/" }]);
  const [generatedRobots, setGeneratedRobots] = useState("");

  // Social Preview State
  const [previewUrl, setPreviewUrl] = useState("");
  const [socialData, setSocialData] = useState<{ title: string; description: string; image: string; site_name: string; url: string } | null>(null);

  // Keyword Generator State
  const [targetTitle, setTargetTitle] = useState("");
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);

  // Broken Link Checker State
  const [linkCheckUrl, setLinkCheckUrl] = useState("");
  const [linkResults, setLinkResults] = useState<{ total: number; brokenCount: number; results: { url: string; status: number; broken: boolean; type: string; error?: string }[] } | null>(null);

  // SERP Simulator State
  const [serpTitle, setSerpTitle] = useState("");
  const [serpDesc, setSerpDesc] = useState("");
  const [serpUrl, setSerpUrl] = useState("");
  const [serpRating, setSerpRating] = useState(4.5);
  const [serpReviews, setSerpReviews] = useState(128);
  const [serpShowRating, setSerpShowRating] = useState(false);

  // Readability State
  const [readabilityText, setReadabilityText] = useState("");
  const [readabilityResult, setReadabilityResult] = useState<{
    wordCount: number; sentenceCount: number; syllableCount: number;
    avgWordsPerSentence: number; avgSyllablesPerWord: number;
    fleschEase: number; fleschKincaidGrade: number; level: string; levelColor: string; suggestions: string[];
  } | null>(null);

  // Meta Tag Generator State
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [metaUrl, setMetaUrl] = useState("");
  const [metaImage, setMetaImage] = useState("");
  const [metaAuthor, setMetaAuthor] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [generatedMeta, setGeneratedMeta] = useState("");

  // Schema Markup Generator State
  const [schemaType, setSchemaType] = useState("Article");
  const [schemaFields, setSchemaFields] = useState<Record<string, string>>({});
  const [generatedSchema, setGeneratedSchema] = useState("");

  // HTTP Header Checker State
  const [headerUrl, setHeaderUrl] = useState("");
  const [headerResult, setHeaderResult] = useState<{ status: number; statusText: string; headers: { key: string; value: string; important: boolean }[] } | null>(null);

  // Redirect Chain Checker State
  const [redirectUrl, setRedirectUrl] = useState("");
  const [redirectChain, setRedirectChain] = useState<{ chain: { url: string; status: number; statusText: string }[]; redirectCount: number } | null>(null);

  // Rank Tracker State
  const [rankUrl, setRankUrl] = useState("");
  const [rankKeyword, setRankKeyword] = useState("");
  const [rankResult, setRankResult] = useState<{ url: string; keyword: string; position: number | null; checkedAt: string; totalScanned: number } | null>(null);
  const [rankHistory, setRankHistory] = useState<{ id: number; url: string; keyword: string; position: number | null; checkedAt: string }[]>([]);

  // Page Speed Analyzer State
  const [pageSpeedUrl, setPageSpeedUrl] = useState("");
  const [pageSpeedResult, setPageSpeedResult] = useState<{
    url: string; ttfb: number; htmlSize: number; htmlSizeKb: number;
    status: number; isCompressed: boolean; hasCache: boolean; cacheControl: string;
    isHttps: boolean; hasHsts: boolean; server: string;
    scriptCount: number; styleCount: number; imageCount: number; iframeCount: number;
    hasViewport: boolean; title: string | null; description: string | null;
    canonical: string | null; h1Count: number; score: number;
    issues: { type: "error" | "warning" | "info"; message: string; impact: string }[];
  } | null>(null);

  const schemaTypes: Record<string, { label: string; fields: { key: string; label: string; placeholder: string }[] }> = {
    Article: {
      label: "Article / Blog Post",
      fields: [
        { key: "headline", label: "Headline", placeholder: "Your article title" },
        { key: "author", label: "Author Name", placeholder: "John Doe" },
        { key: "datePublished", label: "Date Published", placeholder: "2024-01-15" },
        { key: "dateModified", label: "Date Modified", placeholder: "2024-06-01" },
        { key: "description", label: "Description", placeholder: "Brief description..." },
        { key: "url", label: "Article URL", placeholder: "https://example.com/article" },
        { key: "image", label: "Featured Image URL", placeholder: "https://example.com/img.jpg" },
      ],
    },
    Product: {
      label: "Product",
      fields: [
        { key: "name", label: "Product Name", placeholder: "Amazing Widget Pro" },
        { key: "description", label: "Description", placeholder: "Product description..." },
        { key: "price", label: "Price", placeholder: "29.99" },
        { key: "currency", label: "Currency", placeholder: "USD" },
        { key: "availability", label: "Availability", placeholder: "InStock" },
        { key: "brand", label: "Brand", placeholder: "Your Brand" },
        { key: "sku", label: "SKU", placeholder: "PROD-001" },
        { key: "url", label: "Product URL", placeholder: "https://example.com/product" },
        { key: "image", label: "Product Image", placeholder: "https://example.com/img.jpg" },
      ],
    },
    FAQ: {
      label: "FAQ Page",
      fields: [
        { key: "q1", label: "Question 1", placeholder: "What is your product?" },
        { key: "a1", label: "Answer 1", placeholder: "Our product is..." },
        { key: "q2", label: "Question 2", placeholder: "How does shipping work?" },
        { key: "a2", label: "Answer 2", placeholder: "We ship within 2-3 days..." },
        { key: "q3", label: "Question 3", placeholder: "Do you offer refunds?" },
        { key: "a3", label: "Answer 3", placeholder: "Yes, we offer 30-day refunds..." },
      ],
    },
    LocalBusiness: {
      label: "Local Business",
      fields: [
        { key: "name", label: "Business Name", placeholder: "My Local Shop" },
        { key: "description", label: "Description", placeholder: "We sell amazing things..." },
        { key: "telephone", label: "Phone", placeholder: "+1-555-123-4567" },
        { key: "email", label: "Email", placeholder: "hello@mybusiness.com" },
        { key: "address", label: "Street Address", placeholder: "123 Main St" },
        { key: "city", label: "City", placeholder: "New York" },
        { key: "state", label: "State/Region", placeholder: "NY" },
        { key: "zip", label: "Postal Code", placeholder: "10001" },
        { key: "country", label: "Country", placeholder: "US" },
        { key: "url", label: "Website", placeholder: "https://mybusiness.com" },
      ],
    },
  };

  const generateMetaTags = () => {
    if (!metaTitle && !metaDesc) return;
    const tags = [
      `<!-- Primary Meta Tags -->`,
      metaTitle ? `<title>${metaTitle}</title>` : "",
      metaDesc ? `<meta name="description" content="${metaDesc}" />` : "",
      metaKeywords ? `<meta name="keywords" content="${metaKeywords}" />` : "",
      metaAuthor ? `<meta name="author" content="${metaAuthor}" />` : "",
      `<meta name="robots" content="index, follow" />`,
      ``,
      `<!-- Open Graph / Facebook -->`,
      `<meta property="og:type" content="website" />`,
      metaUrl ? `<meta property="og:url" content="${metaUrl}" />` : "",
      metaTitle ? `<meta property="og:title" content="${metaTitle}" />` : "",
      metaDesc ? `<meta property="og:description" content="${metaDesc}" />` : "",
      metaImage ? `<meta property="og:image" content="${metaImage}" />` : "",
      ``,
      `<!-- Twitter Card -->`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      metaUrl ? `<meta name="twitter:url" content="${metaUrl}" />` : "",
      metaTitle ? `<meta name="twitter:title" content="${metaTitle}" />` : "",
      metaDesc ? `<meta name="twitter:description" content="${metaDesc}" />` : "",
      metaImage ? `<meta name="twitter:image" content="${metaImage}" />` : "",
      ``,
      metaUrl ? `<!-- Canonical -->` : "",
      metaUrl ? `<link rel="canonical" href="${metaUrl}" />` : "",
    ].filter(Boolean).join("\n");
    setGeneratedMeta(tags);
    toast({ title: "Meta Tags Generated!" });
  };

  const generateSchema = () => {
    let schema: any = { "@context": "https://schema.org" };
    const f = schemaFields;
    if (schemaType === "Article") {
      schema = { ...schema, "@type": "Article", headline: f.headline, author: { "@type": "Person", name: f.author }, datePublished: f.datePublished, dateModified: f.dateModified, description: f.description, url: f.url, image: f.image };
    } else if (schemaType === "Product") {
      schema = { ...schema, "@type": "Product", name: f.name, description: f.description, brand: { "@type": "Brand", name: f.brand }, sku: f.sku, url: f.url, image: f.image, offers: { "@type": "Offer", price: f.price, priceCurrency: f.currency || "USD", availability: `https://schema.org/${f.availability || "InStock"}` } };
    } else if (schemaType === "FAQ") {
      const qas = [];
      for (let i = 1; i <= 5; i++) {
        if (f[`q${i}`] && f[`a${i}`]) qas.push({ "@type": "Question", name: f[`q${i}`], acceptedAnswer: { "@type": "Answer", text: f[`a${i}`] } });
      }
      schema = { ...schema, "@type": "FAQPage", mainEntity: qas };
    } else if (schemaType === "LocalBusiness") {
      schema = { ...schema, "@type": "LocalBusiness", name: f.name, description: f.description, telephone: f.telephone, email: f.email, url: f.url, address: { "@type": "PostalAddress", streetAddress: f.address, addressLocality: f.city, addressRegion: f.state, postalCode: f.zip, addressCountry: f.country } };
    }
    setGeneratedSchema(JSON.stringify(schema, null, 2));
    toast({ title: "Schema Generated!" });
  };

  const handleAudit = async () => {
    if (!auditUrl.trim()) return;
    setAuditLoading(true);
    setAuditResult(null);
    try {
      const res = await fetch("/api/seo-audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: auditUrl.trim() }) });
      if (!res.ok) throw new Error("Audit failed");
      const data = await res.json();
      setAuditResult(data);
      toast({ title: "Audit Complete", description: `SEO Score: ${data.score}/100` });
    } catch {
      toast({ title: "Error", description: "Failed to audit. Please try again.", variant: "destructive" });
    } finally { setAuditLoading(false); }
  };

  const getScoreColor = (s: number) => s >= 80 ? "text-green-600" : s >= 60 ? "text-yellow-600" : "text-red-600";

  const checkHeaders = async () => {
    if (!headerUrl) return;
    setIsLoading(true);
    setHeaderResult(null);
    try {
      const res = await fetch("/api/seo/http-headers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: headerUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHeaderResult(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const fetchRankHistory = async (url: string, keyword: string) => {
    try {
      const res = await fetch(`/api/seo/rank-history?url=${encodeURIComponent(url)}&keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      if (data.history) setRankHistory(data.history);
    } catch {}
  };

  const checkRanking = async () => {
    if (!rankUrl || !rankKeyword) return;
    setIsLoading(true);
    setRankResult(null);
    try {
      const res = await fetch("/api/seo/rank-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rankUrl, keyword: rankKeyword }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRankResult(data);
      await fetchRankHistory(data.url, data.keyword);
      toast({ title: data.position ? `Ranked #${data.position} on Bing` : "Not found in top results" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const analyzePageSpeed = async () => {
    if (!pageSpeedUrl) return;
    setIsLoading(true);
    setPageSpeedResult(null);
    try {
      const res = await fetch("/api/seo/page-speed", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pageSpeedUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPageSpeedResult(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const checkRedirects = async () => {
    if (!redirectUrl) return;
    setIsLoading(true);
    setRedirectChain(null);
    try {
      const res = await fetch("/api/seo/redirect-chain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: redirectUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRedirectChain(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleSitemapParse = async () => {
    if (!sitemapXml.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/seo/parse-sitemap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ xml: sitemapXml }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSitemapResult(data);
      toast({ title: "Sitemap Parsed", description: `Found ${data.count} URLs.` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleKeywordDensity = async () => {
    if (!keywordText.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/seo/keyword-density", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: keywordText }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setKeywordResult(data);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const generateRobots = () => {
    let content = "";
    robotsRules.forEach(rule => { content += `User-agent: ${rule.agent}\n${rule.allow ? "Allow" : "Disallow"}: ${rule.path}\n\n`; });
    if (robotsSitemap) content += `Sitemap: ${robotsSitemap}\n`;
    setGeneratedRobots(content.trim());
    toast({ title: "Robots.txt Generated" });
  };

  const fetchSocialPreview = async () => {
    if (!previewUrl) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/seo/social-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: previewUrl }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSocialData(data);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const generateKeywords = async () => {
    if (!targetTitle) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/seo/suggest-keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: targetTitle }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestedKeywords(data.keywords);
      toast({ title: "Keywords Generated" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const checkBrokenLinks = async () => {
    if (!linkCheckUrl) return;
    setIsLoading(true);
    setLinkResults(null);
    try {
      const res = await fetch("/api/seo/broken-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: linkCheckUrl }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLinkResults(data);
      toast({ title: `Found ${data.brokenCount} broken link${data.brokenCount !== 1 ? "s" : ""} out of ${data.total} total.` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const analyzeReadability = async () => {
    if (!readabilityText.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/seo/readability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: readabilityText }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReadabilityResult(data);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const getReadabilityColor = (ease: number) => {
    if (ease >= 70) return "text-green-600";
    if (ease >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (status: number, broken: boolean) => {
    if (!broken) return <Badge className="bg-green-100 text-green-700 text-xs">{status} OK</Badge>;
    if (status === 0) return <Badge variant="destructive" className="text-xs">Connection Error</Badge>;
    return <Badge variant="destructive" className="text-xs">{status}</Badge>;
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-green-50 border-green-200";
    if (status >= 300 && status < 400) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
    if (status >= 300 && status < 400) return <ArrowRight className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover-elevate"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-black">SEO Utility Tools</h1>
            <p className="text-muted-foreground">Comprehensive SEO management suite</p>
          </div>
        </div>

        <Tabs defaultValue="site-audit" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-8 bg-muted p-1 rounded-xl">
            <TabsTrigger value="site-audit" className="flex items-center gap-1.5 text-xs font-medium"><Globe className="h-3 w-3" />Site Audit</TabsTrigger>
            <TabsTrigger value="sitemap" className="flex items-center gap-1.5 text-xs"><FileCode className="h-3 w-3" />Sitemap</TabsTrigger>
            <TabsTrigger value="keyword" className="flex items-center gap-1.5 text-xs"><BarChart3 className="h-3 w-3" />Keywords</TabsTrigger>
            <TabsTrigger value="robots" className="flex items-center gap-1.5 text-xs"><Globe className="h-3 w-3" />Robots.txt</TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-1.5 text-xs"><Share2 className="h-3 w-3" />Social Preview</TabsTrigger>
            <TabsTrigger value="keywords-gen" className="flex items-center gap-1.5 text-xs"><Search className="h-3 w-3" />Keyword Suggest</TabsTrigger>
            <TabsTrigger value="broken-links" className="flex items-center gap-1.5 text-xs"><Link2 className="h-3 w-3" />Broken Links</TabsTrigger>
            <TabsTrigger value="serp" className="flex items-center gap-1.5 text-xs"><Star className="h-3 w-3" />SERP Preview</TabsTrigger>
            <TabsTrigger value="readability" className="flex items-center gap-1.5 text-xs"><BookOpen className="h-3 w-3" />Readability</TabsTrigger>
            <TabsTrigger value="meta-tags" className="flex items-center gap-1.5 text-xs"><Tag className="h-3 w-3" />Meta Tags</TabsTrigger>
            <TabsTrigger value="schema" className="flex items-center gap-1.5 text-xs"><Code2 className="h-3 w-3" />Schema</TabsTrigger>
            <TabsTrigger value="http-headers" className="flex items-center gap-1.5 text-xs"><Server className="h-3 w-3" />HTTP Headers</TabsTrigger>
            <TabsTrigger value="redirects" className="flex items-center gap-1.5 text-xs"><ArrowRight className="h-3 w-3" />Redirects</TabsTrigger>
            <TabsTrigger value="page-speed" className="flex items-center gap-1.5 text-xs"><Zap className="h-3 w-3" />Page Speed</TabsTrigger>
            <TabsTrigger value="rank-tracker" className="flex items-center gap-1.5 text-xs"><Trophy className="h-3 w-3" />Rank Tracker</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs font-medium text-primary"><TrendingUp className="h-3 w-3" />History &amp; Compare</TabsTrigger>
            <TabsTrigger value="sitemap-gen" className="flex items-center gap-1.5 text-xs"><FileCode className="h-3 w-3" />Sitemap Gen</TabsTrigger>
            <TabsTrigger value="ai-meta" className="flex items-center gap-1.5 text-xs"><Tag className="h-3 w-3" />AI Meta Tags</TabsTrigger>
            <TabsTrigger value="web-vitals" className="flex items-center gap-1.5 text-xs"><Zap className="h-3 w-3" />Web Vitals</TabsTrigger>
            <TabsTrigger value="word-count" className="flex items-center gap-1.5 text-xs"><FileText className="h-3 w-3" />Word Count</TabsTrigger>
            <TabsTrigger value="slug-gen" className="flex items-center gap-1.5 text-xs"><ArrowRight className="h-3 w-3" />Slug Generator</TabsTrigger>
            <TabsTrigger value="keyword-gap" className="flex items-center gap-1.5 text-xs"><BarChart3 className="h-3 w-3" />Keyword Gap</TabsTrigger>
            <TabsTrigger value="gsc-import" className="flex items-center gap-1.5 text-xs"><TrendingUp className="h-3 w-3" />GSC Import</TabsTrigger>
            <TabsTrigger value="content-match" className="flex items-center gap-1.5 text-xs"><FileText className="h-3 w-3" />Content Match</TabsTrigger>
            <TabsTrigger value="watermark" className="flex items-center gap-1.5 text-xs"><Image className="h-3 w-3" />Watermark Remove</TabsTrigger>
            <TabsTrigger value="zip-compressor" className="flex items-center gap-1.5 text-xs"><FileCode className="h-3 w-3" />ZIP Compressor</TabsTrigger>
          </TabsList>

          {/* ─── Site Audit ─── */}
          <TabsContent value="site-audit">
            <div className="space-y-6">
              {!auditResult ? (
                <div className="space-y-4">
                  <Card className="p-8 max-w-2xl space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">Full Website SEO Audit</h2>
                      <p className="text-muted-foreground text-sm">We crawl up to 1,000 internal pages and generate a detailed SEO report for each.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Website URL</Label>
                      <div className="flex gap-3">
                        <Input
                          placeholder="https://example.com"
                          value={auditUrl}
                          onChange={(e) => setAuditUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAudit()}
                          className="flex-1"
                          data-testid="input-audit-url"
                        />
                        <Button onClick={handleAudit} disabled={auditLoading || !auditUrl.trim()} className="px-8" data-testid="button-start-audit">
                          {auditLoading ? <><Loader className="h-4 w-4 mr-2 animate-spin" />Auditing...</> : "Audit Website"}
                        </Button>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">What we check</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                        <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />Title Tag &amp; Meta Data</div>
                        <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />H1 Tag Verification</div>
                        <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />Image ALT Text</div>
                        <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />Multi-page Crawling</div>
                        <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />Link Analysis</div>
                        <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />Performance Hints</div>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="space-y-6">
                  <Card className={`p-6 ${auditResult.score >= 80 ? "bg-green-50 border-green-200" : auditResult.score >= 60 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">Overall SEO Score</p>
                        <p className={`text-6xl font-black ${getScoreColor(auditResult.score)}`}>{auditResult.score}<span className="text-2xl font-normal">/100</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Audited</p>
                        <p className="font-bold break-all max-w-xs">{auditResult.url}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(auditResult.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                  <h2 className="text-xl font-bold">Page-by-Page Results</h2>
                  <Accordion type="single" collapsible className="space-y-3">
                    {auditResult.pages.map((page, idx) => (
                      <AccordionItem key={idx} value={`page-${idx}`} className="border-none">
                        <Card className="overflow-hidden">
                          <AccordionTrigger className="px-6 py-4 hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="text-left">
                                <p className="text-sm font-medium text-primary truncate max-w-md">{page.url}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Page {idx + 1}</p>
                              </div>
                              <span className={`text-xl font-bold ${getScoreColor(page.score)}`}>{page.score}%</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 pb-6 pt-2">
                            <div className="space-y-6">
                              {page.checks.map((cat, ci) => (
                                <div key={ci} className="space-y-3">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat.category}</h4>
                                  <div className="grid gap-2">
                                    {cat.items.map((item, ii) => (
                                      <div key={ii} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                        {item.status === "pass"
                                          ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                          : <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${item.severity === "critical" ? "text-red-600" : "text-yellow-600"}`} />}
                                        <div>
                                          <p className="text-sm font-semibold">{item.name}</p>
                                          <p className="text-xs text-muted-foreground">{item.message}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </Card>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setAuditResult(null)} className="flex-1">New Audit</Button>
                    <Button className="flex-1" onClick={() => {
                      let csv = `SEO Audit: ${auditResult.url}\nScore: ${auditResult.score}/100\n\n`;
                      auditResult.pages.forEach((p, i) => {
                        csv += `PAGE ${i + 1}: ${p.url}\nScore: ${p.score}/100\n`;
                        p.checks.forEach(c => c.items.forEach(it => { csv += `"${c.category}","${it.name}","${it.status.toUpperCase()}","${it.message}"\n`; }));
                        csv += "\n";
                      });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                      a.download = `seo-audit-${Date.now()}.csv`;
                      a.click();
                    }}>Download CSV Report</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Sitemap ─── */}
          <TabsContent value="sitemap">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Paste Sitemap XML</CardTitle>
                  <Button onClick={handleSitemapParse} disabled={isLoading || !sitemapXml}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}Parse Sitemap
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <Textarea placeholder='<?xml version="1.0" encoding="UTF-8"?>...' className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm" value={sitemapXml} onChange={(e) => setSitemapXml(e.target.value)} />
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[600px]">
                <CardHeader><CardTitle className="text-lg">Parsed URLs {sitemapResult && `(${sitemapResult.count})`}</CardTitle></CardHeader>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full"><div className="p-4 space-y-2">
                    {sitemapResult ? sitemapResult.urls.map((u, i) => <div key={i} className="p-2 bg-muted/50 rounded text-sm break-all border">{u}</div>) : <p className="text-muted-foreground italic text-center py-8">Result will appear here...</p>}
                  </div></ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Keyword Density ─── */}
          <TabsContent value="keyword">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Content to Analyze</CardTitle>
                  <Button onClick={handleKeywordDensity} disabled={isLoading || !keywordText}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}Analyze Density
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <Textarea placeholder="Paste your article or page content here..." className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 text-sm" value={keywordText} onChange={(e) => setKeywordText(e.target.value)} />
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[600px]">
                <CardHeader><CardTitle className="text-lg">Keyword Density {keywordResult && `(Total: ${keywordResult.totalWords} words)`}</CardTitle></CardHeader>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full"><div className="p-4">
                    {keywordResult ? <div className="space-y-3">{keywordResult.density.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded border">
                        <span className="font-medium text-primary">{item.word}</span>
                        <div className="flex gap-4 text-sm text-muted-foreground"><span>Count: {item.count}</span><span className="font-bold">{item.percentage}%</span></div>
                      </div>
                    ))}</div> : <p className="text-muted-foreground italic text-center py-8">Analysis will appear here...</p>}
                  </div></ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Robots.txt ─── */}
          <TabsContent value="robots">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Configure Rules</CardTitle>
                  <Button onClick={generateRobots}>Generate</Button>
                </CardHeader>
                <CardContent className="p-6 space-y-6 overflow-y-auto">
                  <div className="space-y-2"><Label>Sitemap URL</Label><Input placeholder="https://example.com/sitemap.xml" value={robotsSitemap} onChange={(e) => setRobotsSitemap(e.target.value)} /></div>
                  {robotsRules.map((rule, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-4 relative bg-muted/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>User Agent</Label><Input value={rule.agent} onChange={(e) => { const n = [...robotsRules]; n[idx].agent = e.target.value; setRobotsRules(n); }} /></div>
                        <div className="space-y-2"><Label>Path</Label><Input value={rule.path} onChange={(e) => { const n = [...robotsRules]; n[idx].path = e.target.value; setRobotsRules(n); }} /></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`allow-${idx}`} checked={rule.allow} onCheckedChange={(c) => { const n = [...robotsRules]; n[idx].allow = !!c; setRobotsRules(n); }} />
                        <Label htmlFor={`allow-${idx}`}>Allow Access</Label>
                      </div>
                      <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-8 w-8 p-0" onClick={() => setRobotsRules(robotsRules.filter((_, i) => i !== idx))}>×</Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => setRobotsRules([...robotsRules, { agent: "*", allow: false, path: "/admin" }])}>+ Add Rule</Button>
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Generated robots.txt</CardTitle>
                  <Button variant="outline" size="sm" disabled={!generatedRobots} onClick={() => { navigator.clipboard.writeText(generatedRobots); toast({ title: "Copied!" }); }}>Copy</Button>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <Textarea className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm bg-muted/30" value={generatedRobots} readOnly />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Social Preview ─── */}
          <TabsContent value="social">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Fetch Preview</CardTitle>
                  <Button onClick={fetchSocialPreview} disabled={isLoading || !previewUrl}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}Preview
                  </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2"><Label>Page URL</Label><Input placeholder="https://example.com" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} /></div>
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[600px]">
                <CardHeader><CardTitle className="text-lg">Facebook Preview</CardTitle></CardHeader>
                <CardContent className="p-6">
                  {socialData ? (
                    <div className="border rounded-xl overflow-hidden shadow-sm bg-white text-black max-w-[500px] mx-auto">
                      {socialData.image ? <img src={socialData.image} alt="Preview" className="w-full h-auto border-b" /> : <div className="w-full h-48 bg-muted flex items-center justify-center border-b">No Image Found</div>}
                      <div className="p-3 bg-[#f2f3f5]">
                        <p className="text-xs text-gray-500 uppercase font-semibold">{socialData.site_name || new URL(socialData.url).hostname}</p>
                        <h4 className="font-bold text-lg leading-tight mt-1 line-clamp-1">{socialData.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{socialData.description}</p>
                      </div>
                    </div>
                  ) : <p className="text-muted-foreground italic text-center py-8">Fetch a URL to see how it looks on social media</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Keyword Suggest ─── */}
          <TabsContent value="keywords-gen">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Target Title</CardTitle>
                  <Button onClick={generateKeywords} disabled={isLoading || !targetTitle}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}Get Keywords
                  </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2"><Label>Page Title</Label><Input placeholder="e.g. Best wireless headphones 2024" value={targetTitle} onChange={(e) => setTargetTitle(e.target.value)} /></div>
                  <p className="text-sm text-muted-foreground italic">I'll use AI to analyze the title and suggest 20 high-performing keywords.</p>
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Suggested Keywords</CardTitle>
                  <Button variant="outline" size="sm" disabled={suggestedKeywords.length === 0} onClick={() => { navigator.clipboard.writeText(suggestedKeywords.join(", ")); toast({ title: "Copied!" }); }}>Copy All</Button>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full"><div className="p-4 flex flex-wrap gap-2">
                    {suggestedKeywords.length > 0 ? suggestedKeywords.map((kw, i) => <div key={i} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium">{kw}</div>)
                      : <p className="text-muted-foreground italic text-center py-8 w-full">Keywords will appear here after generation</p>}
                  </div></ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Broken Links ─── */}
          <TabsContent value="broken-links">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" />Broken Link Checker</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Crawls a webpage and checks all links for 404s and connection errors</p>
                  </div>
                  <Button onClick={checkBrokenLinks} disabled={isLoading || !linkCheckUrl} className="min-w-[130px]">
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Checking...</> : <><Search className="h-4 w-4 mr-2" />Check Links</>}
                  </Button>
                </CardHeader>
                <CardContent className="p-6"><Input placeholder="https://example.com" value={linkCheckUrl} onChange={(e) => setLinkCheckUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkBrokenLinks()} /></CardContent>
              </Card>
              {linkResults && (<>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="text-center p-4"><p className="text-3xl font-bold">{linkResults.total}</p><p className="text-sm text-muted-foreground mt-1">Total Links</p></Card>
                  <Card className="text-center p-4 border-green-200"><p className="text-3xl font-bold text-green-600">{linkResults.total - linkResults.brokenCount}</p><p className="text-sm text-muted-foreground mt-1">Working</p></Card>
                  <Card className="text-center p-4 border-red-200"><p className="text-3xl font-bold text-red-600">{linkResults.brokenCount}</p><p className="text-sm text-muted-foreground mt-1">Broken</p></Card>
                </div>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">All Links</CardTitle>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />Working</span>
                      <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />Broken</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]"><div className="divide-y">
                      {linkResults.results.sort((a, b) => Number(b.broken) - Number(a.broken)).map((link, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 ${link.broken ? "bg-red-50" : ""}`}>
                          {link.broken ? <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" /> : <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all flex-1 min-w-0 truncate">{link.url}</a>
                          <Badge variant="outline" className="text-xs flex-shrink-0">{link.type}</Badge>
                          {getStatusBadge(link.status, link.broken)}
                        </div>
                      ))}
                    </div></ScrollArea>
                  </CardContent>
                </Card>
              </>)}
            </div>
          </TabsContent>

          {/* ─── SERP Preview ─── */}
          <TabsContent value="serp">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Star className="h-5 w-5 text-primary" />SERP Simulator</CardTitle>
                  <p className="text-sm text-muted-foreground">Preview how your page looks in Google search results</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2"><Label>Page Title <span className="text-muted-foreground text-xs">({serpTitle.length}/60)</span></Label><Input placeholder="My Amazing Page Title" value={serpTitle} onChange={(e) => setSerpTitle(e.target.value)} maxLength={70} />{serpTitle.length > 60 && <p className="text-xs text-yellow-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />May be truncated</p>}</div>
                  <div className="space-y-2"><Label>Meta Description <span className="text-muted-foreground text-xs">({serpDesc.length}/160)</span></Label><Textarea placeholder="A compelling description..." value={serpDesc} onChange={(e) => setSerpDesc(e.target.value)} maxLength={200} className="resize-none h-24" />{serpDesc.length > 160 && <p className="text-xs text-yellow-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />May be truncated</p>}</div>
                  <div className="space-y-2"><Label>Page URL</Label><Input placeholder="https://example.com/your-page" value={serpUrl} onChange={(e) => setSerpUrl(e.target.value)} /></div>
                  <div className="flex items-center gap-3 pt-2"><Checkbox id="show-rating" checked={serpShowRating} onCheckedChange={(c) => setSerpShowRating(!!c)} /><Label htmlFor="show-rating">Show Star Rating / Rich Snippet</Label></div>
                  {serpShowRating && (
                    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                      <div className="space-y-2"><Label>Rating: {serpRating} / 5</Label><Slider value={[serpRating]} min={1} max={5} step={0.1} onValueChange={([v]) => setSerpRating(Math.round(v * 10) / 10)} /></div>
                      <div className="space-y-2"><Label>Number of Reviews</Label><Input type="number" value={serpReviews} onChange={(e) => setSerpReviews(Number(e.target.value))} /></div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Google Search Preview</CardTitle></CardHeader>
                <CardContent className="p-6">
                  <div className="border rounded-xl p-5 bg-white text-black shadow-sm max-w-[600px]">
                    <p className="text-xs text-[#202124] mb-1 truncate">{serpUrl || "https://example.com/your-page"}</p>
                    <h3 className="text-[#1a0dab] text-xl leading-6 cursor-pointer hover:underline line-clamp-1">{serpTitle || "Your Page Title Will Appear Here"}</h3>
                    {serpShowRating && (
                      <div className="flex items-center gap-2 mt-1 mb-1">
                        <span className="text-sm text-[#70757a]">{serpRating}</span>
                        <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(serpRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div>
                        <span className="text-sm text-[#70757a]">({serpReviews.toLocaleString()} reviews)</span>
                      </div>
                    )}
                    <p className="text-sm text-[#4d5156] mt-1 line-clamp-2 leading-5">{serpDesc || "Your meta description will appear here. Make it compelling and informative to improve click-through rates."}</p>
                  </div>
                  <div className="mt-6 space-y-3">
                    <h4 className="font-semibold text-sm">SEO Tips</h4>
                    <div className="space-y-2 text-sm">
                      <div className={`flex items-center gap-2 ${serpTitle.length >= 10 && serpTitle.length <= 60 ? "text-green-600" : "text-yellow-600"}`}>
                        {serpTitle.length >= 10 && serpTitle.length <= 60 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        Title: {serpTitle.length === 0 ? "Enter a title" : serpTitle.length < 10 ? "Too short (min 10)" : serpTitle.length <= 60 ? "Good length ✓" : "Too long — may be cut off"}
                      </div>
                      <div className={`flex items-center gap-2 ${serpDesc.length >= 70 && serpDesc.length <= 160 ? "text-green-600" : "text-yellow-600"}`}>
                        {serpDesc.length >= 70 && serpDesc.length <= 160 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        Description: {serpDesc.length === 0 ? "Enter a description" : serpDesc.length < 70 ? "Too short (min 70)" : serpDesc.length <= 160 ? "Good length ✓" : "Too long — may be cut off"}
                      </div>
                      <div className={`flex items-center gap-2 ${serpUrl.startsWith("https://") ? "text-green-600" : "text-yellow-600"}`}>
                        {serpUrl.startsWith("https://") ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        URL: {serpUrl.startsWith("https://") ? "HTTPS — good for SEO ✓" : "Use HTTPS for better ranking"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Readability ─── */}
          <TabsContent value="readability">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Readability Analyzer</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Flesch-Kincaid score with SEO suggestions</p>
                  </div>
                  <Button onClick={analyzeReadability} disabled={isLoading || !readabilityText}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}Analyze
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <Textarea placeholder="Paste your article, blog post, or page content here..." className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 text-sm" value={readabilityText} onChange={(e) => setReadabilityText(e.target.value)} />
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[600px]">
                <CardHeader><CardTitle className="text-lg">Results</CardTitle></CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                  {readabilityResult ? (
                    <div className="space-y-6">
                      <div className="text-center p-6 rounded-xl bg-muted/40 border">
                        <p className="text-sm text-muted-foreground mb-1">Flesch Reading Ease</p>
                        <p className={`text-5xl font-bold ${getReadabilityColor(readabilityResult.fleschEase)}`}>{readabilityResult.fleschEase}</p>
                        <Badge className={`mt-2 ${readabilityResult.fleschEase >= 60 ? "bg-green-100 text-green-700" : readabilityResult.fleschEase >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{readabilityResult.level}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[["Grade Level", readabilityResult.fleschKincaidGrade], ["Words", readabilityResult.wordCount], ["Sentences", readabilityResult.sentenceCount], ["Avg Words/Sentence", readabilityResult.avgWordsPerSentence]].map(([label, val]) => (
                          <div key={label} className="p-3 rounded-lg border bg-muted/20 text-center"><p className="text-xl font-bold">{val}</p><p className="text-xs text-muted-foreground">{label}</p></div>
                        ))}
                      </div>
                      {readabilityResult.suggestions.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-1"><TrendingUp className="h-4 w-4 text-primary" />SEO Suggestions</h4>
                          {readabilityResult.suggestions.map((s, i) => <div key={i} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800"><AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-600" />{s}</div>)}
                        </div>
                      ) : <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"><CheckCircle className="h-4 w-4 text-green-600" />Great job! Content is well-optimized for readability.</div>}
                    </div>
                  ) : <p className="text-muted-foreground italic text-center py-8">Paste your content and click Analyze</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Meta Tag Generator ─── */}
          <TabsContent value="meta-tags">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="h-fit">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Tag className="h-5 w-5 text-primary" />Meta Tag Generator</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Generate title, OG, Twitter, and canonical tags</p>
                  </div>
                  <Button onClick={generateMetaTags} disabled={!metaTitle && !metaDesc}>Generate Tags</Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Page Title <span className="text-muted-foreground text-xs">({metaTitle.length}/60 chars)</span></Label>
                    <Input placeholder="My Awesome Page" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description <span className="text-muted-foreground text-xs">({metaDesc.length}/160 chars)</span></Label>
                    <Textarea placeholder="A clear, compelling description..." value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className="resize-none h-20" />
                  </div>
                  <div className="space-y-2"><Label>Canonical URL</Label><Input placeholder="https://example.com/page" value={metaUrl} onChange={(e) => setMetaUrl(e.target.value)} /></div>
                  <div className="space-y-2"><Label>OG Image URL</Label><Input placeholder="https://example.com/og-image.jpg" value={metaImage} onChange={(e) => setMetaImage(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Author</Label><Input placeholder="John Doe" value={metaAuthor} onChange={(e) => setMetaAuthor(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Keywords <span className="text-muted-foreground text-xs">(comma-separated)</span></Label><Input placeholder="seo, tools, web" value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} /></div>
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Generated HTML Tags</CardTitle>
                  <Button variant="outline" size="sm" disabled={!generatedMeta} onClick={() => { navigator.clipboard.writeText(generatedMeta); toast({ title: "Copied to clipboard!" }); }}>Copy All</Button>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <Textarea className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-xs bg-muted/20" value={generatedMeta} readOnly placeholder="Fill in the form and click Generate Tags..." />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Schema Markup Generator ─── */}
          <TabsContent value="schema">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="h-fit">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Code2 className="h-5 w-5 text-primary" />Schema Markup Generator</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Generate JSON-LD structured data for rich snippets</p>
                  </div>
                  <Button onClick={generateSchema}>Generate Schema</Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Schema Type</Label>
                    <Select value={schemaType} onValueChange={(v) => { setSchemaType(v); setSchemaFields({}); setGeneratedSchema(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(schemaTypes).map(([key, val]) => <SelectItem key={key} value={key}>{val.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {schemaTypes[schemaType]?.fields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs">{field.label}</Label>
                        <Input placeholder={field.placeholder} value={schemaFields[field.key] || ""} onChange={(e) => setSchemaFields({ ...schemaFields, [field.key]: e.target.value })} className="h-8 text-sm" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Generated JSON-LD</CardTitle>
                  <Button variant="outline" size="sm" disabled={!generatedSchema} onClick={() => { navigator.clipboard.writeText(`<script type="application/ld+json">\n${generatedSchema}\n</script>`); toast({ title: "Copied with script tags!" }); }}>Copy</Button>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <Textarea className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-xs bg-muted/20" value={generatedSchema ? `<script type="application/ld+json">\n${generatedSchema}\n</script>` : ""} readOnly placeholder="Fill in the form and click Generate Schema..." />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── HTTP Header Checker ─── */}
          <TabsContent value="http-headers">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Server className="h-5 w-5 text-primary" />HTTP Header Checker</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Inspect security, caching, and SEO-related HTTP headers</p>
                  </div>
                  <Button onClick={checkHeaders} disabled={isLoading || !headerUrl} className="min-w-[130px]">
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Checking...</> : <><Server className="h-4 w-4 mr-2" />Check Headers</>}
                  </Button>
                </CardHeader>
                <CardContent className="p-6"><Input placeholder="https://example.com" value={headerUrl} onChange={(e) => setHeaderUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkHeaders()} /></CardContent>
              </Card>
              {headerResult && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-3">
                        Status
                        <Badge className={`text-sm ${headerResult.status < 300 ? "bg-green-100 text-green-700" : headerResult.status < 400 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{headerResult.status} {headerResult.statusText}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-1"><Star className="h-3.5 w-3.5 text-primary" />Important SEO Headers</h4>
                      <div className="space-y-2">
                        {headerResult.headers.filter(h => h.important).map((h, i) => (
                          <div key={i} className="p-2 rounded border bg-primary/5">
                            <p className="text-xs font-mono font-bold text-primary">{h.key}</p>
                            <p className="text-xs text-muted-foreground break-all mt-0.5">{h.value}</p>
                          </div>
                        ))}
                        {headerResult.headers.filter(h => h.important).length === 0 && <p className="text-sm text-muted-foreground italic">No important headers found</p>}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-lg">All Headers ({headerResult.headers.length})</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[400px]"><div className="divide-y p-4 space-y-1">
                        {headerResult.headers.map((h, i) => (
                          <div key={i} className="py-2">
                            <p className="text-xs font-mono font-semibold">{h.key}</p>
                            <p className="text-xs text-muted-foreground break-all">{h.value}</p>
                          </div>
                        ))}
                      </div></ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Redirect Chain ─── */}
          <TabsContent value="redirects">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><ArrowRight className="h-5 w-5 text-primary" />Redirect Chain Checker</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Follow all redirects from a URL and see the full chain</p>
                  </div>
                  <Button onClick={checkRedirects} disabled={isLoading || !redirectUrl} className="min-w-[140px]">
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Checking...</> : <><ArrowRight className="h-4 w-4 mr-2" />Check Redirects</>}
                  </Button>
                </CardHeader>
                <CardContent className="p-6"><Input placeholder="https://example.com" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkRedirects()} /></CardContent>
              </Card>

              {redirectChain && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3">
                      Redirect Chain
                      <Badge className={redirectChain.redirectCount === 0 ? "bg-green-100 text-green-700" : redirectChain.redirectCount <= 2 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                        {redirectChain.redirectCount} redirect{redirectChain.redirectCount !== 1 ? "s" : ""}
                      </Badge>
                      {redirectChain.redirectCount > 2 && <span className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Too many redirects hurt SEO</span>}
                      {redirectChain.redirectCount === 0 && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />No redirects — great!</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {redirectChain.chain.map((step, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusColor(step.status)}`}>
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white border flex items-center justify-center text-xs font-bold">{i + 1}</div>
                          {getStatusIcon(step.status)}
                          <a href={step.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all flex-1 min-w-0">{step.url}</a>
                          <Badge className={`flex-shrink-0 text-xs ${step.status < 300 ? "bg-green-100 text-green-700" : step.status < 400 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{step.status}</Badge>
                          {i < redirectChain.chain.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                    {redirectChain.redirectCount >= 1 && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        <strong>Tip:</strong> Each redirect adds latency. For best SEO, link directly to the final URL whenever possible.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          {/* ─── Rank Tracker ─── */}
          <TabsContent value="rank-tracker">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Google / Bing Rank Tracker</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Check where your page ranks for a keyword and track position over 45 days</p>
                  </div>
                  <Button onClick={checkRanking} disabled={isLoading || !rankUrl || !rankKeyword} className="min-w-[140px]">
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Checking...</> : <><Search className="h-4 w-4 mr-2" />Check Rank</>}
                  </Button>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Website URL or Domain</Label>
                    <Input placeholder="example.com" value={rankUrl} onChange={(e) => setRankUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkRanking()} />
                  </div>
                  <div className="space-y-2">
                    <Label>Keyword to Check</Label>
                    <Input placeholder="e.g. best image converter tool" value={rankKeyword} onChange={(e) => setRankKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkRanking()} />
                  </div>
                </CardContent>
              </Card>

              {rankResult && (() => {
                const pos = rankResult.position;
                const posColor = !pos ? "text-muted-foreground" : pos <= 3 ? "text-green-600" : pos <= 10 ? "text-yellow-600" : pos <= 30 ? "text-orange-500" : "text-red-600";
                const posLabel = !pos ? "Not Found" : pos <= 3 ? "Top 3 — Excellent!" : pos <= 10 ? "Page 1 — Great!" : pos <= 30 ? "Page 2–3" : "Low Ranking";
                const posDesc = !pos ? `Not found in top ${rankResult.totalScanned} results` : `Position #${pos} out of ${rankResult.totalScanned} scanned results`;

                const chartData = [...rankHistory].reverse().map((r, i) => ({
                  day: new Date(r.checkedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  position: r.position,
                  label: r.position ? `#${r.position}` : "NF",
                }));

                const bestPos = rankHistory.reduce((b, r) => r.position && (!b || r.position < b) ? r.position : b, null as number | null);
                const worstPos = rankHistory.reduce((b, r) => r.position && (!b || r.position > b) ? r.position : b, null as number | null);

                return (
                  <div className="space-y-6">
                    {/* Current Rank Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="sm:col-span-1 flex flex-col items-center justify-center p-8 text-center">
                        <Trophy className={`h-8 w-8 mb-2 ${posColor}`} />
                        <p className={`text-6xl font-black ${posColor}`}>{pos ? `#${pos}` : "—"}</p>
                        <p className={`text-sm font-semibold mt-2 ${posColor}`}>{posLabel}</p>
                        <p className="text-xs text-muted-foreground mt-1">{posDesc}</p>
                      </Card>

                      <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                        <Card className="p-4 flex flex-col gap-1">
                          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Globe className="h-3 w-3" />Domain</p>
                          <p className="font-bold text-lg truncate">{rankResult.url}</p>
                        </Card>
                        <Card className="p-4 flex flex-col gap-1">
                          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Search className="h-3 w-3" />Keyword</p>
                          <p className="font-bold text-lg truncate">{rankResult.keyword}</p>
                        </Card>
                        <Card className="p-4 flex flex-col gap-1">
                          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-500" />Best Position (45d)</p>
                          <p className="font-black text-2xl text-green-600">{bestPos ? `#${bestPos}` : "—"}</p>
                        </Card>
                        <Card className="p-4 flex flex-col gap-1">
                          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" />Worst Position (45d)</p>
                          <p className="font-black text-2xl text-red-500">{worstPos ? `#${worstPos}` : "—"}</p>
                        </Card>
                      </div>
                    </div>

                    {/* 45-Day Chart */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />Ranking History — Last 45 Days
                          <Badge variant="outline" className="text-xs">{rankHistory.length} checks</Badge>
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={() => fetchRankHistory(rankResult.url, rankResult.keyword)} className="gap-1.5 text-xs">
                          <RefreshCw className="h-3 w-3" />Refresh
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {chartData.length >= 2 ? (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                                <YAxis reversed tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} tickFormatter={(v) => `#${v}`} />
                                <Tooltip
                                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                                  formatter={(v: any) => [`Position #${v}`, "Rank"]}
                                />
                                {pos && <ReferenceLine y={pos} stroke="hsl(var(--primary))" strokeDasharray="4 2" label={{ value: "Now", position: "insideRight", fontSize: 10 }} />}
                                <Line type="monotone" dataKey="position" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} connectNulls={false} />
                              </LineChart>
                            </ResponsiveContainer>
                            <p className="text-xs text-muted-foreground text-center mt-2">Lower position = higher ranking. Check regularly to track trends.</p>
                          </div>
                        ) : (
                          <div className="h-40 flex flex-col items-center justify-center gap-3 text-center">
                            <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
                            <div>
                              <p className="text-sm font-medium">Not enough data for chart yet</p>
                              <p className="text-xs text-muted-foreground mt-1">Check the same keyword a few more times — each check is saved and builds your 45-day history</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Check History Table */}
                    {rankHistory.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle className="text-base">Check History</CardTitle></CardHeader>
                        <CardContent className="p-0">
                          <ScrollArea className="h-56">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-muted/50">
                                <tr className="border-b">
                                  <th className="text-left p-3 font-semibold">Date</th>
                                  <th className="text-left p-3 font-semibold">Keyword</th>
                                  <th className="text-center p-3 font-semibold">Position</th>
                                  <th className="text-center p-3 font-semibold">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rankHistory.map((r, i) => (
                                  <tr key={r.id} className={`border-b last:border-0 ${i === 0 ? "bg-primary/5" : ""}`}>
                                    <td className="p-3 text-muted-foreground text-xs">{new Date(r.checkedAt).toLocaleString()}</td>
                                    <td className="p-3 font-medium truncate max-w-[160px]">{r.keyword}</td>
                                    <td className="p-3 text-center">
                                      <span className={`font-black ${!r.position ? "text-muted-foreground" : r.position <= 3 ? "text-green-600" : r.position <= 10 ? "text-yellow-600" : "text-orange-500"}`}>
                                        {r.position ? `#${r.position}` : "NF"}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <Badge className={`text-xs ${!r.position ? "bg-muted text-muted-foreground" : r.position <= 3 ? "bg-green-100 text-green-700" : r.position <= 10 ? "bg-yellow-100 text-yellow-700" : "bg-orange-100 text-orange-700"}`}>
                                        {!r.position ? "Not Found" : r.position <= 3 ? "Top 3" : r.position <= 10 ? "Page 1" : `Page ${Math.ceil(r.position / 10)}`}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {/* SEO Tips based on position */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm text-blue-800 mb-3 flex items-center gap-1.5"><TrendingUp className="h-4 w-4" />Ranking Improvement Tips</h4>
                        <div className="space-y-2 text-sm text-blue-700">
                          {(!pos || pos > 30) && <p>• Your page isn't ranking well. Focus on on-page SEO: optimize title, H1, and meta description for this keyword.</p>}
                          {pos && pos > 10 && pos <= 30 && <p>• You're on page 2–3. Build quality backlinks and improve content depth to break into page 1.</p>}
                          {pos && pos > 3 && pos <= 10 && <p>• You're on page 1! Add structured data (FAQ schema), improve click-through rate with a compelling title and description.</p>}
                          {pos && pos <= 3 && <p>• Excellent! You're in the top 3. Protect your ranking by keeping content fresh and monitoring competitors.</p>}
                          <p>• Check your ranking daily or weekly — each check is saved so you can see trends over time.</p>
                          <p>• Note: Results are from Bing search. Actual Google rankings may vary slightly.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          {/* ─── Page Speed Analyzer ─── */}
          <TabsContent value="page-speed">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Page Speed Analyzer</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Analyze TTFB, compression, caching, SEO signals, and resource counts</p>
                  </div>
                  <Button onClick={analyzePageSpeed} disabled={isLoading || !pageSpeedUrl} className="min-w-[140px]">
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyzing...</> : <><Zap className="h-4 w-4 mr-2" />Analyze Page</>}
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  <Input placeholder="https://example.com" value={pageSpeedUrl} onChange={(e) => setPageSpeedUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyzePageSpeed()} />
                </CardContent>
              </Card>

              {pageSpeedResult && (() => {
                const s = pageSpeedResult;
                const scoreColor = s.score >= 80 ? "text-green-600" : s.score >= 50 ? "text-yellow-600" : "text-red-600";
                const scoreRing = s.score >= 80 ? "stroke-green-500" : s.score >= 50 ? "stroke-yellow-500" : "stroke-red-500";
                const ttfbColor = s.ttfb < 600 ? "text-green-600" : s.ttfb < 1500 ? "text-yellow-600" : "text-red-600";
                const circumference = 2 * Math.PI * 44;
                const dashOffset = circumference - (s.score / 100) * circumference;

                return (
                  <div className="space-y-6">
                    {/* Score + Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="md:col-span-1 flex flex-col items-center justify-center p-6">
                        <svg width="110" height="110" className="-rotate-90">
                          <circle cx="55" cy="55" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                          <circle cx="55" cy="55" r="44" fill="none" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" className={`transition-all duration-700 ${scoreRing}`} />
                        </svg>
                        <div className="mt-2 text-center">
                          <p className={`text-4xl font-black ${scoreColor}`}>{s.score}</p>
                          <p className="text-xs text-muted-foreground font-semibold mt-0.5">SEO Score</p>
                        </div>
                      </Card>

                      <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: "TTFB", value: `${s.ttfb}ms`, color: ttfbColor, icon: <Zap className="h-4 w-4" />, sub: s.ttfb < 600 ? "Excellent" : s.ttfb < 1500 ? "Moderate" : "Slow" },
                          { label: "HTML Size", value: `${s.htmlSizeKb}KB`, color: s.htmlSizeKb < 50 ? "text-green-600" : s.htmlSizeKb < 100 ? "text-yellow-600" : "text-red-600", icon: <FileText className="h-4 w-4" />, sub: s.htmlSizeKb < 50 ? "Good" : s.htmlSizeKb < 100 ? "Moderate" : "Large" },
                          { label: "Compression", value: s.isCompressed ? "Enabled" : "None", color: s.isCompressed ? "text-green-600" : "text-red-600", icon: <Server className="h-4 w-4" />, sub: s.isCompressed ? "gzip/brotli" : "Missing!" },
                          { label: "HTTPS", value: s.isHttps ? "Yes" : "No", color: s.isHttps ? "text-green-600" : "text-red-600", icon: <CheckCircle className="h-4 w-4" />, sub: s.isHttps ? "Secure" : "Not Secure" },
                          { label: "Cache", value: s.hasCache ? "Yes" : "None", color: s.hasCache ? "text-green-600" : "text-yellow-600", icon: <BarChart3 className="h-4 w-4" />, sub: s.hasCache ? s.cacheControl.slice(0, 20) || "Present" : "Missing" },
                          { label: "Mobile Ready", value: s.hasViewport ? "Yes" : "No", color: s.hasViewport ? "text-green-600" : "text-red-600", icon: <MonitorSmartphone className="h-4 w-4" />, sub: s.hasViewport ? "Viewport set" : "No viewport!" },
                        ].map(({ label, value, color, icon, sub }) => (
                          <div key={label} className="p-3 rounded-xl border bg-card flex flex-col gap-1">
                            <div className={`flex items-center gap-1.5 text-xs font-semibold text-muted-foreground`}>{icon}{label}</div>
                            <p className={`text-xl font-black ${color}`}>{value}</p>
                            <p className="text-[10px] text-muted-foreground">{sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resources + SEO Signals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Resource Counts</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {[
                            { label: "External Scripts", count: s.scriptCount, warn: 10, icon: <Code2 className="h-4 w-4 text-blue-500" /> },
                            { label: "Stylesheets", count: s.styleCount, warn: 5, icon: <FileCode className="h-4 w-4 text-purple-500" /> },
                            { label: "Images", count: s.imageCount, warn: 30, icon: <Image className="h-4 w-4 text-green-500" /> },
                            { label: "iFrames", count: s.iframeCount, warn: 2, icon: <Globe className="h-4 w-4 text-orange-500" /> },
                          ].map(({ label, count, warn, icon }) => (
                            <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <div className="flex items-center gap-2 text-sm">{icon}{label}</div>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${Math.min(100, (count / (warn * 1.5)) * 100)}%` }} /></div>
                                <span className={`text-sm font-bold min-w-[2rem] text-right ${count > warn ? "text-red-500" : "text-green-600"}`}>{count}</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-primary" />SEO Signals</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {[
                            { label: "Title Tag", value: s.title ? `"${s.title.slice(0, 40)}${s.title.length > 40 ? "…" : ""}"` : "Missing", ok: !!s.title },
                            { label: "Meta Description", value: s.description ? `"${s.description.slice(0, 40)}${s.description.length > 40 ? "…" : ""}"` : "Missing", ok: !!s.description },
                            { label: "Canonical URL", value: s.canonical ? "Present" : "Not found", ok: !!s.canonical },
                            { label: "H1 Tag", value: s.h1Count === 1 ? "1 (Perfect)" : s.h1Count === 0 ? "Missing" : `${s.h1Count} (Too many)`, ok: s.h1Count === 1 },
                            { label: "HSTS", value: s.hasHsts ? "Enabled" : "Missing", ok: s.hasHsts },
                            { label: "Server", value: s.server, ok: true },
                          ].map(({ label, value, ok }) => (
                            <div key={label} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                              <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                                {ok ? <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                                {label}
                              </div>
                              <span className="text-xs text-muted-foreground truncate max-w-[160px] text-right">{value}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Issues */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-primary" />Issues & Recommendations
                          <div className="flex gap-2 text-xs">
                            <Badge className="bg-red-100 text-red-700">{pageSpeedResult.issues.filter(i => i.type === "error").length} errors</Badge>
                            <Badge className="bg-yellow-100 text-yellow-700">{pageSpeedResult.issues.filter(i => i.type === "warning").length} warnings</Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {s.issues.map((issue, i) => (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${issue.type === "error" ? "bg-red-50 border-red-200" : issue.type === "warning" ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
                            {issue.type === "error" ? <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" /> : issue.type === "warning" ? <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" /> : <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />}
                            <div>
                              <p className={`text-sm font-medium ${issue.type === "error" ? "text-red-800" : issue.type === "warning" ? "text-yellow-800" : "text-green-800"}`}>{issue.message}</p>
                              <p className={`text-xs mt-0.5 ${issue.type === "error" ? "text-red-600" : issue.type === "warning" ? "text-yellow-600" : "text-green-600"}`}>{issue.impact}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          {/* ─── History & Compare ─── */}
          <TabsContent value="history">
            <AuditHistoryCompare />
          </TabsContent>

          {/* ─── Sitemap Generator ─── */}
          <TabsContent value="sitemap-gen">
            <SitemapGenerator />
          </TabsContent>

          {/* ─── AI Meta Tag Generator ─── */}
          <TabsContent value="ai-meta">
            <AIMetaTagGenerator />
          </TabsContent>

          {/* ─── Core Web Vitals ─── */}
          <TabsContent value="web-vitals">
            <CoreWebVitals />
          </TabsContent>

          {/* ─── Word Count Checker ─── */}
          <TabsContent value="word-count">
            <WordCountChecker />
          </TabsContent>

          {/* ─── URL Slug Generator ─── */}
          <TabsContent value="slug-gen">
            <URLSlugGenerator />
          </TabsContent>

          {/* ─── Keyword Gap Analyzer ─── */}
          <TabsContent value="keyword-gap">
            <KeywordGapAnalyzer />
          </TabsContent>

          {/* ─── GSC Importer ─── */}
          <TabsContent value="gsc-import">
            <GSCImporter />
          </TabsContent>

          {/* ─── Content Match ─── */}
          <TabsContent value="content-match">
            <ContentMatchTool />
          </TabsContent>

          {/* ─── Watermark Remover ─── */}
          <TabsContent value="watermark">
            <WatermarkRemover />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
