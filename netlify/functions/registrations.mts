import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

// 暑期報名資料庫：每一筆報名都是一個獨立的 blob，鍵為伺服器產生的唯一 ID。
// 同一名學生重複報名亦各自獨立存放，永不互相覆蓋或合併，徹底取代舊有「同名覆蓋」的雲端試算表 +
// 瀏覽器本機備份做法。所有欄位（A/B 堂數、上課日期、特選課堂、Part C、折扣、備註）完整保存於伺服器，
// 老師在任何裝置開啟後台都能看到一致而完整的資料。
const STORE_NAME = 'summer-reg-2026'

function regStore() {
  // 強一致性：報名提交或老師修改後，下一次讀取即時反映，避免「入咗又唔見」。
  return getStore({ name: STORE_NAME, consistency: 'strong' })
}

function newId(): string {
  // 伺服器產生的唯一識別，確保每次提交都是一筆獨立紀錄。
  return 'reg_' + crypto.randomUUID()
}

// ──────────────────────────────────────────────────────────────────────────
// Google 試算表同步
// 每次新增／修改／刪除報名後，把伺服器資料庫的完整名冊推送到老師的 Google 試算表，
// 作為自動備份，並方便老師在試算表內自由做統計。推送方式是呼叫一個由老師部署的
// Google Apps Script Web App（網址存於環境變數 GOOGLE_SHEETS_WEBHOOK_URL），
// 採「整份覆蓋」：每次都送出全部紀錄，令試算表成為資料庫的忠實鏡像，
// 新增、修改、刪除都會準確反映。未設定環境變數時自動略過，不影響報名運作。
// ──────────────────────────────────────────────────────────────────────────

function getEnv(name: string): string {
  // 同時支援 Netlify 新版執行環境（Netlify.env）與 process.env。
  try {
    // @ts-ignore - Netlify global 在執行環境中提供
    if (typeof Netlify !== 'undefined' && Netlify.env?.get) {
      // @ts-ignore
      const v = Netlify.env.get(name)
      if (v) return String(v)
    }
  } catch {}
  return (process.env?.[name] as string) || ''
}

// 把特選課堂物件（日期 → 時間）整理成可讀字串，例如「06/22(10:00-12:00), 07/15(14:00-16:00)」。
function formatSpecial(special: unknown): string {
  if (!special || typeof special !== 'object') return ''
  try {
    return Object.entries(special as Record<string, unknown>)
      .map(([date, time]) => (time ? `${date}(${time})` : date))
      .join(', ')
  } catch {
    return ''
  }
}

// 試算表欄目（標題列），順序對老師閱讀及統計最為方便。
const SHEET_HEADER = [
  '登記時間',
  '學生姓名',
  '性別',
  '年級',
  'Part A 堂數',
  'Part A 日期',
  'Part B 堂數',
  'Part B 日期',
  '特選課堂',
  'Part C',
  '折扣',
  '費用總計',
  '備註',
  '系統編號',
  '伺服器建立時間',
]

function recordToRow(rec: Record<string, unknown>): (string | number)[] {
  const s = (v: unknown) => (v == null ? '' : String(v))
  return [
    s(rec.timestamp),
    s(rec.name),
    s(rec.gender),
    s(rec.gradeText),
    s(rec.countA),
    s(rec.detailsA),
    s(rec.countB),
    s(rec.detailsB),
    formatSpecial(rec.special),
    s(rec.hasPartC),
    s(rec.discount),
    s(rec.total),
    s(rec.remark),
    s(rec.id),
    s(rec.createdAt),
  ]
}

// 讀取全部報名紀錄（依建立時間排序，令試算表次序穩定）。
async function loadAllRecords(store: ReturnType<typeof regStore>): Promise<Record<string, unknown>[]> {
  const { blobs } = await store.list()
  const records = await Promise.all(
    blobs.map(async (b) => {
      const rec = (await store.get(b.key, { type: 'json' })) as Record<string, unknown> | null
      return rec ? { ...rec, id: b.key } : null
    }),
  )
  return (records.filter(Boolean) as Record<string, unknown>[]).sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
  )
}

