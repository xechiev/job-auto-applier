import { Router } from 'express';

const router = Router();

// Временный массив вместо БД
const users: any[] = [];

router.post('/register', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email и пароль обязательны'
    });
  }
  
  // Проверяем, есть ли уже такой пользователь
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Пользователь уже существует'
    });
  }
  
  // Создаем пользователя
  const newUser = { 
    id: users.length + 1, 
    email, 
    password 
  };
  users.push(newUser);
  
  res.status(201).json({
    success: true,
    message: 'Пользователь создан',
    user: { id: newUser.id, email: newUser.email }
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email и пароль обязательны'
    });
  }
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    res.json({
      success: true,
      message: 'Успешный вход',
      user: { id: user.id, email: user.email }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Неверный email или пароль'
    });
  }
});

export default router;