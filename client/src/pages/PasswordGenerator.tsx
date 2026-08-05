import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, KeyRound, Copy, RefreshCw, Check, Eye, EyeOff, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { Link } from "wouter";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const AMBIGUOUS = /[O0Il1]/g;

function generatePassword(opts: {
  length: number;
  lower: boolean;
  upper: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}) {
  let charset = "";
  const required: string[] = [];

  if (opts.lower) { charset += LOWER; required.push(LOWER[Math.floor(Math.random() * LOWER.length)]); }
  if (opts.upper) { charset += UPPER; required.push(UPPER[Math.floor(Math.random() * UPPER.length)]); }
  if (opts.numbers) { charset += NUMBERS; required.push(NUMBERS[Math.floor(Math.random() * NUMBERS.length)]); }
  if (opts.symbols) { charset += SYMBOLS; required.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]); }

  if (!charset) return "";

  if (opts.excludeAmbiguous) charset = charset.replace(AMBIGUOUS, "");

  const random = Array.from({ length: opts.length - required.length }, () =>
    charset[Math.floor(Math.random() * charset.length)]
  );

  // Shuffle required into random positions
  const combined = [...required, ...random];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join("");
}

function getStrength(pw: string): { label: string; color: string; score: number; icon: typeof Shield } {
  if (!pw) return { label: "None", color: "bg-gray-200", score: 0, icon: Shield };
  const len = pw.length;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSym = /[^a-zA-Z0-9]/.test(pw);
  const variety = [hasLower, hasUpper, hasNum, hasSym].filter(Boolean).length;

  let score = 0;
  if (len >= 8) score++;
  if (len >= 12) score++;
  if (len >= 16) score++;
  if (variety >= 2) score++;
  if (variety >= 3) score++;
  if (variety >= 4) score++;

  if (score <= 1) return { label: "Weak", color: "bg-red-500", score: 1, icon: ShieldAlert };
  if (score <= 3) return { label: "Fair", color: "bg-amber-400", score: 2, icon: Shield };
  if (score <= 4) return { label: "Strong", color: "bg-blue-500", score: 3, icon: ShieldCheck };
  return { label: "Very Strong", color: "bg-green-500", score: 4, icon: ShieldCheck };
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  badge?: string;
}

