import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Lock,
  Unlock,
  Upload,
  Download,
  FileText,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Link } from "wouter";

type Mode = "protect" | "unlock";

interface ResultFile {
  url: string;
  filename: string;
  originalSize: number;
  newSize: number;
}

export default function PDFSecurity() {
  const [mode, setMode] = useState<Mode>("protect");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResultFile | null>(null);

  // Protect fields
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showUserPw, setShowUserPw] = useState(false);
  const [showOwnerPw, setShowOwnerPw] = useState(false);

  // Unlock fields
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showUnlockPw, setShowUnlockPw] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const formatBytes = (b: number) =>
    b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(2)} MB` : `${(b / 1024).toFixed(2)} KB`;

  const handleProcess = async () => {
    if (!file) return;
    if (mode === "protect" && !userPassword && !ownerPassword) {
      toast({ title: "Password required", description: "Enter at least one password to protect the PDF.", variant: "destructive" });
      return;
    }
    if (mode === "unlock" && !unlockPassword) {
      toast({ title: "Password required", description: "Enter the PDF password to unlock it.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (mode === "protect") {
        formData.append("userPassword", userPassword);
        formData.append("ownerPassword", ownerPassword || userPassword);
        const res = await fetch("/api/pdf/protect", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to protect PDF");
        }
        const data = await res.json();
        setResult(data);
        toast({ title: "PDF protected!", description: "Your PDF is now password-protected." });
      } else {
        formData.append("password", unlockPassword);
        const res = await fetch("/api/pdf/unlock", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to unlock PDF — check the password.");
        }
        const data = await res.json();
        setResult(data);
        toast({ title: "PDF unlocked!", description: "Password protection has been removed." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setUserPassword("");
    setOwnerPassword("");
    setUnlockPassword("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover-elevate">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-black flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              PDF Security
            </h1>
            <p className="text-muted-foreground">Protect or unlock PDF files with a password</p>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
          <button
            onClick={() => { setMode("protect"); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === "protect"
                ? "bg-white shadow text-primary border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Lock className="h-4 w-4" />
            Protect PDF
          </button>
          <button
            onClick={() => { setMode("unlock"); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === "unlock"
                ? "bg-white shadow text-primary border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Unlock className="h-4 w-4" />
            Unlock PDF
          </button>
        </div>

        {/* Upload area */}
        <Card className="border-2 border-dashed border-gray-300 bg-white shadow-sm">
          <CardContent className="p-0">
            <div
              className={`flex flex-col items-center justify-center py-10 px-6 cursor-pointer transition-colors rounded-xl ${
                isDragging ? "bg-blue-50 border-blue-400" : ""
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="h-12 w-12 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <Upload className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">Drop your PDF here</p>
                  <p className="text-sm text-muted-foreground mt-1">or</p>
                  <Button
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    Browse PDF
                  </Button>
                  <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> PDF files only · Your files are secure
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Password fields */}
        {file && (
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-5 space-y-4">
              {mode === "protect" ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-gray-800">Set Passwords</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-pw">User Password <span className="text-muted-foreground text-xs">(required to open)</span></Label>
                    <div className="relative">
                      <Input
                        id="user-pw"
                        type={showUserPw ? "text" : "password"}
                        placeholder="Enter user password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                        onClick={() => setShowUserPw((v) => !v)}
                      >
                        {showUserPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner-pw">Owner Password <span className="text-muted-foreground text-xs">(optional, for editing/printing rights)</span></Label>
                    <div className="relative">
                      <Input
                        id="owner-pw"
                        type={showOwnerPw ? "text" : "password"}
                        placeholder="Leave blank to use same as user password"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                        onClick={() => setShowOwnerPw((v) => !v)}
                      >
                        {showOwnerPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="pt-1 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
                    The PDF will be encrypted with 256-bit AES. The user password is required to open the file.
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Unlock className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-gray-800">Enter PDF Password</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unlock-pw">Password</Label>
                    <div className="relative">
                      <Input
                        id="unlock-pw"
                        type={showUnlockPw ? "text" : "password"}
                        placeholder="Enter the current PDF password"
                        value={unlockPassword}
                        onChange={(e) => setUnlockPassword(e.target.value)}
                        className="pr-10"
                        onKeyDown={(e) => e.key === "Enter" && handleProcess()}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                        onClick={() => setShowUnlockPw((v) => !v)}
                      >
                        {showUnlockPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <ShieldOff className="h-3.5 w-3.5 inline mr-1" />
                    Only unlock PDFs you own or have permission to modify.
                  </div>
                </>
              )}

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleProcess}
                disabled={isProcessing}
              >
                {isProcessing
                  ? "Processing…"
                  : mode === "protect"
                  ? "Protect PDF"
                  : "Unlock PDF"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className="border border-green-200 bg-green-50 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                {mode === "protect" ? (
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                ) : (
                  <ShieldOff className="h-6 w-6 text-green-600" />
                )}
                <div>
                  <p className="font-semibold text-green-800">
                    {mode === "protect" ? "PDF Protected Successfully!" : "PDF Unlocked Successfully!"}
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {formatBytes(result.originalSize)} → {formatBytes(result.newSize)}
                  </p>
                </div>
              </div>
              <a href={result.url} download={result.filename}>
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                  <Download className="h-4 w-4" />
                  Download {result.filename}
                </Button>
              </a>
              <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground" onClick={handleReset}>
                Process another file
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
