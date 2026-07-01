import OpenAI from "openai";
import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import sharp from "sharp";
import archiver from "archiver";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
// @ts-ignore
import potrace from "potrace";
import { promisify } from "util";

const trace = promisify(potrace.trace);
import { api } from "@shared/routes";
import {
  conversionOptionsSchema,
  processRequestSchema,
  mergeRequestSchema,
  formats,
  documentConversionRequestSchema,
  insertReviewSchema,
} from "@shared/schema";
import { storage as dbStorage } from "./storage";
import { db } from "./db";
import { rankChecks, auditSnapshots } from "../shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { z } from "zod";
import CleanCSS from "clean-css";
import beautify from "js-beautify";
import { minify as htmlMinify } from "html-minifier-terser";
import { minify as jsMinify } from "terser";
import axios from "axios";
import * as cheerio from "cheerio";

// pdf-parse - handle ESM import
let pdfParse: any;

// Setup directories
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const OUTPUT_DIR = path.join(process.cwd(), "output");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 } // Increased limit to 200MB
});

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {

  // ── robots.txt ─────────────────────────────────────────────────────────────
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
`User-agent: *
Allow: /

Sitemap: https://imageconvert.tools/sitemap.xml

# Key pages
Allow: /
Allow: /free-seo-audit
Allow: /seo-audit
Allow: /seo-tools
Allow: /text-to-html
Allow: /web-tools
Allow: /faq
`);
  });

  // ── sitemap.xml ────────────────────────────────────────────────────────────
  app.get("/sitemap.xml", (_req, res) => {
    const base = "https://imageconvert.tools";
    const today = new Date().toISOString().split("T")[0];
    const pages = [
      { loc: "/",               priority: "1.0", changefreq: "weekly"  },
      { loc: "/free-seo-audit", priority: "0.9", changefreq: "weekly"  },
      { loc: "/seo-audit",      priority: "0.9", changefreq: "weekly"  },
      { loc: "/seo-tools",      priority: "0.9", changefreq: "weekly"  },
      { loc: "/text-to-html",   priority: "0.7", changefreq: "monthly" },
      { loc: "/web-tools",      priority: "0.7", changefreq: "monthly" },
      { loc: "/faq",            priority: "0.6", changefreq: "monthly" },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${base}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.type("application/xml").send(xml);
  });

  // Reviews API
  app.get("/api/reviews", async (req, res) => {
    try {
      const pagePath = (req.query.pagePath as string) || "/";
      const reviewsData = await dbStorage.getReviews(pagePath);
      res.json(reviewsData);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "unknown",
      });
      const review = await dbStorage.createReview(reviewData);
      res.json(review);
    } catch (err: any) {
      console.error("Review error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Page Speed Analyzer
  app.post("/api/seo/page-speed", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      let fullUrl = url;
      if (!fullUrl.startsWith("http")) fullUrl = "https://" + fullUrl;

      const start = Date.now();
      const response = await axios.get(fullUrl, {
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PageSpeedBot/1.0)", "Accept-Encoding": "gzip, deflate, br" },
        responseType: "text",
      });
      const ttfb = Date.now() - start;

      const html: string = response.data || "";
      const htmlSize = Buffer.byteLength(html, "utf8");

      // Count resources
      const scriptMatches = html.match(/<script[^>]+src=/gi) || [];
      const styleMatches = html.match(/<link[^>]+stylesheet/gi) || [];
      const imgMatches = html.match(/<img[^>]+src=/gi) || [];
      const iframeMatches = html.match(/<iframe[^>]+src=/gi) || [];

      const headers = response.headers;
      const isCompressed = !!(headers["content-encoding"] && /gzip|br|deflate/.test(String(headers["content-encoding"])));
      const hasCache = !!(headers["cache-control"] || headers["expires"]);
      const cacheControl = String(headers["cache-control"] || "");
      const isHttps = fullUrl.startsWith("https://");
      const hasXRobots = !!headers["x-robots-tag"];
      const contentType = String(headers["content-type"] || "");
      const isHtml = contentType.includes("text/html");
      const server = String(headers["server"] || "Unknown");
      const hasHsts = !!headers["strict-transport-security"];

      // Extract meta info
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || html.match(/<meta[^>]+content=["']([^"']*)[^>]+name=["']description["']/i);
      const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i);
      const viewportMatch = html.match(/<meta[^>]+name=["']viewport["']/i);
      const h1Matches = html.match(/<h1[^>]*>/gi) || [];

      const title = titleMatch ? titleMatch[1].trim() : null;
      const description = descMatch ? descMatch[1].trim() : null;
      const canonical = canonicalMatch ? canonicalMatch[1].trim() : null;
      const hasViewport = !!viewportMatch;
      const h1Count = h1Matches.length;

      // Performance score calculation
      const issues: { type: "error" | "warning" | "info"; message: string; impact: string }[] = [];
      let scorePenalty = 0;

      if (ttfb > 1500) { issues.push({ type: "error", message: `Slow TTFB: ${ttfb}ms (target < 600ms)`, impact: "High impact on Core Web Vitals" }); scorePenalty += 25; }
      else if (ttfb > 600) { issues.push({ type: "warning", message: `Moderate TTFB: ${ttfb}ms (target < 600ms)`, impact: "Moderate impact on Core Web Vitals" }); scorePenalty += 10; }

      if (!isCompressed) { issues.push({ type: "error", message: "No compression detected (gzip/brotli)", impact: "Can reduce transfer size by 60-80%" }); scorePenalty += 20; }
      if (!hasCache) { issues.push({ type: "warning", message: "No cache-control headers found", impact: "Repeat visitors re-download resources" }); scorePenalty += 10; }
      if (!isHttps) { issues.push({ type: "error", message: "Page not served over HTTPS", impact: "Security risk + Google ranking penalty" }); scorePenalty += 15; }
      if (!hasHsts) { issues.push({ type: "warning", message: "HSTS header missing", impact: "Reduced HTTPS security" }); scorePenalty += 5; }
      if (scriptMatches.length > 10) { issues.push({ type: "warning", message: `${scriptMatches.length} external scripts detected`, impact: "Each script blocks rendering" }); scorePenalty += 10; }
      if (styleMatches.length > 5) { issues.push({ type: "warning", message: `${styleMatches.length} external stylesheets detected`, impact: "Render-blocking resources" }); scorePenalty += 5; }
      if (htmlSize > 100000) { issues.push({ type: "warning", message: `Large HTML size: ${Math.round(htmlSize / 1024)}KB`, impact: "Consider minification" }); scorePenalty += 5; }
      if (!hasViewport) { issues.push({ type: "error", message: "No viewport meta tag found", impact: "Not mobile-friendly" }); scorePenalty += 15; }
      if (!title) { issues.push({ type: "error", message: "No <title> tag found", impact: "Critical for SEO" }); scorePenalty += 10; }
      if (title && title.length > 60) { issues.push({ type: "warning", message: `Title too long: ${title.length} chars (max 60)`, impact: "May be truncated in search results" }); scorePenalty += 5; }
      if (!description) { issues.push({ type: "warning", message: "No meta description found", impact: "Missed CTR opportunity in search results" }); scorePenalty += 5; }
      if (h1Count === 0) { issues.push({ type: "error", message: "No <h1> tag found", impact: "Critical for SEO structure" }); scorePenalty += 10; }
      if (h1Count > 1) { issues.push({ type: "warning", message: `Multiple <h1> tags (${h1Count})`, impact: "Only one H1 recommended per page" }); scorePenalty += 5; }

      if (issues.length === 0) issues.push({ type: "info", message: "No issues detected — great job!", impact: "Page looks well-optimized" });

      const score = Math.max(0, Math.min(100, 100 - scorePenalty));

      res.json({
        url: fullUrl,
        ttfb,
        htmlSize,
        htmlSizeKb: Math.round(htmlSize / 1024),
        status: response.status,
        isCompressed,
        hasCache,
        cacheControl,
        isHttps,
        hasHsts,
        server,
        scriptCount: scriptMatches.length,
        styleCount: styleMatches.length,
        imageCount: imgMatches.length,
        iframeCount: iframeMatches.length,
        hasViewport,
        title,
        description,
        canonical,
        h1Count,
        score,
        issues,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to analyze page: " + err.message });
    }
  });

  // Rank Check — search Bing for keyword, find URL position, save to DB
  app.post("/api/seo/rank-check", async (req, res) => {
    try {
      const { url, keyword } = req.body;
      if (!url || !keyword) return res.status(400).json({ error: "URL and keyword are required" });

      let domain = url;
      if (!domain.startsWith("http")) domain = "https://" + domain;
      const hostname = new URL(domain).hostname.replace(/^www\./, "");

      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&count=50&first=1`;
      const r = await axios.get(searchUrl, {
        timeout: 12000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      const html: string = r.data || "";
      // Extract result URLs from Bing
      const linkRegex = /href="(https?:\/\/[^"]+)"/g;
      const allLinks: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null) {
        const href = m[1];
        if (href.includes("bing.com") || href.includes("microsoft.com") || href.includes("msn.com")) continue;
        if (href.startsWith("http") && !allLinks.includes(href)) allLinks.push(href);
      }

      // Deduplicate by domain, keep first occurrence per domain
      const seenDomains = new Set<string>();
      const results: string[] = [];
      for (const link of allLinks) {
        try {
          const h = new URL(link).hostname.replace(/^www\./, "");
          if (!seenDomains.has(h)) { seenDomains.add(h); results.push(link); }
        } catch {}
        if (results.length >= 100) break;
      }

      let position: number | null = null;
      for (let i = 0; i < results.length; i++) {
        try {
          const h = new URL(results[i]).hostname.replace(/^www\./, "");
          if (h === hostname || h.includes(hostname) || hostname.includes(h)) {
            position = i + 1;
            break;
          }
        } catch {}
      }

      // Save to DB
      await db.insert(rankChecks).values({ url: hostname, keyword, position });

      res.json({ url: hostname, keyword, position, checkedAt: new Date().toISOString(), totalScanned: results.length });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to check ranking: " + err.message });
    }
  });

  // Rank History — return last 45 days of checks for a url+keyword
  app.get("/api/seo/rank-history", async (req, res) => {
    try {
      const { url, keyword } = req.query as { url: string; keyword: string };
      if (!url || !keyword) return res.status(400).json({ error: "url and keyword are required" });

      const since = new Date();
      since.setDate(since.getDate() - 45);

      const rows = await db
        .select()
        .from(rankChecks)
        .where(and(eq(rankChecks.url, url), eq(rankChecks.keyword, keyword), gte(rankChecks.checkedAt, since)))
        .orderBy(desc(rankChecks.checkedAt));

      res.json({ history: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // HTTP Header Checker
  app.post("/api/seo/http-headers", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      let fullUrl = url;
      if (!fullUrl.startsWith("http")) fullUrl = "https://" + fullUrl;
      const r = await axios.head(fullUrl, {
        timeout: 10000,
        maxRedirects: 0,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const importantHeaders = [
        "content-type", "x-robots-tag", "cache-control", "content-encoding",
        "strict-transport-security", "x-frame-options", "x-content-type-options",
        "content-security-policy", "server", "last-modified", "etag",
        "access-control-allow-origin", "link", "vary",
      ];
      const allHeaders = Object.entries(r.headers).map(([key, value]) => ({
        key,
        value: Array.isArray(value) ? value.join(", ") : String(value),
        important: importantHeaders.includes(key.toLowerCase()),
      }));
      res.json({ status: r.status, statusText: r.statusText, headers: allHeaders });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch headers: " + err.message });
    }
  });

  // Redirect Chain Checker
  app.post("/api/seo/redirect-chain", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      let currentUrl = url;
      if (!currentUrl.startsWith("http")) currentUrl = "https://" + currentUrl;
      const chain: { url: string; status: number; statusText: string }[] = [];
      let hops = 0;
      while (hops < 10) {
        const r = await axios.head(currentUrl, {
          timeout: 8000,
          maxRedirects: 0,
          validateStatus: () => true,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        chain.push({ url: currentUrl, status: r.status, statusText: r.statusText });
        if (r.status >= 300 && r.status < 400 && r.headers.location) {
          currentUrl = new URL(r.headers.location, currentUrl).href;
          hops++;
        } else {
          break;
        }
      }
      res.json({ chain, redirectCount: chain.length - 1 });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to check redirects: " + err.message });
    }
  });

  // Broken Link Checker
  app.post("/api/seo/broken-links", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      let baseUrl = url;
      if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;

      const origin = new URL(baseUrl).origin;

      const pageRes = await axios.get(baseUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(pageRes.data);
      const links: string[] = [];

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        try {
          const abs = new URL(href, baseUrl).href;
          if (!links.includes(abs) && links.length < 80) links.push(abs);
        } catch {}
      });

      const results = await Promise.all(links.map(async (link) => {
        try {
          const r = await axios.head(link, { timeout: 8000, maxRedirects: 5, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0' } });
          return { url: link, status: r.status, broken: r.status >= 400, type: link.startsWith(origin) ? "internal" : "external" };
        } catch (e: any) {
          return { url: link, status: 0, broken: true, error: e.message, type: link.startsWith(origin) ? "internal" : "external" };
        }
      }));

      const broken = results.filter(r => r.broken);
      res.json({ total: results.length, brokenCount: broken.length, results });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to check links: " + err.message });
    }
  });

  // Content Readability Analyzer
  app.post("/api/seo/readability", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      const words = text.split(/\s+/).filter((w: string) => w.trim().length > 0);
      const syllableCount = (word: string) => {
        word = word.toLowerCase().replace(/[^a-z]/g, "");
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
        word = word.replace(/^y/, "");
        const m = word.match(/[aeiouy]{1,2}/g);
        return m ? m.length : 1;
      };
      const totalSyllables = words.reduce((sum: number, w: string) => sum + syllableCount(w), 0);
      const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
      const avgSyllablesPerWord = totalSyllables / Math.max(words.length, 1);

      const fleschEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
      const fleschKincaidGrade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

      let level = "Very Difficult";
      let levelColor = "red";
      if (fleschEase >= 90) { level = "Very Easy"; levelColor = "green"; }
      else if (fleschEase >= 80) { level = "Easy"; levelColor = "green"; }
      else if (fleschEase >= 70) { level = "Fairly Easy"; levelColor = "lime"; }
      else if (fleschEase >= 60) { level = "Standard"; levelColor = "yellow"; }
      else if (fleschEase >= 50) { level = "Fairly Difficult"; levelColor = "orange"; }
      else if (fleschEase >= 30) { level = "Difficult"; levelColor = "red"; }

      const suggestions: string[] = [];
      if (avgWordsPerSentence > 20) suggestions.push("Try to shorten your sentences. Aim for under 20 words per sentence.");
      if (avgSyllablesPerWord > 1.5) suggestions.push("Use simpler, shorter words to improve readability.");
      if (fleschKincaidGrade > 12) suggestions.push("Content reads at a college level. Consider simplifying for a wider audience.");
      if (words.length < 300) suggestions.push("Add more content — pages with 300+ words tend to rank better.");
      if (sentences.length < 5) suggestions.push("Break your text into more sentences for better readability.");

      res.json({
        wordCount: words.length,
        sentenceCount: sentences.length,
        syllableCount: totalSyllables,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10,
        fleschEase: Math.round(fleschEase * 10) / 10,
        fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
        level,
        levelColor,
        suggestions,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/seo/suggest-keywords", async (req, res) => {
    try {
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are an SEO expert. Given a page title, provide exactly 20 high-performing, relevant Google keywords as a comma-separated list. No introductory text."
          },
          {
            role: "user",
            content: `Title: ${title}`
          }
        ]
      });

      const content = response.choices[0].message.content || "";
      const keywords = content.split(",").map(kw => kw.trim()).filter(kw => kw.length > 0);

      res.json({ keywords });
    } catch (err: any) {
      console.error("OpenAI Error:", err);
      res.status(500).json({ error: "Failed to generate keywords: " + (err.message || "Unknown error") });
    }
  });

  // ── AI Meta Tag Generator ─────────────────────────────────────────────────
  app.post("/api/seo/ai-meta-tags", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic or URL is required" });

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are an expert SEO copywriter. Given a topic or URL, generate:
1. An SEO-optimized title tag (MUST be under 60 characters, include primary keyword near the start)
2. A compelling meta description (MUST be under 160 characters, include a call to action)
3. A list of 8 relevant keyword suggestions (comma-separated)

Respond ONLY with valid JSON in this exact format:
{"title": "...", "description": "...", "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"]}`
          },
          { role: "user", content: `Topic/URL: ${topic}` }
        ]
      });

      const raw = response.choices[0].message.content || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to generate meta tags: " + (err.message || "Unknown error") });
    }
  });

  // ── Core Web Vitals ────────────────────────────────────────────────────────
  app.get("/api/seo/core-web-vitals", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") return res.status(400).json({ error: "URL required" });

      const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || "";

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      const fetchVitals = async (strategy: "mobile" | "desktop", attempt = 0): Promise<any> => {
        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=PERFORMANCE${apiKey ? `&key=${apiKey}` : ""}`;
        try {
          const r = await axios.get(apiUrl, { timeout: 45000 });
          const lr = r.data.lighthouseResult;
          const audits = lr.audits;
          return {
            score: Math.round((lr.categories.performance.score ?? 0) * 100),
            lcp:   Math.round((audits["largest-contentful-paint"]?.numericValue ?? 0) / 100) / 10,
            tbt:   Math.round(audits["total-blocking-time"]?.numericValue ?? 0),
            cls:   Math.round((audits["cumulative-layout-shift"]?.numericValue ?? 0) * 1000) / 1000,
            fcp:   Math.round((audits["first-contentful-paint"]?.numericValue ?? 0) / 100) / 10,
            si:    Math.round((audits["speed-index"]?.numericValue ?? 0) / 100) / 10,
            tti:   Math.round((audits["interactive"]?.numericValue ?? 0) / 100) / 10,
          };
        } catch (e: any) {
          const status = e.response?.status;
          if (status === 429 && attempt < 3) {
            const delay = [4000, 8000, 16000][attempt];
            await sleep(delay);
            return fetchVitals(strategy, attempt + 1);
          }
          if (status === 429) {
            throw new Error("RATE_LIMITED");
          }
          throw e;
        }
      };

      // Run sequentially to halve the rate-limit pressure
      const mobile = await fetchVitals("mobile");
      await sleep(1500);
      const desktop = await fetchVitals("desktop");

      res.json({ mobile, desktop });
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        return res.status(429).json({
          error: "RATE_LIMITED",
          message: "Google PageSpeed Insights rate limit reached. Please wait a minute and try again, or add a free Google API key (GOOGLE_PAGESPEED_API_KEY) for a much higher quota."
        });
      }
      res.status(500).json({ error: "Failed to fetch Core Web Vitals: " + (err.message || "Unknown error") });
    }
  });

  // ── Word Count Checker ─────────────────────────────────────────────────────
  app.post("/api/seo/word-count", async (req, res) => {
    try {
      const { url, text } = req.body;
      let content = text || "";

      if (url && !text) {
        const r = await axios.get(url, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
        const $ = cheerio.load(r.data);
        $("script, style, nav, header, footer, aside").remove();
        content = $("body").text().replace(/\s+/g, " ").trim();
      }

      if (!content) return res.status(400).json({ error: "Provide a URL or text" });

      const words      = content.match(/\b\w+\b/g) || [];
      const sentences  = content.split(/[.!?]+/).filter(s => s.trim().length > 5).length;
      const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim()).length;
      const chars      = content.replace(/\s/g, "").length;
      const readingMin = Math.ceil(words.length / 230);

      res.json({
        wordCount:  words.length,
        sentences,
        paragraphs,
        charCount:  chars,
        readingTime: readingMin,
        recommendations: {
          blog:       { min: 1500, max: 2500, label: "Blog Post" },
          landing:    { min: 500,  max: 1000, label: "Landing Page" },
          product:    { min: 300,  max: 600,  label: "Product Page" },
          homepage:   { min: 300,  max: 500,  label: "Homepage" },
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to analyse: " + (err.message || "Unknown error") });
    }
  });

  // ── Competitor Keyword Gap ─────────────────────────────────────────────────
  app.post("/api/seo/keyword-gap", async (req, res) => {
    try {
      const { domain1, domain2 } = req.body;
      if (!domain1 || !domain2) return res.status(400).json({ error: "Both domains are required" });

      const normalise = (d: string) => d.startsWith("http") ? d.trim() : `https://${d.trim()}`;
      const url1 = normalise(domain1);
      const url2 = normalise(domain2);

      // Crawl a site: homepage + up to 12 internal links
      const crawlSite = async (baseUrl: string) => {
        const visited = new Set<string>();
        const pages: string[] = [baseUrl];
        const extracted: string[] = [];

        const host = new URL(baseUrl).hostname;
        const fetchPage = async (u: string) => {
          if (visited.has(u) || visited.size >= 13) return;
          visited.add(u);
          try {
            const r = await axios.get(u, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } });
            const $ = cheerio.load(r.data);
            const title = $("title").text().trim();
            const desc  = $('meta[name="description"]').attr("content") || "";
            const h1    = $("h1").map((_, el) => $(el).text().trim()).get().join(" | ");
            const h2    = $("h2").map((_, el) => $(el).text().trim()).get().slice(0, 6).join(" | ");
            const h3    = $("h3").map((_, el) => $(el).text().trim()).get().slice(0, 6).join(" | ");
            if (title || h1) extracted.push(`PAGE: ${u}\nTitle: ${title}\nDesc: ${desc}\nH1: ${h1}\nH2: ${h2}\nH3: ${h3}`);

            // collect internal links
            $("a[href]").each((_, el) => {
              const href = $(el).attr("href") || "";
              if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
              try {
                const full = href.startsWith("http") ? href : new URL(href, baseUrl).href;
                if (new URL(full).hostname === host && !visited.has(full) && pages.length < 13) {
                  pages.push(full);
                }
              } catch {}
            });
          } catch {}
        };

        // Also try sitemap
        try {
          const sm = await axios.get(`${baseUrl}/sitemap.xml`, { timeout: 5000 });
          const $s = cheerio.load(sm.data, { xmlMode: true });
          $s("loc").each((_, el) => {
            const loc = $s(el).text().trim();
            try {
              if (new URL(loc).hostname === host && !pages.includes(loc) && pages.length < 13) pages.push(loc);
            } catch {}
          });
        } catch {}

        for (const p of pages) { await fetchPage(p); }
        return extracted.join("\n\n");
      };

      const [content1, content2] = await Promise.all([crawlSite(url1), crawlSite(url2)]);

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const prompt = `You are an expert SEO analyst. You have crawled two websites and extracted their page titles, headings, and meta descriptions.

SITE A (${domain1}):
${content1.slice(0, 6000)}

SITE B (${domain2}):
${content2.slice(0, 6000)}

Analyse the content and return a JSON object with this exact structure:
{
  "siteA": { "domain": "${domain1}", "topTopics": ["topic1","topic2",...up to 10] },
  "siteB": { "domain": "${domain2}", "topTopics": ["topic1","topic2",...up to 10] },
  "gaps": [
    { "keyword": "keyword or topic phrase", "competitorPages": 2, "opportunity": "Why Site A should target this", "difficulty": "Low|Medium|High", "intent": "Informational|Commercial|Transactional" }
  ],
  "sharedTopics": ["topic1","topic2",...up to 8],
  "quickWins": ["Specific actionable recommendation 1","Recommendation 2",...up to 5],
  "summary": "2-3 sentence overall analysis"
}
gaps should list 8-12 keywords/topics that Site B covers but Site A does NOT cover, sorted by opportunity.
Respond with ONLY the JSON object, no markdown or extra text.`;

      const resp = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
      });

      const raw = (resp.choices[0].message.content || "{}").replace(/```json|```/g, "").trim();
      const data = JSON.parse(raw);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Analysis failed: " + (err.message || "Unknown error") });
    }
  });

  // ── GSC CSV Import ─────────────────────────────────────────────────────────
  const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post("/api/seo/gsc-import", csvUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "CSV file required" });

      const text = req.file.buffer.toString("utf-8");
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return res.status(400).json({ error: "CSV appears empty" });

      const rawHeader = lines[0];
      const headers = rawHeader.split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());

      const col = (name: string) => headers.findIndex(h => h.includes(name));
      const qIdx  = col("query");
      const pIdx  = col("page") !== -1 && qIdx === -1 ? col("page") : -1;
      const clIdx = col("click");
      const imIdx = col("impression");
      const ctIdx = col("ctr");
      const poIdx = col("position");

      const rows = lines.slice(1).map(line => {
        // handle quoted CSV fields
        const cells: string[] = [];
        let cur = "", inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === "," && !inQ) { cells.push(cur); cur = ""; }
          else { cur += ch; }
        }
        cells.push(cur);
        const get = (i: number) => (cells[i] || "").trim().replace(/^"|"$/g, "");
        const parseCtr = (v: string) => parseFloat(v.replace("%", "")) || 0;
        return {
          keyword:     qIdx  !== -1 ? get(qIdx)  : (pIdx !== -1 ? get(pIdx) : get(0)),
          page:        pIdx  !== -1 ? get(pIdx)  : "",
          clicks:      parseInt(get(clIdx)) || 0,
          impressions: parseInt(get(imIdx)) || 0,
          ctr:         parseCtr(get(ctIdx)),
          position:    parseFloat(get(poIdx))  || 0,
        };
      }).filter(r => r.keyword && r.impressions > 0);

      // Analysis
      const total = rows.length;
      const totalClicks      = rows.reduce((s, r) => s + r.clicks, 0);
      const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);

      const sorted = [...rows].sort((a, b) => b.impressions - a.impressions);
      const top20  = sorted.slice(0, 20);

      // Quick wins: position 4-20, decent impressions
      const quickWins = rows
        .filter(r => r.position >= 4 && r.position <= 20 && r.impressions >= 100)
        .sort((a, b) => a.position - b.position)
        .slice(0, 15);

      // Position bands
      const bands = { top3: 0, p4to10: 0, p11to20: 0, p21plus: 0 };
      rows.forEach(r => {
        if (r.position <= 3)       bands.top3++;
        else if (r.position <= 10) bands.p4to10++;
        else if (r.position <= 20) bands.p11to20++;
        else                       bands.p21plus++;
      });

      // Low CTR (high impressions, below-average CTR for their position)
      const lowCtr = rows
        .filter(r => r.impressions >= 200 && r.position <= 10 && r.ctr < 2)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10);

      res.json({ total, totalClicks, totalImpressions, avgPosition: rows.length ? (rows.reduce((s,r) => s+r.position,0)/rows.length).toFixed(1) : "0",
        top20, quickWins, lowCtr, bands, isPageReport: pIdx !== -1 && qIdx === -1 });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to parse CSV: " + (err.message || "Unknown error") });
    }
  });

  // ── URL Slug Generator ─────────────────────────────────────────────────────
  // ── Content Match Tool ─────────────────────────────────────────────────────
  app.post("/api/seo/content-match", async (req, res) => {
    try {
      const { url, content } = req.body;
      if (!url || !content) return res.status(400).json({ error: "URL and content are required" });

      const r = await axios.get(url.startsWith("http") ? url : `https://${url}`, {
        timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" }
      });
      const $ = cheerio.load(r.data);
      $("script,style,nav,header,footer,aside,noscript").remove();
      const pageText = $("body").text().replace(/\s+/g, " ").trim().toLowerCase();

      // Split user content into sentences
      const sentences = content
        .split(/(?<=[.!?])\s+|[\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 15);

      // For each sentence check if it (or key phrases from it) appear on the page
      const wordOverlap = (a: string, b: string): number => {
        const wordsA = a.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3);
        if (!wordsA.length) return 0;
        const matches = wordsA.filter(w => b.includes(w));
        return matches.length / wordsA.length;
      };

      const results = sentences.map((sentence: string) => {
        const score = wordOverlap(sentence, pageText);
        return { text: sentence, score, matched: score >= 0.6 };
      });

      const matched  = results.filter((r: {matched: boolean}) => r.matched).length;
      const matchPct = Math.round((matched / results.length) * 100);

      // Also return key phrases from page not in user content (bonus context)
      const pageSentences = $("p,h1,h2,h3,li").map((_, el) => $(el).text().trim()).get()
        .filter(s => s.length > 20).slice(0, 30);

      res.json({ results, matchPct, total: results.length, matched, pageSentences });
    } catch (err: any) {
      res.status(500).json({ error: "Content match failed: " + (err.message || "Unknown error") });
    }
  });

  // ── Watermark Remover ──────────────────────────────────────────────────────
  const wmUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

  // Content-aware fill helper: samples border pixels around a region and fills it
  async function contentAwareFill(imgBuf: Buffer, left: number, top: number, width: number, height: number, iW: number, iH: number): Promise<Buffer> {
    // Expand a padding zone around the watermark region to sample surrounding context
    const pad    = Math.max(20, Math.round(Math.max(width, height) * 0.5));
    const pLeft  = Math.max(0, left - pad);
    const pTop   = Math.max(0, top  - pad);
    const pRight = Math.min(iW, left + width  + pad);
    const pBot   = Math.min(iH, top  + height + pad);
    const pW     = pRight - pLeft;
    const pH     = pBot   - pTop;

    // Heavily blur the padded region — this averages surrounding pixels
    const blurSigma = Math.max(15, Math.round(Math.max(width, height) * 0.4));
    const blurredPad = await sharp(imgBuf)
      .extract({ left: pLeft, top: pTop, width: pW, height: pH })
      .blur(blurSigma)
      .toBuffer();

    // Extract only the watermark-sized slice from the blurred patch
    const sliceLeft = left - pLeft;
    const sliceTop  = top  - pTop;
    const fill = await sharp(blurredPad)
      .extract({ left: sliceLeft, top: sliceTop, width, height })
      .toBuffer();

    // Composite fill back and apply gentle edge-blend blur
    const intermediate = await sharp(imgBuf)
      .composite([{ input: fill, left, top }])
      .toBuffer();

    // Second pass: slight blur on the seam only
    const seamPad  = 6;
    const sLeft    = Math.max(0, left   - seamPad);
    const sTop     = Math.max(0, top    - seamPad);
    const sWidth   = Math.min(iW - sLeft, width  + seamPad * 2);
    const sHeight  = Math.min(iH - sTop,  height + seamPad * 2);
    const seamRegion = await sharp(intermediate).extract({ left: sLeft, top: sTop, width: sWidth, height: sHeight }).blur(2).toBuffer();

    return sharp(intermediate)
      .composite([{ input: seamRegion, left: sLeft, top: sTop }])
      .jpeg({ quality: 95 })
      .toBuffer();
  }

  // Auto-remove: GPT-4o Vision detects watermarks, Sharp removes them
  app.post("/api/image/auto-remove-watermark", wmUpload.single("image"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Image required" });

      const imgBuf = req.file.buffer;
      const meta   = await sharp(imgBuf).metadata();
      const iW     = meta.width!;
      const iH     = meta.height!;

      // Resize to max 1200px for vision API (keeps cost + speed reasonable)
      const visionBuf = await sharp(imgBuf)
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      const b64 = visionBuf.toString("base64");

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const visionRes = await openai.chat.completions.create({
        model: "gpt-4.1",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and detect all watermarks (text overlays, logos, copyright stamps, semi-transparent brand marks).
Return ONLY a JSON object — no explanation — in this exact format:
{
  "watermarks": [
    { "x": <left% 0-100>, "y": <top% 0-100>, "w": <width% 1-100>, "h": <height% 1-100>, "type": "text|logo|stamp" }
  ]
}
Coordinates are percentages of the full image dimensions. If no watermarks found return {"watermarks":[]}.`
            },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "high" } }
          ]
        }]
      });

      let regions: Array<{ x: number; y: number; w: number; h: number }> = [];
      try {
        const raw  = visionRes.choices[0].message.content || "{}";
        const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
        regions    = (json.watermarks || []).slice(0, 8);
      } catch {
        // If GPT returns unparseable response, treat whole image bottom-right as guess
        regions = [{ x: 60, y: 80, w: 38, h: 15 }];
      }

      if (regions.length === 0) {
        // No watermarks detected — return original with a flag
        res.set("Content-Type", "image/jpeg");
        res.set("X-Watermarks-Found", "0");
        const out = await sharp(imgBuf).jpeg({ quality: 95 }).toBuffer();
        return res.send(out);
      }

      // Apply content-aware fill for each detected region
      let workBuf = imgBuf;
      for (const r of regions) {
        const left   = Math.max(0, Math.round((r.x / 100) * iW));
        const top    = Math.max(0, Math.round((r.y / 100) * iH));
        const width  = Math.min(iW - left, Math.max(4, Math.round((r.w / 100) * iW)));
        const height = Math.min(iH - top,  Math.max(4, Math.round((r.h / 100) * iH)));
        workBuf = await contentAwareFill(workBuf, left, top, width, height, iW, iH);
      }

      res.set("Content-Type", "image/jpeg");
      res.set("X-Watermarks-Found", String(regions.length));
      res.send(workBuf);
    } catch (err: any) {
      console.error("Auto watermark removal error:", err);
      res.status(500).json({ error: "Auto removal failed: " + (err.message || "Unknown error") });
    }
  });

  app.post("/api/image/remove-watermark", wmUpload.single("image"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Image required" });

      const { x = "0", y = "0", w = "100", h = "100", method = "blur" } = req.body;
      const img = sharp(req.file.buffer);
      const meta = await img.metadata();
      const iW = meta.width!;
      const iH = meta.height!;

      // Convert percentages to pixels
      const left   = Math.max(0, Math.round((parseFloat(x) / 100) * iW));
      const top    = Math.max(0, Math.round((parseFloat(y) / 100) * iH));
      const width  = Math.min(iW - left, Math.max(1, Math.round((parseFloat(w) / 100) * iW)));
      const height = Math.min(iH - top,  Math.max(1, Math.round((parseFloat(h) / 100) * iH)));

      // Extract the watermark region
      const regionBuf = await sharp(req.file.buffer).extract({ left, top, width, height }).toBuffer();

      let processedRegion: Buffer;

      if (method === "blur") {
        // Heavy blur — removes text/logo watermarks effectively
        processedRegion = await sharp(regionBuf).blur(Math.max(8, Math.round(Math.min(width, height) * 0.12))).toBuffer();
      } else if (method === "lighten") {
        // Lighten — works for dark watermarks
        processedRegion = await sharp(regionBuf)
          .modulate({ brightness: 1.4, saturation: 0.6 })
          .blur(4).toBuffer();
      } else {
        // Darken — works for light/white watermarks
        processedRegion = await sharp(regionBuf)
          .modulate({ brightness: 0.6, saturation: 0.6 })
          .blur(4).toBuffer();
      }

      // Composite the processed region back onto the original
      const output = await sharp(req.file.buffer)
        .composite([{ input: processedRegion, left, top }])
        .jpeg({ quality: 95 })
        .toBuffer();

      res.set("Content-Type", "image/jpeg");
      res.send(output);
    } catch (err: any) {
      res.status(500).json({ error: "Watermark removal failed: " + (err.message || "Unknown error") });
    }
  });

  app.post("/api/seo/slug-generator", async (req, res) => {
    try {
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      const slugify = (s: string) =>
        s.toLowerCase()
          .replace(/['']/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");

      // Stop words to strip for short/keyword variants
      const stopWords = new Set(["a","an","the","and","or","but","in","on","at","to","for","of","with","by","from","how","what","why","when","where","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","can","could","should","may","might","must","shall","your","you","we","our","they","it","its","this","that","these","those","about","into","up","out","as","so","if","then","than","more","most","also","just","get","all","s","vs","vs."]);

      const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/);
      const keyWords = words.filter(w => !stopWords.has(w));
      const year = new Date().getFullYear();

      const slugs = [
        { label: "Standard",          slug: slugify(title) },
        { label: "Short & punchy",     slug: keyWords.slice(0, 4).join("-") },
        { label: "Keyword-first",      slug: [...keyWords.slice(0, 3), ...words.filter(w => stopWords.has(w)).slice(0, 2)].join("-").replace(/-+/g, "-") },
        { label: `With year (${year})`, slug: `${year}-${keyWords.slice(0, 4).join("-")}` },
        { label: "Ultra short",        slug: keyWords.slice(0, 3).join("-") },
      ];

      res.json({ slugs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/seo/social-preview", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      const response = await axios.get(url, { timeout: 8000 });
      const $ = cheerio.load(response.data);

      const preview = {
        title: $('meta[property="og:title"]').attr('content') || $('title').text() || "",
        description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || "",
        image: $('meta[property="og:image"]').attr('content') || "",
        site_name: $('meta[property="og:site_name"]').attr('content') || "",
        url: url
      };

      res.json(preview);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch social preview: " + err.message });
    }
  });

  app.post("/api/seo/keyword-density", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 2);

      const totalWords = words.length;
      const counts: Record<string, number> = {};
      words.forEach(word => {
        counts[word] = (counts[word] || 0) + 1;
      });

      const density = Object.entries(counts)
        .map(([word, count]) => ({
          word,
          count,
          percentage: ((count / totalWords) * 100).toFixed(2)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      res.json({ totalWords, density });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/seo/parse-sitemap", async (req, res) => {
    try {
      const { xml } = req.body;
      if (!xml || typeof xml !== "string") {
        return res.status(400).json({ error: "Sitemap XML is required" });
      }

      const $ = cheerio.load(xml, { xmlMode: true });
      const urls: string[] = [];
      $("url > loc").each((_, el) => {
        urls.push($(el).text().trim());
      });

      res.json({ count: urls.length, urls });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/generate-sitemap", async (req, res) => {
    try {
      let { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      // Normalize URL
      if (!url.startsWith("http")) url = "https://" + url;
      const urlObj = new URL(url);
      const domain = urlObj.origin;
      const visited = new Set<string>();
      const toVisit = [domain];
      const maxPages = 2000;

      console.log(`Starting sitemap generation for: ${domain}`);

      while (toVisit.length > 0 && visited.size < maxPages) {
        const currentUrl = toVisit.shift()!;
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);

        try {
          const response = await axios.get(currentUrl, { 
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SitemapGenerator/1.0)'
            }
          });
          const $ = cheerio.load(response.data);

          $("a[href]").each((_, el) => {
            const href = $(el).attr("href");
            if (!href) return;
            try {
              const linkUrl = new URL(href, currentUrl);
              const absoluteUrl = linkUrl.origin + linkUrl.pathname.replace(/\/$/, "");
              
              if (linkUrl.origin === domain && 
                  !visited.has(absoluteUrl) && 
                  !toVisit.includes(absoluteUrl) &&
                  !absoluteUrl.match(/\.(jpg|jpeg|png|gif|pdf|zip|gz|exe)$/i)) {
                toVisit.push(absoluteUrl);
              }
            } catch {}
          });
        } catch (err: any) {
          console.error(`Sitemap crawl error for ${currentUrl}:`, err.message);
        }
      }

      console.log(`Crawled ${visited.size} pages for ${domain}`);

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(visited).map(page => {
  const isHome = page === domain || page === domain + "/";
  return `  <url>
    <loc>${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${isHome ? 'daily' : 'weekly'}</changefreq>
    <priority>${isHome ? '1.00' : '0.8'}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (err: any) {
      console.error("Sitemap generation error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Crawl a website and return categorized URLs for sitemap generation
  app.post("/api/sitemap/discover", async (req, res) => {
    try {
      let { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      if (!url.startsWith("http")) url = "https://" + url;

      const urlObj = new URL(url);
      const domain = urlObj.origin;
      const visited = new Set<string>();
      const toVisit: string[] = [domain];
      const today = new Date().toISOString().split("T")[0];

      while (toVisit.length > 0 && visited.size < 5000) {
        const current = toVisit.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        try {
          const resp = await axios.get(current, {
            timeout: 8000,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; SitemapBot/1.0)" },
            maxRedirects: 3,
          });
          const $ = cheerio.load(resp.data);
          $("a[href]").each((_, el) => {
            const href = $(el).attr("href");
            if (!href) return;
            try {
              const linkObj = new URL(href, current);
              const clean = linkObj.origin + linkObj.pathname.replace(/\/$/, "");
              if (
                linkObj.origin === domain &&
                !visited.has(clean) &&
                !toVisit.includes(clean) &&
                !clean.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|gz|exe|css|js|ico|woff|ttf)$/i) &&
                !clean.includes("#") &&
                !clean.includes("?")
              ) {
                toVisit.push(clean);
              }
            } catch {}
          });
        } catch {}
      }

      // Categorise discovered URLs
      const pages: string[] = [];
      const blogs: string[] = [];
      const categories: string[] = [];

      for (const u of visited) {
        const path = u.replace(domain, "") || "/";
        if (/^\/(blog|post|posts|article|articles|news|story|stories)(\/|$)/i.test(path)) {
          blogs.push(u);
        } else if (/^\/(category|categories|cat|tag|tags|topic|topics)(\/|$)/i.test(path)) {
          categories.push(u);
        } else {
          pages.push(u);
        }
      }

      pages.sort();
      blogs.sort();
      categories.sort();

      res.json({
        domain,
        today,
        total: visited.size,
        pages,
        blogs,
        categories,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/web-tools/process", async (req, res) => {
    const { input, tool } = req.body;
    if (!input) return res.status(400).json({ error: "Input is required" });

    try {
      let output = "";
      switch (tool) {
        case "css-minify":
          output = new CleanCSS().minify(input).styles;
          break;
        case "css-beautify":
          output = beautify.css(input, { indent_size: 2 });
          break;
        case "js-minify":
          const minifiedJs = await jsMinify(input);
          output = minifiedJs.code || "";
          break;
        case "js-beautify":
          output = beautify.js(input, { indent_size: 2 });
          break;
        case "html-minify":
          output = await htmlMinify(input, {
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: true,
            minifyJS: true,
          });
          break;
        case "html-beautify":
          output = beautify.html(input, { indent_size: 2 });
          break;
        default:
          return res.status(400).json({ error: "Invalid tool" });
      }
      res.json({ output });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Load pdf-parse
  if (!pdfParse) {
    const pdfParseModule = await import("pdf-parse");
    // @ts-ignore
    pdfParse = pdfParseModule.default || pdfParseModule;
  }

  // Serve static files from uploads and output
  app.use("/uploads", (req, res, next) => {
    // Basic security: prevent directory traversal
    if (req.path.includes("..")) return res.status(403).send("Forbidden");
    const filePath = path.join(UPLOADS_DIR, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });

  app.use("/output", (req, res, next) => {
    if (req.path.includes("..")) return res.status(403).send("Forbidden");
    const filePath = path.join(OUTPUT_DIR, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });

  // Upload Endpoint
  app.post(api.upload.path, upload.array("files"), (req, res) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const files = (req.files as Express.Multer.File[]).map((file) => ({
      id: file.filename,
      originalName: file.originalname,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
    }));

    res.json(files);
  });

  // Process Endpoint
  app.post(api.process.path, async (req, res) => {
    try {
      const { fileIds, options } = processRequestSchema.parse(req.body);
      const results = [];
      const zipName = `batch-${Date.now()}.zip`;
      const zipPath = path.join(OUTPUT_DIR, zipName);
      const outputStream = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(outputStream);

      for (const fileId of fileIds) {
        const inputPath = path.join(UPLOADS_DIR, fileId);
        if (!fs.existsSync(inputPath)) continue;

        const originalStats = fs.statSync(inputPath);

        // Base Sharp instance
        let pipeline = sharp(inputPath);

        // Watermark
        if (options.watermarkText) {
          const metadata = await pipeline.metadata();
          const width = metadata.width || 1000;
          const height = metadata.height || 1000;

          // Simple SVG text watermark
          const fontSize = Math.floor(width * 0.05);
          const svgImage = `
            <svg width="${width}" height="${height}">
              <style>
                .title { fill: rgba(255, 255, 255, ${options.watermarkOpacity}); font-size: ${fontSize}px; font-weight: bold; }
              </style>
              <text x="95%" y="95%" text-anchor="end" class="title">${options.watermarkText}</text>
            </svg>
          `;

          pipeline = pipeline.composite([
            {
              input: Buffer.from(svgImage),
              top: 0,
              left: 0,
            },
          ]);
        }

        // Keep metadata?
        if (options.keepMetadata) {
          pipeline = pipeline.withMetadata();
        }

        const format = options.format as keyof sharp.FormatEnum;
        let outputBuffer: Buffer;
        let finalQuality = options.quality;

        if (format === 'svg' as any) {
          try {
            const pngBuffer = await pipeline.toFormat('png').toBuffer();
            const svgContent = await trace(pngBuffer);
            outputBuffer = Buffer.from(svgContent);
          } catch (e) {
            console.error("SVG tracing error:", e);
            outputBuffer = await pipeline.toFormat('png').toBuffer();
          }
        } else if (options.targetSizeKB) {
          const targetBytes = options.targetSizeKB * 1024;
          let minQ = 1;
          let maxQ = 100;
          let bestBuffer: Buffer | null = null;

          // Simple binary search for quality
          // Limit iterations to avoid timeout
          for (let i = 0; i < 7; i++) {
            const midQ = Math.floor((minQ + maxQ) / 2);
            const buffer = await pipeline
              .clone()
              .toFormat(format, { quality: midQ })
              .toBuffer();

            if (buffer.length <= targetBytes) {
              bestBuffer = buffer;
              finalQuality = midQ;
              minQ = midQ + 1; // Try higher quality
            } else {
              maxQ = midQ - 1; // Needs lower quality
            }
          }

          // If we couldn't meet target, use the smallest we found (minQ=1 usually)
          // or just the last attempt? bestBuffer contains the valid one.
          // If bestBuffer is null, it means even Q=1 is too big, use Q=1.
          if (!bestBuffer) {
            outputBuffer = await pipeline
              .toFormat(format, { quality: 1 })
              .toBuffer();
          } else {
            outputBuffer = bestBuffer;
          }
        } else {
          // Normal conversion
          outputBuffer = await pipeline
            .toFormat(format, { quality: options.quality })
            .toBuffer();
        }

        // Save output
        const outputFilename = `processed-${path.parse(fileId).name}.${format}`;
        const outputPath = path.join(OUTPUT_DIR, outputFilename);
        fs.writeFileSync(outputPath, outputBuffer);

        // Add to ZIP
        archive.file(outputPath, { name: outputFilename });

        // Add to results
        results.push({
          id: fileId,
          url: `/output/${outputFilename}`,
          filename: outputFilename,
          originalSize: originalStats.size,
          newSize: outputBuffer.length,
          format: format,
          width: 0, // could get from metadata if needed
          height: 0,
        });
      }

      await archive.finalize();

      res.json({
        results,
        zipUrl: `/output/${zipName}`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      res.status(500).json({ message: "Error processing images" });
    }
  });

  // Merge Endpoint
  app.post(api.merge.path, async (req, res) => {
    try {
      const { fileIds, options } = mergeRequestSchema.parse(req.body);

      if (fileIds.length < 2) {
        return res
          .status(400)
          .json({ message: "Need at least 2 images to merge" });
      }

      // Load all images
      const images = await Promise.all(
        fileIds.map(async (fileId) => {
          const inputPath = path.join(UPLOADS_DIR, fileId);
          if (!fs.existsSync(inputPath)) return null;
          const data = await sharp(inputPath).toBuffer();
          const metadata = await sharp(data).metadata();
          return { data, metadata, fileId };
        }),
      );

      const validImages = images.filter((img) => img !== null);
      if (validImages.length < 2) {
        return res
          .status(400)
          .json({ message: "Not enough valid images to merge" });
      }

      let merged: sharp.Sharp;
      const spacing = options.spacing || 0;
      const bgColor = options.backgroundColor || "#ffffff";

      if (options.direction === "horizontal") {
        // Horizontal merge
        const totalWidth = validImages.reduce(
          (sum, img) => sum + (img.metadata.width || 0) + spacing,
          -spacing,
        );
        const maxHeight = Math.max(
          ...validImages.map((img) => img.metadata.height || 0),
        );

        const composites: sharp.OverlayOptions[] = [];
        let currentX = 0;

        for (const img of validImages) {
          composites.push({
            input: img.data,
            left: currentX,
            top: Math.floor(
              ((maxHeight || 0) - (img.metadata.height || 0)) / 2,
            ),
          });
          currentX += (img.metadata.width || 0) + spacing;
        }

        merged = sharp({
          create: {
            width: totalWidth,
            height: maxHeight || 100,
            channels: 3,
            background: bgColor,
          },
        }).composite(composites);
      } else if (options.direction === "vertical") {
        // Vertical merge
        const maxWidth = Math.max(
          ...validImages.map((img) => img.metadata.width || 0),
        );
        const totalHeight = validImages.reduce(
          (sum, img) => sum + (img.metadata.height || 0) + spacing,
          -spacing,
        );

        const composites: sharp.OverlayOptions[] = [];
        let currentY = 0;

        for (const img of validImages) {
          composites.push({
            input: img.data,
            left: Math.floor(((maxWidth || 0) - (img.metadata.width || 0)) / 2),
            top: currentY,
          });
          currentY += (img.metadata.height || 0) + spacing;
        }

        merged = sharp({
          create: {
            width: maxWidth || 100,
            height: totalHeight,
            channels: 3,
            background: bgColor,
          },
        }).composite(composites);
      } else {
        // Grid merge (2x2 or more)
        const cols = Math.ceil(Math.sqrt(validImages.length));
        const maxWidth = Math.max(
          ...validImages.map((img) => img.metadata.width || 0),
        );
        const maxHeight = Math.max(
          ...validImages.map((img) => img.metadata.height || 0),
        );

        const composites: sharp.OverlayOptions[] = [];
        validImages.forEach((img, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          composites.push({
            input: img.data,
            left: col * (maxWidth + spacing),
            top: row * (maxHeight + spacing),
          });
        });

        merged = sharp({
          create: {
            width: cols * (maxWidth + spacing) - spacing,
            height:
              Math.ceil(validImages.length / cols) * (maxHeight + spacing) -
              spacing,
            channels: 3,
            background: bgColor,
          },
        }).composite(composites);
      }

      const format = options.format as keyof sharp.FormatEnum;
      const outputBuffer = await merged
        .toFormat(format, { quality: options.quality })
        .toBuffer();

      const outputFilename = `merged-${Date.now()}.${format}`;
      const outputPath = path.join(OUTPUT_DIR, outputFilename);
      fs.writeFileSync(outputPath, outputBuffer);

      const metadata = await sharp(outputBuffer).metadata();

      // Generate PDF version
      const pdfFilename = `merged-${Date.now()}.pdf`;
      const pdfPath = path.join(OUTPUT_DIR, pdfFilename);

      try {
        const doc = new PDFDocument({
          size: [metadata.width || 800, metadata.height || 600],
          margins: 0,
        });

        const pdfStream = fs.createWriteStream(pdfPath);
        doc.pipe(pdfStream);

        // Use the saved image file path instead of buffer
        doc.image(outputPath, 0, 0, {
          width: metadata.width,
          height: metadata.height,
        });

        doc.end();

        await new Promise<void>((resolve, reject) => {
          pdfStream.on("finish", () => resolve());
          pdfStream.on("error", (err) => reject(err));
        });
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError);
        // Continue without PDF if generation fails
      }

      res.json({
        url: `/output/${outputFilename}`,
        filename: outputFilename,
        originalSize: validImages.reduce(
          (sum, img) => sum + (img.metadata.size || 0),
          0,
        ),
        newSize: outputBuffer.length,
        width: metadata.width || 0,
        height: metadata.height || 0,
        pdfUrl: `/output/${pdfFilename}`,
        pdfFilename: pdfFilename,
      });
    } catch (error) {
      console.error("Merge error:", error);
      res.status(500).json({ message: "Error merging images" });
    }
  });

  // Document Conversion Endpoint
  app.post(api.documentConvert.path, async (req, res) => {
    try {
      const { fileIds, options } = documentConversionRequestSchema.parse(
        req.body,
      );

      if (fileIds.length !== 1) {
        return res
          .status(400)
          .json({ message: "Convert one document at a time" });
      }

      const fileId = fileIds[0];
      const inputPath = path.join(UPLOADS_DIR, fileId);

      if (!fs.existsSync(inputPath)) {
        return res.status(400).json({ message: "File not found" });
      }

      const inputStats = fs.statSync(inputPath);
      const ext = path.extname(fileId).toLowerCase().slice(1);
      const fileName = path.basename(fileId, path.extname(fileId));
      const outputFormat = options.outputFormat || "pdf";

      // Read document content
      let docContent = "";

      if (ext === "xlsx" || ext === "xls") {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(inputPath);
        const worksheet = workbook.worksheets[0];
        const rows: string[] = [];
        if (worksheet) {
          worksheet.eachRow((row) => {
            const values = row.values as (string | number | null)[];
            rows.push(values.slice(1).map(v => v ?? "").join(","));
          });
        }
        docContent = rows.join("\n");
      } else if (ext === "csv") {
        docContent = fs.readFileSync(inputPath, "utf-8");
      } else if (ext === "ods") {
        docContent = "ODS content - spreadsheet data";
      } else if (ext === "docx") {
        docContent = "DOCX content - document text";
      } else if (ext === "pdf") {
        try {
          const pdfBuffer = fs.readFileSync(inputPath);
          const data = await pdfParse(pdfBuffer);
          docContent = data.text || "No text found in PDF";
        } catch (pdfErr) {
          docContent = "Unable to extract text from PDF";
        }
      }

      let outputFilename = "";
      let outputPath = "";
      let outputBuffer: Buffer | null = null;

      if (outputFormat === "pdf") {
        // Generate PDF
        outputFilename = `${fileName}-${Date.now()}.pdf`;
        outputPath = path.join(OUTPUT_DIR, outputFilename);

        try {
          const doc = new PDFDocument({ margin: 40 });
          const pdfStream = fs.createWriteStream(outputPath);
          doc.pipe(pdfStream);

          doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .text("Document: " + fileName, { underline: true });
          doc.fontSize(10).moveDown();
          doc.font("Helvetica").text(docContent || "No content extracted", {
            align: "left",
            wordWrap: true,
          });

          doc.end();

          await new Promise<void>((resolve, reject) => {
            pdfStream.on("finish", () => resolve());
            pdfStream.on("error", (err) => reject(err));
          });
        } catch (pdfError) {
          console.error("PDF generation error:", pdfError);
          return res.status(500).json({ message: "Error generating PDF" });
        }
      } else if (outputFormat === "xlsx" || outputFormat === "csv") {
        const wsData = [
          [fileName],
          ["Content extracted from: " + ext.toUpperCase()],
          [],
          ...docContent.split("\n").map((line) => [line]),
        ];

        outputFilename = `${fileName}-${Date.now()}.${outputFormat}`;
        outputPath = path.join(OUTPUT_DIR, outputFilename);

        try {
          if (outputFormat === "csv") {
            const csvContent = wsData.map(row => row.join(",")).join("\n");
            fs.writeFileSync(outputPath, csvContent, "utf-8");
          } else {
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet("Sheet1");
            wsData.forEach(row => ws.addRow(row));
            await wb.xlsx.writeFile(outputPath);
          }
        } catch (err) {
          console.error("Spreadsheet generation error:", err);
          return res
            .status(500)
            .json({ message: "Error generating spreadsheet" });
        }
      } else if (outputFormat === "docx") {
        // For DOCX, create a simple text document file
        outputFilename = `${fileName}-${Date.now()}.docx`;
        outputPath = path.join(OUTPUT_DIR, outputFilename);

        // Create a simple text file as DOCX placeholder
        try {
          const docContent_formatted = `Document: ${fileName}\n\nExtracted from: ${ext.toUpperCase()}\n\n${docContent}`;
          fs.writeFileSync(outputPath, docContent_formatted);
        } catch (err) {
          console.error("DOCX generation error:", err);
          return res.status(500).json({ message: "Error generating DOCX" });
        }
      }

      const outputStats = fs.statSync(outputPath);

      res.json({
        url: `/output/${outputFilename}`,
        filename: outputFilename,
        originalSize: inputStats.size,
        newSize: outputStats.size,
      });
    } catch (error) {
      console.error("Document conversion error:", error);
      res.status(500).json({ message: "Error converting document" });
    }
  });

  // SEO Audit Endpoint
  app.post("/api/seo-audit", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "Invalid URL" });
      }
      try { new URL(url); } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      const auditResult = await performSEOAudit(url);

      // Save snapshot to DB for historical comparison
      try {
        const domain = new URL(url).hostname;
        await db.insert(auditSnapshots).values({
          url,
          domain,
          score: auditResult.score,
          pageCount: auditResult.pages.length,
          pagesJson: JSON.stringify(auditResult.pages),
        });
      } catch (dbErr) {
        console.error("Failed to save audit snapshot:", dbErr);
      }

      res.json(auditResult);
    } catch (error) {
      console.error("SEO audit error:", error);
      res.status(500).json({ message: "Error performing SEO audit" });
    }
  });

  // Audit history — list all snapshots (optionally filtered by domain)
  app.get("/api/seo/audit-history", async (req, res) => {
    try {
      const { domain } = req.query;
      const query = db
        .select({
          id: auditSnapshots.id,
          url: auditSnapshots.url,
          domain: auditSnapshots.domain,
          score: auditSnapshots.score,
          pageCount: auditSnapshots.pageCount,
          pagesJson: auditSnapshots.pagesJson,
          createdAt: auditSnapshots.createdAt,
        })
        .from(auditSnapshots)
        .orderBy(desc(auditSnapshots.createdAt))
        .limit(50);

      const rows = domain && typeof domain === "string"
        ? await db.select({ id: auditSnapshots.id, url: auditSnapshots.url, domain: auditSnapshots.domain, score: auditSnapshots.score, pageCount: auditSnapshots.pageCount, pagesJson: auditSnapshots.pagesJson, createdAt: auditSnapshots.createdAt }).from(auditSnapshots).where(eq(auditSnapshots.domain, domain)).orderBy(desc(auditSnapshots.createdAt)).limit(50)
        : await query;

      const history = rows.map(r => {
        let extra: any = {};
        try { extra = JSON.parse(r.pagesJson); } catch {}
        return { id: r.id, url: r.url, domain: r.domain, score: r.score, pageCount: r.pageCount, createdAt: r.createdAt, ...extra };
      });
      res.json({ history });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Audit snapshot detail — returns full pages JSON for a specific snapshot
  app.get("/api/seo/audit-snapshot/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const rows = await db
        .select()
        .from(auditSnapshots)
        .where(eq(auditSnapshots.id, id))
        .limit(1);
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const row = rows[0];
      res.json({ ...row, pages: JSON.parse(row.pagesJson) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── In-memory audit report cache (shareable links, 24 h TTL) ──────────────
  const auditReportCache = new Map<string, { report: any; expires: number }>();

  app.get("/api/seo/audit-report/:id", async (req, res) => {
    const entry = auditReportCache.get(req.params.id);
    if (!entry || entry.expires < Date.now()) return res.status(404).json({ error: "Report not found or has expired" });
    res.json(entry.report);
  });

  // ── AI-Powered Full SEO Audit ──────────────────────────────────────────────
  app.post("/api/seo/ai-full-audit", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") return res.status(400).json({ error: "URL required" });
      try { new URL(url); } catch { return res.status(400).json({ error: "Invalid URL format" }); }

      const domain   = new URL(url).hostname;
      const isHttps  = url.startsWith("https://");
      const proto    = isHttps ? "https" : "http";
      const visited  = new Set<string>();
      const queue    = [url];
      const pages: any[] = [];
      let totalScripts  = 0;
      let totalPageSize = 0;

      // ── robots.txt + sitemap ──────────────────────────────────────────────
      let hasRobots  = false;
      let hasSitemap = false;
      try {
        const rb = await axios.get(`${proto}://${domain}/robots.txt`, { timeout: 5000, headers: { "User-Agent": "SEOAuditBot/1.0" } });
        hasRobots  = rb.status === 200 && rb.data.includes("User-agent");
        hasSitemap = rb.data.toLowerCase().includes("sitemap");
      } catch {}
      if (!hasSitemap) {
        try { const sm = await axios.get(`${proto}://${domain}/sitemap.xml`, { timeout: 5000 }); hasSitemap = sm.status === 200; } catch {}
      }

      // ── Crawl up to 20 pages ──────────────────────────────────────────────
      while (queue.length > 0 && visited.size < 20) {
        const pageUrl = queue.shift()!;
        if (visited.has(pageUrl)) continue;
        visited.add(pageUrl);
        try {
          const r = await axios.get(pageUrl, { timeout: 10000, headers: { "User-Agent": "SEOAuditBot/1.0" } });
          const $  = cheerio.load(r.data);
          const pageSize = Buffer.byteLength(r.data as string, "utf8");
          totalPageSize += pageSize;

          const title         = $("title").text().trim();
          const metaDesc      = $('meta[name="description"]').attr("content") || "";
          const canonical     = $('link[rel="canonical"]').attr("href") || "";
          const viewport      = $('meta[name="viewport"]').attr("content") || "";
          const h1s           = $("h1").map((_, e) => $(e).text().trim()).get();
          const h2s           = $("h2").map((_, e) => $(e).text().trim()).get();
          const imgsNoAlt     = $("img:not([alt])").length;
          const totalImgs     = $("img").length;
          const internalLinks = $(`a[href^="/"], a[href*="${domain}"]`).length;
          const externalLinks = $("a[href^='http']").not(`[href*="${domain}"]`).length;
          const ogTags        = $('meta[property^="og:"]').length;
          const twitterTags   = $('meta[name^="twitter:"]').length;
          const schemaJSON    = $('script[type="application/ld+json"]').length;
          const scripts       = $("script[src]").length;
          const lazyImgs      = $("img[loading='lazy']").length;
          const hasAuthor     = $('[rel="author"], .author, [itemprop="author"]').length > 0;
          const hasDate       = $('[itemprop="datePublished"], time[datetime], .post-date, .published').length > 0;
          const hasFavicon    = $('link[rel*="icon"]').length > 0;
          const bodyText      = $("body").text().replace(/\s+/g, " ").trim();
          const wordCount     = bodyText.split(/\s+/).filter(Boolean).length;
          totalScripts += scripts;

          const issues: any[] = [];

          // On-Page
          if (!title) issues.push({ id: "no-title", category: "On-Page", severity: "critical", issue: "Missing <title> tag", fix: "Add a unique title (50–60 chars): <title>Primary Keyword – Brand</title>" });
          else if (title.length < 30) issues.push({ id: "title-short", category: "On-Page", severity: "warning", issue: `Title too short (${title.length} chars): "${title}"`, fix: "Expand to 50–60 characters, lead with the primary keyword." });
          else if (title.length > 65) issues.push({ id: "title-long", category: "On-Page", severity: "warning", issue: `Title too long (${title.length} chars) — truncated in SERPs`, fix: "Trim to under 60 characters keeping primary keyword near the start." });

          if (!metaDesc) issues.push({ id: "no-meta-desc", category: "On-Page", severity: "critical", issue: "Missing meta description", fix: "Add a compelling meta description (150–160 chars) with primary keyword and a CTA." });
          else if (metaDesc.length < 70) issues.push({ id: "meta-short", category: "On-Page", severity: "warning", issue: `Meta description too short (${metaDesc.length} chars)`, fix: "Expand to 150–160 characters to maximise SERP click-through rate." });
          else if (metaDesc.length > 165) issues.push({ id: "meta-long", category: "On-Page", severity: "warning", issue: `Meta description too long (${metaDesc.length} chars) — cut off in SERPs`, fix: "Shorten to under 160 characters." });

          if (h1s.length === 0) issues.push({ id: "no-h1", category: "On-Page", severity: "critical", issue: "No H1 heading found", fix: "Add exactly one H1 with your primary keyword: <h1>Keyword – Value Proposition</h1>" });
          else if (h1s.length > 1) issues.push({ id: "multi-h1", category: "On-Page", severity: "warning", issue: `Multiple H1 tags (${h1s.length}) — confuses search engines`, fix: "Keep exactly one H1. Demote extras to H2 or H3." });

          if (imgsNoAlt > 0) issues.push({ id: "img-alt", category: "On-Page", severity: "warning", issue: `${imgsNoAlt}/${totalImgs} images missing alt text`, fix: `Add descriptive alt text to every image: <img alt="describe image content">` });

          // Technical
          if (!isHttps) issues.push({ id: "no-https", category: "Technical", severity: "critical", issue: "Not using HTTPS — major trust and ranking signal missing", fix: "Install an SSL certificate immediately. Most hosts offer free SSL via Let's Encrypt." });
          if (!canonical) issues.push({ id: "no-canonical", category: "Technical", severity: "warning", issue: "No canonical tag — duplicate content risk", fix: `Add <link rel="canonical" href="${pageUrl}"> in <head>.` });
          if (!viewport) issues.push({ id: "no-viewport", category: "Technical", severity: "critical", issue: "Missing viewport meta tag — not mobile-friendly", fix: `Add <meta name="viewport" content="width=device-width, initial-scale=1"> in <head>.` });
          if (!hasFavicon) issues.push({ id: "no-favicon", category: "Technical", severity: "info", issue: "No favicon detected", fix: "Add <link rel='icon' href='/favicon.ico'> for brand recognition in browser tabs." });
          if (!hasRobots) issues.push({ id: "no-robots", category: "Technical", severity: "warning", issue: "No robots.txt found", fix: "Create /robots.txt to control crawler access and include a Sitemap directive." });
          if (!hasSitemap) issues.push({ id: "no-sitemap", category: "Technical", severity: "warning", issue: "No XML sitemap found", fix: "Create and submit /sitemap.xml to Google Search Console for faster indexing." });
          if (pageSize > 300000) issues.push({ id: "large-page", category: "Technical", severity: "warning", issue: `Page size ${Math.round(pageSize / 1024)}KB — may slow load`, fix: "Minify HTML/CSS/JS, compress images, and use a CDN. Target under 100KB." });
          if (scripts > 10) issues.push({ id: "too-many-scripts", category: "Technical", severity: "warning", issue: `${scripts} render-blocking scripts — hurts Core Web Vitals`, fix: "Defer non-critical scripts with async/defer. Remove unused third-party scripts." });
          if (lazyImgs === 0 && totalImgs > 3) issues.push({ id: "no-lazy-load", category: "Technical", severity: "warning", issue: "Images not using lazy loading", fix: "Add loading='lazy' to below-fold images to improve LCP and page speed." });
          if (schemaJSON === 0) issues.push({ id: "no-schema", category: "Technical", severity: "warning", issue: "No structured data (Schema.org) found", fix: "Add JSON-LD markup: Organization, WebPage, BreadcrumbList. Helps earn rich results in SERPs." });

          // Content
          if (wordCount < 300) issues.push({ id: "thin-content", category: "Content", severity: "critical", issue: `Thin content — only ${wordCount} words`, fix: "Aim for 600–1200 words on key pages. Cover the topic comprehensively to beat competitors." });
          if (ogTags < 3) issues.push({ id: "og-tags", category: "Content", severity: "warning", issue: `Only ${ogTags} Open Graph tags — poor social sharing previews`, fix: "Add og:title, og:description, og:image, og:url for rich previews on social platforms." });
          if (twitterTags === 0) issues.push({ id: "twitter-cards", category: "Content", severity: "info", issue: "No Twitter/X Card tags found", fix: "Add <meta name='twitter:card' content='summary_large_image'> and related tags." });
          if (internalLinks < 3) issues.push({ id: "few-internal-links", category: "Content", severity: "info", issue: `Only ${internalLinks} internal links — weak site architecture`, fix: "Add 5–10 contextual internal links per page to distribute PageRank." });
          if (h2s.length === 0 && wordCount > 300) issues.push({ id: "no-h2", category: "Content", severity: "warning", issue: "No H2 subheadings — poor content structure", fix: "Add H2/H3 subheadings with supporting keywords to improve readability and SEO." });
          if (externalLinks === 0) issues.push({ id: "no-external-links", category: "Content", severity: "info", issue: "No external links to authoritative sources", fix: "Link to 2–3 high-authority sources to signal expertise to Google." });
          if (!hasAuthor) issues.push({ id: "no-author", category: "Content", severity: "info", issue: "No author information detected — weak EEAT signals", fix: "Add author bios with credentials and social links to strengthen Expertise & Authoritativeness." });
          if (!hasDate) issues.push({ id: "no-date", category: "Content", severity: "info", issue: "No publish date detected — freshness signal missing", fix: "Add a visible publish/update date and datePublished schema property." });

          const crit = issues.filter(i => i.severity === "critical").length;
          const warn = issues.filter(i => i.severity === "warning").length;
          const info = issues.filter(i => i.severity === "info").length;
          const pageScore = Math.max(0, 100 - crit * 18 - warn * 7 - info * 2);
          pages.push({ url: pageUrl, score: pageScore, title, metaDesc, wordCount, h1s, h2Count: h2s.length, issues, scripts, pageSize, internalLinks });

          $("a[href]").each((_, el) => {
            try {
              const href = $(el).attr("href")!;
              if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
              const abs = new URL(href, pageUrl).href.split("#")[0].split("?")[0];
              if (new URL(abs).hostname === domain && !visited.has(abs)) queue.push(abs);
            } catch {}
          });
        } catch { /* skip failed pages */ }
      }

      if (!pages.length) return res.status(422).json({ error: "Could not access the website. Make sure it is publicly accessible." });

      // ── Aggregate ─────────────────────────────────────────────────────────
      const allIssues = pages.flatMap(p => p.issues);
      const uniqueIssues: any[] = [];
      const seenIds = new Set<string>();
      for (const issue of allIssues) {
        if (!seenIds.has(issue.id)) { seenIds.add(issue.id); uniqueIssues.push(issue); }
      }

      const techIssues    = uniqueIssues.filter(i => i.category === "Technical");
      const onPageIssues  = uniqueIssues.filter(i => i.category === "On-Page");
      const contentIssues = uniqueIssues.filter(i => i.category === "Content");
      const techScore     = Math.max(10, 100 - techIssues.length * 12);
      const onPageScore   = Math.max(10, 100 - onPageIssues.length * 12);
      const contentScore  = Math.max(10, 100 - contentIssues.length * 10);
      const avgScripts    = totalScripts / pages.length;
      const avgPageSize   = totalPageSize / pages.length;
      const perfScore     = Math.max(10, Math.min(100, 100
        - (avgScripts > 8 ? 25 : avgScripts > 5 ? 12 : 0)
        - (avgPageSize > 300000 ? 25 : avgPageSize > 150000 ? 12 : 0)
        - (!isHttps ? 20 : 0)));
      const overallScore  = Math.round(techScore * 0.30 + onPageScore * 0.30 + contentScore * 0.25 + perfScore * 0.15);

      const samplePage  = pages[0];
      const issueList   = uniqueIssues.slice(0, 20).map(i => `[${i.severity.toUpperCase()}][${i.category}] ${i.issue}`).join("\n");

      // ── AI Analysis ───────────────────────────────────────────────────────
      let aiInsights: any = {};
      try {
        const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
        const prompt = `You are a senior SEO consultant. Analyse this website: ${url}

Site metrics:
- Overall SEO score: ${overallScore}/100
- Technical: ${techScore}/100 | On-Page: ${onPageScore}/100 | Content: ${contentScore}/100 | Performance: ${perfScore}/100
- Pages crawled: ${pages.length}, HTTPS: ${isHttps ? "Yes" : "No"}, robots.txt: ${hasRobots ? "Yes" : "Missing"}, sitemap: ${hasSitemap ? "Yes" : "Missing"}
- Home title: "${samplePage.title}" | Meta desc: "${samplePage.metaDesc?.substring(0, 80)}"
- Home word count: ${samplePage.wordCount} | Avg page size: ${Math.round(avgPageSize / 1024)}KB | Avg scripts: ${Math.round(avgScripts)}
- Issues:
${issueList}

Return ONLY valid JSON (no markdown) with EXACTLY this structure:
{
  "executiveSummary": "2-3 sentence expert summary",
  "topPriority": "Single most impactful action right now",
  "quickWins": ["< 1 hour action 1", "action 2", "action 3"],
  "longTermActions": ["strategic action 1", "action 2"],
  "competitiveInsight": "One actionable sentence about outranking competitors",
  "rankingPrediction": "Expected organic traffic impact in 90 days if top issues fixed",
  "roadmap": {
    "week1": ["Day 1-7 task 1", "task 2", "task 3"],
    "month1": ["Day 8-30 task 1", "task 2", "task 3"],
    "quarter": ["Day 31-90 task 1", "task 2", "task 3"]
  },
  "eeat": {
    "experienceScore": 55,
    "expertiseScore": 60,
    "authorityScore": 40,
    "trustScore": 50,
    "improvements": ["EEAT improvement 1", "improvement 2", "improvement 3"]
  },
  "keywordOpportunities": [
    {"keyword": "target keyword phrase", "intent": "informational", "difficulty": "low", "action": "Create a dedicated blog post targeting this keyword"},
    {"keyword": "another keyword", "intent": "transactional", "difficulty": "medium", "action": "Optimise product/landing page for this term"},
    {"keyword": "third keyword", "intent": "informational", "difficulty": "low", "action": "Write a comprehensive guide targeting this"}
  ],
  "contentSuggestions": [
    {"page": "Home", "suggestion": "Add a clear value proposition and social proof above the fold"},
    {"page": "Blog", "suggestion": "Publish 2 long-form posts per month on core topics"}
  ],
  "competitorComparison": {
    "topCompetitors": ["likely-competitor1.com", "likely-competitor2.com", "likely-competitor3.com"],
    "gaps": ["What top-ranking competitors have that this site lacks", "Gap 2"],
    "advantages": ["Potential strength this site has or can develop", "Advantage 2"]
  },
  "internalLinkingIssues": ["Internal linking issue 1", "Issue 2"],
  "coreWebVitals": {
    "lcp": "needs-improvement",
    "cls": "good",
    "inp": "needs-improvement",
    "lcpTip": "Optimise hero image: use WebP format, add explicit width/height, preload with <link rel=preload>",
    "clsTip": "Add explicit width and height to all images and avoid dynamically injecting content above the fold",
    "inpTip": "Defer non-critical JS, split code bundles, avoid long tasks blocking the main thread"
  }
}`;

        const resp = await openai.chat.completions.create({ model: "gpt-4.1", messages: [{ role: "user", content: prompt }], temperature: 0.35, max_tokens: 1800 });
        const raw  = resp.choices[0].message.content?.trim() || "{}";
        aiInsights = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        aiInsights = {
          executiveSummary: "AI analysis temporarily unavailable — see the issues list for actionable recommendations.",
          topPriority: uniqueIssues.find(i => i.severity === "critical")?.fix || "Fix all critical issues first.",
          quickWins: uniqueIssues.filter(i => i.severity === "warning").slice(0, 3).map((i: any) => i.fix),
          longTermActions: [],
          competitiveInsight: "",
          rankingPrediction: "",
          roadmap: { week1: [], month1: [], quarter: [] },
          eeat: { experienceScore: 50, expertiseScore: 50, authorityScore: 40, trustScore: 50, improvements: [] },
          keywordOpportunities: [],
          contentSuggestions: [],
          competitorComparison: { topCompetitors: [], gaps: [], advantages: [] },
          internalLinkingIssues: [],
          coreWebVitals: { lcp: "needs-improvement", cls: "needs-improvement", inp: "needs-improvement", lcpTip: "", clsTip: "", inpTip: "" },
        };
      }

      // ── Assemble + cache report ───────────────────────────────────────────
      const shareId = Math.random().toString(36).substring(2, 11);
      const report  = {
        url, domain, shareId,
        score: overallScore, techScore, onPageScore, contentScore, perfScore,
        pagesCrawled: pages.length,
        timestamp: new Date().toISOString(),
        issues: uniqueIssues,
        pages: pages.map(p => ({ url: p.url, score: p.score, title: p.title, wordCount: p.wordCount, scripts: p.scripts, pageSize: p.pageSize })),
        aiInsights,
      };

      auditReportCache.set(shareId, { report, expires: Date.now() + 86400000 });
      for (const [k, v] of auditReportCache.entries()) { if (v.expires < Date.now()) auditReportCache.delete(k); }

      // Save summary to DB for history
      try {
        await db.insert(auditSnapshots).values({
          url, domain, score: overallScore,
          pageCount: pages.length,
          pagesJson: JSON.stringify({ shareId, techScore, onPageScore, contentScore, perfScore, issueCount: uniqueIssues.length }),
        });
      } catch {}

      res.json(report);
    } catch (err: any) {
      console.error("AI audit error:", err);
      res.status(500).json({ error: "Audit failed: " + err.message });
    }
  });

  // ── ZIP Compressor ─────────────────────────────────────────────────────────
  app.post("/api/tools/zip-compress", upload.array("files", 100), async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    const level = Math.min(9, Math.max(0, parseInt((req.body.level as string) || "6")));
    const zipNameRaw = ((req.body.zipName as string) || "compressed").replace(/[^a-zA-Z0-9_\-. ]/g, "").trim() || "compressed";
    const zipName = zipNameRaw + ".zip";
    const zipPath = path.join(OUTPUT_DIR, `zip-${Date.now()}.zip`);
    try {
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level } });
        output.on("close", resolve);
        archive.on("error", reject);
        archive.pipe(output);
        for (const f of files) archive.file(f.path, { name: f.originalname });
        archive.finalize();
      });
      res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
      res.setHeader("Content-Type", "application/zip");
      const stream = fs.createReadStream(zipPath);
      stream.pipe(res);
      stream.on("end", () => {
        fs.unlink(zipPath, () => {});
        for (const f of files) fs.unlink(f.path, () => {});
      });
    } catch (err: any) {
      for (const f of files) fs.unlink(f.path, () => {});
      res.status(500).json({ error: err.message || "ZIP creation failed" });
    }
  });

  // ── Ads Platform: Connect (validate credentials) ───────────────────────────
  app.post("/api/ads/connect", async (req, res) => {
    try {
      const { platform, credentials } = req.body;
      if (!platform || !credentials) return res.status(400).json({ error: "platform and credentials required" });
      let metrics: any;
      switch (platform) {
        case "Google":
          if (!credentials.customerId || !credentials.accessToken || !credentials.developerToken)
            return res.status(400).json({ error: "customerId, accessToken and developerToken required" });
          metrics = await fetchGoogleAdsMetrics(credentials.customerId, credentials.accessToken, credentials.developerToken);
          break;
        case "LSA":
          if (!credentials.customerId || !credentials.accessToken || !credentials.developerToken)
            return res.status(400).json({ error: "customerId, accessToken and developerToken required" });
          metrics = await fetchGoogleAdsMetrics(credentials.customerId, credentials.accessToken, credentials.developerToken);
          metrics.platform = "LSA";
          break;
        case "LinkedIn":
          if (!credentials.adAccountId || !credentials.accessToken)
            return res.status(400).json({ error: "adAccountId and accessToken required" });
          metrics = await fetchLinkedInAdsMetrics(credentials.adAccountId, credentials.accessToken);
          break;
        case "Meta":
          if (!credentials.adAccountId || !credentials.accessToken)
            return res.status(400).json({ error: "adAccountId and accessToken required" });
          metrics = await fetchMetaAdsMetrics(credentials.adAccountId, credentials.accessToken, false);
          break;
        case "Meta Leads":
          if (!credentials.adAccountId || !credentials.accessToken)
            return res.status(400).json({ error: "adAccountId and accessToken required" });
          metrics = await fetchMetaAdsMetrics(credentials.adAccountId, credentials.accessToken, true);
          break;
        default:
          return res.status(400).json({ error: "Unknown platform" });
      }
      res.json({ ok: true, metrics, syncedAt: new Date().toISOString() });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || "Connection failed";
      res.status(400).json({ error: msg });
    }
  });

  // ── Ads Platform: Refresh metrics ──────────────────────────────────────────
  app.post("/api/ads/metrics", async (req, res) => {
    try {
      const { platform, credentials } = req.body;
      if (!platform || !credentials) return res.status(400).json({ error: "platform and credentials required" });
      let metrics: any;
      switch (platform) {
        case "Google":
        case "LSA":
          metrics = await fetchGoogleAdsMetrics(credentials.customerId, credentials.accessToken, credentials.developerToken);
          if (platform === "LSA") metrics.platform = "LSA";
          break;
        case "LinkedIn":
          metrics = await fetchLinkedInAdsMetrics(credentials.adAccountId, credentials.accessToken);
          break;
        case "Meta":
          metrics = await fetchMetaAdsMetrics(credentials.adAccountId, credentials.accessToken, false);
          break;
        case "Meta Leads":
          metrics = await fetchMetaAdsMetrics(credentials.adAccountId, credentials.accessToken, true);
          break;
        default:
          return res.status(400).json({ error: "Unknown platform" });
      }
      res.json({ ok: true, metrics, syncedAt: new Date().toISOString() });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || "Fetch failed";
      res.status(400).json({ error: msg });
    }
  });

  // ── AI SEO Content Optimizer ───────────────────────────────────────────────
  app.post("/api/seo/ai-seo", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") return res.status(400).json({ error: "URL required" });
      try { new URL(url); } catch { return res.status(400).json({ error: "Invalid URL format" }); }

      // Fetch page to extract current title + meta
      let currentTitle = "";
      let currentMeta  = "";
      let bodySnippet  = "";
      try {
        const r = await axios.get(url, { timeout: 10000, headers: { "User-Agent": "SEOAuditBot/1.0" } });
        const $ = cheerio.load(r.data);
        currentTitle = $("title").text().trim();
        currentMeta  = $('meta[name="description"]').attr("content")?.trim() || "";
        bodySnippet  = $("body").text().replace(/\s+/g, " ").trim().slice(0, 1500);
      } catch {}

      const prompt = `You are an expert SEO strategist. Analyse the following website and return a JSON object ONLY (no markdown, no explanation).

URL: ${url}
Current title: "${currentTitle}"
Current meta description: "${currentMeta}"
Page text snippet: "${bodySnippet}"

Return ONLY this JSON (all fields required):
{
  "title": "Optimised title tag under 60 chars with primary keyword",
  "description": "Optimised meta description 140-155 chars with CTA",
  "keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5","keyword6","keyword7","keyword8"],
  "schemaType": "One of: Article, LocalBusiness, Product, FAQPage, WebSite, Organization, Service",
  "contentScore": 72,
  "readabilityScore": 68,
  "aiScore": 70,
  "summary": "2-3 sentence executive summary of the site's SEO health and biggest opportunity.",
  "suggestions": [
    {"type":"Title Tag","current":"current value or None","recommended":"recommended value","impact":"High — improved click-through rate"},
    {"type":"Meta Description","current":"current value or None","recommended":"recommended value","impact":"Medium — better SERP preview"},
    {"type":"Schema Markup","current":"Not implemented","recommended":"Add ${"{schemaType}"} schema","impact":"High — enables rich results"},
    {"type":"Content Depth","current":"Estimated current state","recommended":"Actionable improvement","impact":"Medium — topical authority"}
  ],
  "contentIdeas": [
    {"topic":"Blog post topic idea 1","format":"How-to guide","keywords":["kw1","kw2"]},
    {"topic":"Blog post topic idea 2","format":"Listicle","keywords":["kw3","kw4"]},
    {"topic":"Blog post topic idea 3","format":"Case study","keywords":["kw5","kw6"]}
  ],
  "faqs": [
    {"question":"Common question users have about this business?","answer":"Clear, concise answer optimised for featured snippets."},
    {"question":"Second common question?","answer":"Answer with relevant details."},
    {"question":"Third common question?","answer":"Answer addressing user intent."}
  ]
}`;

      let result: any = {};
      try {
        const resp = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1200,
        });
        const raw = resp.choices[0].message.content?.trim() || "{}";
        result = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        // Fallback if AI fails
        result = {
          title: currentTitle ? currentTitle.slice(0, 60) : "Add a keyword-rich title under 60 characters",
          description: currentMeta ? currentMeta.slice(0, 155) : "Add a compelling meta description under 160 characters.",
          keywords: ["website", "services", "online", "professional", "best", "affordable", "quality", "expert"],
          schemaType: "WebSite",
          contentScore: 55,
          readabilityScore: 60,
          aiScore: 55,
          summary: "AI analysis temporarily unavailable. Please check your OpenAI API key and try again.",
          suggestions: [
            { type: "Title Tag", current: currentTitle || "None", recommended: "Add primary keyword near the start of your title", impact: "High — directly impacts SERP rankings" },
            { type: "Meta Description", current: currentMeta || "None", recommended: "Write a 150-160 char description with a call-to-action", impact: "Medium — improves click-through rate" },
          ],
          contentIdeas: [
            { topic: "How to choose the right service provider", format: "How-to guide", keywords: ["tips", "guide"] },
            { topic: "Top benefits of working with professionals", format: "Listicle", keywords: ["benefits", "professional"] },
          ],
          faqs: [
            { question: "What services do you offer?", answer: "Add a comprehensive answer describing your main services." },
            { question: "How can I get started?", answer: "Describe your onboarding process here." },
          ],
        };
      }

      res.json({
        url,
        currentTitle,
        currentMeta,
        title:           result.title        || "",
        description:     result.description  || "",
        keywords:        Array.isArray(result.keywords) ? result.keywords : [],
        schemaType:      result.schemaType   || "WebSite",
        contentScore:    Number(result.contentScore)    || 50,
        readabilityScore:Number(result.readabilityScore)|| 50,
        aiScore:         Number(result.aiScore)         || 50,
        summary:         result.summary      || "",
        suggestions:     Array.isArray(result.suggestions)   ? result.suggestions   : [],
        contentIdeas:    Array.isArray(result.contentIdeas)  ? result.contentIdeas  : [],
        faqs:            Array.isArray(result.faqs)          ? result.faqs          : [],
      });
    } catch (err: any) {
      console.error("AI SEO error:", err);
      res.status(500).json({ error: "AI SEO analysis failed: " + err.message });
    }
  });

  // Cleanup task: Remove files older than 30 minutes
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  const MAX_AGE = 30 * 60 * 1000; // 30 minutes

  setInterval(() => {
    console.log("Running cleanup task...");
    const now = Date.now();

    const cleanupDir = (dir: string) => {
      fs.readdir(dir, (err, files) => {
        if (err) return console.error(`Error reading ${dir}:`, err);

        files.forEach((file) => {
          const filePath = path.join(dir, file);
          fs.stat(filePath, (err, stats) => {
            if (err) return;
            if (now - stats.mtimeMs > MAX_AGE) {
              fs.unlink(filePath, (err) => {
                if (err) console.error(`Error deleting ${file}:`, err);
                else console.log(`Deleted old file: ${file}`);
              });
            }
          });
        });
      });
    };

    cleanupDir(UPLOADS_DIR);
    cleanupDir(OUTPUT_DIR);
  }, CLEANUP_INTERVAL);

  return httpServer;
}

async function performSEOAudit(baseUrl: string) {
  const visited = new Set<string>();
  const toVisit = [baseUrl];
  const results: any[] = [];
  const maxPages = 1000;

  const domain = new URL(baseUrl).hostname;

  while (toVisit.length > 0 && visited.size < maxPages) {
    const url = toVisit.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const response = await axios.get(url, { timeout: 8000 });
      const $ = cheerio.load(response.data);

      const pageResults = auditPage(url, $);
      results.push(pageResults);

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        try {
          const absoluteUrl = new URL(href, url).href;
          const absoluteUrlObj = new URL(absoluteUrl);
          if (absoluteUrlObj.hostname === domain && !visited.has(absoluteUrl)) {
            toVisit.push(absoluteUrl);
          }
        } catch {}
      });
    } catch (error) {
      console.error(`Error auditing ${url}:`, error);
    }
  }

  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + r.score, 0) / results.length,
        )
      : 0;

  return {
    url: baseUrl,
    score: avgScore,
    timestamp: new Date().toISOString(),
    pages: results,
    recommendations: results[0]?.recommendations || [],
  };
}

