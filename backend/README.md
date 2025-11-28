# Instagram Reel Scraper Backend

A production-ready Node.js + Express + Puppeteer backend API for extracting Instagram Reel video URLs in real-time.

## 🚀 Features

- **Real-time video URL extraction** from Instagram Reels, Posts, and IGTV
- **Multiple extraction methods** for maximum reliability
- **Rate limiting** and security middleware
- **CORS support** for frontend integration
- **Error handling** and validation
- **Production-ready** with proper logging and graceful shutdown

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Environment setup:**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000,http://192.168.1.34:3000
```

## 🏃‍♂️ Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001` (or your configured PORT).

## 📡 API Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Instagram Reel Scraper API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Extract Video URL
```
GET /api/reel?url={INSTAGRAM_URL}
```

**Parameters:**
- `url` (required): Instagram Reel/Post/IGTV URL

**Success Response:**
```json
{
  "success": true,
  "videoUrl": "https://scontent.cdninstagram.com/v/...",
  "method": "direct-video-tag"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Video not found"
}
```

### Batch Processing (Optional)
```
POST /api/reel/batch
```

**Body:**
```json
{
  "urls": [
    "https://www.instagram.com/reel/XXXXXXXX/",
    "https://www.instagram.com/reel/YYYYYYYY/"
  ]
}
```

## 🧪 Testing

### Run Test Suite
```bash
npm test
```

### Manual Testing
```bash
# Health check
curl http://localhost:3001/health

# Test with Instagram URL
curl "http://localhost:3001/api/reel?url=https://www.instagram.com/reel/XXXXXXXX/"
```

## 🌐 Frontend Integration

### JavaScript/Fetch
```javascript
async function getVideoUrl(instagramUrl) {
  try {
    const response = await fetch(`http://localhost:3001/api/reel?url=${encodeURIComponent(instagramUrl)}`);
    const data = await response.json();
    
    if (data.success) {
      return data.videoUrl;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching video URL:', error);
    throw error;
  }
}

// Usage
getVideoUrl('https://www.instagram.com/reel/XXXXXXXX/')
  .then(videoUrl => {
    console.log('Video URL:', videoUrl);
    // Use videoUrl in your video player or download
  })
  .catch(error => {
    console.error('Failed to get video URL:', error);
  });
```

### React Hook
```javascript
import { useState, useCallback } from 'react';

export function useInstagramVideo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getVideoUrl = useCallback(async (instagramUrl) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/api/reel?url=${encodeURIComponent(instagramUrl)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.videoUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getVideoUrl, loading, error };
}
```

## 🚀 Deployment

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Railway
1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Render
1. Connect your GitHub repo
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables

### Docker (Optional)
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## ⚙️ Configuration

### Environment Variables
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Allowed CORS origins

### Puppeteer Options
The server uses optimized Puppeteer settings for production:
- Headless mode enabled
- Sandbox disabled for containerized environments
- Memory and CPU optimizations

## 🔒 Security Features

- **Rate limiting**: 100 requests per 15 minutes per IP
- **CORS protection**: Configurable allowed origins
- **Input validation**: URL format validation
- **Error handling**: Sanitized error messages
- **Helmet.js**: Security headers

## 🐛 Troubleshooting

### Common Issues

1. **Puppeteer fails to launch:**
   - Install missing dependencies: `sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget`

2. **Instagram blocks requests:**
   - The API uses multiple extraction methods
   - Rotates user agents and headers
   - Implements delays and retries

3. **CORS errors:**
   - Update `FRONTEND_URL` in `.env`
   - Ensure frontend URL is included in CORS origins

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server logs
3. Test with the provided test script
4. Open an issue with detailed error information