function Toggle({ checked, onChange, label, badge }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
        checked
          ? "bg-blue-50 border-blue-300 text-blue-800"
          : "bg-gray-50 border-gray-200 text-gray-500"
      }`}
    >
      <span>{label}</span>
      <div className="flex items-center gap-2">
        {badge && <span className="font-mono text-xs opacity-60">{badge}</span>}
        <div className={`w-9 h-5 rounded-full transition-colors relative ${checked ? "bg-blue-500" : "bg-gray-300"}`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
        </div>
      </div>
    </button>
  );
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(false);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [passwords, setPasswords] = useState<string[]>(() => [generatePassword({ length: 16, lower: true, upper: true, numbers: true, symbols: false, excludeAmbiguous: false })]);
  const [copied, setCopied] = useState<number | null>(null);
  const [showPasswords, setShowPasswords] = useState(true);

  const { toast } = useToast();

  const generate = useCallback(() => {
    if (!lower && !upper && !numbers && !symbols) {
      toast({ title: "Select at least one character type", variant: "destructive" });
      return;
    }
    setPasswords(Array.from({ length: quantity }, () =>
      generatePassword({ length, lower, upper, numbers, symbols, excludeAmbiguous })
    ));
    setCopied(null);
  }, [length, lower, upper, numbers, symbols, excludeAmbiguous, quantity]);

  const copyOne = (pw: string, idx: number) => {
    navigator.clipboard.writeText(pw).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const copyAll = () => {
    navigator.clipboard.writeText(passwords.join("\n")).then(() => {
      toast({ title: "Copied!", description: `${passwords.length} password${passwords.length > 1 ? "s" : ""} copied to clipboard.` });
    });
  };

  const strength = getStrength(passwords[0] || "");
  const StrengthIcon = strength.icon;

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
              <KeyRound className="h-7 w-7 text-primary" />
              Password Generator
            </h1>
            <p className="text-muted-foreground">Generate secure, random passwords instantly</p>
          </div>
        </div>

        {/* Options card */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-5 space-y-5">
            {/* Length */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">Password Length</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLength(Math.max(4, length - 1))}
                    className="h-6 w-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold flex items-center justify-center"
                  >−</button>
                  <span className="w-8 text-center font-mono font-bold text-blue-600 text-lg">{length}</span>
                  <button
                    onClick={() => setLength(Math.min(128, length + 1))}
                    className="h-6 w-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold flex items-center justify-center"
                  >+</button>
                </div>
              </div>
              <Slider
                min={4}
                max={128}
                step={1}
                value={[length]}
                onValueChange={([v]) => setLength(v)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>4</span>
                <span>128</span>
              </div>
            </div>

            {/* Character types */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block mb-1">Character Types</label>
              <Toggle checked={lower} onChange={setLower} label="Lowercase letters" badge="a-z" />
              <Toggle checked={upper} onChange={setUpper} label="Uppercase letters" badge="A-Z" />
              <Toggle checked={numbers} onChange={setNumbers} label="Numbers" badge="0-9" />
              <Toggle checked={symbols} onChange={setSymbols} label="Symbols" badge="!@#$%" />
            </div>

            {/* Extra options */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block mb-1">Options</label>
              <Toggle checked={excludeAmbiguous} onChange={setExcludeAmbiguous} label="Exclude ambiguous characters" badge="O0Il1" />
            </div>

            {/* Quantity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-6 w-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold flex items-center justify-center"
                  >−</button>
                  <span className="w-6 text-center font-mono font-bold text-blue-600">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(20, quantity + 1))}
                    className="h-6 w-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold flex items-center justify-center"
                  >+</button>
                </div>
              </div>
            </div>

            <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={generate}>
              <RefreshCw className="h-4 w-4" />
              Generate Password{quantity > 1 ? "s" : ""}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {passwords.length > 0 && (
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Generated Password{passwords.length > 1 ? "s" : ""}</span>
                <div className="flex items-center gap-2">
                  {passwords.length > 1 && (
                    <Button variant="outline" size="sm" onClick={copyAll} className="gap-1 text-xs h-7">
                      <Copy className="h-3 w-3" /> Copy All
                    </Button>
                  )}
                  <button
                    onClick={() => setShowPasswords((v) => !v)}
                    className="text-muted-foreground hover:text-gray-700"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Strength bar (shown for single) */}
              {passwords.length === 1 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StrengthIcon className={`h-4 w-4 ${
                      strength.score === 1 ? "text-red-500" :
                      strength.score === 2 ? "text-amber-500" :
                      strength.score === 3 ? "text-blue-500" : "text-green-500"
                    }`} />
                    <span className={`text-xs font-semibold ${
                      strength.score === 1 ? "text-red-500" :
                      strength.score === 2 ? "text-amber-500" :
                      strength.score === 3 ? "text-blue-500" : "text-green-500"
                    }`}>{strength.label}</span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className={`flex-1 rounded-full transition-colors ${
                          s <= strength.score ? strength.color : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {passwords.map((pw, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 group"
                  >
                    <code className={`flex-1 font-mono text-sm text-gray-800 break-all select-all ${!showPasswords ? "blur-sm select-none" : ""}`}>
                      {pw}
                    </code>
                    <button
                      onClick={() => copyOne(pw, idx)}
                      className="flex-shrink-0 text-muted-foreground hover:text-blue-600 transition-colors"
                      title="Copy"
                    >
                      {copied === idx ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center pt-1">
                Passwords are generated locally in your browser — never sent to a server.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
