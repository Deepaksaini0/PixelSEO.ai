import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We don't strictly need a database for this stateless tool, 
// but we define Zod schemas here for API validation.

export const formats = [
  "jpeg", "png", "webp", "avif", "tiff", "gif", 
  "bmp", "ico", "jp2", "heif", "jxl", "svg" // Added svg
] as const;

export const mergeDirections = ["horizontal", "vertical", "grid"] as const;

export const conversionOptionsSchema = z.object({
  format: z.enum(formats).default("jpeg"),
  quality: z.number().min(1).max(100).default(80),
  targetSizeKB: z.number().optional().describe("Target size in KB for smart compression"),
  watermarkText: z.string().optional(),
  watermarkOpacity: z.number().min(0).max(1).default(0.5),
  keepMetadata: z.boolean().default(false)
});

export type ConversionOptions = z.infer<typeof conversionOptionsSchema>;

export const mergeOptionsSchema = z.object({
  direction: z.enum(mergeDirections).default("horizontal"),
  spacing: z.number().min(0).max(50).default(0).describe("Space between images in pixels"),
  backgroundColor: z.string().default("#ffffff").describe("Background color for spacing"),
  format: z.enum(formats).default("jpeg"),
  quality: z.number().min(1).max(100).default(80)
});

export type MergeOptions = z.infer<typeof mergeOptionsSchema>;

export const uploadedFileSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string(),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;

export const processRequestSchema = z.object({
  fileIds: z.array(z.string()),
  fileNames: z.record(z.string(), z.string()).optional(),
  options: conversionOptionsSchema
});

export type ProcessRequest = z.infer<typeof processRequestSchema>;

export const mergeRequestSchema = z.object({
  fileIds: z.array(z.string()).min(2, "Need at least 2 images to merge"),
  options: mergeOptionsSchema
});

export type MergeRequest = z.infer<typeof mergeRequestSchema>;

export const processedResultSchema = z.object({
  id: z.string(), // Maps back to upload ID
  url: z.string(),
  filename: z.string(),
  originalSize: z.number(),
  newSize: z.number(),
  format: z.string(),
  width: z.number().optional(),
  height: z.number().optional()
});

export type ProcessedResult = z.infer<typeof processedResultSchema>;

export const processResponseSchema = z.object({
  results: z.array(processedResultSchema),
  zipUrl: z.string()
});

export type ProcessResponse = z.infer<typeof processResponseSchema>;

export const mergeResponseSchema = z.object({
  url: z.string(),
  filename: z.string(),
  originalSize: z.number(),
  newSize: z.number(),
  width: z.number(),
  height: z.number(),
  pdfUrl: z.string().optional(),
  pdfFilename: z.string().optional()
});

export type MergeResponse = z.infer<typeof mergeResponseSchema>;

// Reviews table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  pagePath: text("page_path").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  userName: text("user_name").default("Anonymous"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// Audit Snapshots table — stores full SEO audit results for comparison over time
export const auditSnapshots = pgTable("audit_snapshots", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  score: integer("score").notNull(),
  pageCount: integer("page_count").notNull(),
  pagesJson: text("pages_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditSnapshotSchema = createInsertSchema(auditSnapshots).omit({ id: true, createdAt: true });
export type AuditSnapshot = typeof auditSnapshots.$inferSelect;
export type InsertAuditSnapshot = z.infer<typeof insertAuditSnapshotSchema>;

// Rank Checks table
export const rankChecks = pgTable("rank_checks", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  keyword: text("keyword").notNull(),
  position: integer("position"),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

export const insertRankCheckSchema = createInsertSchema(rankChecks).omit({ id: true, checkedAt: true });
export type RankCheck = typeof rankChecks.$inferSelect;
export type InsertRankCheck = z.infer<typeof insertRankCheckSchema>;

// Document formats
export const documentInputFormats = ["xlsx", "xls", "csv", "ods", "docx", "pdf"] as const;
export const documentOutputFormats = ["pdf", "xlsx", "csv", "docx"] as const;

export const documentConversionOptionsSchema = z.object({
  outputFormat: z.enum(documentOutputFormats).default("pdf")
});

export type DocumentConversionOptions = z.infer<typeof documentConversionOptionsSchema>;

export const documentConversionRequestSchema = z.object({
  fileIds: z.array(z.string()).min(1, "Need at least 1 document to convert"),
  options: documentConversionOptionsSchema
});

export type DocumentConversionRequest = z.infer<typeof documentConversionRequestSchema>;

export const documentConversionResponseSchema = z.object({
  url: z.string(),
  filename: z.string(),
  originalSize: z.number(),
  newSize: z.number(),
});

export type DocumentConversionResponse = z.infer<typeof documentConversionResponseSchema>;
