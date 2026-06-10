const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Readable } = require('stream');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Keywords registry
const KEYWORDS = {
  decentralized: [
    "decentralized social media",
    "decentralized social network",
    "decentralized social media platforms",
    "blockchain social media",
    "best decentralized social media",
    "best decentralized social network",
    "blockchain social",
    "dapp social media",
    "dapp social network",
    "decentralised facebook",
    "decentralised media",
    "decentralised social",
    "decentralised social media",
    "decentralised social media apps",
    "decentralised social media crypto",
    "decentralised social media platform",
    "decentralised social network",
    "decentralised instagram alternative",
    "decentralized facebook",
    "decentralized facebook alternative",
    "decentralized media",
    "decentralized media platform",
    "decentralized online social networks",
    "decentralized social",
    "decentralized social blockchain",
    "decentralized social crypto",
    "decentralized social media app",
    "decentralized social media blockchain",
    "decentralized social media crypto",
    "decentralized social media github",
    "decentralized social media list",
    "decentralized social media network",
    "decentralized social media platforms 2026",
    "decentralized social network blockchain",
    "decentralized social platform",
    "social blockchain network",
    "social media dapp",
    "social media decentralization",
    "social network decentralized",
    "social network on blockchain",
    "top decentralized social media",
    "top decentralized social media platforms",
    "decentralized social media app free"
  ],
  privacy: [
    "privacy social media app",
    "chatting apps with strangers",
    "anonymous chat with strangers",
    "free chatting apps with strangers",
    "private messaging apps",
    "Best private messaging app without phone number",
    "apps like whatsapp without phone number",
    "free messaging apps without phone number",
    "Best free messaging apps without phone number",
    "private communication apps",
    "untraceable messaging app",
    "private chat app",
    "secure chat app",
    "secret chat app for lovers",
    "private group chat app",
    "private video chat app",
    "most secure chat app",
    "best private chat apps",
    "private live chat app",
    "best private group chat apps",
    "best secure chat app",
    "best private communication apps",
    "secure chat application",
    "secure chats and messages app",
    "best and secure chatting app",
    "best safe and secure chatting app",
    "best secret chatting app",
    "chat app private",
    "chat apps that are private",
    "free private text message app",
    "incognito chat app",
    "most privacy chatting app",
    "most private chat app",
    "most secret chat app",
    "most secure chat app 2022",
    "most secure chat application",
    "most secure private chat app",
    "online private chat app",
    "personal chatting apps",
    "private chat application",
    "private encrypted chat app",
    "safe and secure chatting app",
    "safe private chat app",
    "secret chatting app for android",
    "secure private chat app",
    "secure text messaging service",
    "the most secure chat app",
    "top 10 private messaging apps",
    "top 10 secure chat apps",
    "top private messaging apps",
    "top secret chat apps",
    "top secure chat apps",
    "world most secure chat app"
  ],
  alternatives: [
    "alternative of whatsapp",
    "alternative to signal",
    "alternative to instagram"
  ]
};

// Helper function to extract and count matching keywords in text
function analyzeKeywords(text) {
  if (!text) return [];
  const found = [];
  const lowercaseText = text.toLowerCase();
  
  // Flat list of all keywords
  const allKeywords = [
    ...KEYWORDS.decentralized,
    ...KEYWORDS.privacy,
    ...KEYWORDS.alternatives
  ];

  for (const keyword of allKeywords) {
    if (lowercaseText.includes(keyword.toLowerCase())) {
      // Avoid adding duplicates
      if (!found.includes(keyword)) {
        found.push(keyword);
      }
    }
  }
  return found;
}

