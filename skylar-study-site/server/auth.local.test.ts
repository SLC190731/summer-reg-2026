import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { hashPassword } from "./_core/password";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "u1",
    username: null,
    passwordHash: null,
    email: null,
    name: "User",
    loginMethod: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as AuthenticatedUser;
}

function makeCtx(user: AuthenticatedUser | null): TrpcContext {
  const cookies: Record<string, string> = {};
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: (name: string, val: string) => {
        cookies[name] = val;
      },
      _cookies: cookies,
    } as unknown as TrpcContext["res"],
  };
}

const dbState = {
  users: new Map<number, AuthenticatedUser>(),
  byUsername: new Map<string, AuthenticatedUser>(),
  attempts: [] as Array<{
    attemptId: number;
    userId: number;
    quizType: string;
    category: string | null;
    totalQuestions: number;
    correctAnswers: number;
    scorePercentage: number;
    startedAt: Date;
    completedAt: Date;
    userName: string | null;
    username: string | null;
    userRole: string;
    userEmail: string | null;
  }>,
  newPassword: null as string | null,
  createdUser: null as Partial<AuthenticatedUser> | null,
};

vi.mock("./db", () => ({
  getUserById: async (id: number) => dbState.users.get(id),
  listAllUsers: async () => Array.from(dbState.users.values()),
  updateUserRole: async () => undefined,
  getUserByUsername: async (u: string) => dbState.byUsername.get(u),
  createLocalUser: async (input: { username: string; passwordHash: string; name?: string | null; role?: AuthenticatedUser["role"] }) => {
    dbState.createdUser = input;
    const id = (Math.max(0, ...Array.from(dbState.users.keys())) || 0) + 1;
    const u = makeUser({
      id,
      openId: `local:${input.username}`,
      username: input.username,
      passwordHash: input.passwordHash,
      name: input.name ?? input.username,
      role: input.role ?? "user",
    });
    dbState.users.set(id, u);
    dbState.byUsername.set(input.username, u);
    return u;
  },
  setUserPassword: async (_id: number, hash: string) => {
    dbState.newPassword = hash;
  },
  listAllQuizAttemptsWithUser: async () => dbState.attempts,
  getDb: async () => null,
}));

// 提供 sdk.createSessionToken 不用真的簽 JWT
vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: async (_openId: string, _opts?: unknown) => "fake.session.token",
  },
}));

let appRouter: typeof import("./routers").appRouter;

beforeEach(async () => {
  dbState.users.clear();
  dbState.byUsername.clear();
  dbState.attempts.length = 0;
  dbState.newPassword = null;
  dbState.createdUser = null;
  appRouter = (await import("./routers")).appRouter;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("auth.loginWithUsername", () => {
  it("正確密碼可登入並設置 cookie", async () => {
    const passwordHash = await hashPassword("Hello123");
    const stu = makeUser({ id: 10, openId: "local:stu1", username: "stu1", passwordHash });
    dbState.byUsername.set("stu1", stu);

    const ctx = makeCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.loginWithUsername({ username: "stu1", password: "Hello123" });
    expect(result.success).toBe(true);
    expect(result.user.username).toBe("stu1");
    // 驗證 cookie 確實被設置
    const cookies = (ctx.res as unknown as { _cookies: Record<string, string> })._cookies;
    expect(cookies.app_session_id).toBe("fake.session.token");
  });

  it("錯誤密碼會被拒絕", async () => {
    const passwordHash = await hashPassword("Hello123");
    const stu = makeUser({ id: 11, openId: "local:stu2", username: "stu2", passwordHash });
    dbState.byUsername.set("stu2", stu);

    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.auth.loginWithUsername({ username: "stu2", password: "Wrong!" }),
    ).rejects.toThrow(/密碼錯誤/);
  });

  it("不存在帳號被拒絕", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.auth.loginWithUsername({ username: "ghost", password: "anything" }),
    ).rejects.toThrow(/密碼錯誤/);
  });
});

describe("admin.createLocalUser / resetUserPassword", () => {
  it("admin 可建立自訂帳號", async () => {
    const admin = makeUser({ id: 1, role: "admin", openId: "a1" });
    const caller = appRouter.createCaller(makeCtx(admin));

    const r = await caller.admin.createLocalUser({
      username: "stu_new",
      password: "abcdef",
      name: "新學生",
      role: "user",
    });
    expect(r.success).toBe(true);
    expect(dbState.createdUser?.username).toBe("stu_new");
    // 密碼應該已被雜湊（不是明文）
    expect(dbState.createdUser?.passwordHash).not.toBe("abcdef");
  });

  it("非 admin 不能建立帳號", async () => {
    const teacher = makeUser({ id: 2, role: "teacher", openId: "t1" });
    const caller = appRouter.createCaller(makeCtx(teacher));
    await expect(
      caller.admin.createLocalUser({ username: "x1", password: "abcdef" }),
    ).rejects.toThrow();
  });

  it("OAuth 帳號無法重設密碼", async () => {
    const admin = makeUser({ id: 1, role: "admin", openId: "a1" });
    const target = makeUser({ id: 9, openId: "manus:abc", username: null });
    dbState.users.set(9, target);

    const caller = appRouter.createCaller(makeCtx(admin));
    await expect(
      caller.admin.resetUserPassword({ userId: 9, password: "newpass" }),
    ).rejects.toThrow(/OAuth/);
  });
});

describe("teacher.listAttempts", () => {
  it("teacher 可取得所有學生紀錄", async () => {
    dbState.attempts.push({
      attemptId: 1,
      userId: 5,
      quizType: "true_or_false",
      category: "unit_5",
      totalQuestions: 30,
      correctAnswers: 25,
      scorePercentage: 83,
      startedAt: new Date("2026-05-19T10:00:00Z"),
      completedAt: new Date("2026-05-19T10:05:00Z"),
      userName: "張小明",
      username: "stu5",
      userRole: "user",
      userEmail: null,
    });

    const teacher = makeUser({ id: 2, role: "teacher", openId: "t1" });
    const caller = appRouter.createCaller(makeCtx(teacher));
    const list = await caller.teacher.listAttempts();
    expect(list).toHaveLength(1);
    expect(list[0].userName).toBe("張小明");
  });

  it("學生不能呼叫 teacher.listAttempts", async () => {
    const student = makeUser({ id: 7, role: "user", openId: "s1" });
    const caller = appRouter.createCaller(makeCtx(student));
    await expect(caller.teacher.listAttempts()).rejects.toThrow();
  });

  it("admin 也可呼叫 teacher.listAttempts", async () => {
    const admin = makeUser({ id: 1, role: "admin", openId: "a1" });
    const caller = appRouter.createCaller(makeCtx(admin));
    const list = await caller.teacher.listAttempts();
    expect(Array.isArray(list)).toBe(true);
  });
});
