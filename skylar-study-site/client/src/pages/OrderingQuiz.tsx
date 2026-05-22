import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import ResultSummaryCard from "@/components/ResultSummaryCard";
import { toast } from "sonner";

const UNIT_LABELS: Record<number, string> = {
  5: "單元五：國家歷史和文化",
  6: "單元六：香港今昔",
  7: "單元七：《基本法》與我",
  8: "單元八：資訊新世代",
};

const SUBJECT_LABELS: Record<string, string> = {
  people: "人文科",
  science: "科學科",
};

const PASSING_SCORE = 60;

interface OrderingQuestion {
  id: number;
  unitId: number;
  question: string;
  items: string[];
  correctAnswer: string[];
}

// userAnswer: { [item純文字]: 順序編號 1..N 或 undefined }
type OrderMap = Record<string, number | undefined>;

export function OrderingQuiz() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const unitParam = params.get("unit") || "5";
  const unitId = parseInt(unitParam.replace(/^unit_/, ""), 10) || 5;
  const subject = params.get("subject") || "people";

  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<OrderMap[]>([]);
  const [submittedFlags, setSubmittedFlags] = useState<boolean[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [quizFailed, setQuizFailed] = useState(false);
  const [failureScore, setFailureScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    userOrder: string[];
  } | null>(null);

  const { data: questions = [], isLoading } = trpc.quiz.startOrderingQuiz.useQuery(
    { unitId },
    { enabled: true }
  );

  const submitMutation = trpc.quiz.submitOrderingQuiz.useMutation();

  useEffect(() => {
    if (!quizStarted || quizCompleted || quizFailed) return;
    const timer = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, quizFailed]);

  const handleStartQuiz = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setSubmittedFlags([]);
    setQuizCompleted(false);
    setQuizFailed(false);
    setAnswerFeedback(null);
    setElapsedTime(0);
  };

  const currentQuestion = useMemo<OrderingQuestion | null>(() => {
    if (!questions || questions.length === 0) return null;
    return questions[currentQuestionIndex] as any;
  }, [questions, currentQuestionIndex]);

  // 隨機洗牌待排序項目（每題只洗牌一次，依 question.id 緩存）
  const shuffledItems = useMemo(() => {
    if (!currentQuestion) return [];
    return [...currentQuestion.items].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  // 當前題目的 OrderMap（item -> 順序編號）
  const currentOrderMap: OrderMap = useMemo(() => {
    if (!currentQuestion) return {};
    if (userAnswers[currentQuestionIndex]) return userAnswers[currentQuestionIndex];
    const empty: OrderMap = {};
    shuffledItems.forEach((it) => (empty[it] = undefined));
    return empty;
  }, [currentQuestion, userAnswers, currentQuestionIndex, shuffledItems]);

  /**
   * 點選某個項目右側的編號 n：
   * - 若該編號已被其他項目使用，則先清空那個項目的編號
   * - 若該項目自身已是 n，再點一次則取消
   * - 否則把該編號指派給此項目
   */
  const assignOrder = (item: string, n: number) => {
    if (answerFeedback) return;
    const newMap: OrderMap = { ...currentOrderMap };
    if (newMap[item] === n) {
      newMap[item] = undefined;
    } else {
      // 清掉其他項目佔用的 n
      for (const k of Object.keys(newMap)) {
        if (newMap[k] === n && k !== item) newMap[k] = undefined;
      }
      newMap[item] = n;
    }
    const updated = [...userAnswers];
    updated[currentQuestionIndex] = newMap;
    setUserAnswers(updated);
  };

  const totalItems = currentQuestion?.items.length || 0;
  const allOrdered = useMemo(() => {
    if (!currentQuestion) return false;
    const usedNums = new Set<number>();
    for (const it of shuffledItems) {
      const n = currentOrderMap[it];
      if (typeof n !== "number") return false;
      usedNums.add(n);
    }
    return usedNums.size === totalItems;
  }, [currentQuestion, currentOrderMap, shuffledItems, totalItems]);

  // 由 OrderMap 取得使用者排出的 純文字順序陣列 (依 1..N)
  const buildUserOrder = (map: OrderMap): string[] => {
    const arr: string[] = new Array(totalItems).fill("");
    for (const [item, n] of Object.entries(map)) {
      if (typeof n === "number" && n >= 1 && n <= totalItems) {
        arr[n - 1] = item;
      }
    }
    return arr;
  };

  const checkAnswerCorrect = (map: OrderMap): boolean => {
    if (!currentQuestion) return false;
    const userOrder = buildUserOrder(map);
    const correct = currentQuestion.correctAnswer;
    if (userOrder.length !== correct.length) return false;
    for (let i = 0; i < correct.length; i++) {
      if (userOrder[i] !== correct[i]) return false;
    }
    return true;
  };

  const calculateAccuracy = (answers: OrderMap[], submitted: boolean[]): number => {
    if (!questions.length) return 0;
    let correctCount = 0;
    let submittedCount = 0;
    for (let i = 0; i < questions.length && i < answers.length; i++) {
      if (!submitted[i]) continue;
      submittedCount++;
      const q = questions[i] as any as OrderingQuestion;
      const ans = answers[i];
      const userOrder: string[] = [];
      const arr: string[] = new Array(q.items.length).fill("");
      for (const [item, n] of Object.entries(ans || {})) {
        if (typeof n === "number" && n >= 1 && n <= q.items.length) arr[n - 1] = item;
      }
      userOrder.push(...arr);
      let ok = userOrder.length === q.correctAnswer.length;
      if (ok) {
        for (let j = 0; j < q.correctAnswer.length; j++) {
          if (userOrder[j] !== q.correctAnswer[j]) {
            ok = false;
            break;
          }
        }
      }
      if (ok) correctCount++;
    }
    if (submittedCount === 0) return 0;
    return (correctCount / submittedCount) * 100;
  };

  const checkIfShouldStop = (answers: OrderMap[], submitted: boolean[]): boolean => {
    const total = questions.length;
    const submittedCount = submitted.filter(Boolean).length;
    if (total === 0) return false;
    if (submittedCount / total < 0.5) return false;
    return calculateAccuracy(answers, submitted) < PASSING_SCORE;
  };

  const handleSubmitAnswer = () => {
    if (!allOrdered) {
      toast.error("請為每個項目指定排序編號");
      return;
    }
    if (!currentQuestion) return;
    const isCorrect = checkAnswerCorrect(currentOrderMap);
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = currentOrderMap;
    setUserAnswers(newUserAnswers);
    const newSubmittedFlags = [...submittedFlags];
    newSubmittedFlags[currentQuestionIndex] = true;
    setSubmittedFlags(newSubmittedFlags);
    setAnswerFeedback({ isCorrect, userOrder: buildUserOrder(currentOrderMap) });
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    const newUserAnswers = [...userAnswers];
    const newSubmittedFlags = [...submittedFlags];
    if (checkIfShouldStop(newUserAnswers, newSubmittedFlags)) {
      setFailureScore(Math.round(calculateAccuracy(newUserAnswers, newSubmittedFlags)));
      setQuizFailed(true);
      return;
    }
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setAnswerFeedback(null);
    } else {
      handleFinalSubmit(newUserAnswers);
    }
  };

  const handleFinalSubmit = async (finalAnswers: OrderMap[]) => {
    const answers = finalAnswers
      .map((ans, idx) => ({
        questionId: (questions[idx] as any)?.id,
        userAnswer: (() => {
          const q = questions[idx] as any as OrderingQuestion;
          const arr: string[] = new Array(q.items.length).fill("");
          for (const [item, n] of Object.entries(ans || {})) {
            if (typeof n === "number" && n >= 1 && n <= q.items.length) arr[n - 1] = item;
          }
          return arr;
        })(),
        submitted: !!submittedFlags[idx],
      }))
      .filter((a) => a.submitted && a.questionId)
      .map(({ questionId, userAnswer }) => ({ questionId: questionId!, userAnswer }));
    try {
      const result = await submitMutation.mutateAsync({ unitId, answers });
      setResultData(result);
      setQuizCompleted(true);
      setAnswerFeedback(null);
    } catch (error) {
      toast.error("提交答案失敗");
      console.error(error);
    }
  };

  const handleRestart = () => {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setSubmittedFlags([]);
    setQuizCompleted(false);
    setQuizFailed(false);
    setAnswerFeedback(null);
    setElapsedTime(0);
  };

  const handleBackToUnits = () => navigate("/units");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <p className="mb-4">請先登入</p>
          <Button onClick={() => navigate("/login")}>前往登入</Button>
        </Card>
      </div>
    );
  }

  // ===== Intro 頁 =====
  if (!quizStarted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-md mx-auto w-full pt-4 pb-8">
          <button
            onClick={handleBackToUnits}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className="text-lg">←</span>
            <span className="font-medium">返回</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 w-full max-w-md shadow-lg">
            <div className="text-center space-y-6">
              <div className="flex flex-wrap justify-center items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full border border-blue-200 bg-blue-100 text-xs font-semibold text-blue-800">
                  {SUBJECT_LABELS[subject]}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600">
                  題型：排序題
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">{UNIT_LABELS[unitId]}</h1>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">測驗說明：</span>
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
                  <li>共 {questions.length} 道排序題</li>
                  <li>請在每個待排序項目的右側點選正確的順序編號（1, 2, 3...）</li>
                  <li>每個編號只能用於一個項目；再次點選同一編號可取消</li>
                  <li>需達到 60% 以上才能通過</li>
                  <li>題目與待排序項目順序均隨機排列</li>
                </ul>
              </div>
              <Button onClick={handleStartQuiz} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                開始測驗
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/quiz/print?unit=${unitParam}&subject=${subject}&quizType=ordering`)
                }
                className="w-full"
              >
                一鍵列印試卷
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto w-full pt-4 pb-8">
          <button onClick={handleBackToUnits} className="flex items-center gap-2 text-slate-600">
            <span className="text-lg">←</span>
            <span className="font-medium">返回</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <p className="mb-4">暫無題目</p>
            <Button onClick={handleBackToUnits}>返回</Button>
          </Card>
        </div>
      </div>
    );
  }

  if (quizFailed) {
    return (
      <div className="container mx-auto py-8 px-4">
        <ResultSummaryCard
          status="interrupted"
          unitLabel={UNIT_LABELS[unitId]}
          completedAt={Date.now()}
          scorePercentage={failureScore}
          totalQuestions={questions.length}
          answeredCount={submittedFlags.filter(Boolean).length}
          correctAnswers={Math.round((failureScore / 100) * submittedFlags.filter(Boolean).length)}
          elapsedSeconds={elapsedTime}
        />
        <Card className="p-8 text-center bg-red-50 border-2 border-red-300 mt-6">
          <p className="text-lg font-bold text-red-900 mb-4">⚠️ 測驗已終止</p>
          <p className="text-gray-700 mb-4">
            你在完成超過一半題目時正確率低於 60%。<br />
            當前成績：{failureScore}%<br />
            建議先複習內容，再重新作答。
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRestart} className="bg-red-600 hover:bg-red-700">
              重新再做
            </Button>
            <Button variant="outline" onClick={handleBackToUnits}>
              返回
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (quizCompleted && resultData && resultData.answers) {
    const correctNum = resultData.correctAnswers;
    const totalNum = resultData.totalQuestions;
    const percent = resultData.scorePercentage;
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <ResultSummaryCard
          status="completed"
          unitLabel={UNIT_LABELS[unitId]}
          completedAt={Date.now()}
          scorePercentage={percent}
          totalQuestions={totalNum}
          answeredCount={totalNum}
          correctAnswers={correctNum}
          elapsedSeconds={elapsedTime}
        />

        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">詳細解析</h2>
          <div className="space-y-6">
            {(questions as any[]).map((q: OrderingQuestion, idx: number) => {
              const detail = resultData.answers?.find((a: any) => a.questionId === q.id);
              const userOrder: string[] = detail?.userAnswer || [];
              const isCorrect = detail?.isCorrect;
              return (
                <div
                  key={q.id}
                  className={`rounded-lg p-5 border-2 ${
                    isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-semibold text-slate-900">第 {idx + 1} 題</span>
                    <span
                      className={`text-sm font-bold ${
                        isCorrect ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {isCorrect ? "✓ 答對" : "✗ 答錯"}
                    </span>
                  </div>
                  <p className="mb-4 text-slate-800">{q.question}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 學生作答順序 */}
                    <div className="bg-white/70 rounded p-3">
                      <p className="font-semibold text-slate-900 mb-2">你的順序</p>
                      <ol className="space-y-1 list-decimal list-inside text-sm">
                        {userOrder.map((u, i) => {
                          const ok = u === q.correctAnswer[i];
                          return (
                            <li key={i} className={ok ? "text-green-800" : "text-red-800"}>
                              <span className="font-bold mr-1">{ok ? "✓" : "✗"}</span>
                              <span>{u || "（未作答）"}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                    {/* 正確順序 */}
                    <div className="bg-white/70 rounded p-3">
                      <p className="font-semibold text-slate-900 mb-2">正確順序</p>
                      <ol className="space-y-1 list-decimal list-inside text-sm text-green-900">
                        {q.correctAnswer.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={handleRestart} className="bg-blue-600 hover:bg-blue-700">
            重新再做
          </Button>
          <Button variant="outline" onClick={handleBackToUnits}>
            返回
          </Button>
        </div>
      </div>
    );
  }

  // ===== 答題介面 =====
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto pt-4 pb-2">
        <button
          onClick={handleBackToUnits}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span className="text-lg">←</span>
          <span className="font-medium">返回</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">正在進行測驗</p>
              <p className="text-lg font-bold text-blue-900">{UNIT_LABELS[unitId]}</p>
              <p className="text-sm text-gray-700">題型：排序題</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {currentQuestionIndex + 1} / {questions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              第 {currentQuestionIndex + 1} / {questions.length} 題
            </span>
            <span className="text-sm text-gray-600">
              {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">目前正確率：</span>
            <span className="text-2xl font-bold text-green-600">
              {Math.round(calculateAccuracy(userAnswers, submittedFlags))}%
            </span>
            <span className="text-sm text-gray-600">（需達 60%）</span>
          </div>
        </div>

        {currentQuestion && (
          <Card className="p-6">
            <p className="text-lg font-semibold text-slate-900 mb-6 leading-relaxed">
              {currentQuestion.question}
            </p>

            <p className="text-sm text-slate-600 mb-4">
              請點選每個項目右側的順序編號（1 表示最先，{totalItems} 表示最後）：
            </p>

            <div className="space-y-3">
              {shuffledItems.map((item) => {
                const assigned = currentOrderMap[item];
                return (
                  <div
                    key={item}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                      typeof assigned === "number"
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <span className="text-slate-900 font-medium flex-1">{item}</span>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {Array.from({ length: totalItems }, (_, i) => i + 1).map((n) => {
                        const isThisItem = assigned === n;
                        const isUsedByOther = Object.entries(currentOrderMap).some(
                          ([k, v]) => v === n && k !== item
                        );
                        const disabled = !!answerFeedback;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => assignOrder(item, n)}
                            disabled={disabled}
                            className={`w-10 h-10 rounded-full border-2 font-bold text-sm transition-colors ${
                              isThisItem
                                ? "bg-blue-600 border-blue-600 text-white"
                                : isUsedByOther
                                ? "bg-slate-100 border-slate-300 text-slate-400"
                                : "bg-white border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-400"
                            } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {answerFeedback && currentQuestion && (
              <div
                className={`mt-6 p-4 rounded-lg border-2 ${
                  answerFeedback.isCorrect
                    ? "bg-green-50 border-green-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                <p
                  className={`font-bold mb-3 ${
                    answerFeedback.isCorrect ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {answerFeedback.isCorrect ? "✓ 答對了！" : "✗ 答錯了"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/70 rounded p-3">
                    <p className="font-semibold text-slate-900 mb-2">你的順序</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      {answerFeedback.userOrder.map((u, i) => {
                        const ok = u === currentQuestion.correctAnswer[i];
                        return (
                          <li key={i} className={ok ? "text-green-800" : "text-red-800"}>
                            <span className="font-bold mr-1">{ok ? "✓" : "✗"}</span>
                            <span>{u}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                  <div className="bg-white/70 rounded p-3">
                    <p className="font-semibold text-slate-900 mb-2">正確順序</p>
                    <ol className="space-y-1 list-decimal list-inside text-green-900">
                      {currentQuestion.correctAnswer.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 gap-3">
              {!answerFeedback ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!allOrdered}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  提交答案
                </Button>
              ) : (
                <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                  {currentQuestionIndex < questions.length - 1 ? "下一題" : "查看結果"}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default OrderingQuiz;
