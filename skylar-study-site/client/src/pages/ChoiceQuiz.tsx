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
const LETTERS = ["A", "B", "C", "D", "E", "F"];

interface ChoiceQuestion {
  id: number;
  unitId: number;
  question: string;
  options: string[];
  correctAnswer: string[];
  isMultiple: boolean;
}

export function ChoiceQuiz() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const unitParam = params.get("unit") || "5";
  const unitId = parseInt(unitParam.replace(/^unit_/, ""), 10) || 5;
  const subject = params.get("subject") || "people";

  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // userAnswers[i] = 學生在第 i 題選中的選項「純文字」陣列；null 表示尚未作答
  const [userAnswers, setUserAnswers] = useState<(string[] | null)[]>([]);
  const [submittedFlags, setSubmittedFlags] = useState<boolean[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [quizFailed, setQuizFailed] = useState(false);
  const [failureScore, setFailureScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    userAnswer: string[];
  } | null>(null);

  const { data: questions = [], isLoading } = trpc.quiz.startChoiceQuiz.useQuery(
    { unitId },
    { enabled: true }
  );

  const submitMutation = trpc.quiz.submitChoiceQuiz.useMutation();

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

  const currentQuestion = useMemo<ChoiceQuestion | null>(() => {
    if (!questions || questions.length === 0) return null;
    return questions[currentQuestionIndex] as any;
  }, [questions, currentQuestionIndex]);

  // 選項隨機洗牌（每題只洗牌一次，依 question.id 緩存）
  const shuffledOptions = useMemo(() => {
    if (!currentQuestion) return [];
    return [...currentQuestion.options].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  const currentSelected: string[] = userAnswers[currentQuestionIndex] || [];

  const toggleOption = (opt: string) => {
    if (answerFeedback || !currentQuestion) return;
    let next: string[];
    if (currentQuestion.isMultiple) {
      next = currentSelected.includes(opt)
        ? currentSelected.filter((x) => x !== opt)
        : [...currentSelected, opt];
    } else {
      next = currentSelected.includes(opt) ? [] : [opt];
    }
    const updated = [...userAnswers];
    updated[currentQuestionIndex] = next;
    setUserAnswers(updated);
  };

  const isAnswerEqual = (a: string[], b: string[]) => {
    const x = [...a].sort();
    const y = [...b].sort();
    return JSON.stringify(x) === JSON.stringify(y);
  };

  const calculateAccuracy = (
    answers: (string[] | null)[],
    submitted: boolean[]
  ): number => {
    if (!questions.length) return 0;
    let correctCount = 0;
    let submittedCount = 0;
    for (let i = 0; i < questions.length && i < answers.length; i++) {
      if (!submitted[i]) continue;
      submittedCount++;
      const q = questions[i] as any as ChoiceQuestion;
      const ans = answers[i] || [];
      if (isAnswerEqual(ans, q.correctAnswer)) correctCount++;
    }
    if (submittedCount === 0) return 0;
    return (correctCount / submittedCount) * 100;
  };

  const checkIfShouldStop = (
    answers: (string[] | null)[],
    submitted: boolean[]
  ): boolean => {
    const total = questions.length;
    const submittedCount = submitted.filter(Boolean).length;
    if (total === 0) return false;
    if (submittedCount / total < 0.5) return false;
    return calculateAccuracy(answers, submitted) < PASSING_SCORE;
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion) return;
    if (!currentSelected || currentSelected.length === 0) {
      toast.error("請先完成題目");
      return;
    }
    const isCorrect = isAnswerEqual(currentSelected, currentQuestion.correctAnswer);
    const newSubmitted = [...submittedFlags];
    newSubmitted[currentQuestionIndex] = true;
    setSubmittedFlags(newSubmitted);
    setAnswerFeedback({ isCorrect, userAnswer: currentSelected });
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

  const handleFinalSubmit = async (finalAnswers: (string[] | null)[]) => {
    const answers = finalAnswers
      .map((ans, idx) => ({
        questionId: (questions[idx] as any)?.id,
        userAnswer: ans || [],
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
                  題型：選擇題
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">{UNIT_LABELS[unitId]}</h1>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">測驗說明：</span>
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
                  <li>共 {questions.length} 道選擇題（含單選與多選）</li>
                  <li>單選題：點選一個選項；多選題：可點選多個選項</li>
                  <li>提交後立即顯示你的作答與正確答案</li>
                  <li>需達到 60% 以上才能通過</li>
                  <li>題目與選項順序均隨機排列</li>
                </ul>
              </div>
              <Button onClick={handleStartQuiz} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                開始測驗
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/quiz/print?unit=${unitParam}&subject=${subject}&quizType=choice`)
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
            {(questions as any[]).map((q: ChoiceQuestion, idx: number) => {
              const detail = resultData.answers?.find((a: any) => a.questionId === q.id);
              const userAns: string[] = detail?.userAnswer || [];
              const isCorrect = detail?.isCorrect;
              return (
                <div
                  key={q.id}
                  className={`rounded-lg p-5 border-2 ${
                    isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-semibold text-slate-900">
                      第 {idx + 1} 題{q.isMultiple ? "（多選）" : ""}
                    </span>
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
                    <div className="bg-white/70 rounded p-3">
                      <p className="font-semibold text-slate-900 mb-2">你的答案</p>
                      <ul className="space-y-1 text-sm">
                        {userAns.length === 0 && (
                          <li className="text-slate-500">（未作答）</li>
                        )}
                        {userAns.map((u, i) => {
                          const ok = q.correctAnswer.includes(u);
                          return (
                            <li key={i} className={ok ? "text-green-800" : "text-red-800"}>
                              <span className="font-bold mr-1">{ok ? "✓" : "✗"}</span>
                              <span>{u}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="bg-white/70 rounded p-3">
                      <p className="font-semibold text-slate-900 mb-2">正確答案</p>
                      <ul className="space-y-1 text-sm text-green-900">
                        {q.correctAnswer.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
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
              <p className="text-sm text-gray-700">題型：選擇題</p>
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
            <div className="flex items-center gap-2 mb-3">
              {currentQuestion.isMultiple && (
                <span className="inline-flex items-center px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-800">
                  多選題
                </span>
              )}
            </div>
            <p className="text-lg font-semibold text-slate-900 mb-6 leading-relaxed">
              {currentQuestion.question}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shuffledOptions.map((opt, idx) => {
                const letter = LETTERS[idx] || String(idx + 1);
                const selected = currentSelected.includes(opt);
                const disabled = !!answerFeedback;
                const isCorrectOpt = currentQuestion.correctAnswer.includes(opt);
                let stateClass = "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50";
                if (answerFeedback) {
                  if (selected && isCorrectOpt)
                    stateClass = "bg-green-50 border-green-400";
                  else if (selected && !isCorrectOpt)
                    stateClass = "bg-red-50 border-red-400";
                  else if (!selected && isCorrectOpt)
                    stateClass = "bg-green-50 border-green-300 border-dashed";
                  else stateClass = "bg-white border-slate-200 opacity-70";
                } else if (selected) {
                  stateClass = "bg-blue-50 border-blue-500";
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    disabled={disabled}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${stateClass} ${
                      disabled ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-slate-900 leading-relaxed">{opt}</span>
                  </button>
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
                    <p className="font-semibold text-slate-900 mb-2">你的答案</p>
                    <ul className="space-y-1">
                      {answerFeedback.userAnswer.map((u, i) => {
                        const ok = currentQuestion.correctAnswer.includes(u);
                        return (
                          <li key={i} className={ok ? "text-green-800" : "text-red-800"}>
                            <span className="font-bold mr-1">{ok ? "✓" : "✗"}</span>
                            <span>{u}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="bg-white/70 rounded p-3">
                    <p className="font-semibold text-slate-900 mb-2">正確答案</p>
                    <ul className="space-y-1 text-green-900">
                      {currentQuestion.correctAnswer.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 gap-3">
              {!answerFeedback ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={currentSelected.length === 0}
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

export default ChoiceQuiz;