function auditPage(url: string, $: cheerio.CheerioAPI) {
  const checks = [];
  let score = 100;

  const basicItems = [
    {
      name: "Title Tag",
      status:
        $("title").length > 0 && $("title").text().trim().length > 0
          ? "pass"
          : "fail",
      message:
        $("title").text().trim().length > 0
          ? `Title: ${$("title").text().trim()}`
          : "Missing title tag",
      severity: "critical",
    },
    {
      name: "Meta Description",
      status: $('meta[name="description"]').attr("content")
        ? "pass"
        : "warning",
      message: $('meta[name="description"]').attr("content")
        ? "Meta description found"
        : "Missing meta description",
      severity: "warning",
    },
    {
      name: "H1 Tag",
      status: $("h1").length === 1 ? "pass" : "warning",
      message: `Found ${$("h1").length} H1 tags`,
      severity: "critical",
    },
  ];

  basicItems.forEach((item) => {
    if (item.status === "fail") score -= 20;
    else if (item.status === "warning") score -= 10;
  });
  checks.push({ category: "Basic SEO", items: basicItems });

  const techItems = [
    {
      name: "Image ALT Text",
      status: $("img:not([alt])").length === 0 ? "pass" : "warning",
      message: `Found ${$("img:not([alt])").length} images without alt text`,
      severity: "warning",
    },
    {
      name: "Canonical Tag",
      status: $('link[rel="canonical"]').length > 0 ? "pass" : "warning",
      message: $('link[rel="canonical"]').length > 0 ? "Canonical tag present" : "Missing canonical tag",
      severity: "medium",
    },
    {
      name: "Viewport Tag",
      status: $('meta[name="viewport"]').length > 0 ? "pass" : "fail",
      message: $('meta[name="viewport"]').length > 0 ? "Viewport meta tag present" : "Missing viewport tag (Mobile Friendly)",
      severity: "critical",
    },
    {
      name: "Robots Meta Tag",
      status: $('meta[name="robots"]').length > 0 ? "pass" : "warning",
      message: $('meta[name="robots"]').length > 0 ? "Robots meta tag found" : "Missing robots meta tag",
      severity: "medium",
    },
  ];
  techItems.forEach((item) => {
    if (item.status === "fail") score -= 10;
    else if (item.status === "warning") score -= 5;
  });
  checks.push({ category: "Technical SEO", items: techItems });

  const whiteLabelItems = [
    {
      name: "Internal Links",
      status: $("a[href^='/'], a[href^='" + url + "']").length > 0 ? "pass" : "warning",
      message: `Found ${$("a[href^='/'], a[href^='" + url + "']").length} internal links`,
      severity: "medium",
    },
    {
      name: "Social Tags (Open Graph)",
      status: $('meta[property^="og:"]').length > 0 ? "pass" : "warning",
      message: `${$('meta[property^="og:"]').length} OG tags found`,
      severity: "low",
    },
    {
      name: "Favicon",
      status: $('link[rel*="icon"]').length > 0 ? "pass" : "warning",
      message: $('link[rel*="icon"]').length > 0 ? "Favicon found" : "Missing favicon",
      severity: "low",
    }
  ];
  whiteLabelItems.forEach((item) => {
    if (item.status !== "pass") score -= 2;
  });
  checks.push({ category: "White Label SEO", items: whiteLabelItems });

  return {
    url,
    score: Math.max(0, score),
    checks,
    recommendations: [...basicItems, ...techItems, ...whiteLabelItems]
      .filter((i) => i.status !== "pass")
      .map((i) => i.message),
  };
}

