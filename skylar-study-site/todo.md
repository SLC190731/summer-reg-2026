# 溫習網站平台 - 開發追蹤清單

## 第一階段：判斷題系統

### 資料庫與架構
- [x] 設計判斷題資料庫 schema（題目、答案、分類等）
- [x] 建立題目管理 API（CRUD 操作）
- [x] 實現批量匯入功能（解析檔案並寫入資料庫）

### 前端測驗介面
- [x] 設計優雅完美的測驗頁面佈局
- [x] 實現題目隨機排序邏輯
- [x] 實現選項隨機排列邏輯（正確/錯誤位置隨機）
- [x] 建立純文字題目顯示組件
- [x] 實現答案提交與即時判分

### 結果與分析
- [x] 實現即時判分邏輯
- [x] 建立結果頁面（答對數、總題數、詳細解析）
- [x] 設計結果展示視覺化

### 測試與交付
- [x] 單元測試覆蓋核心邏輯
- [x] 端到端測試驗證完整流程
- [x] 效能測試與優化
- [x] 最終檢查與交付

## 已確認的題目資料
- [x] 共 24 道判斷題
- [x] 答案已確認無誤
- [x] 24 道題目已成功匯入資料庫

## 已完成的功能
- [x] 資料庫架構設計（3 個表：題目、測驗記錄、答題記錄）
- [x] tRPC 路由實現（題目管理、測驗邏輯）
- [x] 優雅的著陸頁面（Home.tsx）
- [x] 測驗頁面（TrueOrFalseQuiz.tsx）
- [x] 結果展示頁面（QuizResult.tsx）
- [x] 題目隨機排列與選項隨機排列
- [x] 即時判分與詳細解析
- [x] 檔案上傳與批量匯入介面（AdminImport.tsx）
- [x] TypeScript 類型檢查通過


## 用戶反饋與修復
- [x] 修複題目重複問題 - 轉換視窗時題目不應重新洗牌
- [x] 固定選項順序 - 「正確」始終排在前、「錯誤」排在後
- [x] 即時答案反饋 - 每次提交答案時顯示作答者的選擇與正確性


## 計分制與及格門檻
- [x] 實現實時計分系統 - 追蹤正確率百分比
- [x] 實現提前終止邏輯 - 正確率低於 60% 時停止測驗
- [x] 實現失敗頁面 - 顯示最終成績與重做或返回選項


## 單元選擇與題型管理
- [x] 建立單元選擇頁面 - 顯示四個單元盒子
- [x] 實現單元詳情展示 - 單元名稱、課程範圍、題型
- [x] 建立題型選擇介面 - 單元五內顯示判斷題選項
- [x] 整合測驗路由 - 從單元選擇導向測驗頁面


## 需要改進的項目
- [x] 在單元卡片中直接顯示具體題型名稱（例如「判斷題」）
- [x] 為 unit_6～unit_8 加上未開放狀態，禁用進入
- [x] 在 TrueOrFalseQuiz 補上題庫為空的 empty state 處理


## 用戶反饋 - 第二輪修復
- [x] 修正題目 17 的錯字 - 「遷徲」改為「遷徙」
- [x] 檢查並移除重複題目
- [x] 添加測驗計時功能 - 在進度條上顯示測驗進行時間


## 測驗狀態持久化
- [x] 實現 localStorage 持久化 - 保存測驗進度、已答題目、計時器
- [x] 實現跨網絡器恢複 - 轉換網絡器後恢複測驗狀態
- [x] 防止題目重新洗牌 - 確保題目順序保持一致


## 用戶反饋 - 第三輪
- [x] 取消自動跳轉，改為學生手動按「下一題」（兩段式：提交答案 → 下一題）
- [x] 完成測驗後展示詳細測驗報告（成績卡片、統計、學習分析、詳細解析）
- [x] 在網站頂部預留 LOGO 位置（SiteHeader 全局導航欄）
- [x] 點擊 LOGO 可從任何頁面返回首頁