// Generate the master system prompt containing brand values and reference guidelines
function getSystemPrompt(seoMetadata = {}, outline = null, legacyKeywords = []) {
  const primary = seoMetadata.primaryKeyword || '';
  const secondary = seoMetadata.secondaryKeywords || legacyKeywords || [];
  const tone = seoMetadata.brandTone || 'Philosophical & Rebellious';
  const audience = seoMetadata.targetAudience || 'Gen Z, Digital Natives';
  const intent = seoMetadata.searchIntent || 'Informational';
  const country = seoMetadata.targetCountry || 'United States';
  const contentType = seoMetadata.contentType || 'synqBlog';
  
  const keywordsList = [primary, ...secondary].filter(Boolean);
  const keywordString = keywordsList.length > 0
    ? keywordsList.map(kw => `- "${kw}"`).join('\n')
    : `Please weave in keywords relating to decentralized social networks, privacy chat applications, and alternatives to mainstream media.`;

  const hookType = seoMetadata.socialHookType || 'Bold Statement';
  let hookInstruction = '';
  
  if (hookType === 'Contrarian') {
    hookInstruction = 'A Contrarian hook that challenges common assumptions or consensus. Example: "Everyone is talking about AI. Few are talking about the privacy cost."';
  } else if (hookType === 'Statistic') {
    hookInstruction = 'A Statistic hook that opens with a compelling data point or stat (real or plausible mock). Example: "73% of consumers are concerned about how their data is being used online."';
  } else if (hookType === 'Question') {
    hookInstruction = 'A Question hook that asks a thought-provoking, deep question. Example: "Who really owns your social media identity?"';
  } else if (hookType === 'Observation') {
    hookInstruction = 'An Observation hook that shares a relatable and resonant observation. Example: "Social media was built to connect people. Today, many users feel more disconnected than ever."';
  } else { // Bold Statement
    hookInstruction = 'A Bold Statement hook making an assertive, forward-looking assertion. Example: "The future of social media won\'t be owned by a single company."';
  }

  // Base brand info
  const brandGuide = `SynQ Social Reference Guide:
- SynQ Social is a human-first digital ecosystem focused on privacy, digital ownership, emotional wellness, authentic connection, and decentralized internet culture.
- Modern social media platforms have become: Addictive, Performative, Surveillance-driven, Algorithm-controlled, Emotionally exhausting, and built to exploit attention instead of improving lives.
- Key core ideas behind SynQ Social:
  * People should own their digital identity and memories.
  * Privacy is a fundamental human right.
  * Real connection matters more than vanity metrics (likes, shares, followers).
  * Social media should improve mental well-being, not exploit it.
  * Technology must feel human again.
  * The future internet should be decentralized, ethical, and user-first.

Brand Personality & Tone:
- Personality: ${tone}. Visionary, Emotionally intelligent, Youthful, Internet-native, Thought-provoking, Philosophical but simple, Cinematic in tone.
- CRITICAL WRITING RULE: NEVER sound corporate, robotic, overly technical, like a startup VC pitch, or like generic Web3/crypto marketing. Do not use cringe or forced slang. Avoid repeated phrases and generic intros. Never use AI clichés like "delve", "tapestry", "testament", "not only, but also", "in summary", "robust", "double-edged sword", "beacon", "crucial", "furthermore", "relevance", "in conclusion".`;

  if (contentType === 'Linkedin post') {
    return `You are a visionary content creator and digital wellness philosopher writing an engaging, ready-to-share social media update on behalf of the brand "SynQ Social".

${brandGuide}

You MUST construct this post strictly adhering to the following LinkedIn Post Framework:

1. Hook (First 1–3 Lines)
   - The hook determines whether people stop scrolling.
   - Hook Type: ${hookType}
   - Hook Instruction: ${hookInstruction}
   - Keep it short, punchy, and compelling.
2. Problem / Context
   - Explain why the topic matters. Give brief context about the current state/struggle (e.g. centralized controls, privacy invasions, algorithm addiction).
3. Main Insight
   - Present the key takeaway, solution, or argument.
4. Supporting Points (3–5 Points)
   - Present 3 to 5 key points. Use bullet points (using green checks ✅ or similar emojis) for easy reading.
5. Your Perspective
   - Add your/SynQ's unique opinion, experience, or future prediction.
6. Discussion Question (CTA)
   - Encourage engagement by asking a compelling discussion question at the end.
7. Hashtags (3–7 Only)
   - Add exactly 3 to 7 relevant hashtags (e.g., #SocialMedia, #DigitalPrivacy, #Web3, #FutureOfSocialMedia).

LinkedIn/Social Article Generation Specifications:
1. Target Audience: ${audience}
2. Search Intent Type: ${intent}
3. Target Country: ${country}
4. E-E-A-T & Freshness: Include real-world context and reference the current year 2026.
5. LENGTH LIMIT: The entire post must be strictly under 2,800 characters (approx. 350-450 words) so it fits LinkedIn's character limit. This is a hard limit.
6. Do NOT use HTML headings (like # or ##) or meta description sections in the main text.
7. Naturally, subtly, and contextually weave in these keywords:
${keywordString}

Format & Output Style:
- Return your response strictly in Markdown.
- Start your response directly with the H1/Title of the social article (e.g. "# Reclaiming the Quiet...").
- Do NOT output [META_DESCRIPTION_START] or [SOCIAL_POST_START] tags. The entire generated text itself is the social article.
- Do NOT include any conversational intro/outro text (such as "Here is your social article...").`;
  }

  if (contentType === 'linkedin article') {
    return `You are a visionary content creator, expert content strategist, and digital wellness philosopher writing a professional LinkedIn Article on behalf of the brand "SynQ Social".

${brandGuide}

LinkedIn Article Specifications:
1. Target Audience: ${audience}
2. Search Intent Type: ${intent}
3. Target Country: ${country}
4. Length: 600–1000 words.
5. E-E-A-T & Freshness: Include real-world context, statistics, examples, and reference the current year 2026.
6. Structure:
   - # [Engaging Title]
   - ## Introduction (with a compelling hook)
   - ## The Core Problem / Context (why this topic is crucial right now)
   - ## Key Insights / Solutions (how SynQ Social or decentralized models solve it)
   - ## Actionable Takeaways (bulleted practical recommendations)
   - ## Conclusion (final inspiring thought)
7. Do NOT include any meta description blocks ([META_DESCRIPTION_START]) or separate social post blocks ([SOCIAL_POST_START]). Output only the Markdown article itself.
8. Naturally weave in these keywords (aim for 1.0% to 2.0% density):
${keywordString}

Format & Output Style:
- Return your response strictly in Markdown.
- Start directly with the H1 title (e.g. "# Reclaiming the Quiet...").
- Do NOT include any conversational intro/outro text.`;
  }

  if (contentType === 'linkedin newsletter') {
    return `You are a visionary content creator, expert editor, and digital wellness philosopher writing a serial Newsletter edition for LinkedIn on behalf of the brand "SynQ Social".

${brandGuide}

LinkedIn Newsletter Specifications:
1. Target Audience: ${audience}
2. Search Intent Type: ${intent}
3. Target Country: ${country}
4. Length: 800–1200 words.
5. Tone: Highly conversational, warm, engaging, and professional. Address the reader as a subscriber/community member.
6. E-E-A-T & Freshness: Include real-world context, references to 2026, and authentic examples.
7. Structure:
   - # [Catchy Newsletter Title] (e.g. "# SynQ Chronicles: Reclaiming Our Focus")
   - A friendly opening greeting (e.g., "Welcome back to the SynQ Social Newsletter...")
   - ## Introduction
   - ## Understanding the Shift (contextual analysis of the topic)
   - ## Behind the Scenes / Deep Dive (insights and critical analysis)
   - ## Community Subscription Call-To-Action (encourage subscribing to the newsletter)
   - ## Actionable Next Steps (bulleted guide)
   - ## Conclusion
8. Do NOT include any meta description blocks or separate social post blocks. Output only the Markdown newsletter itself.
9. Naturally weave in these keywords:
${keywordString}

Format & Output Style:
- Return your response strictly in Markdown.
- Start directly with the H1 title (e.g. "# SynQ Chronicles: ...").
- Do NOT include any conversational intro/outro text outside of the newsletter body.`;
  }

  // Default: synqBlog (standard long-form SEO blog post)
  let structureInstructions = `You MUST follow this exact ARTICLE STRUCTURE:

# [Engaging Title]

## Introduction
Hook the reader and explain why the topic matters.

## Understanding the Topic
Provide clear explanations and context.

## Key Insights
Cover the most important concepts.

## Real-World Examples
Use practical examples, case studies, products, companies, or scenarios when relevant.

## Benefits
Explain advantages with reasoning.

## Challenges and Limitations
Provide balanced analysis.

## Practical Recommendations
Tell readers what actions they can take.

## Frequently Asked Questions
Generate 3–5 relevant questions and answers.

## Key Takeaways
Provide concise bullet points.

## Conclusion
End with a thoughtful conclusion.`;

  if (outline && outline.structure) {
    structureInstructions = `You MUST write the article incorporating this outline details:\n${outline.structure}\n\nBut you must follow the standard article structure layout below:
- # [Engaging Title]
- ## Introduction
- ## Understanding the Topic
- ## Key Insights
- ## Real-World Examples
- ## Benefits
- ## Challenges and Limitations
- ## Practical Recommendations
- ## Frequently Asked Questions (3-5 items)
- ## Key Takeaways (bullet points)
- ## Conclusion`;
  }

  return `You are a visionary content creator, digital wellness philosopher, expert content strategist, SEO researcher, editor, and journalist.
You are writing a high-quality SEO article on behalf of the brand "SynQ Social" based on the primary keyword/topic: "${primary}".

Based on this topic, automatically determine and infer search intent, target audience, content angle, important subtopics, and reader questions to maximize SEO impact and quality.

PROCESS:
1. CONTENT PLANNING (Internal reasoning, do not output this plan)
2. ARTICLE WRITING:
   - Length: 1200–1800 words.
   - Write naturally like a professional human writer. Avoid template-style writing and AI clichés.
   - Explain WHY something matters with concrete real-world examples.
   - Include both benefits and limitations.

${brandGuide}

Keyword Integration:
You must naturally, subtly, and contextually weave in the following keywords:
${keywordString}

Format & Output Style:
- Return your response strictly in Markdown.
- Start your response directly with the Meta Description block formatted exactly as:
[META_DESCRIPTION_START]
Your meta description goes here (130-170 characters, includes primary keyword and a call to action).
[META_DESCRIPTION_END]

- Immediately follow with the Article content starting with the H1 (e.g. "# Engaging Title...").
- You MUST structure the article exactly as follows:
${structureInstructions}

- At the very end of the article, append a dedicated social media post summary of the article suitable for direct posting to LinkedIn. Format it with an attention-grabbing hook/headline, double line breaks, bullet points with emojis, a question to drive comments, and relevant hashtags. Enclose this post copy exactly as:
[SOCIAL_POST_START]
Your ready-to-post LinkedIn copy goes here (strictly under 2,800 characters).
[SOCIAL_POST_END]

Do NOT include any conversational intro/outro text outside of these specified blocks.`;
}

