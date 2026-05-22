import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, GraduationCap, FlaskConical, Printer, ArrowLeft } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

type SubjectId = "people" | "science";

interface Unit {
  id: string;
  name: string;
  description: string;
  courses: string;
  quizTypes: Array<{ id: string; name: string }>;
  available: boolean;
}

interface SubjectMeta {
  id: SubjectId;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
  primaryClass: string;
  badgeClass: string;
}

const SUBJECTS: Record<SubjectId, SubjectMeta> = {
  people: {
    id: "people",
    title: "人文科",
    subtitle: "People Studies",
    Icon: GraduationCap,
    primaryClass: "text-[#0b2a5b]",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  science: {
    id: "science",
    title: "科學科",
    subtitle: "Science",
    Icon: FlaskConical,
    primaryClass: "text-emerald-700",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
};

/**
 * 各年級 + 學科對應的單元配置
 * 目前先開放四年級人文科，其餘為「敬請期待」
 */
const UNIT_CATALOG: Record<number, Record<SubjectId, Unit[]>> = {
  4: {
    people: [
      {
        id: "unit_5",
        name: "單元五",
        description: "國家歷史和文化",
        courses: "第 10、11 課",
        quizTypes: [
          { id: "true_false", name: "判斷題" },
          { id: "classification", name: "分類題" },
          { id: "matching", name: "配對題" },
          { id: "ordering", name: "排序題" },
          { id: "choice", name: "選擇題" },
        ],
        available: true,
      },
      {
        id: "unit_6",
        name: "單元六",
        description: "香港今昔",
        courses: "第 12、13 課",
        quizTypes: [
          { id: "true_false", name: "判斷題" },
          { id: "classification", name: "分類題" },
          { id: "matching", name: "配對題" },
        ],
        available: true,
      },
      {
        id: "unit_7",
        name: "單元七",
        description: "《基本法》與我",
        courses: "第 14 課",
        quizTypes: [
          { id: "classification", name: "分類題" },
          { id: "matching", name: "配對題" },
        ],
        available: true,
      },
      {
        id: "unit_8",
        name: "單元八",
        description: "資訊新世代",
        courses: "第 15、16 課",
        quizTypes: [
          { id: "true_false", name: "判斷題" },
          { id: "classification", name: "分類題" },
          { id: "matching", name: "配對題" },
        ],
        available: true,
      },
    ],
    science: [],
  },
};

interface QuizTypeModalProps {
  unit: Unit | null;
  subject: SubjectMeta;
  onClose: () => void;
  onSelect: (unitId: string, quizTypeId: string) => void;
  onPrint: (unitId: string, quizTypeId?: string) => void;
}

function QuizTypeModal({ unit, subject, onClose, onSelect, onPrint }: QuizTypeModalProps) {
  if (!unit) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm p-6 shadow-lg">
        <div className="space-y-6">
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${subject.badgeClass}`}>
              {subject.title}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">{unit.name}</h2>
            <p className="text-sm text-slate-600 mt-1">
              {unit.description} · {unit.courses}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">選擇題型：</p>
            {unit.quizTypes.map((quizType) => (
              <div key={quizType.id} className="space-y-2">
                <button
                  onClick={() => onSelect(unit.id, quizType.id)}
                  className="w-full p-4 text-left rounded-lg border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{quizType.name}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </button>
                <button
                  onClick={() => onPrint(unit.id, quizType.id)}
                  className="w-full p-2 text-left rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-xs text-slate-600 hover:text-slate-900 flex items-center gap-2"
                >
                  <Printer className="w-3 h-3" />
                  列印此題型
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">其他功能：</p>
            <button
              onClick={() => onPrint(unit.id)}
              className="w-full p-3 text-left rounded-lg border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  <Printer className="w-4 h-4 text-blue-600" />
                  列印版試卷
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <p className="text-xs text-slate-500 mt-1 ml-6">
                隨機排序題目，最後一頁附答案
              </p>
            </button>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            關閉
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function UnitSelection() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const subject: SubjectMeta = (() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("subject");
    return s === "science" ? SUBJECTS.science : SUBJECTS.people;
  })();

  // 未登入或未選擇年級 → 導回首頁處理
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      toast.info("請先登入");
      setLocation("/login");
      return;
    }
    if ((user?.grade ?? null) === null) {
      toast.info("請先選擇年級");
      setLocation("/");
    }
  }, [loading, isAuthenticated, user?.grade, setLocation]);

  const grade = user?.grade ?? 4;
  const units = UNIT_CATALOG[grade]?.[subject.id] ?? [];

  const handleSelectQuizType = (unitId: string, quizTypeId: string) => {
    if (quizTypeId === "true_false") {
      setLocation(`/quiz/true-false?unit=${unitId}&subject=${subject.id}`);
    } else if (quizTypeId === "classification") {
      setLocation(`/quiz/classification?unit=${unitId}&subject=${subject.id}`);
    } else if (quizTypeId === "matching") {
      setLocation(`/quiz/matching?unit=${unitId}&subject=${subject.id}`);
    } else if (quizTypeId === "ordering") {
      setLocation(`/quiz/ordering?unit=${unitId}&subject=${subject.id}`);
    } else if (quizTypeId === "choice") {
      setLocation(`/quiz/choice?unit=${unitId}&subject=${subject.id}`);
    }
  };

  const handlePrintQuiz = (unitId: string, quizTypeId?: string) => {
    const quizType = quizTypeId || "true_false";
    setLocation(`/quiz/print?unit=${unitId}&subject=${subject.id}&quizType=${quizType}`);
  };

  const SubjectIcon = subject.Icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 返回 + 標題 */}
        <div className="space-y-4">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首頁
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${subject.badgeClass}`}>
              {grade} 年級 · {subject.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <SubjectIcon className={`w-9 h-9 ${subject.primaryClass}`} />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{subject.title}　單元選擇</h1>
              <p className="text-sm text-slate-500">{subject.subtitle}</p>
            </div>
          </div>
        </div>

        {/* 單元網格 */}
        {units.length === 0 ? (
          <Card className="p-10 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700 mb-2">題庫籌備中</p>
            <p className="text-sm">{grade} 年級的{subject.title}尚未開放，敬請期待。</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {units.map((unit) => {
              const isAvailable = unit.available;
              return (
                <button
                  key={unit.id}
                  onClick={() => isAvailable && setSelectedUnit(unit)}
                  disabled={!isAvailable}
                  className={`group text-left ${!isAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <Card
                    className={`h-full p-6 transition-all ${
                      isAvailable ? "hover:shadow-lg hover:border-blue-300 cursor-pointer" : ""
                    }`}
                  >
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {unit.name}
                      </h2>
                      <p className="text-sm text-slate-600 leading-relaxed">{unit.description}</p>
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          課程範圍
                        </p>
                        <p className="text-sm text-slate-700 mt-1">{unit.courses}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {unit.quizTypes.map((t) => (
                          <span
                            key={t.id}
                            className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                      <div className="pt-2">
                        {isAvailable ? (
                          <div className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 group-hover:gap-2 transition-all">
                            進入單元
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-sm font-semibold text-slate-400">
                            敬請期待
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <QuizTypeModal
        unit={selectedUnit}
        subject={subject}
        onClose={() => setSelectedUnit(null)}
        onSelect={handleSelectQuizType}
        onPrint={handlePrintQuiz}
      />
    </div>
  );
}
