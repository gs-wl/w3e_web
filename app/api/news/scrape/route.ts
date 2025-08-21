import { NextRequest, NextResponse } from 'next/server';

// Free news sources for RWA and DeFi
const NEWS_SOURCES = [
  {
    name: 'CoinDesk',
    rss: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    category: 'DeFi'
  },
  {
    name: 'CoinTelegraph',
    rss: 'https://cointelegraph.com/rss',
    category: 'DeFi'
  },
  {
    name: 'The Block',
    rss: 'https://www.theblock.co/rss.xml',
    category: 'DeFi'
  },
  {
    name: 'DeFi Pulse',
    rss: 'https://defipulse.com/blog/feed/',
    category: 'DeFi'
  }
];

export async function GET(request: NextRequest) {
  try {
    const allNews = [];
    
    // Scrape news from multiple sources
    for (const source of NEWS_SOURCES) {
      try {
        const response = await fetch(source.rss, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          next: { revalidate: 600 } // Cache for 10 minutes
        });
        
        if (response.ok) {
          const rssText = await response.text();
          const articles = parseRSSToNews(rssText, source);
          allNews.push(...articles);
        }
      } catch (error) {
        console.log(`Failed to fetch from ${source.name}:`, error);
      }
    }
    
    // Filter for RWA and DeFi related content
    const filteredNews = allNews.filter(article => 
      isRWAOrDeFiRelated(article.title + ' ' + article.summary)
    );
    
    // If we have scraped news, enhance with AI analysis
    let enhancedNews = filteredNews;
    if (filteredNews.length > 0) {
      enhancedNews = await enhanceNewsWithAI(filteredNews.slice(0, 10));
    }
    
    // Fallback to mock data if no relevant news found
    if (enhancedNews.length === 0) {
      enhancedNews = getMockNewsData();
    }
    
    return NextResponse.json({ 
      success: true, 
      data: enhancedNews.slice(0, 15),
      source: filteredNews.length > 0 ? 'scraped' : 'fallback'
    });
    
  } catch (error) {
    console.error('News scraping error:', error);
    
    return NextResponse.json({ 
      success: true, 
      data: getMockNewsData(),
      source: 'fallback'
    });
  }
}

function parseRSSToNews(rssText: string, source: any) {
  try {
    const items = rssText.match(/<item>(.*?)<\/item>/gs) || [];
    
    return items.map((item, index) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                   item.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || 
                         item.match(/<description>(.*?)<\/description>/)?.[1] || '';
      
      // Clean HTML from description
      const summary = description.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
      
      return {
        id: `${source.name}-${index}-${Date.now()}`,
        title: title.trim(),
        summary: summary.trim(),
        content: description.replace(/<[^>]*>/g, ''),
        category: source.category,
        source: `${source.name} RSS`,
        publishedAt: new Date(pubDate).toISOString(),
        readTime: Math.ceil(description.length / 1000) + 2, // Rough estimate
        tags: extractTags(title + ' ' + description),
        sentiment: 'neutral',
        confidence: 0.85,
        trending: Math.random() > 0.7,
        url: link
      };
    });
  } catch (error) {
    console.error('RSS parsing error:', error);
    return [];
  }
}

function isRWAOrDeFiRelated(text: string): boolean {
  const keywords = [
    'rwa', 'real world asset', 'tokenization', 'tokenized', 'defi', 'decentralized finance',
    'yield farming', 'liquidity', 'staking', 'smart contract', 'blockchain', 'ethereum',
    'polygon', 'arbitrum', 'avalanche', 'solana', 'binance smart chain', 'bsc',
    'nft', 'dao', 'governance token', 'amm', 'automated market maker',
    'lending protocol', 'borrowing', 'collateral', 'synthetic asset',
    'carbon credit', 'green bond', 'esg', 'sustainable finance',
    'real estate token', 'commodity token', 'gold token', 'oil token',
    'infrastructure token', 'renewable energy', 'solar', 'wind energy'
  ];
  
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword));
}

function extractTags(text: string): string[] {
  const tagMap: { [key: string]: string } = {
    'defi': 'DeFi',
    'rwa': 'RWA',
    'tokenization': 'Tokenization',
    'ethereum': 'Ethereum',
    'polygon': 'Polygon',
    'staking': 'Staking',
    'yield': 'Yield Farming',
    'liquidity': 'Liquidity',
    'nft': 'NFT',
    'dao': 'DAO',
    'carbon': 'Carbon Credits',
    'esg': 'ESG',
    'real estate': 'Real Estate',
    'renewable': 'Renewable Energy'
  };
  
  const lowerText = text.toLowerCase();
  const foundTags = [];
  
  for (const [keyword, tag] of Object.entries(tagMap)) {
    if (lowerText.includes(keyword)) {
      foundTags.push(tag);
    }
  }
  
  return foundTags.slice(0, 5); // Limit to 5 tags
}

