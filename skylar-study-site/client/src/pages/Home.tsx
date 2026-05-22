import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  GraduationCap,
  FlaskConical,
  Sparkles,
  Lock,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

const GRADES = [
  { value: 1, label: "一年級", available: false },
  { value: 2, label: "二年級", available: false },
  { value: 3, label: "三年級", available: false },
  { value: 4, label: "四年級", available: true },
  { value: 5, label: "五年級", available: false },
  { value: 6, label: "六年級", available: false },
];

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [showGradeDialog, setShowGradeDialog] = useState(false);

  const setGradeMutation = trpc.auth.setMyGrade.useMutation({
    onSuccess: () => {
      toast.success("已記錄您的年級");
      utils.auth.me.invalidate();
      setShowGradeDialog(false);
    },
    onError: (err) => toast.error(err.message || "儲存失敗"),
  });

  // 已登入但尚未選擇年級 → 自動彈出年級選擇對話框
  useEffect(() => {
    if (!loading && isAuthenticated && (user?.grade ?? null) === null) {
      setShowGradeDialog(true);
    }
  }, [loading, isAuthenticated, user?.grade]);

  const requireLoginAndGrade = (callback: () => void) => {
    if (!isAuthenticated) {
      toast.info("請先登入後再選擇學科");
      setLocation("/login");
      return;
    }
    if ((user?.grade ?? null) === null) {
      setShowGradeDialog(true);
      return;
    }
    callback();
  };

  const handleSubject = (subject: "people" | "science") => {
    requireLoginAndGrade(() => {
      setLocation(`/units?subject=${subject}`);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30">
      <main className="max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-14">
        {/* 英雄區段 */}
        <section className="text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            博學堂 · Skylar Learning Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            人文科 與 科學科
            <br />
            <span className="bg-gradient-to-r from-[#0b2a5b] to-blue-500 bg-clip-text text-transparent">
              小學溫習平台
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            為小學生量身打造的線上溫習工具，結合分級題庫、即時判分與學習報告，協助同學在家穩步鞏固課堂所學。
          </p>

          {!isAuthenticated && !loading && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => setLocation("/login")}
                size="lg"
                className="bg-[#0b2a5b] hover:bg-[#0a234d] text-white px-8 gap-2"
              >
                登入開始溫習
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {isAuthenticated && (
            <div className="text-sm text-slate-500">
              歡迎回來，
              <span className="font-semibold text-slate-700">
                {user?.name || user?.username || "同學"}
              </span>
              {user?.grade ? (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-700">
                  <CheckCircle2 className="w-4 h-4" />
                  {user.grade} 年級
                </span>
              ) : (
                <button
                  onClick={() => setShowGradeDialog(true)}
                  className="ml-2 underline text-blue-600 hover:text-blue-800"
                >
                  選擇年級
                </button>
              )}
            </div>
          )}
        </section>

        {/* 兩大學科卡 */}
        <section className="grid md:grid-cols-2 gap-6">
          <SubjectCard
            tone="blue"
            icon={<GraduationCap className="w-7 h-7" />}
            title="人文科"
            subtitle="People Studies"
            description="認識中華傳統文化、家國概念、歷史人物與社會發展，培養公民素養。"
            ctaLabel="進入人文科"
            onClick={() => handleSubject("people")}
            gated={!isAuthenticated}
          />
          <SubjectCard
            tone="emerald"
            icon={<FlaskConical className="w-7 h-7" />}
            title="科學科"
            subtitle="Science"
            description="探索自然現象、物理化學基礎、生命與環境，建立觀察與實證的科學思維。"
            ctaLabel="進入科學科"
            onClick={() => handleSubject("science")}
            gated={!isAuthenticated}
            comingSoon
          />
        </section>

        {/* 學習特色 */}
        <section className="grid md:grid-cols-3 gap-4">
          <Feature
            title="分級題庫"
            desc="按年級分配對應單元與題型，貼合學校課程進度。"
          />
          <Feature
            title="即時批改"
            desc="作答後立刻看到對錯與詳細解析，加深印象。"
          />
          <Feature
            title="學習報告"
            desc="紀錄每次成績與用時，掌握進步軌跡。"
          />
        </section>

        <footer className="border-t border-slate-200 pt-8 text-center text-slate-500 text-xs">
          © 2026 博學堂 Skylar Learning Center · 為小學生而設的溫習網站
        </footer>
      </main>

      {/* 年級選擇對話框 */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>選擇你的年級</DialogTitle>
            <DialogDescription>
              請選擇你目前就讀的年級。我們會為你呈現對應的人文科 / 科學科溫習內容。
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {GRADES.map((g) => {
              const isCurrent = user?.grade === g.value;
              return (
                <button
                  key={g.value}
                  disabled={!g.available || setGradeMutation.isPending}
                  onClick={() => setGradeMutation.mutate({ grade: g.value })}
                  className={`relative px-4 py-5 rounded-xl border text-base font-semibold transition-all
                    ${
                      g.available
                        ? "bg-white hover:border-blue-500 hover:bg-blue-50 border-slate-200 text-slate-800 active:scale-[0.97]"
                        : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                    }
                    ${isCurrent ? "ring-2 ring-blue-500 border-blue-500" : ""}
                  `}
                >
                  {g.label}
                  {!g.available && (
                    <span className="block text-[10px] font-normal text-slate-400 mt-1">
                      敬請期待
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute top-1.5 right-2 text-[10px] text-blue-600">
                      目前
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {setGradeMutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-2">
              <Loader2 className="w-4 h-4 animate-spin" /> 儲存中…
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubjectCard({
  tone,
  icon,
  title,
  subtitle,
  description,
  ctaLabel,
  onClick,
  gated,
  comingSoon,
}: {
  tone: "blue" | "emerald";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  onClick: () => void;
  gated?: boolean;
  comingSoon?: boolean;
}) {
  const palette =
    tone === "blue"
      ? { ring: "from-[#0b2a5b] to-blue-400", bg: "bg-blue-100", text: "text-[#0b2a5b]" }
      : { ring: "from-emerald-700 to-emerald-400", bg: "bg-emerald-100", text: "text-emerald-700" };

  return (
    <Card className="relative overflow-hidden p-7 shadow-sm hover:shadow-xl transition-all duration-300 ease-out group">
      <div
        className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${palette.ring} opacity-10 group-hover:opacity-20 transition-opacity`}
      />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 ${palette.bg} ${palette.text} rounded-2xl flex items-center justify-center`}>
            {icon}
          </div>
          {comingSoon && (
            <span className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              題庫籌備中
            </span>
          )}
        </div>
        <div>
          <div className={`text-2xl font-bold ${palette.text}`}>{title}</div>
          <div className="text-xs text-slate-400 tracking-wider uppercase mt-0.5">
            {subtitle}
          </div>
        </div>
        <p className="text-slate-600 leading-relaxed">{description}</p>
        <Button
          onClick={onClick}
          className={`w-full mt-2 ${
            tone === "blue"
              ? "bg-[#0b2a5b] hover:bg-[#0a234d]"
              : "bg-emerald-700 hover:bg-emerald-800"
          } text-white gap-2 active:scale-[0.98]`}
        >
          {gated && <Lock className="w-4 h-4" />}
          {ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white/70 backdrop-blur p-5 border border-slate-200">
      <div className="text-base font-semibold text-slate-800">{title}</div>
      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}
