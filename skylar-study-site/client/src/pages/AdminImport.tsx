import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ImportedQuestion {
  content: string;
  correctAnswer: number;
  category: string;
}

export default function AdminImport() {
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ImportedQuestion[]>([]);
  const [category, setCategory] = useState("unit_5");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "preview" | "success" | "error">("idle");

  const createManyMutation = trpc.questions.createManyTrueOrFalse.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleParseFile = async () => {
    if (!file) {
      toast.error("請選擇檔案");
      return;
    }

    setIsProcessing(true);
    try {
      const text = await file.text();
      
      // 簡單的解析邏輯 - 根據檔案格式調整
      const lines = text.split("\n");
      const parsedQuestions: ImportedQuestion[] = [];

      // 假設格式為：題目內容 | 答案(1/0)
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const parts = trimmed.split("|");
        if (parts.length >= 2) {
          const content = parts[0].trim();
          const answer = parseInt(parts[1].trim());

          if (content && (answer === 0 || answer === 1)) {
            parsedQuestions.push({
              content,
              correctAnswer: answer,
              category,
            });
          }
        }
      }

      if (parsedQuestions.length === 0) {
        toast.error("未能解析任何題目，請檢查檔案格式");
        setImportStatus("error");
      } else {
        setQuestions(parsedQuestions);
        setImportStatus("preview");
        toast.success(`成功解析 ${parsedQuestions.length} 道題目`);
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("解析檔案失敗");
      setImportStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (questions.length === 0) {
      toast.error("沒有題目可匯入");
      return;
    }

    setIsProcessing(true);
    try {
      await createManyMutation.mutateAsync({
        questions,
      });
      setImportStatus("success");
      toast.success(`成功匯入 ${questions.length} 道題目`);
      
      // 重置表單
      setTimeout(() => {
        setFile(null);
        setQuestions([]);
        setImportStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Error importing questions:", error);
      toast.error("匯入失敗");
      setImportStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">題目管理</h1>
          <p className="text-slate-600">批量匯入判斷題</p>
        </div>

        {/* 上傳卡片 */}
        {importStatus === "idle" && (
          <Card className="p-8 shadow-lg">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  選擇檔案
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <Input
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    點擊選擇檔案或拖放
                  </label>
                  {file && (
                    <p className="text-sm text-slate-600 mt-2">
                      已選擇: {file.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  分類
                </label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., unit_5"
                  className="border-slate-200"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
                <p className="font-semibold mb-2">檔案格式說明：</p>
                <p>每行一道題目，格式為：題目內容 | 答案(1=正確, 0=錯誤)</p>
                <p className="mt-2 text-slate-600">例：</p>
                <code className="block bg-white p-2 rounded mt-1 text-xs overflow-x-auto">
                  鑒真即使受到各種阻礙，仍然堅持前往日本 | 1
                </code>
              </div>

              <Button
                onClick={handleParseFile}
                disabled={!file || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    解析中...
                  </>
                ) : (
                  "解析檔案"
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* 預覽卡片 */}
        {importStatus === "preview" && (
          <Card className="p-8 shadow-lg space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">預覽題目</h2>
              <p className="text-slate-600">共 {questions.length} 道題目</p>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex gap-3">
                    <span className="text-xs font-semibold text-slate-500 min-w-fit">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-slate-900">{q.content}</p>
                      <p className="text-xs text-slate-600">
                        答案: {q.correctAnswer === 1 ? "正確" : "錯誤"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setImportStatus("idle")}
                variant="outline"
                className="flex-1"
              >
                返回
              </Button>
              <Button
                onClick={handleImport}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    匯入中...
                  </>
                ) : (
                  "確認匯入"
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* 成功卡片 */}
        {importStatus === "success" && (
          <Card className="p-8 shadow-lg text-center space-y-4 bg-green-50 border border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-green-900">匯入成功</h2>
              <p className="text-green-700 mt-1">
                {questions.length} 道題目已成功匯入資料庫
              </p>
            </div>
          </Card>
        )}

        {/* 錯誤卡片 */}
        {importStatus === "error" && (
          <Card className="p-8 shadow-lg text-center space-y-4 bg-red-50 border border-red-200">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-red-900">匯入失敗</h2>
              <p className="text-red-700 mt-1">
                請檢查檔案格式後重試
              </p>
            </div>
            <Button
              onClick={() => setImportStatus("idle")}
              variant="outline"
              className="w-full"
            >
              返回
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
