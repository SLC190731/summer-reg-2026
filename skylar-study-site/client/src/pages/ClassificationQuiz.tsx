import { useEffect, useState, useMemo } from "react";
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

const PASSING_SCORE = 60; // 60% 及格線

interface ClassificationQuestion {
  id: number;
  unitId: number;
  question: string;
  categories: string[];
  items: string[];
  correctAnswer: Record<string, string[]>;
}

interface UserAnswer {
  [categoryName: string]: string[];
}

export function ClassificationQuiz() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // URL 參數
  const params = new URLSearchParams(window.location.search);
  const unitParam = params.get("unit") || "5";
  // 從 "unit_5" 中提取數字 5
  const unitId = parseInt(unitParam.replace(/^unit_/, ""), 10) || 5;
  const subject = params.get("subject") || "people";

  // 狀態管理
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  // 追蹤每題是否已正式提交（用以判斷是否納入計分／提早終止判定）
  const [submittedFlags, setSubmittedFlags] = useState<boolean[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [quizFailed, setQuizFailed] = useState(false);
  const [failureScore, setFailureScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    userAnswer: UserAnswer;
  } | null>(null);

  // 獲取分類題
  const { data: questions = [], isLoading } = trpc.quiz.startClassificationQuiz.useQuery(
    { unitId },
    { enabled: true }
  );

  // 提交答案
  const submitMutation = trpc.quiz.submitClassificationQuiz.useMutation();

  // 計時器
  useEffect(() => {
    if (!quizStarted || quizCompleted || quizFailed) return;

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, quizFailed]);

  // 開始測驗
  const handleStartQuiz = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setQuizStarted(true);
    setStartTime(Date.now());
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setSubmittedFlags([]);
    setQuizCompleted(false);
    setQuizFailed(false);
    setAnswerFeedback(null);
    setElapsedTime(0);
  };

  // 獲取當前題目
  const currentQuestion = useMemo(() => {
    if (!questions || questions.length === 0) return null;
    return questions[currentQuestionIndex];
  }, [questions, currentQuestionIndex]);

  // 隨機排序分類框
  const shuffledCategories = useMemo(() => {
    if (!currentQuestion) return [];
    return [...currentQuestion.categories].sort(() => Math.random() - 0.5);
  }, [currentQuestion]);

  // 隨機排序待分類項目
  const shuffledItems = useMemo(() => {
    if (!currentQuestion) return [];
    return [...currentQuestion.items].sort(() => Math.random() - 0.5);
  }, [currentQuestion]);

  // 初始化當前題目的答案
  const currentUserAnswer = useMemo(() => {
    if (!currentQuestion) return {};
    if (userAnswers[currentQuestionIndex]) {
      return userAnswers[currentQuestionIndex];
    }
    // 初始化空答案
    const emptyAnswer: UserAnswer = {};
    shuffledCategories.forEach((cat: string) => {
      emptyAnswer[cat] = [];
    });
    return emptyAnswer;
  }, [currentQuestion, userAnswers, currentQuestionIndex, shuffledCategories]);

  // 點選作答：記錄目前選中的待分類項目
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const placeItemInCategory = (item: string, category: string) => {
    if (!currentQuestion) return;
    const newAnswer = { ...currentUserAnswer };
    Object.keys(newAnswer).forEach((cat) => {
      newAnswer[cat] = (newAnswer[cat] || []).filter((i: string) => i !== item);
    });
    if (!newAnswer[category]) newAnswer[category] = [];
    if (!newAnswer[category].includes(item)) newAnswer[category].push(item);
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = newAnswer;
    setUserAnswers(newUserAnswers);
  };

  // 點選待分類項目
  const handleItemClick = (item: string) => {
    if (answerFeedback) return;
    setSelectedItem((prev) => (prev === item ? null : item));
  };

  // 點選分類框（若有選中的項目則放入）
  const handleCategoryClick = (category: string) => {
    if (answerFeedback || !selectedItem) return;
    placeItemInCategory(selectedItem, category);
    setSelectedItem(null);
  };

  // 移除項目
  const handleRemoveItem = (category: string, item: string) => {
    if (!currentQuestion) return;

    const newAnswer = { ...currentUserAnswer };
    newAnswer[category] = newAnswer[category].filter(i => i !== item);

    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = newAnswer;
    setUserAnswers(newUserAnswers);
  };

  // 獲取未分類的項目
  const unclassifiedItems = useMemo(() => {
    if (!currentQuestion) return [];
    const classified = Object.values(currentUserAnswer).flat();
    return currentQuestion.items.filter((item: string) => !classified.includes(item));
  }, [currentQuestion, currentUserAnswer]);

  // 檢查是否所有項目都已分類
  const allItemsClassified = useMemo(() => {
    if (!currentQuestion) return false;
    const totalItems = currentQuestion.items.length;
    const classifiedItems = Object.values(currentUserAnswer).flat().length;
    return classifiedItems === totalItems;
  }, [currentQuestion, currentUserAnswer]);

  // 計算正確率（只計入「已提交」的題目）
  const calculateAccuracy = (answers: UserAnswer[], submitted: boolean[]): number => {
    if (answers.length === 0 || questions.length === 0) return 0;
    let correctCount = 0;
    let submittedCount = 0;

    for (let i = 0; i < questions.length && i < answers.length; i++) {
      if (!submitted[i]) continue; // 未提交的題目一律不計入
      const question = questions[i];
      const userAnswer = answers[i];
      const correctAnswer = question.correctAnswer;

      submittedCount++;

      if (Object.keys(userAnswer).length !== Object.keys(correctAnswer).length) {
        continue;
      }

      let isCorrect = true;
      for (const category of Object.keys(correctAnswer)) {
        const userItems = userAnswer[category] || [];
        const correctItems = correctAnswer[category] || [];
        const userSorted = [...userItems].sort().join('|');
        const correctSorted = [...correctItems].sort().join('|');
        if (userSorted !== correctSorted) {
          isCorrect = false;
          break;
        }
      }
      if (isCorrect) correctCount++;
    }
    if (submittedCount === 0) return 0;
    return Math.round((correctCount / submittedCount) * 100);
  };

  // 檢查是否應該提早終止測驗（依「已提交」題目數）
  const checkIfShouldStop = (answers: UserAnswer[], submitted: boolean[]): boolean => {
    const submittedCount = submitted.filter(Boolean).length;
    const totalQuestions = questions.length;
    if (submittedCount === 0 || totalQuestions === 0) return false;
    const progress = (submittedCount / totalQuestions) * 100;
    if (progress < 50) return false;
    const accuracy = calculateAccuracy(answers, submitted);
    return accuracy < PASSING_SCORE;
  };

  // 検查答案是否正確（順序無關）
  const checkAnswerCorrect = (userAnswer: UserAnswer): boolean => {
    if (!currentQuestion) return false;
    const correctAnswer = currentQuestion.correctAnswer;
    
    // 檢查分類數量是否相同
    if (Object.keys(userAnswer).length !== Object.keys(correctAnswer).length) {
      return false;
    }
    
    // 逐個分類檢查
    for (const category of Object.keys(correctAnswer)) {
      const userItems = userAnswer[category] || [];
      const correctItems = correctAnswer[category] || [];
      
      // 轉換為排序後的字符串進行比較（順序無關）
      const userSorted = [...userItems].sort().join('|');
      const correctSorted = [...correctItems].sort().join('|');
      
      if (userSorted !== correctSorted) {
        return false;
      }
    }
    
    return true;
  };

  // 提交當前答案
  const handleSubmitAnswer = () => {
    if (!allItemsClassified) {
      toast.error("請將所有項目分類完成");
      return;
    }

    // 檢查答案是否正確
    if (!currentQuestion) return;

    const isCorrect = checkAnswerCorrect(currentUserAnswer);

    // 正式提交本題的答案：鎖定 userAnswers、標記 submittedFlags
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = currentUserAnswer;
    setUserAnswers(newUserAnswers);

    const newSubmittedFlags = [...submittedFlags];
    newSubmittedFlags[currentQuestionIndex] = true;
    setSubmittedFlags(newSubmittedFlags);

    setAnswerFeedback({
      isCorrect,
      userAnswer: currentUserAnswer,
    });
  };

  // 下一題
  const handleNext = () => {
    if (!currentQuestion) return;

    // 使用在「提交」時保存的答案與提交狀態
    const newUserAnswers = [...userAnswers];
    const newSubmittedFlags = [...submittedFlags];

    // 檢查是否應該提早終止測驗（依提交過的題目）
    if (checkIfShouldStop(newUserAnswers, newSubmittedFlags)) {
      const accuracy = calculateAccuracy(newUserAnswers, newSubmittedFlags);
      setFailureScore(Math.round(accuracy));
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

  // 最終提交
  const handleFinalSubmit = async (finalAnswers: UserAnswer[]) => {
    // 只交出「已提交」的題目，避免將未提交的「拖拽中狀態」被計入分數
    const answers = finalAnswers
      .map((ans: UserAnswer, idx: number) => ({
        questionId: questions[idx]?.id,
        userAnswer: ans,
        submitted: !!submittedFlags[idx],
      }))
      .filter((a) => a.submitted && a.questionId)
      .map(({ questionId, userAnswer }) => ({ questionId: questionId!, userAnswer }));

    try {
      const result = await submitMutation.mutateAsync({
        unitId,
        answers,
      });

      setResultData(result);
      setQuizCompleted(true);
      setAnswerFeedback(null);
    } catch (error) {
      toast.error("提交答案失敗");
      console.error(error);
    }
  };

  // 重新開始
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

  // 返回單元選擇
  const handleBackToUnits = () => {
    navigate("/units");
  };

  // 未登入
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

  // 未開始
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
                題型：分類題
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">{UNIT_LABELS[unitId]}</h1>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">測驗說明：</span>
              </p>
              <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
                <li>共 {questions.length} 道分類題</li>
                <li>點選下方待分類項目後，再點上方分類框即可放入</li>
                <li>需達到 60% 以上才能通過</li>
                <li>題目順序隨機排列</li>
              </ul>
            </div>
            <Button onClick={handleStartQuiz} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              開始測驗
            </Button>
            <Button variant="outline" onClick={() => navigate(`/quiz/print?unit=${unitParam}&subject=${subject}&quizType=classification`)} className="w-full">
              一鍵列印試卷
            </Button>
          </div>
        </Card>
        </div>
      </div>
    );
  }

  // 加載中
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto w-full pt-4 pb-8">
          <button
            onClick={handleBackToUnits}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
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

  // 沒有題目
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto w-full pt-4 pb-8">
          <button
            onClick={handleBackToUnits}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className="text-lg">←</span>
            <span className="font-medium">返回</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="mb-4">暗無題目</p>
          <Button onClick={handleBackToUnits}>返回</Button>
        </Card>
        </div>
      </div>
    );
  }

  // 測驗失敗 - 完成>50%且正確率<60%時立即停止
  if (quizFailed) {
    return (
      <div className="container mx-auto py-8 px-4">
        <ResultSummaryCard
          status="interrupted"
          unitLabel={UNIT_LABELS[unitId]}
          completedAt={Date.now()}
          scorePercentage={failureScore}
          totalQuestions={questions.length}
          answeredCount={userAnswers.length}
          correctAnswers={Math.round((failureScore / 100) * questions.length)}
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
              重新再造
            </Button>
            <Button variant="outline" onClick={handleBackToUnits}>
              返回
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 完成 - 棄答超過一半但未達 60% 時，需要重新再造
  if (quizCompleted && resultData) {
    const isMoreThanHalf = resultData.correctAnswers + (resultData.totalQuestions - resultData.correctAnswers) > resultData.totalQuestions / 2;
    const needsRetake = isMoreThanHalf && resultData.scorePercentage < 60;
    
    if (needsRetake) {
      return (
        <div className="container mx-auto py-8 px-4">
          <Card className="p-8 text-center bg-yellow-50 border-2 border-yellow-300 mb-6">
            <p className="text-lg font-bold text-yellow-900 mb-4">⚠️ 需要重新再造</p>
            <p className="text-gray-700 mb-4">
              你的答题超過一半，但分數未達 60%。<br />
              當前成績：{resultData.scorePercentage}%
            </p>
            <Button onClick={handleRestart} className="bg-yellow-600 hover:bg-yellow-700">
              重新再造
            </Button>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="container mx-auto py-8 px-4">
        <ResultSummaryCard
          status="completed"
          unitLabel={UNIT_LABELS[unitId]}
          completedAt={Date.now()}
          scorePercentage={resultData.scorePercentage}
          totalQuestions={resultData.totalQuestions}
          answeredCount={resultData.totalQuestions}
          correctAnswers={resultData.correctAnswers}
          elapsedSeconds={elapsedTime}
        />
        <div className="flex gap-4 mt-8 justify-center">
          <Button onClick={handleRestart}>重新做此題型</Button>
          <Button variant="outline" onClick={handleBackToUnits}>
            返回
          </Button>
        </div>
      </div>
    );
  }

  // 測驗中
  if (currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 返回鍵 */}
        <div className="pt-4 pb-4">
          <button
            onClick={handleBackToUnits}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className="text-lg">←</span>
            <span className="font-medium">返回</span>
          </button>
        </div>
        {/* 頁面頂部：測驗進度顯示 */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">正在進行測驗</p>
              <p className="text-lg font-bold text-blue-900">{UNIT_LABELS[unitId]}</p>
              <p className="text-sm text-gray-700">題型：分類題</p>
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
              style={{
                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 目前正確率顯示 */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">目前正確率：</span>
            <span className="text-2xl font-bold text-green-600">{calculateAccuracy(userAnswers, submittedFlags)}%</span>
            <span className="text-sm text-gray-600">（需達 60%）</span>
          </div>
        </div>

        {/* 題目卡片 */}
        <Card className="p-8 mb-6">
          <h3 className="text-xl font-bold mb-6">{currentQuestion.question}</h3>

          {/* 提示列 */}
          {!answerFeedback && (
            <div className="mb-4 text-sm text-slate-600">
              {selectedItem
                ? `已選取：${selectedItem} · 請點選上方分類框以放入。再點一次項目可取消選取。`
                : "請先點選下方「待分類項目」，再點選上方分類框。"}
            </div>
          )}
          {/* 分類框 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {shuffledCategories.map((category: string) => {
              // 計算此分類框中正確的項目
              const correctItemsInCategory = currentQuestion.correctAnswer[category] || [];
              const userItemsInCategory = currentUserAnswer[category] || [];
              
              return (
                <div
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`border-2 border-dashed rounded-lg p-4 min-h-[200px] transition ${
                    answerFeedback
                      ? userItemsInCategory.every((item: string) => correctItemsInCategory.includes(item)) &&
                        correctItemsInCategory.every((item: string) => userItemsInCategory.includes(item))
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                      : selectedItem
                        ? "border-blue-400 bg-blue-50 cursor-pointer hover:bg-blue-100"
                        : "border-gray-300"
                  }`}
                >
                  <h4 className="font-semibold mb-4 text-center">{category}</h4>
                  <div className="space-y-2">
                    {(currentUserAnswer[category] || []).map((item: string) => {
                      const isCorrectItem = answerFeedback && correctItemsInCategory.includes(item);
                      
                      return (
                        <div
                          key={item}
                          className={`p-2 rounded flex justify-between items-center ${
                            answerFeedback
                              ? isCorrectItem
                                ? "bg-green-100 border border-green-300"
                                : "bg-red-100 border border-red-300"
                              : "bg-blue-100"
                          }`}
                        >
                          <span>{item}</span>
                          <div className="flex items-center gap-2">
                            {answerFeedback && (
                              <span className={isCorrectItem ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                {isCorrectItem ? "✓" : "✕"}
                              </span>
                            )}
                            {!answerFeedback && (
                              <button
                                onClick={() => handleRemoveItem(category, item)}
                                className="text-red-500 hover:text-red-700"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 未分類項目 */}
          {!answerFeedback && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">待分類項目</h4>
              <div className="flex flex-wrap gap-2">
                {shuffledItems
                  .filter(
                    (item: string) =>
                      !Object.values(currentUserAnswer).flat().includes(item)
                  )
                  .map((item: string) => {
                    const isSelected = selectedItem === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className={`p-3 rounded transition select-none border-2 ${
                          isSelected
                            ? "bg-blue-100 border-blue-500 text-blue-900 shadow"
                            : "bg-gray-100 border-transparent hover:bg-gray-200"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
          
          {/* 提交後顯示未分類項目 */}
          {answerFeedback && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">未分類項目</h4>
              <div className="flex flex-wrap gap-2">
                {shuffledItems.filter((item: string) => !Object.values(currentUserAnswer).flat().includes(item)).map((item: string) => (
                  <div
                    key={item}
                    className="bg-yellow-100 p-3 rounded border border-yellow-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 答案反饋 */}
          {answerFeedback && (
            <div className={`p-4 rounded mb-6 ${answerFeedback.isCorrect ? "bg-green-100" : "bg-red-100"}`}>
              <p className="font-semibold mb-2">
                {answerFeedback.isCorrect ? "✓ 正確" : "✗ 錯誤"}
              </p>
              {!answerFeedback.isCorrect && (
                <div className="text-sm">
                  <p className="mb-2">正確答案：</p>
                  {shuffledCategories.map((cat: string) => {
                    const items = (currentQuestion.correctAnswer[cat] || []) as string[];
                    return (
                      <p key={cat}>
                        <strong>{cat}：</strong> {items.join(", ")}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 按鈕 */}
          <div className="flex gap-4">
            {!answerFeedback ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!allItemsClassified}
                className="flex-1"
              >
                提交答案
              </Button>
            ) : (
              <Button onClick={handleNext} className="flex-1">
                {currentQuestionIndex === questions.length - 1 ? "完成測驗" : "下一題"}
              </Button>
            )}
          </div>
        </Card>
      </div>
      </div>
    );
  }

  return null;
}



