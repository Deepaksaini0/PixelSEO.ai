import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ChevronDown, ChevronUp, Lock, Unlock, Download, FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

type Mode = "protect" | "unlock";

interface ResultFile {
  url: string;
  filename: string;
  originalSize: number;
  newSize: number;
}

const formatBytes = (b: number) =>
  b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(2)} MB` : `${(b / 1024).toFixed(2)} KB`;

// ── Swagger-style POST badge ──────────────────────────────────────────────────
function PostBadge() {
  return (
    <span
      className="inline-flex items-center justify-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-white"
      style={{ backgroundColor: "#49cc90", minWidth: 56 }}
    >
      POST
    </span>
  );
}

// ── Password input with show/hide ─────────────────────────────────────────────
function PwInput({
  id, placeholder, value, onChange, onEnter,
}: {
  id: string; placeholder: string; value: string;
  onChange: (v: string) => void; onEnter?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        className="w-full border border-[#d3d3d3] rounded px-3 py-2 pr-10 text-sm font-mono bg-white text-[#3b4151] placeholder:text-gray-400 focus:outline-none focus:border-[#49cc90] focus:ring-1 focus:ring-[#49cc90]"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Swagger-style parameter row ───────────────────────────────────────────────
function ParamRow({
  name, inType, required, description, children,
}: {
  name: string; inType: string; required?: boolean;
  description: string; children: React.ReactNode;
}) {
  return (
    <tr className="border-b border-[#e8eaea]">
      <td className="py-3 pr-4 align-top w-40">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-sm font-bold text-[#3b4151]">{name}</span>
          {required && <span className="text-[10px] text-red-500 font-semibold">* required</span>}
          <span className="text-[10px] text-[#999ea1] uppercase mt-0.5">{inType}</span>
        </div>
      </td>
      <td className="py-3 align-top">
        <p className="text-xs text-[#666] mb-2">{description}</p>
        {children}
      </td>
    </tr>
  );
}

// ── File param row ────────────────────────────────────────────────────────────
function FileParamRow({
  file, onFile, onReset,
}: {
  file: File | null; onFile: (f: File) => void; onReset: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <tr className="border-b border-[#e8eaea]">
      <td className="py-3 pr-4 align-top w-40">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-sm font-bold text-[#3b4151]">file</span>
          <span className="text-[10px] text-red-500 font-semibold">* required</span>
          <span className="text-[10px] text-[#999ea1] uppercase mt-0.5">formData</span>
        </div>
      </td>
      <td className="py-3 align-top">
        <p className="text-xs text-[#666] mb-2">PDF file to process (max 50 MB)</p>
        {file ? (
          <div className="flex items-center gap-2 border border-[#49cc90] rounded px-3 py-2 bg-[#ebf7f0]">
            <FileText className="h-4 w-4 text-[#49cc90] flex-shrink-0" />
            <span className="text-sm font-mono text-[#3b4151] truncate flex-1">{file.name}</span>
            <span className="text-xs text-[#999]">{formatBytes(file.size)}</span>
            <button
              className="text-xs text-[#49cc90] hover:underline ml-2 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); onReset(); ref.current?.click(); }}
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={() => ref.current?.click()}
            className="border border-dashed border-[#49cc90] text-[#49cc90] rounded px-4 py-2 text-sm hover:bg-[#ebf7f0] transition-colors font-medium"
          >
            Choose File…
          </button>
        )}
        <input
          ref={ref} type="file" accept=".pdf,application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
      </td>
    </tr>
  );
}

// ── Result response panel ─────────────────────────────────────────────────────
function ResponsePanel({ result, mode }: { result: ResultFile; mode: Mode }) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-bold text-[#3b4151] mb-2">Responses</h4>
      <table className="w-full text-sm border border-[#d3d3d3] rounded overflow-hidden">
        <thead>
          <tr className="bg-[#f0f0f0]">
            <th className="text-left px-3 py-2 text-xs font-bold text-[#3b4151] w-24">Code</th>
            <th className="text-left px-3 py-2 text-xs font-bold text-[#3b4151]">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-[#d3d3d3]">
            <td className="px-3 py-3 align-top">
              <span className="font-mono font-bold text-[#49cc90] text-sm">200</span>
            </td>
            <td className="px-3 py-3">
              <p className="text-xs text-[#3b4151] mb-2 font-medium">
                {mode === "protect" ? "PDF successfully encrypted" : "PDF successfully decrypted"}
              </p>
              <div className="bg-[#1b1b1b] rounded p-3 font-mono text-xs text-[#cde9d3] mb-3 whitespace-pre-wrap">
{`{
  "filename": "${result.filename}",
  "originalSize": ${result.originalSize},
  "newSize": ${result.newSize},
  "url": "${result.url}"
}`}
              </div>
              <a href={result.url} download={result.filename}>
                <button className="flex items-center gap-2 bg-[#49cc90] hover:bg-[#3db37a] text-white px-4 py-2 rounded text-sm font-semibold transition-colors">
                  <Download className="h-4 w-4" />
                  Download {result.filename}
                </button>
              </a>
              <p className="text-xs text-[#999] mt-2">
                {formatBytes(result.originalSize)} → {formatBytes(result.newSize)}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Main endpoint accordion row ───────────────────────────────────────────────
function EndpointRow({
  path, summary, description, mode, defaultOpen,
}: {
  path: string; summary: string; description: string;
  mode: Mode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResultFile | null>(null);
  const { toast } = useToast();

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setUserPassword("");
    setOwnerPassword("");
    setUnlockPassword("");
  };

  const handleExecute = async () => {
    if (!file) { toast({ title: "File required", description: "Please choose a PDF file.", variant: "destructive" }); return; }
    if (mode === "protect" && !userPassword) { toast({ title: "Password required", description: "Enter a user password.", variant: "destructive" }); return; }
    if (mode === "unlock" && !unlockPassword) { toast({ title: "Password required", description: "Enter the PDF password.", variant: "destructive" }); return; }

    setIsProcessing(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (mode === "protect") {
        formData.append("userPassword", userPassword);
        formData.append("ownerPassword", ownerPassword || userPassword);
        const res = await fetch("/api/pdf/protect", { method: "POST", body: formData });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to protect PDF");
        setResult(await res.json());
        toast({ title: "PDF protected!" });
      } else {
        formData.append("password", unlockPassword);
        const res = await fetch("/api/pdf/unlock", { method: "POST", body: formData });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Incorrect password");
        setResult(await res.json());
        toast({ title: "PDF unlocked!" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const rowBg = open ? "bg-[#ebf7f0]" : "hover:bg-[#ebf7f0]";

  return (
    <div className="border border-[#49cc90] rounded mb-2 overflow-hidden">
      {/* Collapsed header */}
      <button
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${rowBg}`}
        onClick={() => setOpen((v) => !v)}
      >
        <PostBadge />
        <span className="font-mono text-sm font-bold text-[#3b4151] flex-1">{path}</span>
        <span className="text-sm text-[#3b4151] hidden sm:block">{summary}</span>
        <div className="ml-auto text-[#3b4151]">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-[#49cc90] bg-white px-5 py-5">
          <p className="text-sm text-[#3b4151] mb-5">{description}</p>

          {/* Parameters */}
          <h4 className="text-sm font-bold text-[#3b4151] mb-3">Parameters</h4>
          <table className="w-full">
            <thead>
              <tr className="bg-[#f0f0f0] border border-[#d3d3d3]">
                <th className="text-left px-3 py-2 text-xs font-bold text-[#3b4151] w-40">Name</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-[#3b4151]">Description</th>
              </tr>
            </thead>
            <tbody className="border border-[#d3d3d3]">
              <FileParamRow file={file} onFile={setFile} onReset={() => setFile(null)} />

              {mode === "protect" ? (
                <>
                  <ParamRow name="userPassword" inType="formData" required description="Password required to open the PDF (256-bit AES encryption)">
                    <PwInput id="user-pw" placeholder="Enter user password" value={userPassword} onChange={setUserPassword} />
                  </ParamRow>
                  <ParamRow name="ownerPassword" inType="formData" description="Owner password controlling editing and printing rights. Defaults to userPassword if blank.">
                    <PwInput id="owner-pw" placeholder="Leave blank to use same as user password" value={ownerPassword} onChange={setOwnerPassword} />
                  </ParamRow>
                </>
              ) : (
                <ParamRow name="password" inType="formData" required description="Current password of the protected PDF">
                  <PwInput id="unlock-pw" placeholder="Enter current PDF password" value={unlockPassword} onChange={setUnlockPassword} onEnter={handleExecute} />
                </ParamRow>
              )}
            </tbody>
          </table>

          {/* Execute */}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleExecute}
              disabled={isProcessing}
              className="bg-[#4990e2] hover:bg-[#3a7bc8] disabled:opacity-60 text-white px-6 py-2 rounded text-sm font-semibold transition-colors"
            >
              {isProcessing ? "Processing…" : "Execute"}
            </button>
            <button
              onClick={handleReset}
              className="border border-[#d3d3d3] text-[#3b4151] hover:bg-[#f5f5f5] px-4 py-2 rounded text-sm transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Result */}
          {result && <ResponsePanel result={result} mode={mode} />}

          {/* Error codes */}
          <div className="mt-4">
            <table className="w-full text-sm border border-[#d3d3d3] rounded overflow-hidden">
              <thead>
                <tr className="bg-[#f0f0f0]">
                  <th className="text-left px-3 py-2 text-xs font-bold text-[#3b4151] w-24">Code</th>
                  <th className="text-left px-3 py-2 text-xs font-bold text-[#3b4151]">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["400", "Bad request — missing file or password"],
                  ["500", "Server error during PDF processing"],
                ].map(([code, desc]) => (
                  <tr key={code} className="border-t border-[#d3d3d3]">
                    <td className="px-3 py-2"><span className="font-mono font-bold text-red-500 text-sm">{code}</span></td>
                    <td className="px-3 py-2 text-xs text-[#3b4151]">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PDFSecurity() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa", fontFamily: "sans-serif" }}>

      {/* Swagger-style topbar */}
      <div className="w-full flex items-center gap-4 px-6 py-3" style={{ backgroundColor: "#1b1b1b" }}>
        <Link href="/">
          <button className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors mr-2">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#49cc90] flex items-center justify-center">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-xl">PDF Security</span>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 max-w-xl w-full">
            <input
              readOnly
              value="/api/pdf"
              className="flex-1 px-4 py-1.5 rounded text-sm font-mono bg-white/10 text-white border border-white/20 focus:outline-none"
            />
            <button
              className="px-4 py-1.5 text-sm font-bold rounded border-2 border-[#49cc90] text-[#49cc90] hover:bg-[#49cc90] hover:text-white transition-colors"
            >
              Explore
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* API info block */}
        <div className="mb-8 border border-[#d3d3d3] rounded bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-[#3b4151]">PDF Security</h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: "#89bf04" }}>1.0</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold border border-[#89bf04] text-[#89bf04]">OAS 3.0</span>
          </div>
          <p className="text-sm text-[#3b4151] mb-3">
            Protect PDF files with 256-bit AES password encryption, or remove password protection from any PDF you own.
          </p>
          <div className="text-xs text-[#3b4151] space-y-0.5">
            <p><span className="text-[#999]">[ Base URL: </span><span className="font-mono text-[#4990e2]">/api</span><span className="text-[#999]"> ]</span></p>
          </div>
        </div>

        {/* Endpoint section */}
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-2xl font-bold text-[#3b4151]">pdf</h2>
          <span className="text-sm text-[#999ea1]">PDF Security Operations</span>
        </div>

        <EndpointRow
          path="/pdf/protect"
          summary="Protect PDF with password"
          description="Encrypts a PDF file with 256-bit AES encryption. A user password is required to open the file; an optional owner password controls editing and printing permissions."
          mode="protect"
          defaultOpen={true}
        />

        <EndpointRow
          path="/pdf/unlock"
          summary="Remove password protection"
          description="Decrypts a password-protected PDF and returns an unencrypted copy. You must supply the correct password. Only use this on PDFs you own or have permission to modify."
          mode="unlock"
        />
      </div>
    </div>
  );
}
