import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "actor-open-id",
    email: "actor@example.com",
    name: "Actor",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// 用環境變數模擬擁有者 openId
const OWNER_OPEN_ID = "owner-open-id";
process.env.OWNER_OPEN_ID = OWNER_OPEN_ID;

// 模擬 DB 層
const dbState = {
  users: new Map<number, AuthenticatedUser>(),
  updates: [] as Array<{ id: number; role: string }>,
};

vi.mock("./db", async () => {
  return {
    getUserById: async (id: number) => dbState.users.get(id),
    listAllUsers: async () => Array.from(dbState.users.values()),
    updateUserRole: async (id: number, role: string) => {
      dbState.updates.push({ id, role });
      const u = dbState.users.get(id);
      if (u) dbState.users.set(id, { ...u, role: role as AuthenticatedUser["role"] });
      return undefined;
    },
    // 下列其他匯出在本測試不會用到，但保留為 noop 以避免 import 錯誤
    getDb: async () => null,
  };
});

// 載入 router（mock 必須在前）
let appRouter: typeof import("./routers").appRouter;

beforeEach(async () => {
  dbState.users.clear();
  dbState.updates.length = 0;
  appRouter = (await import("./routers")).appRouter;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("admin.setUserRole", () => {
  it("拒絕非 admin 呼叫", async () => {
    const ctx = makeCtx(makeUser({ id: 1, role: "user", openId: "u1" }));
    const caller = appRouter.createCaller(ctx);

    dbState.users.set(2, makeUser({ id: 2, role: "user", openId: "u2" }));

    await expect(
      caller.admin.setUserRole({ userId: 2, role: "teacher" }),
    ).rejects.toThrow();
    expect(dbState.updates).toHaveLength(0);
  });

  it("admin 可將學生升級為導師", async () => {
    const ctx = makeCtx(makeUser({ id: 1, role: "admin", openId: "a1" }));
    const caller = appRouter.createCaller(ctx);

    dbState.users.set(2, makeUser({ id: 2, role: "user", openId: "stu" }));

    const result = await caller.admin.setUserRole({ userId: 2, role: "teacher" });
    expect(result).toEqual({ success: true });
    expect(dbState.updates).toEqual([{ id: 2, role: "teacher" }]);
  });

  it("禁止將網站擁有者降級", async () => {
    const ctx = makeCtx(makeUser({ id: 1, role: "admin", openId: "a1" }));
    const caller = appRouter.createCaller(ctx);

    dbState.users.set(2, makeUser({ id: 2, role: "admin", openId: OWNER_OPEN_ID }));

    await expect(
      caller.admin.setUserRole({ userId: 2, role: "teacher" }),
    ).rejects.toThrow(/擁有者/);
    expect(dbState.updates).toHaveLength(0);
  });

  it("禁止 admin 把自己降級", async () => {
    const ctx = makeCtx(makeUser({ id: 1, role: "admin", openId: "a1" }));
    const caller = appRouter.createCaller(ctx);

    dbState.users.set(1, makeUser({ id: 1, role: "admin", openId: "a1" }));

    await expect(
      caller.admin.setUserRole({ userId: 1, role: "user" }),
    ).rejects.toThrow(/自己/);
    expect(dbState.updates).toHaveLength(0);
  });
});
