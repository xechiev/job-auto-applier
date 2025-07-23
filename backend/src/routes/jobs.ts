import { Router, Request, Response } from 'express';
import JobScraper, { SearchCriteria } from '../services/JobScraper';

const router = Router();

// GET /api/jobs/search
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { keywords, location, platform } = req.query;

        if (!keywords || !location) {
            return res.status(400).json({
                success: false,
                message: 'Параметры keywords и location обязательны',
            });
        }

        const criteria: SearchCriteria = {
            keywords: keywords as string,
            location: location as string,
            dateRange: req.query.dateRange as any,
            experienceLevel: req.query.experienceLevel as any,
            jobType: req.query.jobType as any,
        };

        const scraper = new JobScraper();
        await scraper.init();

        let jobs: any[] = [];

        // Определяем, на какой платформе искать
        const targetPlatform = (platform as string) || 'linkedin';

        switch (targetPlatform) {
            case 'linkedin':
                jobs = await scraper.scrapeLinkedIn(criteria);
                break;
            case 'indeed':
                jobs = await scraper.scrapeIndeed(criteria);
                break;
            case 'glassdoor':
                jobs = await scraper.scrapeGlassdoor(criteria);
                break;
            case 'dice':
                jobs = await scraper.scrapeDice(criteria);
                break;
            case 'monster':
                jobs = await scraper.scrapeMonster(criteria);
                break;
            default:
                jobs = await scraper.scrapeLinkedIn(criteria);
        }

        await scraper.close();

        res.json({
            success: true,
            message: `Найдено ${jobs.length} вакансий`,
            platform: targetPlatform,
            criteria,
            jobs,
        });
    } catch (error) {
        console.error('Ошибка поиска вакансий:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при поиске вакансий',
        });
    }
});

// GET /api/jobs/test
router.get('/test', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Jobs API работает',
        availablePlatforms: ['linkedin', 'glassdoor', 'dice', 'monster'],
    });
});

export default router;
