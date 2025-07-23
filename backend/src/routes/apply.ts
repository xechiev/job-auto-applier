import { Router, Request, Response } from 'express';
import JobScraper, { SearchCriteria } from '../services/JobScraper';
import AutoApplyService, {
    AutoApplySettings,
} from '../services/AutoApplyService';
import ProfileService, { UserProfile } from '../services/ProfileService';
import AuthService from '../services/AuthService';

const router = Router();
const globalProfileService = new ProfileService();

// In-memory хранилище для заявок и статистики
const applicationHistory: any[] = [];
const userStats = new Map<string, any>();

// POST /api/apply/profile - Создание/обновление профиля
router.post('/profile', async (req: Request, res: Response) => {
    try {
        const profileData = req.body;
        const profile = await globalProfileService.createProfile(profileData);

        // Инициализируем статистику для нового пользователя
        userStats.set(profile.id, {
            totalApplications: 0,
            successfulApplications: 0,
            applicationsThisWeek: 0,
            applicationsThisMonth: 0,
            lastApplicationDate: null,
            platformStats: {},
            companyStats: {},
        });

        res.status(201).json({
            success: true,
            message: 'Профиль создан',
            profile: {
                id: profile.id,
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
            },
        });
    } catch (error) {
        console.error('Ошибка создания профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка создания профиля',
        });
    }
});

// GET /api/apply/profile/:id - Получение профиля
router.get('/profile/:id', async (req: Request, res: Response) => {
    try {
        const profile = await globalProfileService.getProfile(req.params.id);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден',
            });
        }

        // Добавляем статистику к профилю
        const stats = userStats.get(req.params.id) || {
            totalApplications: 0,
            successfulApplications: 0,
            applicationsThisWeek: 0,
            applicationsThisMonth: 0,
        };

        res.json({
            success: true,
            profile: {
                ...profile,
                stats,
            },
        });
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения профиля',
        });
    }
});

// GET /api/apply/applications/:userId - История заявок пользователя
router.get('/applications/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0, status, platform } = req.query;

        let userApplications = applicationHistory.filter(
            (app) => app.userId === userId
        );

        // Фильтрация по статусу
        if (status) {
            userApplications = userApplications.filter(
                (app) => app.status === status
            );
        }

        // Фильтрация по платформе
        if (platform) {
            userApplications = userApplications.filter(
                (app) => app.platform === platform
            );
        }

        // Пагинация
        const total = userApplications.length;
        const applications = userApplications.slice(
            Number(offset),
            Number(offset) + Number(limit)
        );

        res.json({
            success: true,
            applications,
            total,
            limit: Number(limit),
            offset: Number(offset),
        });
    } catch (error) {
        console.error('Ошибка получения истории заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения истории заявок',
        });
    }
});

// GET /api/apply/stats/:userId - Статистика пользователя
router.get('/stats/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const stats = userStats.get(userId);

        if (!stats) {
            return res.status(404).json({
                success: false,
                message: 'Статистика не найдена',
            });
        }

        // Расширенная аналитика
        const userApplications = applicationHistory.filter(
            (app) => app.userId === userId
        );
        const platformBreakdown: Record<string, number> = {};
        const statusBreakdown: Record<string, number> = {};
        const companyBreakdown: Record<string, number> = {};

        userApplications.forEach((app) => {
            // По платформам
            platformBreakdown[app.platform] =
                (platformBreakdown[app.platform] || 0) + 1;

            // По статусам
            statusBreakdown[app.applicationResult] =
                (statusBreakdown[app.applicationResult] || 0) + 1;

            // По компаниям
            companyBreakdown[app.company] =
                (companyBreakdown[app.company] || 0) + 1;
        });

        res.json({
            success: true,
            stats: {
                ...stats,
                platformBreakdown,
                statusBreakdown,
                companyBreakdown,
                successRate:
                    stats.totalApplications > 0
                        ? (
                              (stats.successfulApplications /
                                  stats.totalApplications) *
                              100
                          ).toFixed(1)
                        : 0,
            },
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статистики',
        });
    }
});

