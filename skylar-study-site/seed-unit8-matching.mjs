// 列印 SQL 插入語句到 stdout，由 webdev_execute_sql 執行
import { unit8Questions } from './unit8_matching_data.ts';

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

const rows = unit8Questions.map((q) => {
  const left = JSON.stringify(q.leftItems);
  const right = JSON.stringify(q.rightItems);
  const ans = JSON.stringify(q.correctAnswer);
  return `(8, '${escapeStr(q.question)}', '${escapeStr(left)}', '${escapeStr(right)}', '${escapeStr(ans)}', 'people', 4)`;
});

const sql = `INSERT INTO matching_questions (unit_id, question, left_items, right_items, correct_answer, subject, grade) VALUES\n${rows.join(',\n')};`;

console.log(sql);
