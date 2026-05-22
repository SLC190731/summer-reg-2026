import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import ResultSummaryCard from "@/components/ResultSummaryCard";

interface QuizResultProps {
  result: {
    attemptId: number;
    totalQuestions: number;
    correctAnswers: number;
    scorePercentage: number;
    answers: Array<{
      questionId: number;
      userAnswer: number;
      isCorrect: boolean;
    }>;
  };
  questions: Array<{
    id: number;
    content: string;
    correctAnswer: number;
    explanation?: string;
    shuffledOptions: Array<{ label: string; value: number }>;
  }>;
  userAnswers: Record<number, number>;
  elapsedTime?: number;
  category?: string;
  completedAt?: number;
  onRestart: () => void;
}

const UNIT_LABELS: Record<string, string> = {
  unit_5: "單元五：國家歷史和文化",
  unit_6: "單元六 · 第 12、13 課",
  unit_7: "單元七 · 第 14、15 課",
  unit_8: "單元八 · 第 16、17 課",
};

export default function QuizResult({
  result,
  questions,
  userAnswers,
  elapsedTime = 0,
  category,
  completedAt,
  onRestart,
}: QuizResultProps) {
  const getOptionLabel = (value: number) => (value === 1 ? "正確" : "錯誤");
  const answeredCount = Object.keys(userAnswers).length;
  const unitLabel = (category && UNIT_LABELS[category]) || "測驗";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 主要成績卡片 - 与失敗頁共用 ResultSummaryCard */}
        <ResultSummaryCard
          status="completed"
          unitLabel={unitLabel}
          completedAt={completedAt ?? Date.now()}
          scorePercentage={result.scorePercentage}
          totalQuestions={result.totalQuestions}
          answeredCount={answeredCount}
          correctAnswers={result.correctAnswers}
          elapsedSeconds={elapsedTime}
        />
        {/* 詳細解析 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">詳細解析</h2>

          {result.answers.map((answer, idx) => {
            const question = questions.find((q) => q.id === answer.questionId);
            if (!question) return null;

            const userAnswerLabel = getOptionLabel(answer.userAnswer);
            const correctAnswerLabel = getOptionLabel(question.correctAnswer);

            return (
              <Card
                key={idx}
                className={`p-6 shadow-md border-l-4 ${
                  answer.isCorrect ? "border-l-green-500" : "border-l-red-500"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-slate-500">
                          第 {idx + 1} 題
                        </span>
                        {answer.isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            答對
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                            <XCircle className="w-3 h-3" />
                            答錯
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-medium text-slate-900 leading-relaxed">
                        {question.content}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                    <div className={answer.isCorrect ? "bg-green-50 p-3 rounded" : "bg-red-50 p-3 rounded"}>
                      <p className="text-xs text-slate-600 font-semibold mb-1">你的答案</p>
                      <p
                        className={`text-lg font-bold ${
                          answer.isCorrect ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {userAnswerLabel}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-slate-600 font-semibold mb-1">正確答案</p>
                      <p className="text-lg font-bold text-blue-600">{correctAnswerLabel}</p>
                    </div>
                  </div>

                  {question.explanation && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-600 font-semibold mb-2">詳細解析</p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* 底部按鈕 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            onClick={onRestart}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            size="lg"
          >
            返回單元選擇
          </Button>
        </div>
      </div>
    </div>
  );
}