## 用戶反饋 - 第四輪：一鍵列印
- [x] 在每個測驗頁面加入「一鍵列印」按鈕（測驗開始頁 + 單元選擇 Modal）
- [x] 建立 PrintQuiz 列印頁面：題目隨機排序（可重新洗牌）
- [x] 列印版最後一頁列出答案，透過動態欄位與字級與分頁控制限制在一頁內
- [x] 使用 print CSS（@media print）優化分頁、隱藏控制列、隱藏全局 Header


## 用戶反饋 - 第五輪：重考制度與測驗報告卡
- [x] 修改停止測驗邏輯：只在「已作答 ≥ 50% 題數」且分數 < 60% 才立即停止
- [x] 重做 QuizResult 頂部卡片：依附圖加入「總題數、已作答題數、答對題數、測驗用時」
- [x] 卡片右上顯示百分比與評級；左上顯示獎杯圖示、單元名稱、完成日期


## 用戶反饋 - 第六輪：失敗頁評估卡 + 帳戶後台
- [x] 抽取共用 ResultSummary 卡片組件（ResultSummaryCard.tsx）並接入失敗頁
- [x] 失敗頁顯示「總題數、已作答題數、答對題數、測驗用時」四欄統計
- [x] DB schema 新增 `teacher` 角色並完成 migration
- [x] 後台頁面 /admin/users：查詢、篩選、下拉設定 admin / teacher / student
- [x] adminProcedure 守衛 + setUserRole API，保護 owner 與自己不被降級


## 用戶反饋 - 第七輪：自訂帳號登入 + 老師檢視
- [x] schema：user 增加 username（唯一）與 passwordHash 欄位並 migration
- [x] tRPC: auth.loginWithUsername，發放 JWT cookie 與既有 session 同流程
- [x] 前端登入頁 /login：用戶名 + 密碼表單；保留 Manus OAuth 為次選
- [x] 後台：admin 可一鍵建立 teacher / student / admin 帳戶（指定用戶名 + 初始密碼 + 角色）並可重設密碼
- [x] 老師頁面 /teacher/results：列出所有學生測驗紀錄（學生、單元、分數、用時、日期）+ 統計卡
- [x] 後端 teacherProcedure 守衛：只讓 teacher/admin 看；其他角色拒絕
- [x] vitest：hashPassword/verifyPassword 正確、錯誤、隨機鹽獨立、格式驗證 4 個測試均通過


## 用戶反饋 - 第八輪：博學堂雙學科平台
- [ ] 上傳博學堂 LOGO 至 webdev-static-assets，取得永久 URL
- [ ] schema：user 增 grade（1–6）；quiz_attempts 增 subject（people / science）並 migration
- [ ] 重做首頁：呈現「人民科」「科學科」雙入口卡片
- [ ] 學生未登入或未選年級 → 跳 /login（已登入則導去年級選擇）
- [ ] 年級選擇頁（先設定四年級可用），其它年級顯示「敬請期待」
- [ ] SiteHeader 左上角換成博學堂 LOGO（中英橫式），點擊回首頁
- [ ] 測驗題目頁頂部顯示「學科 · 單元名稱 · 題型」
- [ ] 將單元五判斷題納入四年級人民科其中一個題型
- [ ] 字體統一使用 Microsoft JhengHei；圖片用絕對 URL
- [ ] vitest：grade 必填、subject 寫入正確、未登入被擋

## 用戶反饋 - 第十輪：單元 5 分類題新題型
- [x] 擴充 schema：新增 classification_questions 表（unit_id、question、categories、items、correctAnswer）
- [x] 後端 helpers：getClassificationQuestions、saveClassificationAttempt
- [x] 前端頁面：ClassificationQuiz（拖拽邏輯、隨機排序、驗證）
- [x] 匯入 7 題分類題資料至 unit_id = 5（移除分類框/項目的數字前綴）
- [x] 驗證多端佈局（iOS/Android）並保存 checkpoint
- [x] vitest: 7 項分類題測試全部通過


