import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function AdminQuestionFix() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const updateMutation = trpc.admin.updateQuestion.useMutation();

  const handleFixQuestion17 = async () => {
    setIsLoading(true);
    try {
      await updateMutation.mutateAsync({
        id: 17,
        content: "宋朝時期，人們為逃避水災從內地遷徙到香港，建立圍村。",
      });
      setResult({
        success: true,
        message: "✅ 題目 17 已成功更新！「遷徲」已改為「遷徙」",
      });
    } catch (error) {
      setResult({
        success: false,
        message: `❌ 更新失敗：${error instanceof Error ? error.message : "未知錯誤"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-md mx-auto">
        <Card className="p-8 shadow-lg">
          <div className="text-center space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">題目修正工具</h1>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-slate-700">
                <strong>題目 17：</strong>
              </p>
              <p className="text-sm text-red-600 mt-2">
                ❌ 原文：宋朝時期，人們為逃避水災從內地遷<span className="font-bold">徲</span>到香港，建立圍村。
              </p>
              <p className="text-sm text-green-600 mt-2">
                ✅ 修正：宋朝時期，人們為逃避水災從內地遷<span className="font-bold">徙</span>到香港，建立圍村。
              </p>
            </div>

            <Button
              onClick={handleFixQuestion17}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                "點擊更新題目 17"
              )}
            </Button>

            {result && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  result.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    result.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {result.message}
                </p>
              </div>
            )}

            <Button
              onClick={() => setLocation("/units")}
              variant="outline"
              className="w-full"
            >
              返回單元選擇
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
