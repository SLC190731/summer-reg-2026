import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, BookOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.loginWithUsername.useMutation({
    onSuccess: () => {
      toast.success("登入成功");
      utils.auth.me.invalidate();
      // 等 cookie 落地後再跳轉
      setTimeout(() => setLocation("/"), 80);
    },
    onError: (err) => toast.error(err.message || "登入失敗"),
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-amber-50 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">登入溫習平台</h1>
          <p className="text-slate-500 text-sm">使用學校發放的用戶名與密碼登入</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!username.trim() || !password) {
              toast.error("請輸入用戶名與密碼");
              return;
            }
            loginMutation.mutate({ username: username.trim(), password });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="login-username">用戶名</Label>
            <Input
              id="login-username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例：student01"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">密碼</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            登入
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400">或</span>
          </div>
        </div>

        <a href={getLoginUrl()} className="block">
          <Button variant="outline" className="w-full">
            使用 Manus 帳戶登入
          </Button>
        </a>

        <p className="text-xs text-slate-400 text-center">
          忘記密碼？請聯絡你的老師或管理員協助重設。
        </p>
      </Card>
    </div>
  );
}
