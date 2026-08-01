const express = require('express');
const cors = require('cors');
const scraper = require('./scraper');
const enhancedScraper = require('./enhanced-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Basic scraping API endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url, method, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let data;
    
    if (method === 'puppeteer' || options.dynamic) {
      data = await scraper.scrapeWithPuppeteer(url, options);
    } else {
      data = await scraper.scrapeWithCheerio(url, options);
    }

    res.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enhanced scraping API endpoint for protected sites
app.post('/api/scrape-protected', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🛡️ Attempting to scrape protected site: ${url}`);
    
    const data = await enhancedScraper.scrapeProtectedSite(url, options);
    
    res.json({
      success: true,
      data: data,
      method: 'enhanced',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enhanced scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      suggestion: 'Try using a different method or check if the website is accessible'
    });
  }
});

// Test endpoint to check if scraper works
app.post('/api/test-scraper', async (req, res) => {
  try {
    const testUrls = [
      'https://httpbin.org/html',
      'https://example.com',
      'https://httpbin.org/user-agent'
    ];

    const results = [];
    
    for (const url of testUrls) {
      try {
        const data = await scraper.scrapeWithCheerio(url);
        results.push({
          url,
          status: 'success',
          title: data.title
        });
      } catch (error) {
        results.push({
          url,
          status: 'failed',
          error: error.message
        });
      }
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      success: true,
      results: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/scrape - Basic scraping',
      'POST /api/scrape-protected - Enhanced scraping for protected sites',
      'POST /api/test-scraper - Test scraper functionality',
      'GET  /api/health - Health check'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Web Scraper Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   POST /api/scrape - Basic scraping`);
  console.log(`   POST /api/scrape-protected - Enhanced scraping for protected sites`);
  console.log(`   POST /api/test-scraper - Test scraper functionality`);
  console.log(`   GET  /api/health - Health check`);
});