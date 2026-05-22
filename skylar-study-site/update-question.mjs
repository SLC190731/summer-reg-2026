// 這個腳本用於更新題目 17 的錯字
// 需要在瀏覽器控制台中執行以下代碼：

const updateQuestion = async () => {
  try {
    const response = await fetch('/api/trpc/admin.updateQuestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          id: 17,
          content: '宋朝時期，人們為逃避水災從內地遷徙到香港，建立圍村。',
        },
      }),
    });

    const result = await response.json();
    console.log('更新結果:', result);
  } catch (error) {
    console.error('更新失敗:', error);
  }
};

updateQuestion();
