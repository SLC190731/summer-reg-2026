import { useLocation } from "wouter";
import { Users, ClipboardList, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

/**
 * 全局 LOGO 導航欄
 * - 點擊 LOGO 即返回首頁
 * - 管理員額外顯示「帳戶管理」入口
 * - 老師額外顯示「學生測驗結果」入口
 */
export default function SiteHeader() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation("/");
    },
  });

  const isAdmin = isAuthenticated && user?.role === "admin";
  const isTeacher = isAuthenticated && (user?.role === "teacher" || user?.role === "admin");

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location !== "/") setLocation("/");
  };

  const navItem = (path: string, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <a
      href={path}
      onClick={(e) => {
        e.preventDefault();
        setLocation(path);
      }}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </a>
  );

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/75 border-b border-slate-200/60 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <a
          href="/"
          onClick={handleLogoClick}
          className="group flex items-center gap-2 transition-transform duration-200 ease-out active:scale-[0.97]"
          aria-label="返回首頁"
        >
          <img
            src="/manus-storage/skylar-logo_b84ca744.webp"
            alt="博學堂 Skylar Learning Center"
            className="h-9 sm:h-10 w-auto select-none"
            draggable={false}
          />
        </a>

        <div className="flex items-center gap-2">
          {isTeacher && navItem("/teacher/results", "測驗結果", ClipboardList)}
          {isAdmin && navItem("/admin/users", "帳戶管理", Users)}

          {isAuthenticated ? (
            <button
              onClick={() => logoutMutation.mutate()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {user?.name ? `登出（${user.name}）` : "登出"}
            </button>
          ) : (
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                setLocation("/login");
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              登入
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
