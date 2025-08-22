import express from 'express';
import { chromium } from 'playwright-extra';
import stealth from 'playwright-extra-plugin-stealth';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Use stealth plugin to avoid detection
chromium.use(stealth());

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Global browser instance (stays warm)
let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    console.log('Launching new browser instance...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-http2',
        '--disable-quic'
      ]
    });
  }
  return browser;
}

// Parse currency string to number
function parseCurrency(text) {
  if (!text) return undefined;
  
  const cleaned = text.replace(/[$,\s]/g, '').toLowerCase();
  
  if (cleaned.includes('m') || cleaned.includes('mil')) {
    const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
    return num * 1000000;
  }
  
  if (cleaned.includes('k')) {
    const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
    return num * 1000;
  }
  
  const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? undefined : num;
}

// Parse integer from text
function parseInteger(text) {
  if (!text) return undefined;
  const num = parseInt(text.replace(/[^0-9]/g, ''));
  return isNaN(num) ? undefined : num;
}

// Clean and normalize text
function cleanText(text) {
  return text?.trim().replace(/\s+/g, ' ') || '';
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    browser: browser?.isConnected(),
    timestamp: new Date().toISOString()
  });
});

// Main scraping endpoint
app.post('/scrape', async (req, res) => {
  const { url, dealId } = req.body;
  
  if (!url || !url.includes('bizbuysell.com')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid BizBuySell URL'
    });
  }

  if (!dealId) {
    return res.status(400).json({
      success: false,
      error: 'Deal ID is required'
    });
  }

  let context;
  let page;

  try {
    console.log(`🕷️ Scraping BizBuySell listing: ${url}`);
    const browser = await getBrowser();
    
    // Create new context with advanced anti-detection configuration
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 }, // More common macOS resolution
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"'
      }
    });
    
    page = await context.newPage();
    
    // Set realistic cookies to simulate a real browsing session
    console.log('🍪 Setting realistic session cookies...');
    await context.addCookies([
      {
        name: '_ga',
        value: 'GA1.2.' + Math.random().toString(36).substring(2, 15),
        domain: '.bizbuysell.com',
        path: '/'
      },
      {
        name: '_gid', 
        value: 'GA1.2.' + Math.random().toString(36).substring(2, 15),
        domain: '.bizbuysell.com',
        path: '/'
      },
      {
        name: 'session_id',
        value: Math.random().toString(36).substring(2, 15),
        domain: '.bizbuysell.com',
        path: '/'
      },
      {
        name: 'visited',
        value: 'true',
        domain: '.bizbuysell.com',
        path: '/'
      }
    ]);
    
    // Don't block resources initially - let the page load naturally first
    // This helps avoid detection as blocking resources can be suspicious
    
    // Navigate with realistic settings (simulate clicking from Google)
    console.log('🌐 Navigating to:', url);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000,
      referer: 'https://www.google.com/'  // Appear as if coming from Google search
    });
    
    // Add realistic human-like delay
    console.log('⏳ Simulating page reading time...');
    await page.waitForTimeout(3000 + Math.random() * 3000);  // Random 3-6 second delay
    
    // Simulate human mouse movements
    console.log('🖱️ Simulating realistic mouse activity...');
    await page.mouse.move(100, 100);
    await page.waitForTimeout(500);
    await page.mouse.move(300, 200);
    await page.waitForTimeout(300);
    await page.mouse.move(500, 400);
    await page.waitForTimeout(200);
    
    // Scroll down a bit to simulate reading
    await page.evaluate(() => {
      window.scrollTo(0, 200);
    });
    await page.waitForTimeout(1000);
    
    // Scroll back up
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    
    // Wait for main content with multiple selectors
    try {
      await page.waitForSelector('h1, .listing-title, [data-cy="listing-title"], .business-title', { 
        timeout: 20000 
      });
    } catch (e) {
      console.log('⚠️ Main selector not found, continuing with current page state');
    }

    // Additional delay after content loads
    await page.waitForTimeout(3000);
    
    // Extract data using Playwright's evaluate
    const extractedData = await page.evaluate(() => {
      const extractedFields = [];
      
      // Helper functions (defined in browser context)
      const cleanText = (text) => text?.trim().replace(/\s+/g, ' ') || '';
      
      const parseCurrency = (text) => {
        if (!text) return undefined;
        const cleaned = text.replace(/[$,\s]/g, '').toLowerCase();
        
        if (cleaned.includes('m') || cleaned.includes('mil')) {
          const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
          return num * 1000000;
        }
        
        if (cleaned.includes('k')) {
          const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
          return num * 1000;
        }
        
        const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? undefined : num;
      };
      
      const parseInteger = (text) => {
        if (!text) return undefined;
        const num = parseInt(text.replace(/[^0-9]/g, ''));
        return isNaN(num) ? undefined : num;
      };
      
      // Extract business name
      let business_name = 'Business Opportunity';
      const titleSelectors = [
        'h1[data-cy="listing-title"]',
        '.listing-title',
        'h1.title',
        'h1'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          business_name = cleanText(element.textContent);
          extractedFields.push('business_name');
          break;
        }
      }
      
      // Extract location
      let location;
      const locationSelectors = [
        'span[data-cy="listing-location"]',
        '.listing-location',
        '[data-testid="location"]',
        '.location'
      ];
      
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          location = cleanText(element.textContent);
          if (location && location.includes(',')) {
            extractedFields.push('location');
            break;
          }
        }
      }
      
      // If location not found, try to find City, State pattern
      if (!location) {
        const bodyText = document.body?.textContent || '';
        const locationMatch = bodyText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})/);
        if (locationMatch) {
          location = locationMatch[0];
          extractedFields.push('location');
        }
      }
      
      // Extract financial information by searching for labeled values
      const financialData = {};
      
      // Look for asking price
      const priceElements = document.querySelectorAll('*');
      for (const element of priceElements) {
        const text = element.textContent || '';
        if ((text.includes('Asking Price') || text.includes('Price:')) && text.includes('$')) {
          const value = parseCurrency(text);
          if (value && value > 10000) {
            financialData.asking_price = value;
            extractedFields.push('asking_price');
            break;
          }
        }
      }
      
      // Look for cash flow / SDE
      for (const element of priceElements) {
        const text = element.textContent || '';
        if ((text.includes('Cash Flow') || text.includes('SDE')) && text.includes('$')) {
          const value = parseCurrency(text);
          if (value && value > 1000 && !financialData.cash_flow) {
            financialData.cash_flow = value;
            extractedFields.push('cash_flow');
            break;
          }
        }
      }
      
      // Look for gross revenue
      for (const element of priceElements) {
        const text = element.textContent || '';
        if ((text.includes('Gross Revenue') || text.includes('Revenue')) && text.includes('$')) {
          const value = parseCurrency(text);
          if (value && value > 1000 && !financialData.gross_revenue) {
            financialData.gross_revenue = value;
            extractedFields.push('gross_revenue');
            break;
          }
        }
      }
      
      // Look for EBITDA
      for (const element of priceElements) {
        const text = element.textContent || '';
        if (text.includes('EBITDA') && text.includes('$')) {
          const value = parseCurrency(text);
          if (value && value > 1000 && !financialData.ebitda) {
            financialData.ebitda = value;
            extractedFields.push('ebitda');
            break;
          }
        }
      }
      
      // Extract business description
      let business_description;
      const descriptionSelectors = [
        '[data-cy="business-description"]',
        '.business-description',
        '.description',
        '.summary',
        '.listing-description'
      ];
      
      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          const text = cleanText(element.textContent);
          if (text && text.length > 50) {
            business_description = text.substring(0, 2000); // Limit length
            extractedFields.push('business_description');
            break;
          }
        }
      }
      
      // Extract other fields from the page content
      const bodyText = document.body?.textContent || '';
      const otherData = {};
      
      // Look for rent
      const rentMatch = bodyText.match(/Rent[:\s]*\$?([\d,]+)/i);
      if (rentMatch) {
        otherData.rent = parseCurrency(rentMatch[1]);
        if (otherData.rent) extractedFields.push('rent');
      }
      
      // Look for established year
      const establishedMatch = bodyText.match(/[Ee]stablished[:\s]*(\d{4})|[Ss]ince[:\s]*(\d{4})|[Ff]ounded[:\s]*(\d{4})/);
      if (establishedMatch) {
        const year = parseInt(establishedMatch[1] || establishedMatch[2] || establishedMatch[3]);
        if (year > 1900 && year <= new Date().getFullYear()) {
          otherData.established = year;
          extractedFields.push('established');
        }
      }
      
      // Look for employee count
      const employeeMatch = bodyText.match(/(\d+)\s*[Ee]mployees?/);
      if (employeeMatch) {
        const count = parseInt(employeeMatch[1]);
        if (count > 0 && count < 10000) {
          otherData.employees = count;
          extractedFields.push('employees');
        }
      }
      
      // Look for building square footage
      const buildingMatch = bodyText.match(/(\d+[\d,]*)\s*(?:sq\.?\s*ft\.?|square\s*feet)/i);
      if (buildingMatch) {
        otherData.building_sf = parseInteger(buildingMatch[1]);
        if (otherData.building_sf) extractedFields.push('building_sf');
      }
      
      // Look for inventory value
      const inventoryMatch = bodyText.match(/[Ii]nventory[:\s]*\$?([\d,]+)/);
      if (inventoryMatch) {
        otherData.inventory = parseCurrency(inventoryMatch[1]);
        if (otherData.inventory) extractedFields.push('inventory');
      }
      
      // Look for franchise information
      if (bodyText.match(/[Ff]ranchise/)) {
        const franchiseMatch = bodyText.match(/[Ff]ranchise[:\s]*([^.]+)/);
        if (franchiseMatch) {
          otherData.franchise = cleanText(franchiseMatch[1]).substring(0, 200);
          extractedFields.push('franchise');
        }
      }
      
      // Look for reason for selling
      const reasonMatch = bodyText.match(/[Rr]eason\s*for\s*[Ss]elling[:\s]*([^.]+)/);
      if (reasonMatch) {
        otherData.reason_for_selling = cleanText(reasonMatch[1]).substring(0, 500);
        extractedFields.push('reason_for_selling');
      }
      
      return {
        business_name,
        location,
        ...financialData,
        business_description,
        ...otherData,
        fields_extracted: extractedFields,
        parsing_confidence: Math.min(extractedFields.length / 22, 1.0)
      };
    });
    
    console.log('✅ Extraction completed');
    console.log('📊 Extracted fields:', extractedData.fields_extracted);
    console.log('🎯 Parsing confidence:', extractedData.parsing_confidence);
    
    // Add metadata
    const finalData = {
      ...extractedData,
      source_type: 'bizbuysell',
      source_url: url,
      parsed_at: new Date().toISOString()
    };
    
    // Note: Database save is handled by the Edge Function to avoid duplicates
    // Railway service only returns the scraped data
    console.log('📤 Returning scraped data to Edge Function for database save');
    
    res.json({
      success: true,
      data: finalData,
      fields_extracted: extractedData.fields_extracted,
      parsing_confidence: extractedData.parsing_confidence
    });
    
  } catch (error) {
    console.error('💥 Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scrape BizBuySell listing'
    });
  } finally {
    // Clean up context
    if (context) {
      try {
        await context.close();
      } catch (e) {
        console.error('Error closing context:', e);
      }
    }
  }
});

