# BizBuySell Scraper Service

A Playwright-based web scraper service designed to extract business listing data from BizBuySell.com. This service is optimized for deployment on Railway and integrates with Supabase for data storage.

## Features

- 🎭 **Playwright Browser Automation**: Bypasses blocking by using a real browser
- 🚀 **Railway-Ready**: Optimized for Railway's container environment
- 🔄 **Auto-Retry Logic**: Handles failures gracefully
- 📊 **Comprehensive Data Extraction**: Extracts all executive summary fields
- 🧠 **Industry Classification**: Optional OpenAI integration for business categorization
- 💾 **Supabase Integration**: Direct database storage support

## Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. Clone the repository and navigate to the scraper service:
```bash
cd scraper-service
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Configure your environment variables:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_key (optional)
PORT=3001
NODE_ENV=development
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Testing the Scraper

Test the health endpoint:
```bash
curl http://localhost:3001/health
```

Test the scraper endpoint:
```bash
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.bizbuysell.com/Business-Opportunity/[listing-id]",
    "dealId": "test-deal-123"
  }'
```

## Railway Deployment

### Step 1: Prepare Your Code

1. Ensure all files are committed to Git:
```bash
git add .
git commit -m "Add BizBuySell scraper service"
git push origin main
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will automatically detect Node.js and start deployment

### Step 3: Configure Environment Variables

In the Railway dashboard, add these environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ |
| `FRONTEND_URL` | Your frontend URL (for CORS) | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for industry classification | ❌ |
| `NODE_ENV` | Set to `production` | ✅ |

### Step 4: Generate Public Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. You'll receive a URL like: `scraper-service-production.up.railway.app`

### Step 5: Update Supabase Edge Function

Add the Railway URL to your Supabase Edge Functions environment:

```bash
supabase secrets set SCRAPER_SERVICE_URL=https://scraper-service-production.up.railway.app
```

### Step 6: Update Frontend Integration

If using Vercel, add the scraper URL to your environment variables:

```bash
SCRAPER_SERVICE_URL=https://scraper-service-production.up.railway.app
```

## API Endpoints

### `GET /health`
Health check endpoint to verify service status.

**Response:**
```json
{
  "status": "healthy",
  "browser": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `POST /scrape`
Main scraping endpoint for BizBuySell listings.

**Request Body:**
```json
{
  "url": "https://www.bizbuysell.com/Business-Opportunity/...",
  "dealId": "deal-uuid-here"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "business_name": "Example Business",
    "location": "San Francisco, CA",
    "asking_price": 500000,
    "cash_flow": 120000,
    "gross_revenue": 800000,
    "business_description": "...",
    "fields_extracted": ["business_name", "location", "asking_price", ...],
    "parsing_confidence": 0.85
  }
}
```

### `POST /classify-industry` (Optional)
Classify business industry using OpenAI.

**Request Body:**
```json
{
  "description": "A coffee shop specializing in artisan roasts..."
}
```

**Response:**
```json
{
  "success": true,
  "industry": "Food & Beverage",
  "confidence": 0.95
}
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Supabase   │────▶│   Railway   │
│   (React)   │     │ Edge Function│     │   Scraper   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   Supabase   │     │ BizBuySell  │
                    │   Database   │     │   Website   │
                    └──────────────┘     └─────────────┘
```

## Troubleshooting

### Browser Won't Launch
- Ensure all Playwright args are included in `server.js`
- Check Railway logs for specific error messages

### CORS Issues
- Verify `FRONTEND_URL` is correctly set
- Check that CORS middleware is properly configured

### Scraping Fails
- Test the BizBuySell URL manually
- Check if the page structure has changed
- Review Railway logs for detailed error messages

### Memory Issues
- Railway provides sufficient memory for Playwright
- Browser instance is reused to optimize memory

## Performance Optimization

- **Resource Blocking**: CSS, images, and fonts are blocked to speed up page loads
- **Browser Reuse**: Single browser instance stays warm between requests
- **Context Isolation**: Each scrape uses a fresh context for clean state
- **Selective Waiting**: Only waits for essential elements

## Security Considerations

- Use service keys only on backend services
- Never expose API keys in frontend code
- Validate all URLs before scraping
- Rate limit requests to prevent abuse

## Monitoring

Monitor your service health:
- Railway Dashboard: View logs, metrics, and deployment status
- Health Endpoint: Set up uptime monitoring
- Supabase Dashboard: Track database operations

## Support

For issues or questions:
1. Check Railway logs for error details
2. Test locally to reproduce issues
3. Verify environment variables are set correctly
4. Ensure BizBuySell URL is valid and accessible