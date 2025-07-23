import app from './app';
import connectDB from './config/database';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const PORT = process.env.PORT || 3001;

// Подключаемся к базе данных
connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📡 API готов к работе`);
});