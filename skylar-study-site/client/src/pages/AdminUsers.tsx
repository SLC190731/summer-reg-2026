import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Loader2, Shield, GraduationCap, User as UserIcon, AlertTriangle, UserPlus, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Role = "admin" | "teacher" | "user";

const ROLE_META: Record<Role, { label: string; icon: React.ReactNode; className: string }> = {
  admin: {
    label: "管理員",
    icon: <Shield className="w-3.5 h-3.5" />,
    className: "bg-red-100 text-red-700 border-red-200",
  },
  teacher: {
    label: "導師",
    icon: <GraduationCap className="w-3.5 h-3.5" />,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  user: {
    label: "學生",
    icon: <UserIcon className="w-3.5 h-3.5" />,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default function AdminUsers() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const utils = trpc.useUtils();
  const usersQuery = trpc.admin.listUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const setRoleMutation = trpc.admin.setUserRole.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      toast.success("已更新角色");
    },
    onError: (err) => toast.error(err.message || "更新失敗"),
  });

  // 新增帳號表單
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "user" as Role });
  const createMutation = trpc.admin.createLocalUser.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      toast.success("已建立帳號");
      setCreateOpen(false);
      setForm({ username: "", password: "", name: "", role: "user" });
    },
    onError: (err) => toast.error(err.message || "建立失敗"),
  });

  // 重設密碼
  const [resetTarget, setResetTarget] = useState<{ id: number; label: string } | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const resetMutation = trpc.admin.resetUserPassword.useMutation({
    onSuccess: () => {
      toast.success("密碼已重設");
      setResetTarget(null);
      setResetPwd("");
    },
    onError: (err) => toast.error(err.message || "重設失敗"),
  });

  // 未登入
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">需要登入</h1>
          <p className="text-slate-600">後台僅限管理員存取，請先登入。</p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            前往登入
          </Button>
        </Card>
      </div>
    );
  }

  // 非 admin
  if (!authLoading && isAuthenticated && user?.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-2xl font-bold">沒有權限</h1>
          <p className="text-slate-600">這個頁面只開放給管理員使用。</p>
        </Card>
      </div>
    );
  }

  if (authLoading || usersQuery.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const users = usersQuery.data ?? [];
  const counts = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    teacher: users.filter((u) => u.role === "teacher").length,
    student: users.filter((u) => u.role === "user").length,
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    const kw = keyword.trim().toLowerCase();
    if (!kw) return true;
    return (
      (u.name ?? "").toLowerCase().includes(kw) ||
      (u.email ?? "").toLowerCase().includes(kw) ||
      (u.openId ?? "").toLowerCase().includes(kw) ||
      (u.username ?? "").toLowerCase().includes(kw)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 標題 */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">帳戶管理</h1>
            <p className="text-slate-600 mt-1">管理導師與學生帳號，設定每位用戶的角色。</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <UserPlus className="w-4 h-4" /> 新增帳號
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>新增帳號</DialogTitle>
                <DialogDescription>建立導師或學生帳號，使用用戶名 + 密碼登入。</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>用戶名</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="例：student01"
                  />
                  <p className="text-xs text-slate-400">只能包含英文、數字、 . _ -，3-64 字元</p>
                </div>
                <div className="space-y-1.5">
                  <Label>初始密碼</Label>
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="至少 6 字元"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>顯示名稱（選填）</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="例：張小明"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>角色</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">學生</SelectItem>
                      <SelectItem value="teacher">導師</SelectItem>
                      <SelectItem value="admin">管理員</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={createMutation.isPending || !form.username || !form.password}
                  onClick={() => createMutation.mutate({
                    username: form.username.trim(),
                    password: form.password,
                    name: form.name.trim() || undefined,
                    role: form.role,
                  })}
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  建立
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 重設密碼 dialog */}
        <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>重設密碼</DialogTitle>
              <DialogDescription>將為 {resetTarget?.label} 設定新密碼。</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>新密碼</Label>
              <Input value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} placeholder="至少 6 字元" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetTarget(null)}>取消</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={resetMutation.isPending || resetPwd.length < 6 || !resetTarget}
                onClick={() => resetTarget && resetMutation.mutate({ userId: resetTarget.id, password: resetPwd })}
              >
                {resetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                確認重設
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 統計卡 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-slate-500 text-sm">總人數</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-slate-500 text-sm">管理員</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{counts.admin}</div>
          </Card>
          <Card className="p-4">
            <div className="text-slate-500 text-sm">導師</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{counts.teacher}</div>
          </Card>
          <Card className="p-4">
            <div className="text-slate-500 text-sm">學生</div>
            <div className="text-2xl font-bold text-slate-700 mt-1">{counts.student}</div>
          </Card>
        </div>

        {/* 篩選 */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <Input
              placeholder="搜尋姓名、Email 或 openId"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="md:max-w-sm"
            />
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
              <SelectTrigger className="md:max-w-[180px]">
                <SelectValue placeholder="角色篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="admin">管理員</SelectItem>
                <SelectItem value="teacher">導師</SelectItem>
                <SelectItem value="user">學生</SelectItem>
              </SelectContent>
            </Select>
            <div className="md:ml-auto text-sm text-slate-500">
              顯示 {filtered.length} / {users.length} 位用戶
            </div>
          </div>
        </Card>

        {/* 列表 */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>姓名 / 賬號</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[120px]">目前角色</TableHead>
                <TableHead className="w-[180px]">設定角色</TableHead>
                <TableHead className="w-[120px]">操作</TableHead>
                <TableHead className="w-[120px]">建立時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u, idx) => {
                const meta = ROLE_META[u.role as Role];
                const isSelf = user?.id === u.id;
                const isUpdating =
                  setRoleMutation.isPending && setRoleMutation.variables?.userId === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="text-slate-500">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {u.name || "（未設定）"}
                        {isSelf && (
                          <span className="ml-2 text-xs text-blue-600">（你）</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[260px]">
                        {u.username ? `@${u.username}` : (u.openId ?? "—")}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{u.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                        {meta.icon}
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isUpdating}
                        onValueChange={(value) =>
                          setRoleMutation.mutate({ userId: u.id, role: value as Role })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">設為管理員</SelectItem>
                          <SelectItem value="teacher">設為導師</SelectItem>
                          <SelectItem value="user">設為學生</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.username ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setResetTarget({ id: u.id, label: u.name ?? u.username! })}
                        >
                          <KeyRound className="w-3.5 h-3.5" /> 重設密碼
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">OAuth 帳號</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(u.createdAt).toLocaleDateString("zh-HK")}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    沒有符合條件的用戶
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <p className="text-xs text-slate-400">
          提示：可在「新增帳號」直接建立導師或學生帳號，他們可使用用戶名 + 密碼登入，不需電郵。
        </p>
      </div>
    </div>
  );
}