// ── Ads Platform Connect + Metrics ─────────────────────────────────────────────
async function fetchGoogleAdsMetrics(customerId: string, accessToken: string, developerToken: string) {
  const cid = customerId.replace(/-/g, "");
  const query = `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc, metrics.cost_per_conversion, campaign.status FROM campaign WHERE segments.date DURING LAST_30_DAYS AND campaign.status = 'ENABLED'`;
  const res = await axios.post(
    `https://googleads.googleapis.com/v17/customers/${cid}/googleAds:search`,
    { query },
    { headers: { Authorization: `Bearer ${accessToken}`, "developer-token": developerToken, "Content-Type": "application/json" }, timeout: 15000 }
  );
  const rows = res.data.results || [];
  let impressions = 0, clicks = 0, costMicros = 0, conversions = 0, convValue = 0, activeCampaigns = 0;
  for (const r of rows) {
    const m = r.metrics || {};
    impressions   += Number(m.impressions || 0);
    clicks        += Number(m.clicks || 0);
    costMicros    += Number(m.costMicros || 0);
    conversions   += Number(m.conversions || 0);
    convValue     += Number(m.conversionsValue || 0);
    activeCampaigns++;
  }
  const spend = costMicros / 1_000_000;
  const ctr   = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc   = clicks > 0 ? spend / clicks : 0;
  const cpa   = conversions > 0 ? spend / conversions : 0;
  const roas  = spend > 0 ? convValue / spend : 0;
  const convRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  return { impressions, clicks, spend: spend.toFixed(2), conversions: conversions.toFixed(0), convRate: convRate.toFixed(2), convValue: convValue.toFixed(2), ctr: ctr.toFixed(2), cpc: cpc.toFixed(2), cpa: cpa.toFixed(2), roas: roas.toFixed(2), activeCampaigns, platform: "Google" };
}

