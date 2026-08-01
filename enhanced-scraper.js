const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class EnhancedScraper {
  constructor() {
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async scrapeProtectedSite(url, options = {}) {
    const {
      useStealth = true,
      waitForSelector = null,
      timeout = 60000
    } = options;

    console.log(`🛡️ Starting enhanced scrape for: ${url}`);

    // Method 1: Try with enhanced Puppeteer first
    try {
      console.log('🚀 Attempting stealth scraping...');
      const data = await this.stealthScrape(url, options);
      return data;
    } catch (error) {
      console.log('❌ Stealth method failed:', error.message);
    }

    // Method 2: Try with basic method as fallback
    try {
      console.log('🔄 Trying basic method...');
      const basicScraper = require('./scraper');
      const data = await basicScraper.scrapeWithPuppeteer(url, options);
      return data;
    } catch (error) {
      console.log('❌ Basic method failed:', error.message);
    }

    throw new Error('All scraping methods failed. The website might be heavily protected.');
  }

  async stealthScrape(url, options) {
    const browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--lang=en-US,en' // Set language
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set viewport to look more human
      await page.setViewport({ width: 1366, height: 768 });
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // Remove automation indicators
      await page.evaluateOnNewDocument(() => {
        // Override webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
      });

      console.log(`🌐 Navigating to protected site: ${url}`);
      
      // Add random delay before navigation
      await this.delay(Math.random() * 2000 + 1000);
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: options.timeout || 60000 
      });

      // Check if we got blocked
      const pageTitle = await page.title();
      const pageContent = await page.content();
      
      if (pageTitle.includes('403') || 
          pageTitle.includes('Forbidden') || 
          pageTitle.includes('Access Denied') ||
          pageContent.includes('403') ||
          pageContent.includes('Forbidden')) {
        throw new Error('Website returned 403 Forbidden - Access blocked');
      }

      // Wait for specific element if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }

      // Add random delay to mimic human behavior
      await this.delay(Math.random() * 3000 + 1000);

      // Extract data
      const data = await page.evaluate(() => {
        const extractText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };

        const extractAllText = (selector) => {
          const elements = Array.from(document.querySelectorAll(selector));
          return elements.map(el => el.textContent.trim());
        };

        return {
          title: document.title,
          url: window.location.href,
          content: document.body.innerText.substring(0, 2000) + '...',
          headings: {
            h1: extractAllText('h1'),
            h2: extractAllText('h2'),
            h3: extractAllText('h3')
          },
          links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
            href: a.href,
            text: a.textContent.trim()
          })).slice(0, 10), // First 10 links
          success: true
        };
      });

      console.log('✅ Successfully scraped protected site');
      return data;

    } catch (error) {
      console.error('❌ Stealth scraping failed:', error.message);
      throw error;
    } finally {
      await browser.close();
    }
  }

  // Simple delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to test if a website is accessible
  async testWebsiteAccess(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      return {
        accessible: true,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      return {
        accessible: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }
}

module.exports = new EnhancedScraper();