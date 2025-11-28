const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.1.34:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

app.use('/api', limiter);
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Instagram Reel Scraper API is running',
    timestamp: new Date().toISOString()
  });
});

// Utility function to validate Instagram Reel URL
function validateInstagramUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const patterns = [
    /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/reels\/[\w-]+\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+\/?/
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

// Main API endpoint for extracting Instagram Reel video URL
app.get('/api/reel', async (req, res) => {
  const { url } = req.query;
  let browser = null;

  try {
    // Validate URL parameter
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Missing ?url parameter'
      });
    }

    if (!validateInstagramUrl(url)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Instagram URL. Please provide a valid Reel, Post, or IGTV URL.'
      });
    }

    console.log(`[${new Date().toISOString()}] Processing URL: ${url}`);

    // Launch Puppeteer with optimized settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      timeout: 30000
    });

    const page = await browser.newPage();

    // Set user agent to mimic real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    // Navigate to the Instagram URL
    console.log('Loading Instagram page...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for potential redirects or dynamic content
    await page.waitForTimeout(3000);

    // Try multiple methods to extract video URL
    const videoData = await page.evaluate(() => {
      // Method 1: Direct video tag
      const videoElement = document.querySelector('video');
      if (videoElement && videoElement.src) {
        return {
          videoUrl: videoElement.src,
          method: 'direct-video-tag'
        };
      }

      // Method 2: Video with source tags
      const videoWithSource = document.querySelector('video source');
      if (videoWithSource && videoWithSource.src) {
        return {
          videoUrl: videoWithSource.src,
          method: 'video-source-tag'
        };
      }

      // Method 3: Look for video URLs in script tags
      const scripts = document.querySelectorAll('script');
      for (let script of scripts) {
        const content = script.textContent || script.innerHTML;
        
        // Look for video_url pattern
        const videoUrlMatch = content.match(/"video_url":"([^"]+)"/);
        if (videoUrlMatch) {
          return {
            videoUrl: videoUrlMatch[1].replace(/\\u0026/g, '&'),
            method: 'script-video-url'
          };
        }

        // Look for playback_url pattern
        const playbackMatch = content.match(/"playback_url":"([^"]+)"/);
        if (playbackMatch) {
          return {
            videoUrl: playbackMatch[1].replace(/\\u0026/g, '&'),
            method: 'script-playback-url'
          };
        }

        // Look for src pattern in JSON
        const srcMatch = content.match(/"src":"([^"]+\.mp4[^"]*)"/);
        if (srcMatch) {
          return {
            videoUrl: srcMatch[1].replace(/\\u0026/g, '&'),
            method: 'script-src'
          };
        }
      }

      // Method 4: Look in meta tags
      const ogVideo = document.querySelector('meta[property="og:video"]');
      if (ogVideo && ogVideo.content) {
        return {
          videoUrl: ogVideo.content,
          method: 'og-video-meta'
        };
      }

      const ogVideoSecure = document.querySelector('meta[property="og:video:secure_url"]');
      if (ogVideoSecure && ogVideoSecure.content) {
        return {
          videoUrl: ogVideoSecure.content,
          method: 'og-video-secure-meta'
        };
      }

      return null;
    });

    if (!videoData || !videoData.videoUrl) {
      console.log('Video not found using standard methods, trying alternative approach...');
      
      // Alternative approach: Wait for video to load and try again
      try {
        await page.waitForSelector('video', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const alternativeVideoUrl = await page.evaluate(() => {
          const video = document.querySelector('video');
          return video ? video.src || video.currentSrc : null;
        });

        if (alternativeVideoUrl) {
          console.log(`Video found using alternative method: ${alternativeVideoUrl}`);
          return res.json({
            success: true,
            videoUrl: alternativeVideoUrl,
            method: 'alternative-video-element'
          });
        }
      } catch (waitError) {
        console.log('Alternative method also failed:', waitError.message);
      }

      return res.status(404).json({
        success: false,
        message: 'Video not found. The post may be private, unavailable, or not contain a video.'
      });
    }

    console.log(`Video found using method: ${videoData.method}`);
    console.log(`Video URL: ${videoData.videoUrl}`);

    // Validate the extracted URL
    if (!videoData.videoUrl.startsWith('http')) {
      return res.status(404).json({
        success: false,
        message: 'Invalid video URL extracted'
      });
    }

    res.json({
      success: true,
      videoUrl: videoData.videoUrl,
      method: videoData.method
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    let errorMessage = 'An error occurred while processing the request';
    
    if (error.message.includes('Navigation timeout')) {
      errorMessage = 'Request timed out. The Instagram page took too long to load.';
    } else if (error.message.includes('net::ERR_')) {
      errorMessage = 'Network error. Please check the URL and try again.';
    } else if (error.message.includes('Protocol error')) {
      errorMessage = 'Browser error. Please try again.';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });

  } finally {
    // Always close the browser
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed successfully');
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
});

// Batch processing endpoint (optional)
app.post('/api/reel/batch', async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of URLs'
    });
  }

  if (urls.length > 5) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 5 URLs allowed per batch request'
    });
  }

  const results = [];
  
  for (const url of urls) {
    try {
      // You could implement batch processing here
      // For now, we'll return a placeholder
      results.push({
        url,
        success: false,
        message: 'Batch processing not implemented yet'
      });
    } catch (error) {
      results.push({
        url,
        success: false,
        message: error.message
      });
    }
  }

  res.json({
    success: true,
    results
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Instagram Reel Scraper API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/reel?url=INSTAGRAM_URL`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;