async function fetchMetaAdsMetrics(adAccountId: string, accessToken: string, leadGenOnly = false) {
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const fields = "spend,impressions,clicks,reach,actions,action_values,ctr,cpc,cost_per_action_type";
  const params: Record<string,string> = { access_token: accessToken, fields, date_preset: "last_30d", level: "account" };
  if (leadGenOnly) params.filtering = JSON.stringify([{ field: "objective", operator: "IN", value: ["LEAD_GENERATION"] }]);
  const res = await axios.get(`https://graph.facebook.com/v19.0/${accountId}/insights`, { params, timeout: 15000 });
  const d = res.data.data?.[0] || {};
  const getAction = (type: string) => (d.actions || []).find((a: any) => a.action_type === type)?.value || "0";
  const getActionVal = (type: string) => (d.action_values || []).find((a: any) => a.action_type === type)?.value || "0";
  const conversions = parseFloat(getAction("offsite_conversion.fb_pixel_purchase") || getAction("lead") || "0");
  const convValue   = parseFloat(getActionVal("offsite_conversion.fb_pixel_purchase") || "0");
  const spend       = parseFloat(d.spend || "0");
  const impressions = parseInt(d.impressions || "0");
  const clicks      = parseInt(d.clicks || "0");
  const ctr         = parseFloat(d.ctr || "0");
  const cpc         = parseFloat(d.cpc || "0");
  const roas        = spend > 0 ? convValue / spend : 0;
  const cpa         = conversions > 0 ? spend / conversions : 0;
  const convRate    = clicks > 0 ? (conversions / clicks) * 100 : 0;
  return { impressions, clicks, spend: spend.toFixed(2), conversions: conversions.toFixed(0), convRate: convRate.toFixed(2), convValue: convValue.toFixed(2), ctr: ctr.toFixed(2), cpc: cpc.toFixed(2), cpa: cpa.toFixed(2), roas: roas.toFixed(2), activeCampaigns: 0, platform: leadGenOnly ? "Meta Leads" : "Meta" };
}

