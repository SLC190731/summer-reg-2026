import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ArrowLeft, Shuffle } from "lucide-react";

/**
 * 列印版測驗頁面
 * - 題目以隨機順序排列
 * - 最後一頁集中顯示所有答案，並透過 @media print 規限在一頁內
 * - 點擊「一鍵列印」呼叫 window.print()，並由 print CSS 隱藏導航元素
 */
export default function PrintQuiz() {
  const [, setLocation] = useLocation();
  const [category] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("unit") || "unit_5";
  });
  const [quizType] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("quizType") || "true_false";
  });

  const unitId = parseInt(category.replace(/^unit_/, ""), 10) || 5;

  const UNIT_LABELS: Record<number, string> = {
    5: "單元五 - 國家歷史和文化",
    6: "單元六 - 香港今昔",
    7: "單元七 - 《基本法》與我",
    8: "單元八 - 資訊新世代",
  };
  const unitTitle = UNIT_LABELS[unitId] || `單元 ${unitId}`;

  const { data: tfQuestions, isLoading: tfLoading } = trpc.questions.listTrueOrFalse.useQuery(
    { category },
    { enabled: quizType === "true_false" }
  );
  const { data: classQuestions, isLoading: classLoading } = trpc.quiz.startClassificationQuiz.useQuery(
    { unitId },
    { enabled: quizType === "classification" }
  );
  const { data: matchQuestions, isLoading: matchLoading } = trpc.quiz.startMatchingQuiz.useQuery(
    { unitId },
    { enabled: quizType === "matching" }
  );
  const { data: orderQuestions, isLoading: orderLoading } = trpc.quiz.startOrderingQuiz.useQuery(
    { unitId },
    { enabled: quizType === "ordering" }
  );
  const { data: choiceQuestionsData, isLoading: choiceLoading } = trpc.quiz.startChoiceQuiz.useQuery(
    { unitId },
    { enabled: quizType === "choice" }
  );

  const questions =
    quizType === "classification"
      ? classQuestions
      : quizType === "matching"
      ? matchQuestions
      : quizType === "ordering"
      ? orderQuestions
      : quizType === "choice"
      ? choiceQuestionsData
      : tfQuestions;
  const isLoading =
    quizType === "classification"
      ? classLoading
      : quizType === "matching"
      ? matchLoading
      : quizType === "ordering"
      ? orderLoading
      : quizType === "choice"
      ? choiceLoading
      : tfLoading;
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.random());

  // 隨機排序題目（每次重新洗牌都會改變 seed）
  const shuffledQuestions = useMemo(() => {
    if (!questions) return [];
    // 使用 shuffleSeed 觸發重新洗牌（seed 變化即重新計算）
    void shuffleSeed;
    return [...questions].sort(() => Math.random() - 0.5);
  }, [questions, shuffleSeed]);

  // 分類題專屬：每題的 items / categories 隨機排序（供試卷與答案區共用）
  const classificationShuffled = useMemo(() => {
    void shuffleSeed;
    if (quizType !== "classification" || shuffledQuestions.length === 0) {
      return new Map<string | number, { items: string[]; categories: string[] }>();
    }
    const map = new Map<string | number, { items: string[]; categories: string[] }>();
    shuffledQuestions.forEach((q) => {
      const question = q as any;
      const items = [...((question.items as string[]) || [])].sort(() => Math.random() - 0.5);
      const categories = [...((question.categories as string[]) || [])].sort(() => Math.random() - 0.5);
      map.set(question.id, { items, categories });
    });
    return map;
  }, [shuffledQuestions, quizType, shuffleSeed]);

  // 配對題專屬：每題的 leftItems / rightItems 隨機排序（供試卷與答案區共用）
  const matchingShuffled = useMemo(() => {
    void shuffleSeed;
    if (quizType !== "matching" || shuffledQuestions.length === 0) {
      return new Map<string | number, { left: string[]; right: string[] }>();
    }
    const map = new Map<string | number, { left: string[]; right: string[] }>();
    shuffledQuestions.forEach((q) => {
      const question = q as any;
      const left = [...((question.leftItems as string[]) || [])].sort(() => Math.random() - 0.5);
      const right = [...((question.rightItems as string[]) || [])].sort(() => Math.random() - 0.5);
      map.set(question.id, { left, right });
    });
    return map;
  }, [shuffledQuestions, quizType, shuffleSeed]);

  // 選擇題專屬：每題的 options 隨機排序（供試卷與答案區共用同一份隨機順序與字母對應）
  const choiceShuffled = useMemo(() => {
    void shuffleSeed;
    if (quizType !== "choice" || shuffledQuestions.length === 0) {
      return new Map<string | number, { options: string[] }>();
    }
    const map = new Map<string | number, { options: string[] }>();
    shuffledQuestions.forEach((q) => {
      const question = q as any;
      const options = [...((question.options as string[]) || [])].sort(() => Math.random() - 0.5);
      map.set(question.id, { options });
    });
    return map;
  }, [shuffledQuestions, quizType, shuffleSeed]);

  // 排序題專屬：每題的 items 隨機排序（供試卷與答案區共用同一份隨機順序）
  const orderingShuffled = useMemo(() => {
    void shuffleSeed;
    if (quizType !== "ordering" || shuffledQuestions.length === 0) {
      return new Map<string | number, { items: string[] }>();
    }
    const map = new Map<string | number, { items: string[] }>();
    shuffledQuestions.forEach((q) => {
      const question = q as any;
      const items = [...((question.items as string[]) || [])].sort(() => Math.random() - 0.5);
      map.set(question.id, { items });
    });
    return map;
  }, [shuffledQuestions, quizType, shuffleSeed]);

  // 進入頁面時自動把標題改為列印標題
  useEffect(() => {
    const original = document.title;
    const quizTypeLabel =
      quizType === "classification"
        ? "分類題"
        : quizType === "matching"
        ? "配對題"
        : quizType === "ordering"
        ? "排序題"
        : quizType === "choice"
        ? "選擇題"
        : "判斷題";
    document.title = quizTypeLabel + "列印版 - 溫習平台";
    return () => {
      document.title = original;
    };
  }, [quizType]);

  const handlePrint = () => {
    window.print();
  };

  const handleReshuffle = () => {
    setShuffleSeed(Math.random());
  };

  // 根據題目數量動態計算答案頁的字級與欄數，確保完整落在一頁內
  // A4 可用縱高約 273mm，扣除頁邊與標題後約 240mm 可供答案グリッド
  const answerCount = shuffledQuestions.length;
  // 採「多欄、計算每欄頻率」策略：最多 6 欄，使每欄題數 ≤ 8 以下
  const answerCols =
    answerCount <= 20
      ? 4
      : answerCount <= 32
      ? 4
      : answerCount <= 48
      ? 6
      : answerCount <= 72
      ? 6
      : 8;
  const colClassMap: Record<number, string> = {
    4: "grid-cols-4",
    6: "grid-cols-6",
    8: "grid-cols-8",
  };
  const answerColsClass = colClassMap[answerCols] || "grid-cols-6";
  // 根據「每欄需填入的題數」動態設定字級
  const perColumn = Math.ceil(answerCount / answerCols);
  const answerFontClass =
    perColumn <= 6
      ? "text-sm"
      : perColumn <= 9
      ? "text-[12px]"
      : perColumn <= 12
      ? "text-[11px]"
      : perColumn <= 16
      ? "text-[10px]"
      : "text-[9px]";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-slate-600">該單元暫無題目可列印</p>
          <Button onClick={() => setLocation("/units")} variant="outline">
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 列印專用 CSS：隱藏控制列、設定 A4 邊距、答案頁限一頁、控制分頁 */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 14mm;
          }
          html, body {
            background: white !important;
          }
          .no-print { display: none !important; }
          .print-container {
            background: white !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .print-page-break { page-break-before: always; break-before: page; }
          /* 答案頁強制單頁：避免內部換頁 */
          .answer-page {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .question-item {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* 移除全局 SiteHeader 在列印時的影響 */
          header { display: none !important; }
        }
      `}</style>

      {/* 列印控制列（列印時隱藏） */}
      <div className="no-print sticky top-14 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setLocation("/units")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div className="flex items-center gap-2">
            <Button onClick={handleReshuffle} variant="outline" size="sm">
              <Shuffle className="w-4 h-4 mr-1.5" />
              重新洗牌
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              一鍵列印
            </Button>
          </div>
        </div>
      </div>

      {/* 列印內容 */}
      <div className="print-container max-w-4xl mx-auto px-6 py-8 bg-white">
        {/* 試卷標題 */}
        <div className="text-center mb-6 pb-4 border-b-2 border-slate-800">
          <h1 className="text-2xl font-bold text-slate-900">
            {quizType === "classification"
              ? "分類題測驗"
              : quizType === "matching"
              ? "配對題測驗"
              : quizType === "ordering"
              ? "排序題測驗"
              : quizType === "choice"
              ? "選擇題測驗"
              : "判斷題測驗"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{unitTitle}</p>
          <div className="flex justify-between text-xs text-slate-600 mt-3 px-4">
            <span>姓名：____________________</span>
            <span>班級：____________________</span>
            <span>日期：____________________</span>
          </div>
        </div>

        {/* 作答說明 */}
        <div className="mb-5 text-sm text-slate-700 border border-slate-300 rounded p-3 bg-slate-50 no-print-bg">
          <p className="font-semibold mb-1">作答說明：</p>
          {quizType === "matching" ? (
            <p>
              請將右側「選項」中的英文字母填入左侧項目後的括號內（可多選，以逗號分隔，例如 A、C）。共
              <span className="font-bold mx-1">{shuffledQuestions.length}</span>
              題。
            </p>
          ) : quizType === "ordering" ? (
            <p>
              請依照題目敘述，將下列「待排序項目」按照正確的先後順序，把「項目編號」填入「（　）→（　）→…」的括號內。共
              <span className="font-bold mx-1">{shuffledQuestions.length}</span>
              題。
            </p>
          ) : quizType === "classification" ? (
            <p>
              請閉讀每題，將「待分類項目」中的項目填入正確的分類框中（可在項目旁填入分類名稱）。共
              <span className="font-bold mx-1">{shuffledQuestions.length}</span>
              題。
            </p>
          ) : quizType === "choice" ? (
            <p>
              請在每題選項前的園國內填上「✓」。單選題只允選 1 項；多選題請內務必全部選出（項目右側有「多選」標記）。共
              <span className="font-bold mx-1">{shuffledQuestions.length}</span>
              題。
            </p>
          ) : (
            <p>
              請判斷下列題目，於括號內填入「
              <span className="font-bold">○</span>」表示正確、「
              <span className="font-bold">✗</span>」表示錯誤。共
              <span className="font-bold mx-1">{shuffledQuestions.length}</span>
              題。
            </p>
          )}
        </div>

        {/* 題目列表 */}
        <ol className="space-y-6 mb-8 list-none counter-reset-item">
          {shuffledQuestions.map((q, idx) => {
            const isClassification = quizType === "classification";
            const question = q as any;
            
            return (
              <li key={q.id} className="question-item text-[14px] leading-relaxed">
                {/* 判斷題：一行顯示題目 + () 填答 */}
                {!isClassification && quizType !== "matching" && quizType !== "ordering" && quizType !== "choice" && (
                  <div className="flex gap-3 items-center">
                    <span className="font-semibold text-slate-900 min-w-[2.5em]">
                      {idx + 1}.
                    </span>
                    <span className="flex-1 text-slate-900">
                      {question.content}
                    </span>
                    <span className="text-slate-600 font-medium">(答：</span>
                    <span className="font-mono text-slate-700 whitespace-nowrap border-b-2 border-slate-900 px-3 py-1 min-w-[2em] text-center">
                      　
                    </span>
                    <span className="text-slate-600 font-medium">)</span>
                  </div>
                )}
                
                {/* 配對題：左侧項目 + 右侧選項（使用 matchingShuffled 隨機對位） */}
                {quizType === "matching" && (() => {
                  const ms = matchingShuffled.get(question.id) || {
                    left: (question.leftItems as string[]) || [],
                    right: (question.rightItems as string[]) || [],
                  };
                  return (
                  <>
                    <div className="flex gap-3 mb-3">
                      <span className="font-semibold text-slate-900 min-w-[2.5em]">
                        {idx + 1}.
                      </span>
                      <span className="flex-1 text-slate-900 font-medium">
                        {question.question}
                      </span>
                    </div>
                    <div className="ml-8 grid grid-cols-2 gap-4">
                      {/* 左侧：待配對項目（填答欄） */}
                      <div className="border border-slate-400 rounded p-3">
                        <p className="text-xs text-slate-700 mb-2 font-semibold">待配對項目：</p>
                        <ol className="space-y-2 text-sm">
                          {ms.left.map((lt, li) => (
                            <li key={li} className="flex items-start gap-2">
                              <span className="font-semibold text-slate-800">{li + 1}.</span>
                              <span className="flex-1 text-slate-800">{lt}</span>
                              <span className="text-slate-600">（</span>
                              <span className="font-mono text-slate-700 inline-block min-w-[4em] border-b border-slate-700 text-center">&nbsp;</span>
                              <span className="text-slate-600">）</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      {/* 右侧：選項 */}
                      <div className="border border-slate-400 rounded p-3">
                        <p className="text-xs text-slate-700 mb-2 font-semibold">選項：</p>
                        <ol className="space-y-1 text-sm list-none">
                          {ms.right.map((rt, ri) => (
                            <li key={ri} className="text-slate-800">
                              <span className="font-semibold">{String.fromCharCode(65 + ri)}.</span> {rt}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </>
                  );
                })()}

                {/* 選擇題：使用 choiceShuffled 隨機順序顯示選項，學生在選項前的園國內勾選 */}
                {quizType === "choice" && (() => {
                  const cs = choiceShuffled.get(question.id) || {
                    options: (question.options as string[]) || [],
                  };
                  const isMultiple = !!question.isMultiple;
                  return (
                    <>
                      <div className="flex gap-3 mb-3">
                        <span className="font-semibold text-slate-900 min-w-[2.5em]">
                          {idx + 1}.
                        </span>
                        <span className="flex-1 text-slate-900 font-medium">
                          {question.question}
                          {isMultiple && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded border border-amber-400 text-amber-700 text-[10px] font-semibold align-middle">
                              多選
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {cs.options.map((opt: string, oi: number) => (
                          <div key={oi} className="flex items-start gap-2 text-sm text-slate-800">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-700 text-[10px] flex-shrink-0 mt-0.5">&nbsp;</span>
                            <span className="font-semibold">{String.fromCharCode(65 + oi)}.</span>
                            <span className="flex-1">{opt}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* 排序題：使用 orderingShuffled 隨機順序顯示項目，學生在下方括號內填入「項目編號」依序排列 */}
                {quizType === "ordering" && (() => {
                  const os = orderingShuffled.get(question.id) || {
                    items: (question.items as string[]) || [],
                  };
                  return (
                    <>
                      <div className="flex gap-3 mb-3">
                        <span className="font-semibold text-slate-900 min-w-[2.5em]">
                          {idx + 1}.
                        </span>
                        <span className="flex-1 text-slate-900 font-medium">
                          {question.question}
                        </span>
                      </div>
                      <div className="ml-8 space-y-3">
                        <div className="border border-slate-400 rounded p-3">
                          <p className="text-xs text-slate-700 mb-2 font-semibold">待排序項目：</p>
                          <ol className="space-y-1 text-sm list-none">
                            {os.items.map((it: string, ii: number) => (
                              <li key={ii} className="text-slate-800">
                                <span className="font-semibold">{ii + 1}.</span> {it}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
                          <span className="text-slate-700">正確順序：</span>
                          {os.items.map((_, ii) => (
                            <span key={ii} className="flex items-center gap-1">
                              <span className="text-slate-600">（</span>
                              <span className="font-mono inline-block min-w-[2.5em] border-b border-slate-700 text-center">&nbsp;</span>
                              <span className="text-slate-600">）</span>
                              {ii < os.items.length - 1 && <span className="text-slate-600">→</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* 分類題：使用 classificationShuffled 隨機順序 */}
                {isClassification && (() => {
                  const cs = classificationShuffled.get(question.id) || {
                    items: (question.items as string[]) || [],
                    categories: (question.categories as string[]) || [],
                  };
                  return (
                  <>
                    <div className="flex gap-3 mb-3">
                      <span className="font-semibold text-slate-900 min-w-[2.5em]">
                        {idx + 1}.
                      </span>
                      <span className="flex-1 text-slate-900 font-medium">
                        {question.question}
                      </span>
                    </div>
                    <div className="ml-8 space-y-3">
                      {/* 待分類項目（帶編號） */}
                      <div className="border border-slate-400 rounded p-3">
                        <p className="text-xs text-slate-700 mb-2 font-semibold">待分類項目：</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {cs.items.map((item: string, itemIdx: number) => (
                            <div key={itemIdx} className="text-sm text-slate-800">
                              <span className="font-semibold">({String.fromCharCode(65 + itemIdx)})</span> {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* 分類框（留給學生填答字母） */}
                      <div className="space-y-2">
                        <p className="text-xs text-slate-600">請將上面項目的字母填入對應的分類框中：</p>
                        {cs.categories.map((category: string, catIdx: number) => (
                          <div key={catIdx} className="border border-slate-400 rounded p-3 flex items-start gap-3">
                            <span className="font-semibold text-slate-900 text-sm min-w-[8em]">{category}：</span>
                            <span className="flex-1 border-b border-slate-400 min-h-[1.5em]">&nbsp;</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                  );
                })()}
              </li>
            );
          })}
        </ol>

        {/* 答案頁（強制換頁） */}
        <div className="print-page-break answer-page">
          <div className="text-center mb-5 pb-3 border-b-2 border-slate-800">
            <h2 className="text-xl font-bold text-slate-900">參考答案</h2>
            <p className="text-xs text-slate-600 mt-1">
              {quizType === "matching"
                ? "各左侧項目對應的右侧選項字母（題號對應上方試卷之順序）"
                : quizType === "classification"
                ? "各分類框的正確項目（題號對應上方試卷之順序）"
                : quizType === "ordering"
                ? "待排序項目的正確先後順序（以項目編號表示，題號對應上方試卷之順序）"
                : quizType === "choice"
                ? "正確選項字母（題號對應上方試卷之順序）"
                : "○ = 正確／✗ = 錯誤（題號對應上方試卷之順序）"}
            </p>
          </div>

          {quizType === "choice" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {shuffledQuestions.map((q, idx) => {
                const question = q as any;
                const cs = choiceShuffled.get(question.id) || {
                  options: (question.options as string[]) || [],
                };
                const correct = (question.correctAnswer as string[]) || [];
                const letters = correct
                  .map((c) => {
                    const idxInOpts = cs.options.indexOf(c);
                    return idxInOpts >= 0 ? String.fromCharCode(65 + idxInOpts) : "?";
                  })
                  .sort()
                  .join("、");
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between border border-slate-300 rounded px-2 py-1 bg-white"
                  >
                    <span className="font-semibold text-slate-700">{idx + 1}.</span>
                    <span className="font-bold text-blue-700">{letters || "—"}</span>
                  </div>
                );
              })}
            </div>
          ) : quizType === "ordering" ? (
            <div className="space-y-3">
              {shuffledQuestions.map((q, idx) => {
                const question = q as any;
                const os = orderingShuffled.get(question.id) || {
                  items: (question.items as string[]) || [],
                };
                const correctOrder = (question.correctAnswer as string[]) || [];
                const numbers = correctOrder.map((it) => {
                  const idxInItems = os.items.indexOf(it);
                  return idxInItems >= 0 ? String(idxInItems + 1) : "?";
                });
                return (
                  <div key={q.id} className="border border-slate-300 rounded p-3 bg-white text-sm">
                    <p className="font-semibold text-slate-800 mb-2">
                      第 {idx + 1} 題答案：
                      <span className="ml-2 font-bold text-blue-700">
                        {numbers.join(" → ") || "—"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600">
                      （{correctOrder.join(" → ")}）
                    </p>
                  </div>
                );
              })}
            </div>
          ) : quizType === "matching" ? (
            <div className="space-y-3">
              {shuffledQuestions.map((q, idx) => {
                const question = q as any;
                const ms = matchingShuffled.get(question.id) || {
                  left: (question.leftItems as string[]) || [],
                  right: (question.rightItems as string[]) || [],
                };
                const leftItems = ms.left;
                const rightItems = ms.right;
                const correctAnswer = question.correctAnswer as Record<string, string[]>;
                return (
                  <div key={q.id} className="border border-slate-300 rounded p-3 bg-white text-sm">
                    <p className="font-semibold text-slate-800 mb-2">第 {idx + 1} 題答案：</p>
                    <ol className="space-y-1 text-slate-700">
                      {leftItems.map((lt, li) => {
                        const rights = correctAnswer[lt] || [];
                        const letters = rights
                          .map((rt) => {
                            const idxInRight = rightItems.indexOf(rt);
                            return idxInRight >= 0 ? String.fromCharCode(65 + idxInRight) : "?";
                          })
                          .sort()
                          .join("、");
                        return (
                          <li key={li} className="flex items-start gap-2">
                            <span className="font-semibold">{li + 1}.</span>
                            <span className="flex-1">{lt}</span>
                            <span className="font-bold text-blue-700">{letters || "—"}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          ) : quizType === "classification" ? (
            <div className="space-y-4">
              {shuffledQuestions.map((q, idx) => {
                const question = q as any;
                const cs = classificationShuffled.get(question.id) || {
                  items: (question.items as string[]) || [],
                  categories: (question.categories as string[]) || [],
                };
                return (
                  <div key={q.id} className="border border-slate-300 rounded p-3 bg-white">
                    <p className="font-semibold text-slate-800 mb-2">第 {idx + 1} 題答案：</p>
                    <div className="space-y-2 text-sm">
                      {cs.categories.map((category: string, catIdx: number) => {
                        const categoryItems: string[] = Array.isArray(question.correctAnswer[category])
                          ? question.correctAnswer[category]
                          : [];
                        // 將正確項目轉換為學生試卷上看到的字母（依據打亂後的 items 順序）
                        const letters = categoryItems
                          .map((item) => {
                            const idxInItems = cs.items.indexOf(item);
                            return idxInItems >= 0 ? String.fromCharCode(65 + idxInItems) : "?";
                          })
                          .sort();
                        return (
                          <div key={catIdx}>
                            <p className="font-semibold text-slate-700">{category}：<span className="text-blue-700 ml-2">{letters.join("、") || "—"}</span></p>
                            <p className="text-slate-600 ml-2 text-xs">
                              ({categoryItems.join("、")})
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`grid ${answerColsClass} gap-x-3 gap-y-2 ${answerFontClass}`}>
              {shuffledQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between border border-slate-300 rounded px-2 py-1 bg-white"
                >
                  <span className="font-semibold text-slate-700">
                    {idx + 1}.
                  </span>
                  <span
                    className={`font-bold ${
                      q.correctAnswer === 1 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {q.correctAnswer === 1 ? "○" : "✗"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-[10px] text-slate-500 text-center">
            本答案頁僅供教師批改與學生自我檢查使用。
          </div>
        </div>
      </div>
    </div>
  );
}