// 把完整名冊推送到 Google 試算表。永不丟出例外——備份失敗不可拖垮報名功能。
async function syncToGoogleSheets(
  records: Record<string, unknown>[],
): Promise<{ ok: boolean; configured: boolean; status?: number; error?: string }> {
  const url = getEnv('GOOGLE_SHEETS_WEBHOOK_URL')
  if (!url) return { ok: false, configured: false }

  const payload = {
    secret: getEnv('GOOGLE_SHEETS_SYNC_SECRET') || undefined,
    sheetName: getEnv('GOOGLE_SHEETS_TAB_NAME') || '報名資料',
    header: SHEET_HEADER,
    rows: records.map(recordToRow),
    syncedAt: new Date().toISOString(),
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!res.ok) return { ok: false, configured: true, status: res.status }
    return { ok: true, configured: true, status: res.status }
  } catch (err) {
    return { ok: false, configured: true, error: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(timer)
  }
}

// 變更後觸發一次背景同步：盡量以 waitUntil 在背景完成，避免拖慢老師／學生的操作回應。
function scheduleSync(store: ReturnType<typeof regStore>, context: Context): void {
  const job = loadAllRecords(store)
    .then((records) => syncToGoogleSheets(records))
    .catch(() => {})
  // @ts-ignore - waitUntil 在 Netlify 執行環境提供，確保回應送出後背景工作仍會完成
  if (typeof context?.waitUntil === 'function') context.waitUntil(job)
}

export default async (req: Request, context: Context) => {
  const store = regStore()

  // 讀取全部報名紀錄（後台名冊、統計、點名日曆共用）。
  if (req.method === 'GET') {
    const { blobs } = await store.list()
    const records = await Promise.all(
      blobs.map(async (b) => {
        const rec = (await store.get(b.key, { type: 'json' })) as Record<string, unknown> | null
        return rec ? { ...rec, id: b.key } : null
      }),
    )
    return Response.json(records.filter(Boolean))
  }

  if (req.method === 'POST') {
    let body: any
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: '請求格式錯誤' }, { status: 400 })
    }

    const action = String(body.action || 'create')

    // 新增報名：每筆獨立留底，不與任何同名舊紀錄合併。
    if (action === 'create') {
      const id = newId()
      const record = {
        ...(body.record || {}),
        id,
        createdAt: new Date().toISOString(),
      }
      await store.setJSON(id, record)
      scheduleSync(store, context)
      return Response.json({ ok: true, id })
    }

    // 修改單一報名（折扣／備註／特選／調堂）：只針對該 ID，不影響其他同名紀錄。
    if (action === 'update') {
      const id = String(body.id || '')
      if (!id) return Response.json({ error: '缺少紀錄 ID' }, { status: 400 })
      const existing = (await store.get(id, { type: 'json' })) as Record<string, unknown> | null
      if (!existing) return Response.json({ error: '找不到該筆紀錄' }, { status: 404 })
      const updated = { ...existing, ...(body.patch || {}), id }
      await store.setJSON(id, updated)
      scheduleSync(store, context)
      return Response.json({ ok: true, id })
    }

    // 刪除單一報名：只刪該 ID 一筆，由老師決定保留或刪除哪一筆。
    if (action === 'delete') {
      const id = String(body.id || '')
      if (!id) return Response.json({ error: '缺少紀錄 ID' }, { status: 400 })
      await store.delete(id)
      scheduleSync(store, context)
      return Response.json({ ok: true, id })
    }

    // 手動全量同步：把現有完整名冊立即推送到 Google 試算表（亦用於首次把舊資料補入試算表）。
    if (action === 'sync') {
      const records = await loadAllRecords(store)
      const result = await syncToGoogleSheets(records)
      if (!result.configured) {
        return Response.json(
          { ok: false, configured: false, error: '尚未設定 Google 試算表同步網址' },
          { status: 200 },
        )
      }
      return Response.json({ ...result, count: records.length }, { status: result.ok ? 200 : 502 })
    }

    return Response.json({ error: '未知操作' }, { status: 400 })
  }

  return new Response('Method Not Allowed', { status: 405 })
}

export const config: Config = {
  path: '/api/registrations',
}
