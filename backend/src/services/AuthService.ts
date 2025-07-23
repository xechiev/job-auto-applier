import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';

export interface PlatformCredentials {
    email: string;
    password: string;
    platform: 'linkedin' | 'glassdoor' | 'dice' | 'monster';
}

export interface AuthSession {
    platform: string;
    email: string;
    cookies: any[];
    lastLogin: Date;
    isValid: boolean;
}

class AuthService {
    private sessionsDir = './browser-sessions';
    private browser: Browser | null = null;

    constructor() {
        // Создаем папку для сессий
        fs.ensureDirSync(this.sessionsDir);
    }

    async initBrowser(userEmail: string): Promise<Browser> {
        const userDataDir = path.join(
            this.sessionsDir,
            this.sanitizeEmail(userEmail)
        );

        console.log('🚀 Запускаем браузер с сохранением сессии...');

        this.browser = await puppeteer.launch({
            headless: false, // Показываем браузер для логина
            defaultViewport: { width: 1280, height: 720 },
            userDataDir, // Сохраняем сессию пользователя
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ],
        });

        return this.browser;
    }

    async loginToLinkedIn(email: string, password?: string): Promise<boolean> {
        if (!this.browser) {
            throw new Error('Браузер не инициализирован');
        }

        const page = await this.browser.newPage();

        try {
            console.log('🔐 Проверяем LinkedIn авторизацию...');

            // Переходим на LinkedIn
            await page.goto('https://www.linkedin.com/feed/', {
                waitUntil: 'domcontentloaded',
                timeout: 60000,
            });

            // Проверяем, уже залогинены ли мы
            const isLoggedIn = await this.checkLinkedInAuth(page);

            if (isLoggedIn) {
                console.log('✅ Уже авторизованы в LinkedIn!');
                await page.close();
                return true;
            }

            console.log('🔑 Требуется авторизация в LinkedIn...');

            // Если есть пароль - пробуем автоматический логин
            if (password) {
                return await this.autoLoginLinkedIn(page, email, password);
            } else {
                return await this.manualLoginLinkedIn(page, email);
            }
        } catch (error) {
            console.error('❌ Ошибка при авторизации в LinkedIn:', error);
            await page.close();
            return false;
        }
    }

    private async checkLinkedInAuth(page: Page): Promise<boolean> {
        try {
            // Ждем загрузки и проверяем наличие элементов профиля
            await new Promise((resolve) => setTimeout(resolve, 3000));

            const authSelectors = [
                '.global-nav__me',
                '[data-test-global-nav-me]',
                '.nav-item__profile-member-photo',
                '.global-nav__primary-item--profile',
            ];

            for (const selector of authSelectors) {
                const element = await page.$(selector);
                if (element) {
                    console.log(`✅ Найден элемент авторизации: ${selector}`);
                    return true;
                }
            }

            // Проверяем URL - если мы на feed, значит залогинены
            const currentUrl = page.url();
            if (currentUrl.includes('/feed/') || currentUrl.includes('/in/')) {
                console.log('✅ Авторизация подтверждена по URL');
                return true;
            }

            return false;
        } catch (error) {
            console.log('🔍 Не удалось определить статус авторизации');
            return false;
        }
    }

    private async autoLoginLinkedIn(
        page: Page,
        email: string,
        password: string
    ): Promise<boolean> {
        try {
            console.log('🤖 Автоматический логин в LinkedIn...');

            // Переходим на страницу логина
            await page.goto('https://www.linkedin.com/login', {
                waitUntil: 'networkidle2',
            });

            // Заполняем email
            await page.waitForSelector('#username', { timeout: 10000 });
            await page.type('#username', email, { delay: 100 });

            // Заполняем пароль
            await page.waitForSelector('#password', { timeout: 5000 });
            await page.type('#password', password, { delay: 100 });

            // Нажимаем кнопку входа
            await page.click('button[type="submit"]');

            // Ждем перенаправления или ошибки
            await page.waitForNavigation({
                waitUntil: 'networkidle2',
                timeout: 30000,
            });

            // Проверяем успешность логина
            const isLoggedIn = await this.checkLinkedInAuth(page);

            if (isLoggedIn) {
                console.log('✅ Автоматический логин успешен!');
                await this.saveCookies(page, 'linkedin', email);
                await page.close();
                return true;
            } else {
                console.log(
                    '❌ Автоматический логин не удался. Возможно требуется капча или 2FA'
                );
                return await this.manualLoginLinkedIn(page, email);
            }
        } catch (error) {
            console.error('❌ Ошибка автоматического логина:', error);
            return await this.manualLoginLinkedIn(page, email);
        }
    }

    private async manualLoginLinkedIn(
        page: Page,
        email: string
    ): Promise<boolean> {
        try {
            console.log('👤 Ручной логин в LinkedIn...');
            console.log('📋 Инструкции:');
            console.log('   1. Залогиньтесь в открывшемся браузере');
            console.log('   2. Решите капчу если необходимо');
            console.log('   3. Пройдите 2FA если настроена');
            console.log('   4. Дождитесь появления главной страницы');
            console.log('⏳ Ожидаем завершения логина...');

            // Переходим на страницу логина если не там
            const currentUrl = page.url();
            if (!currentUrl.includes('login')) {
                await page.goto('https://www.linkedin.com/login', {
                    waitUntil: 'networkidle2',
                });
            }

            // Предзаполняем email если поле пустое
            try {
                const emailField = await page.$('#username');
                if (emailField) {
                    const emailValue = await page.evaluate(
                        (el: any) => el.value,
                        emailField
                    );
                    if (!emailValue) {
                        await emailField.type(email, { delay: 100 });
                    }
                }
            } catch (e) {
                // Игнорируем ошибки предзаполнения
            }

            // Ждем успешного логина (максимум 5 минут)
            const authCheckInterval = setInterval(async () => {
                const isAuth = await this.checkLinkedInAuth(page);
                if (isAuth) {
                    console.log('✅ Ручной логин завершен успешно!');
                    clearInterval(authCheckInterval);
                }
            }, 5000);

            // Ждем авторизации с таймаутом 5 минут
            let attempts = 0;
            const maxAttempts = 60; // 5 минут при проверке каждые 5 секунд

            while (attempts < maxAttempts) {
                const isLoggedIn = await this.checkLinkedInAuth(page);
                if (isLoggedIn) {
                    clearInterval(authCheckInterval);
                    await this.saveCookies(page, 'linkedin', email);
                    await page.close();
                    return true;
                }

                await new Promise((resolve) => setTimeout(resolve, 5000));
                attempts++;
            }

            console.log('⏰ Время ожидания логина истекло');
            clearInterval(authCheckInterval);
            await page.close();
            return false;
        } catch (error) {
            console.error('❌ Ошибка ручного логина:', error);
            await page.close();
            return false;
        }
    }

    private async saveCookies(
        page: Page,
        platform: string,
        email: string
    ): Promise<void> {
        try {
            const cookies = await page.cookies();
            const session: AuthSession = {
                platform,
                email,
                cookies,
                lastLogin: new Date(),
                isValid: true,
            };

            const sessionFile = path.join(
                this.sessionsDir,
                `${this.sanitizeEmail(email)}_${platform}.json`
            );

            await fs.writeJSON(sessionFile, session, { spaces: 2 });
            console.log(`💾 Сессия ${platform} сохранена для ${email}`);
        } catch (error) {
            console.error('❌ Ошибка сохранения cookies:', error);
        }
    }

    async loadCookies(
        page: Page,
        platform: string,
        email: string
    ): Promise<boolean> {
        try {
            const sessionFile = path.join(
                this.sessionsDir,
                `${this.sanitizeEmail(email)}_${platform}.json`
            );

            if (!(await fs.pathExists(sessionFile))) {
                console.log(`📂 Сессия для ${email} не найдена`);
                return false;
            }

            const session: AuthSession = await fs.readJSON(sessionFile);

            // Проверяем, не устарела ли сессия (7 дней)
            const sessionAge =
                Date.now() - new Date(session.lastLogin).getTime();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней

            if (sessionAge > maxAge) {
                console.log(`⏰ Сессия устарела для ${email}`);
                return false;
            }

            await page.setCookie(...session.cookies);
            console.log(`🍪 Cookies загружены для ${email}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка загрузки cookies:', error);
            return false;
        }
    }

    async checkAuthStatus(
        platform: string,
        email: string
    ): Promise<AuthSession | null> {
        try {
            const sessionFile = path.join(
                this.sessionsDir,
                `${this.sanitizeEmail(email)}_${platform}.json`
            );

            if (!(await fs.pathExists(sessionFile))) {
                return null;
            }

            const session: AuthSession = await fs.readJSON(sessionFile);
            return session;
        } catch (error) {
            return null;
        }
    }

    private sanitizeEmail(email: string): string {
        return email.replace(/[^a-zA-Z0-9]/g, '_');
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Браузер авторизации закрыт');
        }
    }

    // Методы для других платформ (добавим позже)
    async loginToGlassdoor(email: string, password?: string): Promise<boolean> {
        console.log('🔗 Glassdoor авторизация - в разработке');
        return false;
    }

    async loginToDice(email: string, password?: string): Promise<boolean> {
        console.log('🔗 Dice авторизация - в разработке');
        return false;
    }

    async loginToMonster(email: string, password?: string): Promise<boolean> {
        console.log('🔗 Monster авторизация - в разработке');
        return false;
    }
}

export default AuthService;
