import puppeteer, { Browser, Page } from 'puppeteer';
import { JobData } from './JobScraper';
import ProfileService, { UserProfile } from './ProfileService';
import AuthService from './AuthService';

export interface ApplicationResult {
    jobId: string;
    jobTitle: string;
    company: string;
    status: 'success' | 'failed' | 'skipped';
    reason?: string;
    appliedAt: Date;
    applicationMethod: 'easy_apply' | 'external' | 'form_fill';
}

export interface AutoApplySettings {
    maxApplicationsPerDay: number;
    onlyEasyApply: boolean;
    skipAppliedJobs: boolean;
    customAnswers: { [question: string]: string };
    delayBetweenApps: number; // секунды
}

class AutoApplyService {
    private browser: Browser | null = null;
    private profileService: ProfileService;
    private authService: AuthService;
    private appliedJobs: Set<string> = new Set(); // Трекинг поданных заявок

    constructor() {
        this.profileService = new ProfileService();
        this.authService = new AuthService();
    }

    async init(userEmail?: string): Promise<void> {
        console.log('🤖 Запускаем Auto Apply с авторизацией...');

        if (userEmail) {
            this.browser = await this.authService.initBrowser(userEmail);
        } else {
            this.browser = await puppeteer.launch({
                headless: false,
                defaultViewport: { width: 1280, height: 720 },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                ],
            });
        }

