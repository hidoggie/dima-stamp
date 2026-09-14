const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>QR코드 연결을 위한 임시 페이지입니다.</h1><p>나중에 실제 내용으로 업데이트 될 예정입니다.</p>');
});

app.listen(port, () => {
  console.log(`Dummy server is running on port ${port}`);
});