const puppeteer = require('puppeteer');
const { execSync, spawn } = require('child_process');

describe('App UI', () => {
  let browser;
  let page;
  let chromeProcess;

  beforeAll(async () => {
    console.log('Starting Chrome with debug...');
    try {
      const chromePort = 9222;
      // Убиваем существующие процессы Chrome
      try {
        execSync('pkill -f "chrome --headless.*9222"');
        console.log('Killed existing Chrome processes on port 9222');
      } catch (error) {
        console.log('No Chrome processes to kill:', error.message);
      }
      console.log('Launching Chrome...');
      try {
        // Проверяем версию Chrome
        const chromeVersion = execSync('google-chrome --version', { stdio: 'pipe' }).toString();
        console.log('Chrome version:', chromeVersion.trim());
        // Запускаем Chrome асинхронно
        chromeProcess = spawn('google-chrome', [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          `--remote-debugging-port=${chromePort}`,
          '--disable-dev-shm-usage',
          '--enable-logging=stderr',
          '--v=1',
        ]);
        console.log('Chrome process spawned, PID:', chromeProcess.pid);
        // Перенаправляем логи Chrome в консоль
        chromeProcess.stdout.on('data', (data) => {
          console.log('Chrome stdout:', data.toString());
        });
        chromeProcess.stderr.on('data', (data) => {
          console.log('Chrome stderr:', data.toString());
        });
        chromeProcess.on('error', (error) => {
          console.error('Chrome process error:', error);
        });
      } catch (error) {
        console.error('Failed to start Chrome:', error);
        throw error;
      }
      // Ждем, чтобы Chrome успел запуститься
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('Connecting to Chrome...');
      browser = await puppeteer.connect({
        browserURL: `http://localhost:${chromePort}`,
        defaultViewport: { width: 1280, height: 720 },
      });
      console.log('Connected to Chrome');
      page = await browser.newPage();
      console.log('New page created');
    } catch (error) {
      console.error('Failed to launch Puppeteer:', error);
      throw error;
    }
  }, 90000);

  afterAll(async () => {
    if (browser) {
      console.log('Closing browser...');
      try {
        await browser.close();
        console.log('Browser closed');
      } catch (error) {
        console.error('Failed to close browser:', error);
      }
    }
    if (chromeProcess) {
      console.log('Cleaning up Chrome process...');
      try {
        // Закрываем обработчики событий
        chromeProcess.stdout.removeAllListeners();
        chromeProcess.stderr.removeAllListeners();
        chromeProcess.removeAllListeners();
        // Принудительно завершаем процесс
        chromeProcess.kill('SIGTERM');
        console.log('Chrome process terminated');
        // Убедимся, что все процессы Chrome завершены
        try {
          execSync('pkill -f "chrome --headless"');
          console.log('Remaining Chrome processes killed');
        } catch (error) {
          console.log('No remaining Chrome processes to kill:', error.message);
        }
      } catch (error) {
        console.error('Failed to clean up Chrome process:', error);
      }
    }
  }, 45000);

  test('сохраняет скриншот главной страницы', async () => {
    console.log('Navigating to http://217.114.10.226...');
    await page.goto('http://217.114.10.226', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'main-page-screenshot.png' });
    console.log('Checking title...');
    const title = await page.$eval('h1.title', el => el.textContent);
    expect(title).toBe('RMS - Система голосования');
  }, 60000);

  test('сохраняет snapshot HTML главной страницы', async () => {
    console.log('Navigating to http://217.114.10.226 for snapshot...');
    await page.goto('http://217.114.10.226', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Capturing HTML snapshot...');
    const html = await page.content();
    expect(html).toMatchSnapshot();
  }, 60000);
});