## 用戶反饋 - 第十一輪：分類題和判斷題問題修正
- [x] 統一判斷題和分類題卡片的寬度尺寸
- [x] 修正分類題未提交答案時不應計算分數的問題
- [x] 修正分類題計分方式（做到一半即使全對也達不到 60%）
- [x] 在所有測驗頁面添加返回鍵（返回該單元頁面）
- [x] 重新排版選擇題列印版本，讓學生易於填答


## 用戶反饋 - 第十二輪：返回鍵位置調整 + 列印版排版改進
- [x] 移動返回鍵到頁面頂部（所有測驗頁面）
- [x] 簡化返回鍵文字爲「返回」
- [x] 恢複判斷題列印版為上一版本排版（不轉行）
- [x] 改進選擇題列印版排版（讓學生易於填寶答案）


## 用戶反饋 - 第十三輪：測驗詳細說明 + 列印排版改進
- [x] 為判斷題添加詳細說明頁面（進入測驗前）
- [x] 為分類題添加詳細說明頁面（進入測驗前）
- [x] 改進判斷題列印版排版（一行顯示題目 + () 填答）


## 用戶反饋 - 第十四輪：詳細說明頁面 + 列印版調整
- [x] 檢查所有單元的所有測驗，補回缺失的詳細說明頁面（已驗證：判斷/分類/配對/排序/選擇 5 種題型均有介紹頁）
- [x] 列印頁面頂部「返回單元選擇」改為「返回」（PrintQuiz.tsx 已採「返回」文案）
- [x] 分類題列印版大標題根據題型顯示（h1 已依 quizType 動態切換「分類題測驗 / 配對題測驗 / 排序題測驗 / 選擇題測驗 / 判斷題測驗」）
- [x] 重新排版分類題列印版讓學生更易明白配對方式並可填答（採「待分類項目（字母 A/B/C…）+ 分類框（學生填字母）」雙區排版）

## 用戶反饋 - 第十五輪：統一所有單元的判斷題詳細說明頁
- [x] 統一判斷題詳細說明頁設計（匹配附圖：text-3xl 大標題、藍色說明框、開始測驗主按鈕、一鍵列印副按鈕、卡片置中加大）
- [x] 修復判斷題 localStorage 殘留狀態導致跳過 intro 頁面的問題
- [x] 統一判斷題的單元標題格式（與分類題 UNIT_LABELS 一致）

## 用戶反饋 - 第十九輪：新增單元五配對題（一對一 + 一對多）
- [x] 新增 `matching_questions` 表（unit_id、question、leftItems、rightItems、correctAnswer JSON、subject、grade）
- [x] 後端 router：getMatchingQuestions / submitMatchingQuiz
- [x] 前端頁面 MatchingQuiz：左欄項目 + 右欄選項；學生為每個左項勾選 1 或多個右側選項（一對多）
- [x] 每次測驗隨機排序：題目、左欄、右欄；展示時去除字母／數字編號前綴
- [x] 提交後顯示用戶答案與正確答案；正確項打勾，錯誤項打叉並標出正解
- [x] 進入測驗前的詳細說明頁（沿用分類題的版面）
- [x] PrintQuiz 支援配對題列印（已於第二十一輪完成：顯示左欄、右欄、作答行與答案頁字母對應）
- [x] UnitSelection 單元五加入「配對題」入口
- [x] 匯入單元五 9 題配對題到資料庫

## 用戶反饋 - 第二十輪：配對題版面統一 + 行動裝置拖曳修復
- [x] 配對題頂端統一為與分類題一致的版面（總卷卡、進度條、正確率列、第 N/M 題行）
- [x] 修復分類題在 iOS／Android 上無法拖曳待分類項目（改用 @dnd-kit/core：PointerSensor + TouchSensor 雙感應器）

## 用戶反饋 - 第二十一輪：分類題改點選 + 配對題列印修復
- [x] 分類題改為點選作答模式（先選下方「待分類項目」，再點上方分類框以放入；已移除 dnd-kit 拖拽機制）
- [x] PrintQuiz 支援配對題（quizType=matching），列印時顯示左欄項目、右欄選項與作答行；答案頁進一步列出字母對應