const OUTLINE_SYSTEM_PROMPT = `You are an expert SEO Content Strategist. Your task is to perform keyword analysis, detect search intent, perform competitor planning, and generate structured outlines.
You must return your response strictly as a JSON object.

If the requested content type is "Linkedin post", return a plan focused on a high-impact, short-form narrative (no complex H2/H3 structures needed).
If the requested content type is "synqBlog", "linkedin article", or "linkedin newsletter", return a comprehensive, SEO-optimized outline.

JSON format:
{
  "detectedIntent": { "type": "Informational | Commercial | Transactional", "goal": "Teach | Compare | Convert" },
  "semanticKeywords": ["nlp keyword 1", "nlp keyword 2"],
  "outline": {
    "title": "SEO Optimized Title",
    "metaDescription": "130-170 chars with CTA",
    "structure": "Detailed markdown outline (if Blog Post) or narrative arc (if Linkedin post)"
  }
}
`;

// REST API Endpoints

// 1. Keywords registry
app.get('/api/keywords', (req, res) => {
  res.json(KEYWORDS);
});

// 2. Settings config routes
app.get('/api/config', (req, res) => {
  res.json(db.getConfig());
});

app.post('/api/config', (req, res) => {
  const updatedConfig = db.saveConfig(req.body);
  res.json(updatedConfig);
});

