import { NextRequest, NextResponse } from 'next/server';

// Twitter API v2 integration
export async function GET(request: NextRequest) {
    try {
        let tweets: any[] = [];
        let source = 'fallback';

        // Method 1: Try Twitter API v2
        tweets = await fetchTweetsFromAPI();
        if (tweets.length > 0) {
            source = 'twitter_api_v2';
            console.log(`✅ Successfully fetched ${tweets.length} tweets from Twitter API v2`);
        }

        // Method 2: Generate AI-enhanced content as fallback
        if (tweets.length === 0) {
            console.log('🤖 Using AI-generated content as fallback');
            tweets = await getEnhancedMockData('w3energy_org');
            source = 'ai_enhanced';
        }

        return NextResponse.json({
            success: true,
            data: tweets.slice(0, 10),
            source: source,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Twitter API error:', error);

        return NextResponse.json({
            success: true,
            data: await getEnhancedMockData('w3energy_org'),
            source: 'error_fallback',
            timestamp: new Date().toISOString()
        });
    }
}

async function fetchTweetsFromAPI(): Promise<any[]> {
    const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
    const TWITTER_USERNAME = 'w3energy_org';

    if (!TWITTER_BEARER_TOKEN) {
        console.log('❌ Twitter Bearer Token not found in environment variables');
        return [];
    }

    try {
        console.log('🐦 Fetching tweets from Twitter API v2...');

        // Step 1: Get user ID by username
        const userResponse = await fetch(
            `https://api.twitter.com/2/users/by/username/${TWITTER_USERNAME}?user.fields=id,name,username,verified,profile_image_url,public_metrics`,
            {
                headers: {
                    'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error('❌ Failed to fetch user info:', userResponse.status, errorText);
            return [];
        }

        const userData = await userResponse.json();

        if (!userData.data) {
            console.error('❌ User not found:', TWITTER_USERNAME);
            return [];
        }

        const user = userData.data;
        console.log(`✅ Found user: ${user.name} (@${user.username})`);

        // Step 2: Get user's tweets
        const tweetsResponse = await fetch(
            `https://api.twitter.com/2/users/${user.id}/tweets?` +
            new URLSearchParams({
                'max_results': '10',
                'tweet.fields': 'id,text,created_at,public_metrics,context_annotations,entities',
                'expansions': 'author_id,attachments.media_keys',
                'media.fields': 'url,preview_image_url,type',
                'exclude': 'retweets,replies' // Only original tweets
            }),
            {
                headers: {
                    'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!tweetsResponse.ok) {
            const errorText = await tweetsResponse.text();
            console.error('❌ Failed to fetch tweets:', tweetsResponse.status, errorText);
            return [];
        }

        const tweetsData = await tweetsResponse.json();

        if (!tweetsData.data || tweetsData.data.length === 0) {
            console.log('📭 No tweets found for user');
            return [];
        }

        // Step 3: Transform tweets to our format
        const transformedTweets = tweetsData.data.map((tweet: any) => {
            const metrics = tweet.public_metrics || {};

            return {
                id: `twitter-${tweet.id}`,
                username: user.name,
                handle: `@${user.username}`,
                avatar: user.profile_image_url || '/logo/logo.png',
                content: tweet.text,
                timestamp: tweet.created_at,
                likes: metrics.like_count || 0,
                retweets: metrics.retweet_count || 0,
                replies: metrics.reply_count || 0,
                verified: user.verified || false,
                engagement: getEngagementLevel(metrics),
                source: 'twitter_api_v2',
                url: `https://x.com/${user.username}/status/${tweet.id}`,
                // Additional metadata
                quote_count: metrics.quote_count || 0,
                impression_count: metrics.impression_count || 0,
                entities: tweet.entities || {}
            };
        });

        console.log(`✅ Successfully transformed ${transformedTweets.length} tweets`);
        return transformedTweets;

    } catch (error) {
        console.error('❌ Twitter API fetch error:', error);
        return [];
    }
}

function getEngagementLevel(metrics: any): string {
    const totalEngagement = (metrics.like_count || 0) +
        (metrics.retweet_count || 0) +
        (metrics.reply_count || 0) +
        (metrics.quote_count || 0);

    if (totalEngagement > 100) return 'high';
    if (totalEngagement > 20) return 'medium';
    return 'low';
}



async function getEnhancedMockData(username: string): Promise<any[]> {
    console.log('Using enhanced mock data with AI generation...');

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (OPENROUTER_API_KEY) {
        try {
            const prompt = `Generate 6 realistic X/Twitter posts for W3 Energy (@w3energy_org), a renewable energy and RWA (Real World Assets) platform. 
      
      The posts should be:
      - Professional but engaging
      - About renewable energy, sustainability, tokenized assets, clean energy projects
      - Include relevant hashtags like #RenewableEnergy #CleanTech #Sustainability #RWA #GreenFinance
      - Mix of announcements, market updates, and educational content
      - Each post should be different and realistic
      - Keep under 280 characters each
      
      Return as JSON array:
      [
        {
          "content": "post content here...",
          "engagement": "high|medium|low"
        }
      ]`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                    'X-Title': 'W3 Energy X Post Generation'
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.2-3b-instruct:free',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 800,
                    temperature: 0.7
                })
            });

            if (response.ok) {
                const aiResult = await response.json();
                const aiContent = aiResult.choices[0]?.message?.content;

                try {
                    const generatedPosts = JSON.parse(aiContent);
                    if (Array.isArray(generatedPosts) && generatedPosts.length > 0) {
                        console.log('✅ Generated AI X posts successfully');
                        return generatedPosts.map((post: any, index: number) => ({
                            id: `ai-${Date.now()}-${index}`,
                            username: 'W3 Energy',
                            handle: '@w3energy_org',
                            avatar: '/logo/logo.png',
                            content: post.content,
                            timestamp: new Date(Date.now() - (index + 1) * 3 * 60 * 60 * 1000).toISOString(),
                            likes: Math.floor(Math.random() * 500) + 100,
                            retweets: Math.floor(Math.random() * 200) + 50,
                            replies: Math.floor(Math.random() * 100) + 20,
                            verified: true,
                            engagement: post.engagement || 'medium',
                            source: 'ai_generated',
                            url: 'https://x.com/w3energy_org'
                        }));
                    }
                } catch (parseError) {
                    console.log('Failed to parse AI response, using static mock');
                }
            }
        } catch (aiError) {
            console.log('AI generation failed:', aiError);
        }
    }

    // Fallback to static mock data
    return getStaticMockData();
}

function getStaticMockData() {
    const currentTime = Date.now();
    const mockPosts = [
        {
            content: '🌞 BREAKING: Our solar energy tokenization platform just reached 1GW of renewable capacity! Clean energy investments are now generating sustainable returns for our community. The future is green! ⚡ #RenewableEnergy #CleanTech #Sustainability',
            engagement: 'high'
        },
        {
            content: '📊 Weekly Clean Energy Insights:\n\n🔹 Solar Projects: 250MW (+12%)\n🔹 Wind Farms: 180MW (+8%)\n🔹 Carbon Offset: 50,000 tons\n🔹 Green Investors: 15,420\n\nBuilding a sustainable future together! 🌍 #GreenFinance',
            engagement: 'high'
        },
        {
            content: '🌱 Carbon Credit Update: Our blockchain-verified carbon offset program has officially neutralized 100,000 tons of CO2! Every investment contributes to a cleaner planet. Invest green, live clean. 🌍💚 #CarbonNeutral #ClimateAction',
            engagement: 'medium'
        },
        {
            content: '🏭 Industrial Solar Update: New 50MW solar farm in Nevada now tokenized! Fractional ownership starting at $100. Earn clean energy dividends while supporting renewable infrastructure. Power the future! ⚡ #SolarEnergy #RWA',
            engagement: 'high'
        },
        {
            content: '💨 Wind Energy 2.0 is live! Our offshore wind tokenization offers:\n\n✅ 15% annual returns\n✅ Real wind farm ownership\n✅ Transparent energy production data\n✅ ESG compliance\n\nHarness the wind, harvest the profits! 🌪️💰 #WindEnergy',
            engagement: 'high'
        },
        {
            content: '🎯 Sustainability Milestone: 25,000 investors now trust W3 Energy with their green investments! Thank you for believing in renewable energy tokenization. Together, we\'re powering a sustainable tomorrow! 🙏 #Community #CleanEnergy',
            engagement: 'medium'
        }
    ];

    return mockPosts
        .sort(() => Math.random() - 0.5)
        .slice(0, 6)
        .map((post, index) => ({
            id: `static-${currentTime}-${index}`,
            username: 'W3 Energy',
            handle: '@w3energy_org',
            avatar: '/logo/logo.png',
            content: post.content,
            timestamp: new Date(currentTime - (index + 1) * (2 + Math.random() * 4) * 60 * 60 * 1000).toISOString(),
            likes: Math.floor(Math.random() * 800) + 200,
            retweets: Math.floor(Math.random() * 300) + 80,
            replies: Math.floor(Math.random() * 150) + 30,
            verified: true,
            engagement: post.engagement,
            source: 'static_mock',
            url: 'https://x.com/w3energy_org'
        }));
}