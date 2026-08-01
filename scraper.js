const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

class WebScraper {
  constructor() {
    this.proxies = require('./proxies.json');
  }

  // Get random proxy for rotation
  getRandomProxy() {
    if (this.proxies.length === 0) return null;
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }

  // Delay function to avoid overwhelming servers
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check robots.txt (basic implementation)
  async checkRobotsTxt(baseUrl) {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const response = await axios.get(robotsUrl, { timeout: 5000 });
      console.log('🤖 robots.txt found:', robotsUrl);
      return response.data;
    } catch (error) {
      console.log('⚠️  No robots.txt found or unable to fetch');
      return null;
    }
  }

  // Scrape with Puppeteer (for dynamic content)
  async scrapeWithPuppeteer(url, options = {}) {
    const {
      headless = true,
      delayMs = 2000,
      useProxy = false,
      waitForSelector = null
    } = options;

    let browser;
    try {
      const launchOptions = {
        headless: headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };

      // Add proxy if requested
      if (useProxy) {
        const proxy = this.getRandomProxy();
        if (proxy) {
          launchOptions.args.push(`--proxy-server=${proxy.ip}:${proxy.port}`);
        }
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // Implement delay before request
      await this.delay(1000);

      console.log(`🌐 Navigating to: ${url}`);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Wait for additional content if selector specified
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      }

      // Additional delay for dynamic content
      await this.delay(delayMs);

      // Extract data from the page
      const data = await page.evaluate(() => {
        const extractText = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.textContent.trim() : null;
        };

        const extractAttributes = (selector, attributes) => {
          const elements = Array.from(document.querySelectorAll(selector));
          return elements.map(el => {
            const obj = {};
            attributes.forEach(attr => {
              obj[attr] = el[attr];
            });
            return obj;
          });
        };

        return {
          title: document.title,
          url: window.location.href,
          headings: {
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
            h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim())
          },
          links: extractAttributes('a[href]', ['href', 'textContent']),
          images: extractAttributes('img', ['src', 'alt', 'title']),
          meta: {
            description: extractText('meta[name="description"]') || 
                         extractText('meta[property="og:description"]'),
            keywords: extractText('meta[name="keywords"]')
          },
          content: {
            text: document.body.innerText.substring(0, 1000) + '...' // First 1000 chars
          }
        };
      });

      return data;

    } catch (error) {
      throw new Error(`Puppeteer scraping failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Scrape with Cheerio (for static content)
  async scrapeWithCheerio(url, options = {}) {
    const { useProxy = false } = options;

    try {
      const config = {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        }
      };

      // Add proxy if requested
      if (useProxy) {
        const proxy = this.getRandomProxy();
        if (proxy) {
          config.proxy = {
            host: proxy.ip,
            port: proxy.port
          };
        }
      }

      // Implement delay
      await this.delay(1000);

      console.log(`📡 Fetching: ${url}`);
      const response = await axios.get(url, config);
      const $ = cheerio.load(response.data);

      // Extract data
      const data = {
        title: $('title').text(),
        url: url,
        headings: {
          h1: $('h1').map((i, el) => $(el).text().trim()).get(),
          h2: $('h2').map((i, el) => $(el).text().trim()).get(),
          h3: $('h3').map((i, el) => $(el).text().trim()).get()
        },
        links: $('a[href]').map((i, el) => ({
          href: $(el).attr('href'),
          text: $(el).text().trim()
        })).get(),
        images: $('img').map((i, el) => ({
          src: $(el).attr('src'),
          alt: $(el).attr('alt'),
          title: $(el).attr('title')
        })).get(),
        meta: {
          description: $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content'),
          keywords: $('meta[name="keywords"]').attr('content')
        },
        content: {
          text: $('body').text().replace(/\s+/g, ' ').substring(0, 1000) + '...'
        }
      };

      return data;

    } catch (error) {
      throw new Error(`Cheerio scraping failed: ${error.message}`);
    }
  }
}

module.exports = new WebScraper();