## 用戶反饋 - 第二十二輪：單元六配對題 + 介紹頁單元名稱修正
- [x] 解析單元六配對題 Word 檔（含一對一與一對多，共 15 題）並在對話中列出供核對
- [x] 匯入單元六 15 題配對題到資料庫（unit_id=6）
- [x] 在 UnitSelection 啟用單元六「配對題」入口
- [x] 修正所有題型介紹頁的單元名稱顯示（分類題介紹頁改為動態題數與點選文案；PrintQuiz / MatchingQuiz 統一單元七、五、八標籤）
- [x] vitest: 新增單元六配對題 5 個測試（題數、結構、前綴、一對多、關鍵題目）均通過

## 用戶反饋 - 第二十三輪：單元六配對題結果頁 + 單元五名稱統一
- [x] 修復單元六配對題提交後無法跳轉結果頁（MatchingQuiz 結果頁條件判斷補上 resultData.answers 檢查）
- [x] 統一單元五名稱為「國家歷史和文化」（修正 TrueOrFalseQuiz、ClassificationQuiz、MatchingQuiz、PrintQuiz、QuizResult、TeacherResults 的 UNIT_LABELS）

## 用戶反饋 - 第二十四輪：配對題題目下選項顯示移除
- [x] 移除配對題答題頁面中題目下的選項顯示區塊（因為左欄項目下已顯示完整的右欄選項供勾選）

## 用戶反饋 - 第二十五輪：單元七配對題重新匯入（含完整問題說明）
- [x] 重新提取 Word 檔案原始內容，確保每題包含完整的問題說明
- [x] 刪除舊的單元七配對題資料
- [x] 重新匯入 8 題單元七配對題（含完整問題說明）：
  - 題 1：把以下的日期或年份與有關事件配對。
  - 題 2：把以下詞彙與意思配對。
  - 題 3：以下活動體現了香港居民享有哪些權利？
  - 題 4：把以下《基本法》列明的香港居民的權利和相關內容配對。
  - 題 5：在以下場合作為香港居民需要履行甚麼義務？
  - 題 6：在享有以下權利時，需要履行甚麼相對的義務？
  - 題 7：在享有以下權利時，需要履行甚麼相對的義務？
  - 題 8：我們享有以下權利時，應該履行甚麼義務？
- [x] vitest: 37 個測試全部通過
- [x] 在 UnitSelection 啟用單元七配對題入口

## 用戶反饋 - 第二十六輪：即時顯示答案的排序與題目排序不一致
- [x] 檢查所有測驗（判斷題、分類題、配對題）提交答案後的即時答案顯示
- [x] 修正配對題答案反饋顯示順序（改用 shuffledLeft 与答題區一致）
- [x] 修正分類題正確答案顯示順序（改用 shuffledCategories 与答題區一致）
- [x] 判斷題只有「正確/錯誤」二選項不存在排序問題
- [x] 運行 vitest 測試確保修改無誤（37 個測試全部通過）

## 用戶反饋 - 第二十七輪：列印版配對題隨機排序
- [x] PrintQuiz 為配對題每題的 leftItems 與 rightItems 隨機排序（每次重新洗牌都重新打亂）
- [x] 試卷區與答案區共用同一份打亂結果（透過 matchingShuffled Map 快取）
- [x] 答案頁字母對應根據打亂後的 rightItems 計算，確保正確
- [x] vitest: 37 個測試全部通過

## 用戶反饋 - 第二十八輪：列印版分類題待分類項目隨機排序
- [x] PrintQuiz 為分類題每題的 items（待分類項目）加入隨機排序
- [x] PrintQuiz 為分類題的 categories（分類框）加入隨機排序
- [x] 試卷區與答案區共用同一份打亂結果（classificationShuffled Map）
- [x] 重新洗牌按鈕應同時打亂分類題的項目順序（shuffleSeed 觸發）
- [x] 答案區加入字母對應顯示（A、B、C…依據打亂後的項目順序）
- [x] 運行 vitest 測試確保修改無誤（37 個測試全部通過）

