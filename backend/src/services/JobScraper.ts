import puppeteer, { Browser, Page } from 'puppeteer';

export interface JobData {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    salary?: string;
    url: string;
    platform: 'linkedin' | 'glassdoor' | 'dice' | 'monster' | 'indeed';
    isEasyApply: boolean;
    datePosted: string;
}

export interface SearchCriteria {
    keywords: string;
    location: string;
    dateRange?: 'day' | 'week' | 'month';
    experienceLevel?: 'entry' | 'mid' | 'senior';
    jobType?: 'fulltime' | 'parttime' | 'contract';
}

class JobScraper {
    private browser: Browser | null = null;

    async init(): Promise<void> {
        console.log('🚀 Запускаем браузер...');
        this.browser = await puppeteer.launch({
            headless: false, // Показываем браузер для отладки
            defaultViewport: { width: 1280, height: 720 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
            ],
        });
        console.log('✅ Браузер запущен');
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Браузер закрыт');
        }
    }

    async scrapeIndeed(criteria: SearchCriteria): Promise<JobData[]> {
        console.log('🔧 ТЕСТ: Принудительно возвращаем тестовые данные');
        return [
            {
                id: 'indeed_test_1',
                title: 'Frontend Developer - React',
                company: 'Test Tech Company',
                location: 'New York, NY',
                description: 'React, JavaScript, TypeScript developer needed',
                url: 'https://indeed.com/viewjob?jk=test123',
                platform: 'indeed',
                isEasyApply: true,
                datePosted: new Date().toISOString(),
            },
            {
                id: 'indeed_test_2',
                title: 'Senior Frontend Engineer',
                company: 'Startup Inc',
                location: 'New York, NY',
                description: 'Vue.js and React experience required',
                url: 'https://indeed.com/viewjob?jk=test456',
                platform: 'indeed',
                isEasyApply: true,
                datePosted: new Date().toISOString(),
            },
        ];
    }

    async scrapeLinkedIn(criteria: SearchCriteria): Promise<JobData[]> {
        if (!this.browser) {
            throw new Error('Браузер не инициализирован');
        }

        console.log('🔍 Начинаем поиск на LinkedIn...');
        const page = await this.browser.newPage();

        try {
            // Формируем URL для поиска
            const searchUrl = this.buildLinkedInSearchUrl(criteria);
            console.log('📍 URL поиска:', searchUrl);

            // Переходим на страницу поиска
            await page.goto(searchUrl, { waitUntil: 'networkidle2' });

            // Ждем загрузки результатов
            await page.waitForSelector('.job-search-card', { timeout: 10000 });

            // Извлекаем данные о вакансиях
            const jobs = await page.evaluate(() => {
                const jobCards = document.querySelectorAll('.job-search-card');
                const jobs: any[] = [];

                jobCards.forEach((card, index) => {
                    const titleElement = card.querySelector(
                        '.base-search-card__title'
                    );
                    const companyElement = card.querySelector(
                        '.base-search-card__subtitle'
                    );
                    const locationElement = card.querySelector(
                        '.job-search-card__location'
                    );
                    const linkElement = card.querySelector('a');

                    if (
                        titleElement &&
                        companyElement &&
                        locationElement &&
                        linkElement
                    ) {
                        jobs.push({
                            id: `linkedin_${Date.now()}_${index}`,
                            title: titleElement.textContent?.trim() || '',
                            company: companyElement.textContent?.trim() || '',
                            location: locationElement.textContent?.trim() || '',
                            description: 'Описание загружается...',
                            url: linkElement.href,
                            platform: 'linkedin',
                            isEasyApply: true,
                            datePosted: new Date().toISOString(),
                        });
                    }
                });

                return jobs;
            });

            console.log(`✅ Найдено ${jobs.length} вакансий на LinkedIn`);
            return jobs;
        } catch (error) {
            console.error('❌ Ошибка при парсинге LinkedIn:', error);
            return [];
        } finally {
            await page.close();
        }
    }

    private buildLinkedInSearchUrl(criteria: SearchCriteria): string {
        const baseUrl = 'https://www.linkedin.com/jobs/search/';
        const params = new URLSearchParams({
            keywords: criteria.keywords,
            location: criteria.location,
            f_TPR: this.getDateRangeParam(criteria.dateRange),
            f_E: this.getExperienceLevelParam(criteria.experienceLevel),
            f_JT: this.getJobTypeParam(criteria.jobType),
        });

        return `${baseUrl}?${params.toString()}`;
    }

    private getDateRangeParam(dateRange?: string): string {
        switch (dateRange) {
            case 'day':
                return 'r86400';
            case 'week':
                return 'r604800';
            case 'month':
                return 'r2592000';
            default:
                return '';
        }
    }

    private getExperienceLevelParam(level?: string): string {
        switch (level) {
            case 'entry':
                return '1';
            case 'mid':
                return '2';
            case 'senior':
                return '3';
            default:
                return '';
        }
    }

    private getJobTypeParam(type?: string): string {
        switch (type) {
            case 'fulltime':
                return 'F';
            case 'parttime':
                return 'P';
            case 'contract':
                return 'C';
            default:
                return '';
        }
    }

    // Заглушки для других платформ (добавим позже)
    async scrapeGlassdoor(criteria: SearchCriteria): Promise<JobData[]> {
        console.log('🔍 Glassdoor scraping - в разработке');
        return [];
    }

    async scrapeDice(criteria: SearchCriteria): Promise<JobData[]> {
        console.log('🔍 Dice scraping - в разработке');
        return [];
    }

    async scrapeMonster(criteria: SearchCriteria): Promise<JobData[]> {
        console.log('🔍 Monster scraping - в разработке');
        return [];
    }
}

export default JobScraper;