async function enhanceNewsWithAI(articles: any[]): Promise<any[]> {
  try {
    // Use OpenRouter's free model for AI enhancement
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    if (!OPENROUTER_API_KEY) {
      console.log('No OpenRouter API key found, skipping AI enhancement');
      return articles;
    }
    
    const enhancedArticles = [];
    
    for (const article of articles.slice(0, 5)) { // Limit to 5 articles to avoid rate limits
      try {
        const prompt = `Analyze this news article about RWA/DeFi and provide:
1. Sentiment (positive/negative/neutral)
2. Confidence score (0-1)
3. Key insights (2-3 sentences)
4. Relevant tags

Article: "${article.title}"
Summary: "${article.summary}"

Respond in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.85,
  "insights": "Key insights here...",
  "tags": ["tag1", "tag2", "tag3"]
}`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'X-Title': 'RWA.defi News Analysis'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.2-3b-instruct:free', // Free model
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 200,
            temperature: 0.3
          })
        });
        
        if (response.ok) {
          const aiResult = await response.json();
          const aiContent = aiResult.choices[0]?.message?.content;
          
          try {
            const aiAnalysis = JSON.parse(aiContent);
            enhancedArticles.push({
              ...article,
              sentiment: aiAnalysis.sentiment || article.sentiment,
              confidence: aiAnalysis.confidence || article.confidence,
              aiInsights: aiAnalysis.insights,
              tags: [...new Set([...article.tags, ...(aiAnalysis.tags || [])])].slice(0, 5)
            });
          } catch (parseError) {
            // If AI response isn't valid JSON, use original article
            enhancedArticles.push(article);
          }
        } else {
          enhancedArticles.push(article);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (aiError) {
        console.log('AI enhancement failed for article:', aiError);
        enhancedArticles.push(article);
      }
    }
    
    // Add remaining articles without AI enhancement
    enhancedArticles.push(...articles.slice(5));
    
    return enhancedArticles;
    
  } catch (error) {
    console.error('AI enhancement error:', error);
    return articles;
  }
}

function getMockNewsData() {
  return [
    {
      id: '1',
      title: 'Tokenized Real Estate Market Surges 340% in Q1 2024',
      summary: 'AI analysis reveals unprecedented growth in tokenized real estate investments, with institutional adoption driving the surge. Key markets include commercial properties in NYC, London, and Tokyo.',
      content: 'The tokenized real estate market has experienced explosive growth in the first quarter of 2024, with total value locked increasing by 340% compared to Q4 2023...',
      category: 'Real Estate',
      source: 'AI Market Analysis',
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      readTime: 4,
      tags: ['Real Estate', 'Tokenization', 'Institutional'],
      sentiment: 'positive',
      confidence: 0.92,
      trending: true,
      url: '#'
    },
    {
      id: '2',
      title: 'Central Banks Explore CBDC Integration with RWA Protocols',
      summary: 'Multiple central banks are reportedly testing integration between Central Bank Digital Currencies (CBDCs) and Real World Asset tokenization platforms.',
      content: 'According to recent analysis of regulatory filings and public statements, at least seven major central banks are actively exploring integration pathways...',
      category: 'Regulation',
      source: 'Regulatory Tracker',
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      readTime: 6,
      tags: ['CBDC', 'Regulation', 'Central Banks'],
      sentiment: 'positive',
      confidence: 0.87,
      trending: true,
      url: '#'
    },
    {
      id: '3',
      title: 'Green Bonds Tokenization Reaches $50B Milestone',
      summary: 'Environmental, Social, and Governance (ESG) focused tokenized bonds have crossed the $50 billion threshold, with renewable energy projects leading the charge.',
      content: 'The tokenized green bonds market has achieved a significant milestone, surpassing $50 billion in total value...',
      category: 'ESG',
      source: 'ESG Monitor',
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      readTime: 5,
      tags: ['Green Bonds', 'ESG', 'Sustainability'],
      sentiment: 'positive',
      confidence: 0.94,
      trending: false,
      url: '#'
    }
  ];
}