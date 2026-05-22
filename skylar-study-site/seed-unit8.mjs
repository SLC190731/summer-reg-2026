import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { trueOrFalseQuestions } from './drizzle/schema.ts';

const questions = [
  { content: '如果受到網絡欺凌，千萬不要讓家人知道，以免他們擔心。', answer: 0 },
  { content: '發現同學受到網絡欺凌時，應該把欺凌訊息轉發給其他同學。', answer: 0 },
  { content: '我們應該相信傳媒報道內容的所有事實和意見。', answer: 0 },
  { content: '使用手提電話的車輛到站時間預報系統，可以預先知道車輛到達時間，使生活更方便。', answer: 1 },
  { content: '互聯網的出現和資訊科技的普及促進了資訊的流通。', answer: 1 },
  { content: '現代資訊科技進步，人們足不出户便可以選購各地的貨品，也可以遠程辦公。', answer: 1 },
  { content: '遠程辦公、網上購物和預知車輛到站時間，都是資訊科技為我們帶來的好處。', answer: 1 },
  { content: '沉迷上網、過度網購及減少與人溝通，都是資訊科技對人們的負面影響。', answer: 1 },
  { content: '沉迷上網可以促進家庭關係。', answer: 0 },
  { content: '電腦病毒會危害網絡安全。', answer: 1 },
  { content: '姓名、電話、電郵、相片、指紋等都是可以辨認個人身份的資料，屬於私隱。', answer: 1 },
  { content: '在網上結識的人不一定可信。', answer: 1 },
  { content: '我們在網上應該使用簡單的密碼，而且不要更改，以確保網絡安全。', answer: 0 },
  { content: '在網上的言行不受法律規管。', answer: 0 },
  { content: '以假名使用資訊科技工具表達意見，便不用為言論負責。', answer: 0 },
  { content: '如果社會基礎設施受到網絡攻擊，會嚴重影響社會和國家的安全。', answer: 1 },
  { content: '香港有不少重要的社會設施都連接了互聯網，因此維護網絡安全是所有香港居民的責任。', answer: 1 },
  { content: '大眾傳媒傳播信息，為人們提供娛樂、時事、教育等資訊。', answer: 1 },
  { content: '電視和電台是大眾傳媒，電影不是大眾傳媒。', answer: 0 },
  { content: '互聯網和社交媒體都是新媒體，大眾可以輕易地獲得資訊和作出評論。', answer: 1 },
  { content: '大眾傳媒具有揭發社會問題和監察政府的功能。', answer: 1 },
  { content: '「智慧型手機有許多不同的品牌和型號。」這句話是事實。', answer: 1 },
  { content: '「她的建議值得引起社會的廣泛重視。」這句話是意見。', answer: 1 },
  { content: '「物流公司應該設立機制處理任何延誤所引發的爭議。」這句話是事實。', answer: 0 },
  { content: '與金錢有關的資訊是不良資訊，我們要拒絕接收。', answer: 0 },
  { content: '在各種獲得消費資訊的途徑中，廣告是一種主要的途徑。', answer: 1 },
  { content: '降價打折是利用消費者的羊羣心態來促銷產品。', answer: 0 },
  { content: '廣告可能對我們造成負面的影響，我們應該避免接觸廣告。', answer: 0 },
  { content: '有些廣告以名人或偶像作為代言人，吸引消費者購買產品。', answer: 1 },
  { content: '有些廣告利用人們喜歡跟隨別人行動、不甘落後於人的心理，這種廣告策略稱為羊羣心態。', answer: 1 },
  { content: '有時候廣告的內容未必可信，我們有懷疑時，可向可靠的專業人士或相關機構查詢。', answer: 1 },
  { content: '有些廣告鼓吹透過購買產品滿足無窮的物質欲望，容易令消費者過度消費。', answer: 1 },
  { content: '政府立法禁止煙草產品在電視展示廣告，避免誤導消費者。', answer: 1 },
  { content: '我們應該為自己訂立健康上網的習慣，不要沉迷上網。', answer: 1 },
  { content: '沉迷上網會影響健康、學業、以及與家人和朋友的關係，我們應該建立健康上網的習慣。', answer: 1 },
  { content: '當我們收到陌生人寄來的信息時，應該立即開啟。', answer: 0 },
  { content: '定期更新防毒軟件可以預防電腦病毒入侵。', answer: 1 },
  { content: '身份證號碼不是要小心保護的個人資料。', answer: 0 },
  { content: '我們可以隨意在社交網站上分享生活點滴，例如上載學生證、透露同學的姓名。', answer: 0 },
  { content: '我們收到訊息後應該先查證，確認訊息真確才轉發給別人。', answer: 1 },
  { content: '我們使用互聯網時，要避免披露個人資料。', answer: 1 },
  { content: '我們要提高警覺，做好預防措施，提升網絡安全。', answer: 1 },
  { content: '在使用互聯網時，不隨便與陌生人接觸，是保障私隱的方法之一。', answer: 1 },
  { content: '把別人的文章當作自己的作品發表，是正確的行為。', answer: 0 },
  { content: '人們可以在政府部門的社交網站專頁留言，表達意見。', answer: 1 },
  { content: '網上購物雖然很方便，但我們也不應過度消費。', answer: 1 },
  { content: '認清個人的需要才決定購物，是精明的做法。', answer: 1 },
];

async function seed() {
  const pool = await mysql.createPool(process.env.DATABASE_URL);
  const db = drizzle(pool);

  try {
    for (const q of questions) {
      await db.insert(trueOrFalseQuestions).values({
        content: q.content,
        correctAnswer: q.answer,
        category: 'unit_8',
        subject: 'people',
        grade: 4,
      });
    }
    console.log(`✅ 已成功匯入 ${questions.length} 題單元八判斷題`);
  } catch (error) {
    console.error('❌ 匯入失敗:', error.message);
  } finally {
    await pool.end();
  }
}

seed();
