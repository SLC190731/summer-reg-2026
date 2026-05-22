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

interface MatchingQuestion {
  id: number;
  unitId: number;
  question: string;
  leftItems: string[];
  rightItems: string[];
  correctAnswer: Record<string, string[]>;
}

// userAnswer: { [leftItem]: string[] of selected rightItems }
type UserAnswer = Record<string, string[]>;

// 將數字轉成英文字母編號（0 -> A, 1 -> B...）
const letterFor = (i: number) => String.fromCharCode(65 + i);

export function MatchingQuiz() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const unitParam = params.get("unit") || "5";
  const unitId = parseInt(unitParam.replace(/^unit_/, ""), 10) || 5;
  const subject = params.get("subject") || "people";

  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [submittedFlags, setSubmittedFlags] = useState<boolean[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [quizFailed, setQuizFailed] = useState(false);
  const [failureScore, setFailureScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    userAnswer: UserAnswer;
  } | null>(null);

  const { data: questions = [], isLoading } = trpc.quiz.startMatchingQuiz.useQuery(
    { unitId },
    { enabled: true }
  );

  const submitMutation = trpc.quiz.submitMatchingQuiz.useMutation();

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

  const currentQuestion = useMemo<MatchingQuestion | null>(() => {
    if (!questions || questions.length === 0) return null;
    return questions[currentQuestionIndex] as any;
  }, [questions, currentQuestionIndex]);

  // 隨機排序左欄/右欄（每題只洗牌一次，依 question.id 緩存）
  const shuffledLeft = useMemo(() => {
    if (!currentQuestion) return [];
    return [...currentQuestion.leftItems].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  const shuffledRight = useMemo(() => {
    if (!currentQuestion) return [];
    return [...currentQuestion.rightItems].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  // 當前題目答案（左項 -> 已選右項陣列）
  const currentUserAnswer: UserAnswer = useMemo(() => {
    if (!currentQuestion) return {};
    if (userAnswers[currentQuestionIndex]) return userAnswers[currentQuestionIndex];
    const empty: UserAnswer = {};
    shuffledLeft.forEach((l) => (empty[l] = []));
    return empty;
  }, [currentQuestion, userAnswers, currentQuestionIndex, shuffledLeft]);

  const toggleSelection = (leftItem: string, rightItem: string) => {
    if (answerFeedback) return; // 已提交該題後不能再改
    const newAnswer: UserAnswer = { ...currentUserAnswer };
    const current = newAnswer[leftItem] ? [...newAnswer[leftItem]] : [];
    const idx = current.indexOf(rightItem);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(rightItem);
    newAnswer[leftItem] = current;
    const updated = [...userAnswers];
    updated[currentQuestionIndex] = newAnswer;
    setUserAnswers(updated);
  };

  // 每個左項至少要勾選 1 個右項才算「完成」可提交
  const allItemsMatched = useMemo(() => {
    if (!currentQuestion) return false;
    return shuffledLeft.every((l) => (currentUserAnswer[l] || []).length > 0);
  }, [currentQuestion, currentUserAnswer, shuffledLeft]);

  // 比較答案（雙向 normalize 排序）
  const checkAnswerCorrect = (ans: UserAnswer): boolean => {
    if (!currentQuestion) return false;
    const correct = currentQuestion.correctAnswer;
    const keys = Object.keys(correct);
    for (const k of keys) {
      const userArr = [...(ans[k] || [])].sort();
      const correctArr = [...(correct[k] || [])].sort();
      if (userArr.length !== correctArr.length) return false;
      for (let i = 0; i < userArr.length; i++) {
        if (userArr[i] !== correctArr[i]) return false;
      }
    }
    return true;
  };

  const calculateAccuracy = (answers: UserAnswer[], submitted: boolean[]): number => {
    if (!questions.length) return 0;
    let correctCount = 0;
    let submittedCount = 0;
    for (let i = 0; i < questions.length && i < answers.length; i++) {
      if (!submitted[i]) continue;
      submittedCount++;
      const q = questions[i] as any as MatchingQuestion;
      const ans = answers[i];
      const correct = q.correctAnswer;
      let ok = true;
      for (const k of Object.keys(correct)) {
        const userArr = [...(ans[k] || [])].sort();
        const correctArr = [...(correct[k] || [])].sort();
        if (userArr.length !== correctArr.length) {
          ok = false;
          break;
        }
        for (let j = 0; j < userArr.length; j++) {
          if (userArr[j] !== correctArr[j]) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
      }
      if (ok) correctCount++;
    }
    if (submittedCount === 0) return 0;
    return (correctCount / submittedCount) * 100;
  };

  const checkIfShouldStop = (answers: UserAnswer[], submitted: boolean[]): boolean => {
    const total = questions.length;
    const submittedCount = submitted.filter(Boolean).length;
    if (total === 0) return false;
    // 已提交 ≥ 50% 且正確率 < 60% 才終止
    if (submittedCount / total < 0.5) return false;
    return calculateAccuracy(answers, submitted) < PASSING_SCORE;
  };

  const handleSubmitAnswer = () => {
    if (!allItemsMatched) {
      toast.error("請為每個項目選擇至少一個配對");
      return;
    }
    if (!currentQuestion) return;
    const isCorrect = checkAnswerCorrect(currentUserAnswer);
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = currentUserAnswer;
    setUserAnswers(newUserAnswers);
    const newSubmittedFlags = [...submittedFlags];
    newSubmittedFlags[currentQuestionIndex] = true;
    setSubmittedFlags(newSubmittedFlags);
    setAnswerFeedback({ isCorrect, userAnswer: currentUserAnswer });
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

  const handleFinalSubmit = async (finalAnswers: UserAnswer[]) => {
    const answers = finalAnswers
      .map((ans, idx) => ({
        questionId: (questions[idx] as any)?.id,
        userAnswer: ans,
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
                  題型：配對題
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">{UNIT_LABELS[unitId]}</h1>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">測驗說明：</span>
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
                  <li>共 {questions.length} 道配對題</li>
                  <li>為每個左欄項目選擇對應的右欄選項（可選擇多個）</li>
                  <li>需達到 60% 以上才能通過</li>
                  <li>題目與選項順序隨機排列</li>
                </ul>
              </div>
              <Button onClick={handleStartQuiz} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                開始測驗
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/quiz/print?unit=${unitParam}&subject=${subject}&quizType=matching`)
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
            {(questions as any[]).map((q: MatchingQuestion, idx: number) => {
              const detail = resultData.answers?.find((a: any) => a.questionId === q.id);
              const userAns: UserAnswer = detail?.userAnswer || {};
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
                  <div className="space-y-3 text-sm">
                    {q.leftItems.map((l) => {
                      const userSel = (userAns[l] || []) as string[];
                      const correctSel = (q.correctAnswer[l] || []) as string[];
                      const missed = correctSel.filter((c) => !userSel.includes(c));
                      return (
                        <div key={l} className="bg-white/70 rounded p-2">
                          <p className="font-semibold text-slate-900 mb-1">{l}</p>
                          <ul className="space-y-1 ml-1">
                            {userSel.length === 0 && (
                              <li className="text-slate-500 italic">（未作答）</li>
                            )}
                            {userSel.map((u) => {
                              const ok = correctSel.includes(u);
                              return (
                                <li
                                  key={u}
                                  className={`flex items-start gap-2 ${
                                    ok ? "text-green-800" : "text-red-800"
                                  }`}
                                >
                                  <span className="font-bold">{ok ? "✓" : "✗"}</span>
                                  <span>{u}</span>
                                </li>
                              );
                            })}
                            {missed.map((m) => (
                              <li key={m} className="flex items-start gap-2 text-amber-800">
                                <span className="font-bold">+</span>
                                <span>漏選：{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
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
        {/* 頁面頂部：測驗進度顯示 */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">正在進行測驗</p>
              <p className="text-lg font-bold text-blue-900">{UNIT_LABELS[unitId]}</p>
              <p className="text-sm text-gray-700">題型：配對題</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{currentQuestionIndex + 1} / {questions.length}</p>
            </div>
          </div>
        </div>

        {/* 進度條 */}
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

        {/* 目前正確率顯示 */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">目前正確率：</span>
            <span className="text-2xl font-bold text-green-600">{Math.round(calculateAccuracy(userAnswers, submittedFlags))}%</span>
            <span className="text-sm text-gray-600">（需達 60%）</span>
          </div>
        </div>

        {currentQuestion && (
          <Card className="p-6">
            <p className="text-lg font-semibold text-slate-900 mb-6 leading-relaxed">
              {currentQuestion.question}
            </p>

            {/* 左欄項目：每個項目下方提供右欄選項作 checkbox */}
            <div className="space-y-4">
              {shuffledLeft.map((l, lIdx) => {
                const selected = currentUserAnswer[l] || [];
                return (
                  <div
                    key={l}
                    className="border-2 border-slate-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-sm flex items-center justify-center">
                        {lIdx + 1}
                      </span>
                      <span className="text-slate-900 font-medium flex-1">{l}</span>
                      <span className="text-xs text-slate-500">已選 {selected.length} 項</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-11">
                      {shuffledRight.map((r, rIdx) => {
                        const isSelected = selected.includes(r);
                        const disabled = !!answerFeedback;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggleSelection(l, r)}
                            disabled={disabled}
                            className={`flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors border ${
                              isSelected
                                ? "bg-blue-100 border-blue-400 text-blue-900"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                            } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
                          >
                            <span
                              className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold ${
                                isSelected
                                  ? "bg-blue-500 border-blue-500 text-white"
                                  : "border-slate-300 text-slate-500"
                              }`}
                            >
                              {letterFor(rIdx)}
                            </span>
                            <span className="flex-1">{r}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 答題反饋：逐項 ✓ / ✗ 詳細標示 */}
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
                <div className="space-y-3 text-sm">
                  {shuffledLeft.map((l) => {
                    const userSel = (answerFeedback.userAnswer[l] || []) as string[];
                    const correctSel = (currentQuestion.correctAnswer[l] || []) as string[];
                    const missed = correctSel.filter((c) => !userSel.includes(c));
                    return (
                      <div key={l} className="bg-white/60 rounded p-2">
                        <p className="font-semibold text-slate-900 mb-1">{l}</p>
                        <ul className="space-y-1 ml-1">
                          {userSel.length === 0 && (
                            <li className="text-slate-500 italic">（未作答）</li>
                          )}
                          {userSel.map((u) => {
                            const ok = correctSel.includes(u);
                            return (
                              <li
                                key={u}
                                className={`flex items-start gap-2 ${
                                  ok ? "text-green-800" : "text-red-800"
                                }`}
                              >
                                <span className="font-bold">{ok ? "✓" : "✗"}</span>
                                <span>{u}</span>
                              </li>
                            );
                          })}
                          {missed.map((m) => (
                            <li key={m} className="flex items-start gap-2 text-amber-800">
                              <span className="font-bold">+</span>
                              <span>漏選：{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 gap-3">
              {!answerFeedback ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!allItemsMatched}
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

export default MatchingQuiz;
