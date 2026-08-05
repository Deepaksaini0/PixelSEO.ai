import { useState, useEffect } from "react";
import { UploadedFile, ConversionOptions, ProcessedResult, MergeOptions } from "@shared/schema";
import { useUploadFiles, useProcessFiles, useMergeFiles, useDocumentConvert } from "@/hooks/use-converter";
import { Dropzone } from "@/components/Dropzone";
import { FileCard } from "@/components/FileCard";
import { Sidebar } from "@/components/Sidebar";
import { MergeControls } from "@/components/MergeControls";
import { DocumentControls } from "@/components/DocumentControls";
import { ResultCard } from "@/components/ResultCard";
import { ImageEditor } from "@/components/ImageEditor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, RotateCcw, Image as ImageIcon, FileText, HelpCircle, FileJson, Zap, Code, BarChart3, Sparkles, Eraser, Palette, ShieldCheck, ScanBarcode, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ShareButton } from "@/components/ShareButton";

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<ProcessedResult[] | null>(null);
  const [mergedResult, setMergedResult] = useState<any>(null);
  const [documentResult, setDocumentResult] = useState<any>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"convert" | "merge" | "document" | "editor">("convert");
  
  const [options, setOptions] = useState<ConversionOptions>({
    format: "jpeg",
    quality: 80,
    watermarkOpacity: 0.5,
    keepMetadata: false,
  });

  const [mergeOptions, setMergeOptions] = useState<MergeOptions>({
    direction: "horizontal",
    spacing: 0,
    backgroundColor: "#ffffff",
    format: "jpeg",
    quality: 80
  });

  const [documentOutputFormat, setDocumentOutputFormat] = useState<string>("pdf");
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);

  const uploadMutation = useUploadFiles();
  const processMutation = useProcessFiles();
  const mergeMutation = useMergeFiles();
  const documentMutation = useDocumentConvert();
  const { toast } = useToast();

  const handleDrop = async (files: File[]) => {
    try {
      const uploaded = await uploadMutation.mutateAsync(files);
      setUploadedFiles(prev => [...prev, ...uploaded]);
    } catch (error) {
      // Handled by mutation hook
    }
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleEditSave = async (blob: Blob) => {
    if (!editingFile) return;

    try {
      const file = new File([blob], editingFile.originalName, { type: 'image/jpeg' });
      const uploaded = await uploadMutation.mutateAsync([file]);
      
      setUploadedFiles(prev => prev.map(f => f.id === editingFile.id ? uploaded[0] : f));
      setEditingFile(null);
      toast({ title: "Image updated successfully" });
    } catch (error) {
      toast({ title: "Failed to save edited image", variant: "destructive" });
    }
  };

  const handleProcess = async () => {
    if (uploadedFiles.length === 0) return;

    try {
      const response = await processMutation.mutateAsync({
        fileIds: uploadedFiles.map(f => f.id),
        fileNames: Object.fromEntries(uploadedFiles.map(f => [f.id, f.originalName])),
        options,
      });
      
      setResults(response.results);
      setZipUrl(response.zipUrl);
    } catch (error) {
      // Handled by mutation hook
    }
  };

  const handleMerge = async () => {
    if (uploadedFiles.length < 2) {
      toast({
        title: "Not enough images",
        description: "You need at least 2 images to merge",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await mergeMutation.mutateAsync({
        fileIds: uploadedFiles.map(f => f.id),
        options: mergeOptions,
      });
      
      setMergedResult(response);
    } catch (error) {
      // Handled by mutation hook
    }
  };

  const handleDocumentConvert = async () => {
    if (uploadedFiles.length === 0) return;

    try {
      const response = await documentMutation.mutateAsync({
        fileIds: uploadedFiles.map(f => f.id),
        options: { outputFormat: documentOutputFormat },
      });
      
      setDocumentResult(response);
    } catch (error) {
      // Handled by mutation hook
    }
  };

  const handleReset = () => {
    setUploadedFiles([]);
    setResults(null);
    setMergedResult(null);
    setDocumentResult(null);
    setZipUrl(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingFile) return; // Let editor handle its own shortcuts

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (mode === 'convert') handleProcess();
          else if (mode === 'merge') handleMerge();
          else if (mode === 'document') handleDocumentConvert();
        }
      } else if (e.altKey) {
        if (e.key === '1') setMode('convert');
        else if (e.key === '2') setMode('merge');
        else if (e.key === '3') setMode('editor');
        else if (e.key === '4') setMode('document');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, editingFile, handleProcess, handleMerge, handleDocumentConvert]);

  const handleEditorDrop = async (files: File[]) => {
    try {
      const uploaded = await uploadMutation.mutateAsync(files);
      if (uploaded.length > 0) {
        setEditingFile(uploaded[0]);
      }
    } catch (error) {
      // Handled by mutation hook
    }
  };

  const showResults = results !== null || mergedResult !== null || documentResult !== null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar - Settings Panel */}
      {!showResults && (
        <motion.aside 
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full md:w-80 lg:w-96 flex-shrink-0 z-20 h-[50vh] md:h-screen sticky top-0 md:relative"
        >
          <div className="h-full flex flex-col overflow-hidden">
            {/* Mode Tabs */}
            <div className="flex-shrink-0 border-b border-border/50 p-4 bg-gray-300">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="grid w-full grid-cols-3 bg-gray-300">
                  <TabsTrigger value="convert" className="btn-secondary bg-gray-300 text-black hover:bg-gray-400">Convert</TabsTrigger>
                  <TabsTrigger value="merge" className="btn-secondary bg-gray-300 text-black hover:bg-gray-400">Merge</TabsTrigger>
                  <TabsTrigger value="editor" className="btn-secondary bg-gray-300 text-black hover:bg-gray-400">Edit</TabsTrigger>
                  <TabsTrigger value="document" className="btn-secondary bg-gray-300 text-black hover:bg-gray-400">Document</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto">
              {mode === "convert" ? (
                <Sidebar 
                  options={options}
                  setOptions={setOptions}
                  onProcess={handleProcess}
                  isProcessing={processMutation.isPending}
                  fileCount={uploadedFiles.length}
                />
              ) : mode === "merge" ? (
                <div className="p-6 space-y-6">
                  <MergeControls options={mergeOptions} setOptions={setMergeOptions} />
                  <Button 
                    onClick={handleMerge} 
                    disabled={uploadedFiles.length < 2 || mergeMutation.isPending}
                    className="w-full"
                    size="lg"
                    data-testid="button-merge"
                  >
                    {mergeMutation.isPending ? "Merging..." : "Merge Images"}
                  </Button>
                </div>
              ) : mode === "editor" ? (
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Image Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload an image to crop, resize, or rotate it.
                    </p>
                    <div className="pt-4">
                      <Dropzone 
                        onDrop={handleEditorDrop} 
                        isUploading={uploadMutation.isPending} 
                        multi={false}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  <DocumentControls outputFormat={documentOutputFormat} onFormatChange={setDocumentOutputFormat} />
                  <Button 
                    onClick={handleDocumentConvert} 
                    disabled={uploadedFiles.length === 0 || documentMutation.isPending}
                    className="w-full"
                    size="lg"
                    data-testid="button-document-convert"
                  >
                    {documentMutation.isPending ? "Converting..." : `Convert to ${documentOutputFormat.toUpperCase()}`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto relative scroll-smooth">
        
        {/* Decorative Background Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:px-8 md:py-12">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-display font-bold text-black dark:text-black">
                {mode === "convert" ? "Image Convert / Compress" : mode === "merge" ? "Merge Image" : mode === "editor" ? "Edit Image" : "Convert PDF"}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              {!showResults && (
                <>
                  <Link href="/free-seo-audit">
                    <Button className="flex items-center gap-2 hover-elevate bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0" data-testid="button-ai-seo-nav">
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">Free SEO Audit</span>
                    </Button>
                  </Link>
                  <Link href="/seo-audit">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-seo-nav">
                      <Zap className="h-4 w-4" />
                      <span className="hidden sm:inline">SEO Audit</span>
                    </Button>
                  </Link>
              <Link href="/seo-tools">
                <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-seo-tools-nav">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">SEO Tools</span>
                </Button>
              </Link>
                  <Link href="/text-to-html">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-text-to-html-nav">
                      <Code className="h-4 w-4" />
                      <span className="hidden sm:inline">Text to HTML</span>
                    </Button>
                  </Link>
                  <Link href="/web-tools">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-web-tools-nav">
                      <Code className="h-4 w-4" />
                      <span className="hidden sm:inline">Web Tools</span>
                    </Button>
                  </Link>
                  <Link href="/watermark-remover">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-watermark-nav">
                      <Eraser className="h-4 w-4" />
                      <span className="hidden sm:inline">Watermark Remover</span>
                    </Button>
                  </Link>
                  <Link href="/faq">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-faq-nav">
                      <HelpCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">FAQ Schema</span>
                    </Button>
                  </Link>
                  <Link href="/llms">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-llms-nav">
                      <FileJson className="h-4 w-4" />
                      <span className="hidden sm:inline">llms.txt</span>
                    </Button>
                  </Link>
                  <Link href="/colors-from-image">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-colors-nav">
                      <Palette className="h-4 w-4" />
                      <span className="hidden sm:inline">Colors from Image</span>
                    </Button>
                  </Link>
                  <Link href="/pdf-security">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-pdf-security-nav">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">PDF Security</span>
                    </Button>
                  </Link>
                  <Link href="/barcode-generator">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-barcode-nav">
                      <ScanBarcode className="h-4 w-4" />
                      <span className="hidden sm:inline">Barcode Generator</span>
                    </Button>
                  </Link>
                  <Link href="/password-generator">
                    <Button variant="outline" className="flex items-center gap-2 hover-elevate" data-testid="button-password-nav">
                      <KeyRound className="h-4 w-4" />
                      <span className="hidden sm:inline">Password Generator</span>
                    </Button>
                  </Link>
                </>
              )}
              {showResults && (
                <Button variant="ghost" onClick={() => { setResults(null); setMergedResult(null); setDocumentResult(null); }} className="hover:bg-white/5" data-testid="button-back">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Edit
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!showResults ? (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Upload Area */}
                <section>
                  <Dropzone 
                    onDrop={mode === "editor" ? handleEditorDrop : handleDrop} 
                    isUploading={uploadMutation.isPending} 
                    multi={mode !== "editor"}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {mode === "merge" ? "Select 2+ images to merge them together" : mode === "document" ? "Upload documents (XLSX, XLS, CSV, ODS, DOCX) to convert to PDF" : mode === "editor" ? "Upload an image to start editing" : "Upload images to convert or compress"}
                  </p>
                </section>

                {/* File Grid */}
                {uploadedFiles.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Queue ({uploadedFiles.length})</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => setUploadedFiles([])}
                        data-testid="button-clear-all"
                      >
                        Clear All
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence>
                        {uploadedFiles.map((file) => (
                          <FileCard 
                            key={file.id} 
                            file={file} 
                            onRemove={handleRemoveFile} 
                            onEdit={(f) => setEditingFile(f)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                )}

                {editingFile && (
                  <ImageEditor
                    image={editingFile.url}
                    onSave={handleEditSave}
                    onClose={() => setEditingFile(null)}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {results ? (
                  <>
                    {/* Results Header for Convert */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl">
                      <div>
                        <h2 className="text-2xl font-bold font-display">Conversion Complete!</h2>
                        <p className="text-muted-foreground mt-1">
                          Successfully processed {results.length} files.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={handleReset}
                          className="border-white/10 hover:bg-white/5"
                          data-testid="button-start-over"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Start Over
                        </Button>
                        {zipUrl && (
                          <Button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = zipUrl;
                              link.download = 'converted_files.zip';
                              link.click();
                            }}
                            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                            data-testid="button-download-zip-results"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download All (ZIP)
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {results.map((result, idx) => (
                        <ResultCard key={result.id} result={result} index={idx} />
                      ))}
                    </div>
                  </>
                ) : mergedResult ? (
                  <>
                    {/* Results Header for Merge */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl">
                      <div>
                        <h2 className="text-2xl font-bold font-display">Merge Complete!</h2>
                        <p className="text-muted-foreground mt-1">
                          Images successfully merged.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={handleReset}
                          className="border-white/10 hover:bg-white/5"
                          data-testid="button-start-over-merge"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Start Over
                        </Button>
                      </div>
                    </div>

                    {/* Merged Image Display */}
                    <div className="max-w-2xl mx-auto">
                      <div className="rounded-lg border border-border overflow-hidden bg-card">
                        <img 
                          src={mergedResult.url} 
                          alt="Merged image"
                          className="w-full h-auto"
                          data-testid="img-merged-result"
                        />
                      </div>
                      
                      {/* Image Info */}
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-card rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">File Size</p>
                          <p className="text-lg font-semibold mt-1">{(mergedResult.newSize / 1024).toFixed(2)} KB</p>
                        </div>
                        <div className="p-4 bg-card rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Dimensions</p>
                          <p className="text-lg font-semibold mt-1">{mergedResult.width} × {mergedResult.height}px</p>
                        </div>
                      </div>

                      {/* Download Buttons */}
                      <div className="mt-6 flex gap-3">
                        <Button 
                          asChild 
                          className="flex-1" 
                          size="lg"
                          data-testid="button-download-merged"
                        >
                          <a href={mergedResult.url} download={mergedResult.filename}>
                            <Download className="mr-2 h-4 w-4" />
                            Download as {mergedResult.filename.split('.').pop()?.toUpperCase()}
                          </a>
                        </Button>
                        <ShareButton url={mergedResult.url} title="Check out this image I merged!" />
                      </div>
                      
                      {mergedResult.pdfUrl && (
                        <div className="mt-3 flex gap-3">
                          <Button 
                            asChild 
                            variant="outline"
                            className="flex-1" 
                            size="lg"
                            data-testid="button-download-pdf"
                          >
                            <a href={mergedResult.pdfUrl} download={mergedResult.pdfFilename}>
                              <Download className="mr-2 h-4 w-4" />
                              Download as PDF
                            </a>
                          </Button>
                          <ShareButton url={mergedResult.pdfUrl} title="Check out this PDF I created!" />
                        </div>
                      )}
                    </div>
                  </>
                ) : documentResult ? (
                  <>
                    {/* Results Header for Document */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl">
                      <div>
                        <h2 className="text-2xl font-bold font-display">Conversion Complete!</h2>
                        <p className="text-muted-foreground mt-1">
                          Document successfully converted to {documentOutputFormat.toUpperCase()}.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={handleReset}
                          className="border-white/10 hover:bg-white/5"
                          data-testid="button-start-over-document"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Start Over
                        </Button>
                      </div>
                    </div>

                    {/* Document Result Info */}
                    <div className="max-w-2xl mx-auto">
                      <div className="p-6 bg-card rounded-lg border border-border">
                        <div className="flex items-center gap-4">
                          <FileText className="h-12 w-12 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">{documentOutputFormat.toUpperCase()} File</p>
                            <p className="text-lg font-semibold">{documentResult.filename}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-card rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Original Size</p>
                          <p className="text-lg font-semibold mt-1">{(documentResult.originalSize / 1024).toFixed(2)} KB</p>
                        </div>
                        <div className="p-4 bg-card rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">PDF Size</p>
                          <p className="text-lg font-semibold mt-1">{(documentResult.newSize / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>

                      {/* Download Button */}
                      <div className="mt-6 flex gap-3">
                        <Button 
                          asChild 
                          className="flex-1" 
                          size="lg"
                          data-testid="button-download-document-pdf"
                        >
                          <a href={documentResult.url} download={documentResult.filename}>
                            <Download className="mr-2 h-4 w-4" />
                            Download {documentOutputFormat.toUpperCase()}
                          </a>
                        </Button>
                        <ShareButton url={documentResult.url} title={`Check out this ${documentOutputFormat.toUpperCase()} I converted!`} />
                      </div>
                    </div>
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SEO Content Section ────────────────────────────────────────── */}
        <section className="relative z-10 border-t border-border/40 bg-muted/30 mt-8">
          <div className="max-w-6xl mx-auto px-4 py-12 md:px-8">

            {/* Primary heading */}
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-black mb-3">
                Best Free SEO Tools — All-in-One AI SEO Audit Platform
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
                The most comprehensive <strong>free SEO audit tool</strong> available. Get instant <strong>website SEO analysis</strong>, <strong>technical SEO audit</strong>, <strong>on-page SEO checker</strong>, and AI-powered recommendations — all at zero cost. A true <strong>Ahrefs alternative free</strong> and <strong>SEMrush alternative free</strong> for every website owner.
              </p>
            </div>

            {/* 2-column keyword-rich feature grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {[
                {
                  icon: "🔍",
                  title: "Free SEO Audit Tool & SEO Checker Free",
                  body: "Run a complete <strong>free SEO audit</strong> in seconds. Our <strong>SEO checker free</strong> tool crawls up to 20 pages, checks all on-page factors, and generates a prioritised list of fixes — no account needed.",
                },
                {
                  icon: "🤖",
                  title: "AI SEO Tool & AI Content Optimization",
                  body: "Powered by GPT-4, our <strong>AI SEO tool</strong> delivers an expert executive summary, EEAT analysis, and a full <strong>AI content optimization</strong> plan. Fix your content strategy with AI-generated guidance.",
                },
                {
                  icon: "⚙️",
                  title: "Technical SEO Audit",
                  body: "Full <strong>technical SEO audit</strong>: HTTPS, canonical tags, robots.txt, XML sitemap, viewport meta, Core Web Vitals, schema markup, page speed, and render-blocking scripts — all in one <strong>website SEO analysis</strong>.",
                },
                {
                  icon: "📄",
                  title: "On-Page SEO Checker & SEO Score Checker",
                  body: "Our <strong>on-page SEO checker</strong> reviews title tags, meta descriptions, H1–H3 headings, alt text, and internal links. Your <strong>SEO score checker</strong> shows a 0–100 score with exact fixes to boost it.",
                },
                {
                  icon: "🔑",
                  title: "Keyword Gap Analysis Tool",
                  body: "Discover keywords your competitors rank for that you're missing. Our <strong>keyword gap analysis tool</strong> surfaces high-opportunity, low-difficulty terms so you know exactly what content to create next.",
                },
                {
                  icon: "🏆",
                  title: "Competitor SEO Analysis Tool",
                  body: "Identify your top 3 SEO competitors and see exactly what advantages they have. Our <strong>competitor SEO analysis tool</strong> shows gaps and your own strengths — so you can outrank them faster.",
                },
                {
                  icon: "📊",
                  title: "SEO Audit Report Generator",
                  body: "Generate a white-label <strong>SEO audit report</strong> in one click. Download a professional HTML report with scores, issues, roadmap, EEAT, and keyword opportunities — ready to share with clients.",
                },
                {
                  icon: "📈",
                  title: "SEO Rank Checker & Website Ranking Checker",
                  body: "Understand <strong>why my website is not ranking</strong> with our <strong>website ranking checker</strong>. Get a clear SEO score, issue breakdown, and a 90-day roadmap that predicts your traffic improvement.",
                },
                {
                  icon: "🛒",
                  title: "SEO Audit for WordPress & Ecommerce",
                  body: "Whether you need an <strong>SEO audit for WordPress</strong> or an <strong>SEO audit for ecommerce website</strong>, our crawler handles any CMS. Get product-page and category-level recommendations out of the box.",
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-2">{icon}</div>
                  <h3 className="font-bold text-sm mb-2">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: body }} />
                </div>
              ))}
            </div>

            {/* Why use / FAQ row */}
            <div className="grid sm:grid-cols-2 gap-5 mb-8">
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                  <span>❓</span> Why Is My Website Not Ranking?
                </h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {[
                    "Missing or duplicate title tags and meta descriptions",
                    "No XML sitemap or robots.txt blocking crawlers",
                    "Thin content (under 300 words) on key pages",
                    "No structured data (Schema.org) for rich results",
                    "Poor Core Web Vitals — slow LCP, high CLS",
                    "Weak EEAT signals — no author info or external links",
                  ].map(r => (
                    <li key={r} className="flex items-start gap-2">
                      <span className="text-red-500 shrink-0">✗</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                  <span>✅</span> How to Improve Your Website SEO Score
                </h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {[
                    "Run a free technical SEO audit and fix critical issues first",
                    "Use our on-page SEO checker to optimise every page title",
                    "Add JSON-LD structured data for Organisation and WebPage",
                    "Build internal links between related pages to spread authority",
                    "Close competitor keyword gaps with targeted content",
                    "Improve Core Web Vitals: compress images, defer JS, use CDN",
                  ].map(r => (
                    <li key={r} className="flex items-start gap-2">
                      <span className="text-green-500 shrink-0">✓</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
        
          </div>
        </section>

      </main>
    </div>
  );
}