// POST /api/apply/start - Запуск автоматической подачи заявок
router.post('/start', async (req: Request, res: Response) => {
    try {
        const { searchCriteria, settings, credentials, profileId } = req.body;

        // Используем profileId если передан, иначе создаем тестовый профиль
        let profile;
        let userId;

        if (profileId) {
            profile = await globalProfileService.getProfile(profileId);
            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: 'Профиль не найден',
                });
            }
            userId = profileId;
        } else {
            // Создаем тестовый профиль
            profile = {
                id: `temp-profile-${Date.now()}`,
                email: credentials?.email || 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+1234567890',
                location: 'New York, NY',
                resume: {
                    summary: 'Experienced software engineer',
                    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
                    experience: [],
                    education: [],
                },
                jobPreferences: {
                    desiredRoles: ['Software Engineer'],
                    preferredLocations: ['Remote'],
                    salaryRange: { min: 80000, max: 150000 },
                    workType: 'any' as const,
                    experienceLevel: 'mid' as const,
                },
                applicationData: {
                    coverLetterTemplate:
                        'Dear Hiring Manager, I am interested in this position...',
                    availableStartDate: '2 weeks',
                    sponsorshipRequired: false,
                },
            };
            userId = profile.id;

            // Инициализируем статистику для временного пользователя
            if (!userStats.has(userId)) {
                userStats.set(userId, {
                    totalApplications: 0,
                    successfulApplications: 0,
                    applicationsThisWeek: 0,
                    applicationsThisMonth: 0,
                    lastApplicationDate: null,
                });
            }
        }

        // Настройки по умолчанию
        const applySettings: AutoApplySettings = {
            maxApplicationsPerDay: settings?.maxApplicationsPerDay || 2,
            onlyEasyApply: settings?.onlyEasyApply ?? true,
            skipAppliedJobs: settings?.skipAppliedJobs ?? true,
            customAnswers: settings?.customAnswers || {},
            delayBetweenApps: settings?.delayBetweenApps || 30,
        };

        // Инициализируем Auto Apply
        const autoApply = new AutoApplyService();
        await autoApply.init(credentials?.email);

        // Авторизация только если есть credentials
        if (credentials?.email && searchCriteria.platform === 'linkedin') {
            console.log('🔐 Начинаем авторизацию...');
            const isAuthorized = await autoApply.ensureLinkedInAuth(
                credentials.email,
                credentials.password
            );

            if (!isAuthorized) {
                await autoApply.close();
                return res.status(401).json({
                    success: false,
                    message: 'Не удалось авторизоваться в LinkedIn',
                });
            }
        }

        // Поиск вакансий
        console.log('🔍 Ищем вакансии...');
        const scraper = new JobScraper();
        await scraper.init();

        const targetPlatform = searchCriteria.platform || 'indeed';
        let jobs: any[] = [];

        switch (targetPlatform) {
            case 'indeed':
                jobs = await scraper.scrapeIndeed(searchCriteria);
                break;
            case 'linkedin':
                jobs = await scraper.scrapeLinkedIn(searchCriteria);
                break;
            case 'glassdoor':
                jobs = await scraper.scrapeGlassdoor(searchCriteria);
                break;
            default:
                jobs = await scraper.scrapeIndeed(searchCriteria);
        }

        await scraper.close();

        if (jobs.length === 0) {
            await autoApply.close();
            return res.json({
                success: true,
                message: 'Вакансии не найдены',
                stats: { jobsFound: 0, applicationsSubmitted: 0 },
            });
        }

        // Фильтрация уже поданных заявок
        if (applySettings.skipAppliedJobs) {
            const appliedJobUrls = new Set(
                applicationHistory
                    .filter((app) => app.userId === userId)
                    .map((app) => app.jobUrl)
            );

            jobs = jobs.filter((job) => !appliedJobUrls.has(job.url));
            console.log(
                `🔄 После фильтрации дубликатов осталось ${jobs.length} вакансий`
            );
        }

        // Подача заявок
        console.log('🤖 Начинаем автоподачу...');
        const results = await autoApply.applyToJobs(
            jobs,
            profile as any,
            applySettings
        );
        await autoApply.close();

        // Сохранение результатов в историю
        const currentTime = new Date();
        const stats = userStats.get(userId) || {
            totalApplications: 0,
            successfulApplications: 0,
            applicationsThisWeek: 0,
            applicationsThisMonth: 0,
        };

        results.forEach((result) => {
            // Добавляем в историю
            applicationHistory.push({
                userId,
                jobId: result.jobId,
                jobTitle: result.jobTitle,
                company: result.company,
                platform: targetPlatform,
                jobUrl: jobs.find((j) => j.id === result.jobId)?.url || '',
                status: result.status === 'success' ? 'submitted' : 'failed',
                applicationResult: result.status,
                applicationMethod: result.applicationMethod,
                failureReason: result.reason,
                appliedAt: result.appliedAt,
                coverLetter: globalProfileService.generateCoverLetter(
                    profile,
                    result.jobTitle,
                    result.company
                ),
                searchKeywords: searchCriteria.keywords,
                searchLocation: searchCriteria.location,
            });

            // Обновляем статистику
            if (result.status === 'success') {
                stats.totalApplications++;
                stats.successfulApplications++;
                stats.lastApplicationDate = currentTime;
                stats.applicationsThisWeek++;
                stats.applicationsThisMonth++;
            }
        });

        userStats.set(userId, stats);

        // Подготовка ответа
        const responseStats = {
            jobsFound: jobs.length,
            applicationsSubmitted: results.filter((r) => r.status === 'success')
                .length,
            applicationsSkipped: results.filter((r) => r.status === 'skipped')
                .length,
            applicationsFailed: results.filter((r) => r.status === 'failed')
                .length,
        };

        res.json({
            success: true,
            message: `Автоподача завершена. Подано ${responseStats.applicationsSubmitted} заявок`,
            stats: responseStats,
            results: results.slice(0, 10),
            userId, // Возвращаем userId для дальнейшего отслеживания
        });
    } catch (error) {
        console.error('Ошибка автоподачи:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при автоподаче заявок',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// GET /api/apply/auth-status/:email/:platform - Проверка статуса авторизации
router.get(
    '/auth-status/:email/:platform',
    async (req: Request, res: Response) => {
        try {
            const { email, platform } = req.params;
            const authService = new AuthService();
            const status = await authService.checkAuthStatus(platform, email);

            res.json({
                success: true,
                isAuthenticated: !!status,
                lastLogin: status?.lastLogin,
                platform,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Ошибка проверки авторизации',
            });
        }
    }
);

// DELETE /api/apply/applications/:applicationId - Удаление заявки из истории
router.delete(
    '/applications/:applicationId',
    async (req: Request, res: Response) => {
        try {
            const { applicationId } = req.params;
            const { userId } = req.body;

            const index = applicationHistory.findIndex(
                (app) => app.jobId === applicationId && app.userId === userId
            );

            if (index === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Заявка не найдена',
                });
            }

            applicationHistory.splice(index, 1);

            res.json({
                success: true,
                message: 'Заявка удалена из истории',
            });
        } catch (error) {
            console.error('Ошибка удаления заявки:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка удаления заявки',
            });
        }
    }
);

// GET /api/apply/test - Тест API
router.get('/test', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Auto Apply API работает',
        endpoints: [
            'POST /api/apply/profile - Создать профиль',
            'GET /api/apply/profile/:id - Получить профиль',
            'POST /api/apply/start - Запустить автоподачу',
            'GET /api/apply/applications/:userId - История заявок',
            'GET /api/apply/stats/:userId - Статистика пользователя',
            'DELETE /api/apply/applications/:applicationId - Удалить заявку',
            'GET /api/apply/auth-status/:email/:platform - Статус авторизации',
        ],
        inMemoryData: {
            profiles: globalProfileService.getProfilesCount?.() || 'N/A',
            applications: applicationHistory.length,
            users: userStats.size,
        },
    });
});

export default router;
