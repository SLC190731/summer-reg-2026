import { Card } from "@/components/ui/card";
import { Clock, Trophy, AlertCircle } from "lucide-react";

interface ResultSummaryCardProps {
  /** 卡片狀態：完成 / 中斷未通過 */
  status: "completed" | "interrupted";
  /** 單元名稱（已含「· 第10、11課」等敘述） */
  unitLabel: string;
  /** 完成時間（毫秒 epoch） */
  completedAt: number;
  /** 顯示在右上角的百分比 */
  scorePercentage: number;
  /** 題庫總題數 */
  totalQuestions: number;
  /** 已作答題數 */
  answeredCount: number;
  /** 答對題數 */
  correctAnswers: number;
  /** 測驗用時（秒） */
  elapsedSeconds: number;
}

function formatTime(seconds: number) {
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs === 0 ? `${minutes}分` : `${minutes}分${secs}秒`;
}

function getScoreColor(percentage: number) {
  if (percentage >= 90) return "text-emerald-600";
  if (percentage >= 80) return "text-green-600";
  if (percentage >= 60) return "text-blue-600";
  return "text-red-600";
}

function getGradeLabel(percentage: number) {
  if (percentage >= 90) return { label: "優異", color: "text-emerald-600" };
  if (percentage >= 80) return { label: "良好", color: "text-green-600" };
  if (percentage >= 70) return { label: "中上", color: "text-blue-600" };
  if (percentage >= 60) return { label: "合格", color: "text-blue-600" };
  return { label: "需要加強", color: "text-red-600" };
}

export default function ResultSummaryCard({
  status,
  unitLabel,
  completedAt,
  scorePercentage,
  totalQuestions,
  answeredCount,
  correctAnswers,
  elapsedSeconds,
}: ResultSummaryCardProps) {
  const grade = getGradeLabel(scorePercentage);
  const completedAtLabel = new Date(completedAt).toLocaleString("zh-HK", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const isInterrupted = status === "interrupted";

  return (
    <Card className="p-6 md:p-8 shadow-md rounded-2xl border-slate-200">
      {/* 上半部 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isInterrupted ? (
              <AlertCircle className="w-7 h-7 text-red-400" strokeWidth={1.75} />
            ) : (
              <Trophy className="w-7 h-7 text-blue-400" strokeWidth={1.75} />
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {isInterrupted ? "測驗中斷" : "測驗完成"}
            </h1>
          </div>
          <p className="text-slate-600 mt-2 text-sm md:text-base">{unitLabel}</p>
          <p className="text-slate-500 text-xs md:text-sm mt-1">{completedAtLabel}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-4xl md:text-6xl font-bold ${getScoreColor(scorePercentage)}`}>
            {scorePercentage}%
          </div>
          <div className={`text-sm md:text-base mt-1 ${grade.color}`}>{grade.label}</div>
        </div>
      </div>

      <div className="border-t border-slate-200 my-6" />

      {/* 四欄統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-slate-900">{totalQuestions}</div>
          <div className="text-sm text-slate-500 mt-1">總題數</div>
        </div>
        <div className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-slate-900">{answeredCount}</div>
          <div className="text-sm text-slate-500 mt-1">已作答題數</div>
        </div>
        <div className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-green-600">{correctAnswers}</div>
          <div className="text-sm text-slate-500 mt-1">答對題數</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-2xl md:text-3xl font-bold text-slate-900">
            <Clock className="w-5 h-5 md:w-6 md:h-6 text-slate-500" strokeWidth={2} />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="text-sm text-slate-500 mt-1">測驗用時</div>
        </div>
      </div>

      {/* 進度條 */}
      <div className="mt-6 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            scorePercentage >= 80
              ? "bg-green-500"
              : scorePercentage >= 60
              ? "bg-blue-500"
              : "bg-red-400"
          }`}
          style={{ width: `${Math.max(0, Math.min(100, scorePercentage))}%` }}
        />
      </div>
    </Card>
  );
}
