import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
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
import { Loader2, GraduationCap, AlertTriangle, Trophy, TrendingUp, Users } from "lucide-react";

const UNIT_LABELS: Record<string, string> = {
  unit_5: "單元五：國家歷史和文化",
  unit_6: "單元六：香港今昔",
  unit_7: "單元七：《基本法》與我",
  unit_8: "單元八：資訊新世代",
  unit_10_11: "國家歷史和文化．第10、11課",
};

function unitLabel(category: string | null | undefined) {
  if (!category) return "—";
  return UNIT_LABELS[category] ?? category;
}

function formatDuration(start: string | Date, end: string | Date) {
  const ms = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s.toString().padStart(2, "0")}秒`;
}

export default function TeacherResults() {
  const { user, loading, isAuthenticated } = useAuth();
  const allowed = isAuthenticated && (user?.role === "teacher" || user?.role === "admin");

  const attemptsQuery = trpc.teacher.listAttempts.useQuery(undefined, { enabled: allowed });
  const [keyword, setKeyword] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("all");

  const data = attemptsQuery.data ?? [];
  const units = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => r.category && set.add(r.category));
    return Array.from(set);
  }, [data]);

  const filtered = data.filter((r) => {
    if (unitFilter !== "all" && r.category !== unitFilter) return false;
    const kw = keyword.trim().toLowerCase();
    if (!kw) return true;
    return (
      (r.userName ?? "").toLowerCase().includes(kw) ||
      (r.username ?? "").toLowerCase().includes(kw) ||
      (r.userEmail ?? "").toLowerCase().includes(kw)
    );
  });

  const stats = useMemo(() => {
    if (filtered.length === 0) return { count: 0, students: 0, avg: 0 };
    const studentsSet = new Set(filtered.map((r) => r.userId));
    const avg =
      filtered.reduce((acc, r) => acc + r.scorePercentage, 0) / filtered.length;
    return { count: filtered.length, students: studentsSet.size, avg: Math.round(avg) };
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
          <h2 className="text-xl font-bold">僅限導師或管理員</h2>
          <p className="text-slate-500 text-sm">此頁面僅供老師查看學生測驗紀錄。</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            學生測驗結果
          </h1>
          <p className="text-slate-600 mt-1">查看每位學生在各單元的測驗紀錄與成績。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">測驗總場次</div>
              <div className="text-2xl font-bold text-slate-900">{stats.count}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">參與學生</div>
              <div className="text-2xl font-bold text-slate-900">{stats.students}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">平均分數</div>
              <div className="text-2xl font-bold text-slate-900">{stats.avg}%</div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <Input
              placeholder="搜尋學生姓名、用戶名或 Email"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="md:max-w-sm"
            />
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="md:max-w-[260px]">
                <SelectValue placeholder="單元篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部單元</SelectItem>
                {units.map((c) => (
                  <SelectItem key={c} value={c}>{unitLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="md:ml-auto text-sm text-slate-500">
              共 {filtered.length} 筆紀錄
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>學生</TableHead>
                <TableHead>單元</TableHead>
                <TableHead className="text-center w-[100px]">題數</TableHead>
                <TableHead className="text-center w-[100px]">答對</TableHead>
                <TableHead className="text-center w-[120px]">分數</TableHead>
                <TableHead className="w-[110px]">用時</TableHead>
                <TableHead className="w-[160px]">完成時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attemptsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    暫無測驗紀錄
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, idx) => {
                  const tone =
                    r.scorePercentage >= 80
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : r.scorePercentage >= 60
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-red-100 text-red-700 border-red-200";
                  return (
                    <TableRow key={r.attemptId}>
                      <TableCell className="text-slate-500">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {r.userName || r.username || "（未命名）"}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {r.username ? `@${r.username}` : r.userEmail ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700">{unitLabel(r.category)}</TableCell>
                      <TableCell className="text-center">{r.totalQuestions}</TableCell>
                      <TableCell className="text-center text-emerald-600 font-semibold">
                        {r.correctAnswers}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={tone}>
                          {r.scorePercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDuration(r.startedAt, r.completedAt)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {new Date(r.completedAt).toLocaleString("zh-HK", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