## 用戶反饋 - 第二十九輪：新增單元8配對題
- [x] 將 23 題單元8配對題匯入資料庫（unit_id=8）
- [x] 在 UnitSelection 啟用單元8配對題入口
- [x] 確認答題版題目順序、左欄、右欄都隨機排序（沿用既有邏輯）
- [x] 確認列印版題目順序、左欄、右欄都隨機排序（沿用既有邏輯）
- [x] 運行 vitest 測試確保無誤（37 個測試全部通過）

## 用戶反饋 - 第三十輪：新增單元8分類題
- [x] 提取 Word 檔案 11 題分類題內容（含題目、分類框、待分類項目、答案）
- [x] 用戶核對通過
- [x] 匯入 11 題單元8分類題到資料庫（unit_id=8）
- [x] 在 UnitSelection 啟用單元8分類題入口
- [x] 答題版與列印版沿用既有隨機排序邏輯（題目、分類框、待分類項目）
- [x] vitest 測試通過（37 個全部通過）

## 用戶反饋 - 第三十一輪：新增排序題（人文科 單元 5）

- [x] 提取單元 5 排序題 Word 檔內容並提交用戶核對（4 題）
- [x] 新增 ordering_questions / ordering_attempts 資料表 schema 並執行 migration
- [x] 建立後端 tRPC procedures（startOrderingQuiz / submitOrderingQuiz）與 db.ts helpers
- [x] 建立前端 OrderingQuiz.tsx（介紹頁、答題頁、項目隨機洗牌、點選編號互動、即時回饋、結果頁、< 60% 終止）
- [x] App.tsx 註冊 /quiz/ordering 路由
- [x] PrintQuiz 加入排序題支援（orderingShuffled Map，題目區「（）→（）」括號，答案區顯示項目編號正確順序）
- [x] UnitSelection 啟用單元 5 排序題入口
- [x] 匯入單元 5 排序題目資料（玄奘 / 鑒真 / 文天祥 / 元朝建立 共 4 題）
- [x] 撰寫 server/routers/ordering.test.ts（6 個測試），全部 43 個 vitest 測試通過
- [x] 建立 checkpoint（fc096f7b）
- [x] 更新 study-platform-quiz-builder skill 加入排序題工作流程（SKILL.md Workflow D、references/database-schema.md、frontend-conventions.md、print-quiz-rules.md 均同步；quick_validate 通過）

## 用戶反饋 - 第三十二輪：新增選擇題（人文科 單元 5）

- [x] 提取單元 5 選擇題 Word 檔內容並提交用戶核對（34 題：27 單選 + 7 多選；包含玄奘、鑒真、宋代、元代、文天祥等）
- [x] 新增 choice_questions / choice_attempts 資料表 schema 並執行 migration
- [x] 建立後端 tRPC procedures（startChoiceQuiz / submitChoiceQuiz）與 db.ts helpers（5 個）
- [x] 建立前端 ChoiceQuiz.tsx（介紹頁、答題頁、單選/多選混合、選項隨機、即時回饋、結果頁、< 60% 終止）
- [x] App.tsx 註冊 /quiz/choice 路由
- [x] PrintQuiz 加入選擇題支援（choiceShuffled Map、字母對應、多選括號）
- [x] UnitSelection 啟用單元 5 選擇題入口
- [x] 匯入單元 5 選擇題目資料（34 題），修正第 31/33 題的歷史對應（鐵木真、徽必烈）
- [x] 撰寫 choice.test.ts（9 個測試）並執行 pnpm vitest：52 個測試全部通過
- [x] 建立 checkpoint（315a7734）
- [x] 更新 study-platform-quiz-builder skill 加入選擇題工作流程（SKILL.md Workflow E、references/database-schema.md 第 5 節、frontend-conventions.md 第 5 節、print-quiz-rules.md 選擇題隨機化段落；quick_validate 通過）