// Industry classification endpoint (optional - if OpenAI key is available)
app.post('/classify-industry', async (req, res) => {
  const { description } = req.body;
  
  if (!description) {
    return res.status(400).json({
      success: false,
      error: 'Description is required'
    });
  }
  
  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      success: true,
      industry: 'Other',
      confidence: 0.1
    });
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an industry classification expert. Classify businesses into these standard categories:
            Technology, Healthcare, Retail, Manufacturing, Food & Beverage, Professional Services, 
            Construction, Transportation, Real Estate, Education, Finance, Entertainment, Agriculture, Other.
            
            Return ONLY a JSON object with "industry" and "confidence" (0.0-1.0).`
          },
          {
            role: 'user',
            content: `Classify this business: "${description}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (content) {
      const result = JSON.parse(content);
      return res.json({
        success: true,
        industry: result.industry || 'Other',
        confidence: result.confidence || 0.5
      });
    }
  } catch (error) {
    console.error('Industry classification error:', error);
  }
  
  res.json({
    success: true,
    industry: 'Other',
    confidence: 0.1
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing browser...');
  if (browser) {
    try {
      await browser.close();
    } catch (e) {
      console.error('Error closing browser:', e);
    }
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing browser...');
  if (browser) {
    try {
      await browser.close();
    } catch (e) {
      console.error('Error closing browser:', e);
    }
  }
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 BizBuySell scraper service running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});