async function fetchLinkedInAdsMetrics(adAccountId: string, accessToken: string) {
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 30);
  const params = {
    q: "analytics", pivot: "CAMPAIGN", timeGranularity: "MONTHLY",
    "dateRange.start.year": start.getFullYear(), "dateRange.start.month": start.getMonth() + 1, "dateRange.start.day": start.getDate(),
    "dateRange.end.year": now.getFullYear(), "dateRange.end.month": now.getMonth() + 1, "dateRange.end.day": now.getDate(),
    [`accounts`]: `urn:li:sponsoredAccount:${adAccountId}`,
    fields: "externalWebsiteConversions,clicks,impressions,costInLocalCurrency,externalWebsitePostClickConversions,leadGenerationMailContactInfoShares,conversionValueInLocalCurrency",
  };
  const res = await axios.get("https://api.linkedin.com/rest/adAnalytics", {
    params, headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202401" }, timeout: 15000,
  });
  const rows = res.data.elements || [];
  let impressions = 0, clicks = 0, spend = 0, conversions = 0, convValue = 0;
  for (const r of rows) {
    impressions += parseInt(r.impressions || "0");
    clicks      += parseInt(r.clicks || "0");
    spend       += parseFloat(r.costInLocalCurrency || "0");
    conversions += parseInt(r.externalWebsiteConversions || r.externalWebsitePostClickConversions || "0");
    convValue   += parseFloat(r.conversionValueInLocalCurrency || "0");
  }
  const ctr      = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc      = clicks > 0 ? spend / clicks : 0;
  const cpa      = conversions > 0 ? spend / conversions : 0;
  const roas     = spend > 0 ? convValue / spend : 0;
  const convRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  return { impressions, clicks, spend: spend.toFixed(2), conversions: conversions.toFixed(0), convRate: convRate.toFixed(2), convValue: convValue.toFixed(2), ctr: ctr.toFixed(2), cpc: cpc.toFixed(2), cpa: cpa.toFixed(2), roas: roas.toFixed(2), activeCampaigns: rows.length, platform: "LinkedIn" };
}
