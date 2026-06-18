import { Link } from "wouter";
import { WatermarkRemover } from "@/components/WatermarkRemover";
import { ArrowLeft } from "lucide-react";

export default function WatermarkRemoverPage() {
  return (
    <div className="min-h-screen bg-[#111118] text-white flex flex-col">
      {/* Minimal top nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to tools
        </Link>
        <span className="text-xs text-gray-600">Powered by AI</span>
      </header>

      {/* Full-page tool */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        <WatermarkRemover />
      </main>
    </div>
  );
}