app.post('/api/config/test-webhook', async (req, res) => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) {
    return res.status(400).json({ error: 'Webhook URL is required' });
  }

  try {
    const testPayload = {
      event: 'webhook_test',
      platform: 'linkedin',
      timestamp: new Date().toISOString(),
      message: 'Test message from SynQ Social Content Bot. Your webhook is connected correctly!',
      article: {
        id: 'art_test',
        title: 'Connecting the Dots: Authentic Digital Spaces',
        content: 'This is a test of the SynQ Social automated publishing webhook. When you publish an article, its full content and formatted social text will be sent here.',
        status: 'draft',
        keywords: ['decentralized social network', 'privacy chat app']
      },
      socialText: "Connecting the Dots: Authentic Digital Spaces\n\nThis is a test of the SynQ Social automated publishing webhook. When you publish an article, its full content and formatted social text will be sent here."
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      res.json({ success: true, status: response.status });
    } else {
      res.status(response.status).json({ 
        error: `Webhook returned status ${response.status} ${response.statusText}`
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Articles management CRUD
app.get('/api/articles', (req, res) => {
  res.json(db.getArticles());
});

app.get('/api/articles/:id', (req, res) => {
  const article = db.getArticle(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(article);
});

app.put('/api/articles/:id', (req, res) => {
  const current = db.getArticle(req.params.id);
  if (current && (current.status === 'draft_saved' || current.status === 'published')) {
    return res.status(400).json({ error: 'Published articles cannot be modified.' });
  }
  const updated = db.updateArticle(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(updated);
});

app.delete('/api/articles/:id', (req, res) => {
  const success = db.deleteArticle(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json({ success: true });
});

// Mock LinkedIn draft saving
app.post('/api/articles/:id/save-draft', async (req, res) => {
  const article = db.getArticle(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Update status in local database
  const updated = db.updateArticle(req.params.id, {
    status: 'draft_saved',
    savedAt: new Date().toISOString(),
    publishedPlatform: 'linkedin'
  });

  const config = db.getConfig();
  let webhookStatus = { triggered: false, success: false, error: null };

  // If a webhook URL is configured, trigger it
  if (config.webhookUrl) {
    webhookStatus.triggered = true;
    try {
      // Prepare a clean text version of the post for social media (stripping markdown or using AI social copy)
      let socialText = updated.socialText || '';
      if (!socialText) {
        const cleanBody = updated.content
          .replace(/^#\s+.+$/gm, '') // Remove top level title if present
          .replace(/^##+\s+(.+)$/gm, '\n* $1 *\n') // Simplify headers
          .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bolds
          .replace(/\*(.+?)\*/g, '$1') // Remove italics
          .trim();
        socialText = `${updated.title}\n\n${cleanBody}`;
      }

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'article_draft_saved',
          platform: 'linkedin',
          timestamp: new Date().toISOString(),
          article: updated,
          socialText: socialText
        })
      });

      if (response.ok) {
        webhookStatus.success = true;
        console.log(`Webhook triggered successfully for article: ${article.id}`);
      } else {
        webhookStatus.error = `Webhook returned status ${response.status} ${response.statusText}`;
        console.error(`Webhook returned error status ${response.status} for article: ${article.id}`);
      }
    } catch (err) {
      console.error('Webhook execution failed:', err.message);
      webhookStatus.error = err.message;
    }
  }

  res.json({
    success: true,
    article: updated,
    webhookStatus,
    message: webhookStatus.triggered 
      ? (webhookStatus.success ? 'Draft saved successfully and webhook triggered!' : `Draft saved locally, but webhook failed: ${webhookStatus.error}`)
      : 'Draft saved successfully to mock LinkedIn drafts!'
  });
});

// Mock SynQ Blog draft saving
app.post('/api/articles/:id/save-draft-synq', async (req, res) => {
  const article = db.getArticle(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Update status in local database
  const updated = db.updateArticle(req.params.id, {
    status: 'draft_saved',
    savedAt: new Date().toISOString(),
    publishedPlatform: 'synq-blog'
  });

  res.json({
    success: true,
    article: updated,
    message: 'Draft saved successfully to SynQ Blog!'
  });
});

// 4. AI Generation Route (Ollama Streaming)
app.post('/api/articles/generate', async (req, res) => {
  const { prompt, seoMetadata = {}, outline = null, keywords = [] } = req.body;
  
  const config = db.getConfig();
  const systemPrompt = getSystemPrompt(seoMetadata, outline, keywords);

  let userPrompt = prompt;
  if (!userPrompt) {
    if (seoMetadata.primaryKeyword) {
      userPrompt = `Write a complete, high-quality, human-like SEO article for the primary keyword "${seoMetadata.primaryKeyword}". Follow the approved outline structure, incorporate statistics and examples, auto-generate an FAQ block, and naturally integrate keywords.`;
    } else {
      return res.status(400).json({ error: 'Prompt or seoMetadata is required' });
    }
  }

  // Set headers for SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const reader = Readable.fromWeb(response.body);
    let fullResponseText = '';

    // Handle chunk processing
    reader.on('data', (chunk) => {
      const textChunk = chunk.toString();
      const lines = textChunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const word = parsed.message?.content || '';
          fullResponseText += word;
          
          // Write SSE data format
          res.write(`data: ${JSON.stringify({ text: word })}\n\n`);
        } catch (e) {
          // Parsing error on partial chunk line
        }
      }
    });

    reader.on('end', () => {
      // Analyze title and final keyword coverage
      let title = 'Untitled SynQ Post';
      let content = fullResponseText.trim();
      let metaDescription = '';

      // Parse Meta Description if enclosed in brackets
      const metaStartTag = '[META_DESCRIPTION_START]';
      const metaEndTag = '[META_DESCRIPTION_END]';
      if (content.includes(metaStartTag) && content.includes(metaEndTag)) {
        const startIdx = content.indexOf(metaStartTag) + metaStartTag.length;
        const endIdx = content.indexOf(metaEndTag);
        metaDescription = content.substring(startIdx, endIdx).trim();
        content = (content.substring(0, content.indexOf(metaStartTag)) + content.substring(endIdx + metaEndTag.length)).trim();
      } else if (outline && outline.metaDescription) {
        metaDescription = outline.metaDescription;
      }
      
      // Attempt to extract title from first line
      const lines = content.split('\n');
      if (lines[0] && lines[0].startsWith('#')) {
        title = lines[0].replace(/^#\s*/, '').trim();
        content = lines.slice(1).join('\n').trim();
      } else if (outline && outline.title) {
        title = outline.title;
      }

      const analyzedKeywords = analyzeKeywords(fullResponseText);

      // Parse Social Media Post if enclosed in brackets
      let socialText = '';
      const socialStartTag = '[SOCIAL_POST_START]';
      const socialEndTag = '[SOCIAL_POST_END]';
      if (content.includes(socialStartTag) && content.includes(socialEndTag)) {
        const startIdx = content.indexOf(socialStartTag) + socialStartTag.length;
        const endIdx = content.indexOf(socialEndTag);
        socialText = content.substring(startIdx, endIdx).trim();
        content = (content.substring(0, content.indexOf(socialStartTag)) + content.substring(endIdx + socialEndTag.length)).trim();
      }

      // Save as draft in local database
      const savedArticle = db.addArticle({
        title,
        content,
        prompt: userPrompt,
        history: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: fullResponseText }
        ],
        status: 'draft',
        keywords: analyzedKeywords,
        seoMetadata,
        outline,
        metaDescription,
        socialText
      });

      // Send the final result with saved db record
      res.write(`data: ${JSON.stringify({ done: true, article: savedArticle })}\n\n`);
      res.end();
    });

    reader.on('error', (err) => {
      console.error('Reader error:', err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Ollama communication error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Ollama is unreachable. Please verify Ollama is running and Llama 3.2:3b is pulled.' })}\n\n`);
    res.end();
  }
});

// 5. AI Refinement Route (Ollama Streaming)
app.post('/api/articles/:id/refine', async (req, res) => {
  const { id } = req.params;
  const { refinementPrompt } = req.body;

  if (!refinementPrompt) {
    return res.status(400).json({ error: 'Refinement prompt is required' });
  }

  const article = db.getArticle(id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  if (article.status === 'draft_saved' || article.status === 'published') {
    return res.status(400).json({ error: 'Published articles cannot be refined.' });
  }

  const config = db.getConfig();
  const systemPrompt = getSystemPrompt(article.seoMetadata || {}, article.outline || null, article.keywords || []);

  // Set headers for SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Construct dialogue context from previous history
    const conversation = [
      { role: 'system', content: systemPrompt }
    ];

    if (article.history && article.history.length > 0) {
      // Add existing history
      conversation.push(...article.history);
    } else {
      // Fallback if no history was saved
      conversation.push({ role: 'user', content: article.prompt || 'Generate SynQ Social article' });
      conversation.push({ role: 'assistant', content: `# ${article.title}\n\n${article.content}` });
    }

    // Append the refinement command
    conversation.push({
      role: 'user',
      content: `Refine the article based on these instructions: "${refinementPrompt}". Keep the brand personality, keep it in Markdown, and do not include conversational filler.`
    });

    const response = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: conversation,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const reader = Readable.fromWeb(response.body);
    let fullResponseText = '';

    reader.on('data', (chunk) => {
      const textChunk = chunk.toString();
      const lines = textChunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const word = parsed.message?.content || '';
          fullResponseText += word;
          
          res.write(`data: ${JSON.stringify({ text: word })}\n\n`);
        } catch (e) {
          // Chunk parse error
        }
      }
    });

    reader.on('end', () => {
      let title = article.title;
      let content = fullResponseText.trim();
      let metaDescription = article.metaDescription || '';

      // Parse Meta Description if enclosed in brackets
      const metaStartTag = '[META_DESCRIPTION_START]';
      const metaEndTag = '[META_DESCRIPTION_END]';
      if (content.includes(metaStartTag) && content.includes(metaEndTag)) {
        const startIdx = content.indexOf(metaStartTag) + metaStartTag.length;
        const endIdx = content.indexOf(metaEndTag);
        metaDescription = content.substring(startIdx, endIdx).trim();
        content = (content.substring(0, content.indexOf(metaStartTag)) + content.substring(endIdx + metaEndTag.length)).trim();
      }

      // Extract updated title if returned in Markdown style
      const lines = content.split('\n');
      if (lines[0] && lines[0].startsWith('#')) {
        title = lines[0].replace(/^#\s*/, '').trim();
        content = lines.slice(1).join('\n').trim();
      }

      // Parse Social Media Post if enclosed in brackets
      let socialText = article.socialText || '';
      const socialStartTag = '[SOCIAL_POST_START]';
      const socialEndTag = '[SOCIAL_POST_END]';
      if (content.includes(socialStartTag) && content.includes(socialEndTag)) {
        const startIdx = content.indexOf(socialStartTag) + socialStartTag.length;
        const endIdx = content.indexOf(socialEndTag);
        socialText = content.substring(startIdx, endIdx).trim();
        content = (content.substring(0, content.indexOf(socialStartTag)) + content.substring(endIdx + socialEndTag.length)).trim();
      }

      // Re-evaluate keywords
      const analyzedKeywords = analyzeKeywords(fullResponseText);

      // Append new generation steps to history
      const updatedHistory = [
        ...article.history,
        { role: 'user', content: refinementPrompt },
        { role: 'assistant', content: fullResponseText }
      ];

      // Update in local DB
      const updatedArticle = db.updateArticle(id, {
        title,
        content,
        history: updatedHistory,
        keywords: analyzedKeywords,
        metaDescription,
        socialText
      });

      res.write(`data: ${JSON.stringify({ done: true, article: updatedArticle })}\n\n`);
      res.end();
    });

    reader.on('error', (err) => {
      console.error('Reader error:', err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Ollama refinement error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Ollama is unreachable during refinement. Verify service status.' })}\n\n`);
    res.end();
  }
});

// Start the HTTP server
app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`  SYNQ SOCIAL CONTENT BOT IS RUNNING ON PORT ${PORT}`);
  console.log(`  Access dashboard: http://localhost:${PORT}`);
  console.log(`=============================================================`);
});