        console.log('✅ Auto Apply браузер готов');
    }

    // В файле src/services/AutoApplyService.ts добавьте этот метод:

    async ensureLinkedInAuth(
        email: string,
        password?: string
    ): Promise<boolean> {
        console.log('🔐 Проверяем авторизацию LinkedIn...');
        return await this.authService.loginToLinkedIn(email, password);
    }

    async close(): Promise<void> {
        await this.authService.close();
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Auto Apply браузер закрыт');
        }
    }

    async applyToJobs(
        jobs: JobData[],
        profile: UserProfile,
        settings: AutoApplySettings
    ): Promise<ApplicationResult[]> {
        if (!this.browser) {
            throw new Error('Браузер не инициализирован');
        }

        console.log(`🎯 Начинаем автоподачу на ${jobs.length} вакансий`);
        const results: ApplicationResult[] = [];
        let applicationsToday = 0;

        for (const job of jobs) {
            // Проверяем лимиты
            if (applicationsToday >= settings.maxApplicationsPerDay) {
                console.log(
                    `⏰ Достигнут дневной лимит: ${settings.maxApplicationsPerDay} заявок`
                );
                break;
            }

            // Пропускаем уже поданные заявки
            if (settings.skipAppliedJobs && this.appliedJobs.has(job.id)) {
                results.push({
                    jobId: job.id,
                    jobTitle: job.title,
                    company: job.company,
                    status: 'skipped',
                    reason: 'Уже подавали заявку',
                    appliedAt: new Date(),
                    applicationMethod: 'easy_apply',
                });
                continue;
            }

            // Пропускаем не Easy Apply если настройка включена
            if (settings.onlyEasyApply && !job.isEasyApply) {
                results.push({
                    jobId: job.id,
                    jobTitle: job.title,
                    company: job.company,
                    status: 'skipped',
                    reason: 'Не Easy Apply',
                    appliedAt: new Date(),
                    applicationMethod: 'external',
                });
                continue;
            }

            console.log(`📝 Подаем заявку: ${job.title} в ${job.company}`);

            try {
                const result = await this.applyToSingleJob(
                    job,
                    profile,
                    settings
                );
                results.push(result);

                if (result.status === 'success') {
                    applicationsToday++;
                    this.appliedJobs.add(job.id);
                }

                // Задержка между заявками (имитируем человеческое поведение)
                await this.randomDelay(settings.delayBetweenApps);
            } catch (error) {
                console.error(
                    `❌ Ошибка при подаче заявки на ${job.title}:`,
                    error
                );
                results.push({
                    jobId: job.id,
                    jobTitle: job.title,
                    company: job.company,
                    status: 'failed',
                    reason: `Ошибка: ${error}`,
                    appliedAt: new Date(),
                    applicationMethod: 'easy_apply',
                });
            }
        }

        console.log(
            `✅ Завершено! Подано ${applicationsToday} заявок из ${jobs.length}`
        );
        return results;
    }

    private async applyToSingleJob(
        job: JobData,
        profile: UserProfile,
        settings: AutoApplySettings
    ): Promise<ApplicationResult> {
        const page = await this.browser!.newPage();

        try {
            // Переходим на страницу вакансии
            await page.goto(job.url, { waitUntil: 'networkidle2' });

            // Определяем тип подачи заявки
            // ИСПРАВЛЕНИЕ: Добавьте Indeed
            if (job.platform === 'linkedin') {
                return await this.applyLinkedIn(page, job, profile, settings);
            } else if (job.platform === 'indeed') {
                // ДОБАВИТЬ
                return await this.applyIndeed(page, job, profile, settings); // ДОБАВИТЬ
            } else {
                return await this.applyExternal(page, job, profile, settings);
            }
        } finally {
            await page.close();
        }
    }

    private async applyLinkedIn(
        page: Page,
        job: JobData,
        profile: UserProfile,
        settings: AutoApplySettings
    ): Promise<ApplicationResult> {
        // Ищем кнопку Easy Apply
        const easyApplyButton = await page.$('.jobs-apply-button--top-card');

        if (!easyApplyButton) {
            return {
                jobId: job.id,
                jobTitle: job.title,
                company: job.company,
                status: 'failed',
                reason: 'Easy Apply кнопка не найдена',
                appliedAt: new Date(),
                applicationMethod: 'easy_apply',
            };
        }

        // Кликаем Easy Apply
        await easyApplyButton.click();
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Заполняем форму
        await this.fillLinkedInForm(page, profile, settings);

        // Подтверждаем отправку
        const submitButton = await page.$(
            'button[aria-label="Submit application"]'
        );
        if (submitButton) {
            await submitButton.click();
            await new Promise((resolve) => setTimeout(resolve, 3000));

            return {
                jobId: job.id,
                jobTitle: job.title,
                company: job.company,
                status: 'success',
                reason: 'Заявка подана через Easy Apply',
                appliedAt: new Date(),
                applicationMethod: 'easy_apply',
            };
        }

        return {
            jobId: job.id,
            jobTitle: job.title,
            company: job.company,
            status: 'failed',
            reason: 'Не удалось найти кнопку отправки',
            appliedAt: new Date(),
            applicationMethod: 'easy_apply',
        };
    }

    private async applyIndeed(
        page: Page,
        job: JobData,
        profile: UserProfile,
        settings: AutoApplySettings
    ): Promise<ApplicationResult> {
        console.log('📝 Подача заявки на Indeed...');

        // Симуляция подачи заявки для теста
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return {
            jobId: job.id,
            jobTitle: job.title,
            company: job.company,
            status: 'success',
            reason: 'Заявка подана на Indeed (тест)',
            appliedAt: new Date(),
            applicationMethod: 'easy_apply',
        };
    }

    private async fillLinkedInForm(
        page: Page,
        profile: UserProfile,
        settings: AutoApplySettings
    ): Promise<void> {
        // Заполняем поля формы
        const fields = {
            'input[name="phoneNumber"]': profile.phone,
            'textarea[name="coverLetter"]':
                this.profileService.generateCoverLetter(
                    profile,
                    'Software Engineer', // Получим из job данных
                    'Company' // Получим из job данных
                ),
        };

        for (const [selector, value] of Object.entries(fields)) {
            const field = await page.$(selector);
            if (field && value) {
                await field.evaluate((el: any) => (el.value = ''));
                await field.type(value, { delay: 100 });
            }
        }

        // Обрабатываем кастомные вопросы
        for (const [question, answer] of Object.entries(
            settings.customAnswers
        )) {
            const questionElement = await page.$(`text=${question}`);
            if (questionElement) {
                const answerField = await questionElement.$(
                    'xpath=../following-sibling::*//input | ../following-sibling::*//textarea'
                );
                if (answerField) {
                    await answerField.type(answer, { delay: 100 });
                }
            }
        }
    }

    private async applyExternal(
        page: Page,
        job: JobData,
        profile: UserProfile,
        settings: AutoApplySettings
    ): Promise<ApplicationResult> {
        // Логика для внешних сайтов (Glassdoor, Dice, Monster)
        console.log(`🔗 Внешняя подача заявки: ${job.platform}`);

        return {
            jobId: job.id,
            jobTitle: job.title,
            company: job.company,
            status: 'skipped',
            reason: 'Внешние сайты пока не поддерживаются',
            appliedAt: new Date(),
            applicationMethod: 'external',
        };
    }

    private async randomDelay(baseSeconds: number): Promise<void> {
        const delay = (baseSeconds + Math.random() * 5) * 1000; // +0-5 сек случайно
        console.log(`⏳ Пауза ${Math.round(delay / 1000)} секунд...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    getApplicationStats(): { total: number; today: number } {
        return {
            total: this.appliedJobs.size,
            today: this.appliedJobs.size, // Упрощенно, в реальности считали бы по дате
        };
    }
}

export default AutoApplyService;
