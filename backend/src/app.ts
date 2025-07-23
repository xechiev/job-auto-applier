import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import applyRoutes from './routes/apply';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes); // Подключаем jobs routes
app.use('/api/apply', applyRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'Job Auto Applier API работает!',
        version: '1.0.0',
        endpoints: [
            'GET /',
            'GET /api/jobs/test',
            'GET /api/jobs/search',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/apply/test',
            'POST /api/apply/profile',
            'POST /api/apply/start',
        ],
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API endpoint работает!',
    });
});

export default app;
