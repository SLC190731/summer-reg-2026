import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowLeft, Printer } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import QuizResult from "@/components/QuizResult";
import ResultSummaryCard from "@/components/ResultSummaryCard";

const UNIT_LABELS: Record<string, string> = {
  unit_5: "單元五：國家歷史和文化",
  unit_6: "單元六：香港今昔",
  unit_7: "單元七：《基本法》與我",
  unit_8: "單元八：資訊新世代",
};

const SUBJECT_LABELS: Record<string, { name: string; tone: string }> = {
  people: { name: "人文科", tone: "bg-blue-100 text-blue-800 border-blue-200" },
  science: { name: "科學科", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

interface ShuffledQuestion {
  id: number;
  content: string;
  correctAnswer: number;
  explanation?: string;
  shuffledOptions: Array<{ label: string; value: number }>;
}

const PASSING_SCORE = 60; // 60% 及格線

export default function TrueOrFalseQuiz() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  
  // 從 URL 參數獲取單元 ID 與學科，默認為 unit_5 / people
  const [category] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("unit") || "unit_5";
  });
  const [subject] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("subject");
    return s === "science" ? "science" : "people";
  });
  const subjectInfo = SUBJECT_LABELS[subject];
  const unitLabel = UNIT_LABELS[category] ?? category;
  const [shuffledQuestions, setShuffledQuestions] = useState<ShuffledQuestion[]>([]);
  const [answerFeedback, setAnswerFeedback] = useState<{ questionId: number; isCorrect: boolean } | null>(null);
  const [quizFailed, setQuizFailed] = useState(false);
  const [failureScore, setFailureScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0); // 測驗進行時間（秒）

  // 保留未完成測驗進度，但進入頁面時必須先顯示詳細說明頁（intro）。
  // 記錄是否有有效的未完成進度，讓使用者在 intro 頁選擇「繼續上次」或「重新開始」。
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [savedState, setSavedState] = useState<any>(null);
  useEffect(() => {
    const saved = localStorage.getItem(`quiz_state_${category}`);
    if (!saved) {
      setHasSavedProgress(false);
      setSavedState(null);
      return;
    }
    try {
      const state = JSON.parse(saved);
      const total = Array.isArray(state.shuffledQuestions) ? state.shuffledQuestions.length : 0;
      const idx = typeof state.currentQuestionIndex === "number" ? state.currentQuestionIndex : 0;
      const finished = total > 0 && idx >= total - 1 && Object.keys(state.userAnswers || {}).length >= total;
      if (!state.quizStarted || total === 0 || finished) {
        localStorage.removeItem(`quiz_state_${category}`);
        setHasSavedProgress(false);
        setSavedState(null);
        return;
      }
      setHasSavedProgress(true);
      setSavedState(state);
    } catch (error) {
      console.error('讀取測驗狀態失敗:', error);
      localStorage.removeItem(`quiz_state_${category}`);
      setHasSavedProgress(false);
      setSavedState(null);
    }
  }, [category]);

  // 「繼續上次測驗」：從 saved state 恢復進度
  const handleResumeQuiz = () => {
    if (!savedState) return;
    setCurrentQuestionIndex(typeof savedState.currentQuestionIndex === "number" ? savedState.currentQuestionIndex : 0);
    setUserAnswers(savedState.userAnswers || {});
    setShuffledQuestions(savedState.shuffledQuestions || []);
    setElapsedTime(savedState.elapsedTime || 0);
    setQuizFailed(!!savedState.quizFailed);
    setFailureScore(savedState.failureScore || 0);
    setQuizStarted(true);
  };

  // 保存測驗狀態到 localStorage
  useEffect(() => {
    if (quizStarted) {
      const state = {
        quizStarted,
        currentQuestionIndex,
        userAnswers,
        shuffledQuestions,
        elapsedTime,
        quizFailed,
        failureScore,
      };
      localStorage.setItem(`quiz_state_${category}`, JSON.stringify(state));
    }
  }, [quizStarted, currentQuestionIndex, userAnswers, shuffledQuestions, elapsedTime, quizFailed, failureScore, category]);

  // 獲取題目（在 intro 頁也載入，以顯示題數）
  const { data: questions, isLoading: questionsLoading } = trpc.quiz.startQuiz.useQuery(
    { category },
    { enabled: true }
  );
  const totalQuestionCount = questions?.length ?? 0;

  // 提交測驗
  const submitQuizMutation = trpc.quiz.submitQuiz.useMutation();

  // 初始化洗牌題目 - 只在第一次獲取題目時執行
  useEffect(() => {
    if (questions && shuffledQuestions.length === 0) {
      const shuffled = questions.map(q => ({
        id: q.id,
        content: q.content,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || undefined,
        // 固定順序：正確始終在前，錯誤在後
        shuffledOptions: [
          { label: "正確", value: 1 },
          { label: "錯誤", value: 0 },
        ],
      }));
      setShuffledQuestions(shuffled);
    }
  }, [questions, shuffledQuestions.length]);

  // 計算當前正確率 - 基於已作答的題目
  const calculateAccuracy = (answers: Record<number, number>) => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount === 0) return 0;

    const correctCount = Object.entries(answers).filter(([questionId, answer]) => {
      const question = shuffledQuestions.find(q => q.id === parseInt(questionId));
      return question && answer === question.correctAnswer;
    }).length;

    return (correctCount / answeredCount) * 100;
  };

  // 檢查是否應該停止測驗
  // 規則：學生需至少完成 50% 題目後，若正確率低於 60% 才立即停止測驗
  const checkIfShouldStop = (answers: Record<number, number>) => {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = shuffledQuestions.length;
    if (answeredCount === 0 || totalQuestions === 0) return false;

    const progress = (answeredCount / totalQuestions) * 100;
    // 尚未完成一半題目，不觸發停止邏輯
    if (progress < 50) return false;

    const accuracy = calculateAccuracy(answers);
    return accuracy < PASSING_SCORE;
  };

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === shuffledQuestions.length - 1;
  const currentAccuracy = calculateAccuracy(userAnswers);

  const handleAnswerSelect = (value: number) => {
    setSelectedAnswer(value);
  };

  // 第一步：提交答案，顯示即時反饋（不跳轉）
  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !currentQuestion) return;
    if (answerFeedback !== null) return; // 已提交過

    const updatedAnswers = {
      ...userAnswers,
      [currentQuestion.id]: selectedAnswer,
    };
    setUserAnswers(updatedAnswers);

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setAnswerFeedback({
      questionId: currentQuestion.id,
      isCorrect,
    });
  };

  // 第二步：學生手動按「下一題」才跳轉
  const handleNext = () => {
    if (answerFeedback === null) {
      // 還沒提交，先提交
      handleSubmitAnswer();
      return;
    }

    // 已經提交，跳到下一題
    setSelectedAnswer(null);
    setAnswerFeedback(null);

    // 檢查是否應該停止測驗（正確率低於 60%）
    if (checkIfShouldStop(userAnswers)) {
      const accuracy = calculateAccuracy(userAnswers);
      setFailureScore(Math.round(accuracy));
      setQuizFailed(true);
      return;
    }

    if (isLastQuestion) {
      handleSubmitQuizWithAnswers(userAnswers);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      const prevQuestion = shuffledQuestions[prevIndex];
      setCurrentQuestionIndex(prevIndex);
      // 回填「上一題」已作答的選項，而非當前題
      if (prevQuestion) {
        setSelectedAnswer(userAnswers[prevQuestion.id] ?? null);
      } else {
        setSelectedAnswer(null);
      }
      setAnswerFeedback(null);
    }
  };

  const handleSubmitQuizWithAnswers = async (finalAnswers: Record<number, number>) => {
    if (!isAuthenticated || !user) {
      alert("請先登入");
      return;
    }

    const answers = shuffledQuestions.map(q => ({
      questionId: q.id,
      userAnswer: finalAnswers[q.id] ?? 0,
    }));

    try {
      const result = await submitQuizMutation.mutateAsync({
        category,
        answers,
      });
      setResultData(result);
      setQuizCompleted(true);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      alert("提交測驗失敗，請重試");
    }
  };

  const handleSubmitQuiz = async () => {
    handleSubmitQuizWithAnswers(userAnswers);
  };

  const handleStartQuiz = () => {
    // 點擊「開始測驗」時，先清除舊狀態以避免載入上一次未完成的進度
    localStorage.removeItem(`quiz_state_${category}`);
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSelectedAnswer(null);
    setQuizCompleted(false);
    setShuffledQuestions([]);
    setAnswerFeedback(null);
    setQuizFailed(false);
    setFailureScore(0);
    setElapsedTime(0);
  };

  useEffect(() => {
    if (!quizStarted || quizCompleted || quizFailed) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [quizStarted, quizCompleted, quizFailed]);

  const handleRestartQuiz = () => {
    localStorage.removeItem(`quiz_state_${category}`);
    setLocation(`/units?subject=${subject}`);
  };

  const handleRetryQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSelectedAnswer(null);
    setAnswerFeedback(null);
    setQuizFailed(false);
    setFailureScore(0);
    setElapsedTime(0);
  };

  // 顯示結果頁面
  if (quizCompleted && resultData) {
    // 測驗完成時清理 localStorage
    localStorage.removeItem(`quiz_state_${category}`);
    return (
      <QuizResult
        result={resultData}
        questions={shuffledQuestions}
        userAnswers={userAnswers}
        elapsedTime={elapsedTime}
        category={category}
        completedAt={Date.now()}
        onRestart={handleRestartQuiz}
      />
    );
  }

  // 顯示失敗頁面（被中斷）
  if (quizFailed) {
    const answeredCount = Object.keys(userAnswers).length;
    const correctCount = Object.entries(userAnswers).filter(([qid, ans]) => {
      const q = shuffledQuestions.find((x) => x.id === parseInt(qid));
      return q && ans === q.correctAnswer;
    }).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <ResultSummaryCard
            status="interrupted"
            unitLabel={(UNIT_LABELS[category] as string | undefined) ?? "測驗"}
            completedAt={Date.now()}
            scorePercentage={failureScore}
            totalQuestions={shuffledQuestions.length}
            answeredCount={answeredCount}
            correctAnswers={correctCount}
            elapsedSeconds={elapsedTime}
          />

          <Card className="p-6 shadow-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-slate-700 font-semibold">測驗已安全中斷</p>
                <p className="text-sm text-slate-600 mt-1">
                  你在完成超過一半題目時正確率低於 {PASSING_SCORE}%，系統已結束本次測驗。建議先複習內容，再重新作答。
                </p>
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              onClick={handleRetryQuiz}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              重新做此題型
            </Button>
            <Button onClick={handleRestartQuiz} size="lg" variant="outline" className="px-8">
              返回單元選擇
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 顯示開始頁面
  if (!quizStarted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        {/* 返回按鈕 */}
        <div className="max-w-2xl mx-auto w-full pt-4 pb-8">
          <button
            onClick={() => setLocation(`/units?subject=${subject}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md p-8 shadow-lg">
            <div className="text-center space-y-6">
            <div className="flex flex-wrap justify-center items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${subjectInfo.tone}`}>
                {subjectInfo.name}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600">
                題型：判斷題
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">{unitLabel}</h1>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">測驗說明：</span>
              </p>
              <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
                <li>共 {totalQuestionCount} 道判斷題</li>
                <li>每題選擇「正確」或「錯誤」</li>
                <li>需達到 60% 以上才能通過</li>
                <li>題目順序隨機排列</li>
              </ul>
            </div>
            {!isAuthenticated ? (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                請先登入以保存測驗記錄
              </p>
            ) : null}
            {hasSavedProgress ? (
              <Button
                onClick={handleResumeQuiz}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                繼續上次測驗
              </Button>
            ) : null}
            <Button
              onClick={handleStartQuiz}
              size="lg"
              variant={hasSavedProgress ? "outline" : "default"}
              className={hasSavedProgress ? "w-full" : "w-full bg-blue-600 hover:bg-blue-700 text-white"}
            >
              {hasSavedProgress ? "重新開始測驗" : "開始測驗"}
            </Button>
            <Button
              onClick={() => setLocation(`/quiz/print?unit=${category}&subject=${subject}&quizType=true_false`)}
              size="lg"
              variant="outline"
              className="w-full"
            >
              <Printer className="w-4 h-4 mr-2" />
              一鍵列印試卷
            </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 顯示測驗頁面
  // 題庫為空時顯示 empty state
  if (!questionsLoading && shuffledQuestions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        {/* 返回按鈕 */}
        <div className="max-w-2xl mx-auto w-full pt-4 pb-8">
          <button
            onClick={() => setLocation(`/units?subject=${subject}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md p-8 shadow-lg">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <AlertCircle className="w-16 h-16 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">題庫暫無題目</h1>
                <p className="text-slate-600 mt-2">該單元的題庫尚未準備就緒，請稍後再試</p>
              </div>
              <Button
                onClick={() => setLocation(`/units?subject=${subject}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                返回
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (questionsLoading || !currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-2xl mx-auto w-full pt-4 pb-8">
          <button
            onClick={() => setLocation(`/units?subject=${subject}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-slate-600">載入題目中...</p>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / shuffledQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 返回按鈕 */}
        <div className="pt-4 pb-4">
          <button
            onClick={() => setLocation(`/units?subject=${subject}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </button>
        </div>
        {/* 測驗資訊條：學科 · 單元 · 題型 */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${subjectInfo.tone}`}>
            {subjectInfo.name}
          </span>
          <span className="text-slate-700 font-medium">{unitLabel}</span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600">
            題型：判斷題
          </span>
        </div>
        {/* 進度與成績 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>第 {currentQuestionIndex + 1} / {shuffledQuestions.length} 題</span>
              <div className="flex items-center gap-4">
                <span>{Math.round(progress)}%</span>
                <span className="text-slate-500 font-medium">時間: {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}</span>
              </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 正確率顯示 */}
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">目前正確率：</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${
                  currentAccuracy >= PASSING_SCORE ? "text-green-600" : "text-orange-600"
                }`}>
                  {Math.round(currentAccuracy)}%
                </span>
                <span className="text-xs text-slate-500">（需達 {PASSING_SCORE}%）</span>
              </div>
            </div>
          </div>
        </div>

        {/* 題目卡片 */}
        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            {/* 題目內容 */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 leading-relaxed">
                {currentQuestion.content}
              </h2>
            </div>

            {/* 選項 */}
            <div className="space-y-3">
              {currentQuestion.shuffledOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option.value)}
                  disabled={answerFeedback !== null}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedAnswer === option.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  } ${answerFeedback !== null ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAnswer === option.value
                          ? "border-blue-600 bg-blue-600"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedAnswer === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span className="font-medium text-slate-900">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* 即時反饋 */}
            {answerFeedback && (
              <div
                className={`p-4 rounded-lg space-y-3 ${
                  answerFeedback.isCorrect
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {/* 答題情況 */}
                <div className="flex items-center gap-3">
                  {answerFeedback.isCorrect ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-green-900">答案正確！</p>
                        <p className="text-sm text-green-700">繼續加油</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-red-900">答案錯誤</p>
                      </div>
                    </>
                  )}
                </div>

                {/* 詳細答案展示 */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 font-medium">你的答案：</span>
                    <span className={`font-semibold ${
                      answerFeedback.isCorrect ? "text-green-700" : "text-red-700"
                    }`}>
                      {selectedAnswer === 1 ? "正確" : "錯誤"}
                    </span>
                  </div>
                  {!answerFeedback.isCorrect && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 font-medium">正確答案：</span>
                      <span className="font-semibold text-blue-700">
                        {currentQuestion.correctAnswer === 1 ? "正確" : "錯誤"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 按鈕 */}
        <div className="flex gap-4 justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0 || answerFeedback !== null}
            variant="outline"
            className="flex-1"
          >
            上一題
          </Button>
          {answerFeedback === null ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null || submitQuizMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              提交答案
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={submitQuizMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLastQuestion ? "完成測驗" : "下一題"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
