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
// Generate the master system prompt containing brand values and reference guidelines
function getSystemPrompt(seoMetadata = {}, outline = null, legacyKeywords = []) {
  const primary = seoMetadata.primaryKeyword || '';
  const secondary = seoMetadata.secondaryKeywords || legacyKeywords || [];
  const tone = seoMetadata.brandTone || 'Philosophical & Rebellious';
  const audience = seoMetadata.targetAudience || 'Gen Z, Digital Natives';
  const intent = seoMetadata.searchIntent || 'Informational';
  const country = seoMetadata.targetCountry || 'United States';
  
  const keywordsList = [primary, ...secondary].filter(Boolean);
  const keywordString = keywordsList.length > 0
    ? keywordsList.map(kw => `- "${kw}"`).join('\n')
    : `Please weave in keywords relating to decentralized social networks, privacy chat applications, and alternatives to mainstream media.`;
  
  let structureInstructions = '';
  if (outline && outline.structure) {
    structureInstructions = `You MUST write the article following this approved outline structure exactly:\n${outline.structure}\n`;
  } else {
    structureInstructions = `You must write the article following this recommended SEO structure:
- Title (SEO Optimized)
- Meta Description
- H1
- Introduction (Hook, Problem, Solution)
- H2 Sections
- H3 Subsections
- Bullet points, tables, examples, statistics
- FAQ Section
- Conclusion
- CTA (Call to Action)`;
  }

  return `You are a visionary content creator and digital wellness philosopher writing articles, thought-pieces, and social media posts on behalf of the brand "SynQ Social".

SynQ Social Reference Guide:
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
- CRITICAL WRITING RULE: NEVER sound corporate, robotic, overly technical, like a startup VC pitch, or like generic Web3/crypto marketing. Do not use cringe or forced slang. Avoid repeated phrases and generic intros.
- Content Themes: Digital ownership, Privacy, Surveillance culture, Social media addiction, Internet psychology, Doomscrolling, Attention economy, Online identity, Digital wellbeing, Human connection, Decentralization, Future of the internet.

SEO Content Generation Specifications:
1. Target Audience: ${audience}
2. Search Intent Type: ${intent}
3. Target Country: ${country}
4. E-E-A-T Optimization: Include real examples, mock/real statistics, original insights, and trust signals naturally.
5. Content Freshness: Ensure the year used is 2026, incorporating current trends and latest statistics.

Structure instructions:
${structureInstructions}

Keyword Integration:
You must naturally, subtly, and contextually weave in the following keywords. Do NOT dump them all at once. They must read seamlessly and flow naturally within your cinematic paragraphs:
${keywordString}

Format & Output Style:
- Return your response strictly in Markdown.
- Start your response directly with the Meta Description block formatted exactly as:
[META_DESCRIPTION_START]
Your meta description goes here (140-160 characters).
[META_DESCRIPTION_END]
- Then immediately follow with the Article content starting with the H1 (e.g. "# The Ghost in the Machine...").
- Do NOT include any conversational intro/outro text (such as "Here is the article...").
`;
}

const OUTLINE_SYSTEM_PROMPT = `You are an expert SEO Content Strategist. Your task is to perform keyword analysis, detect search intent, perform basic competitor outline planning, generate semantic entities, and construct an optimized outline.
You must return your response strictly as a JSON object, with no other text, markdown wrapper, or conversational filler.
The JSON must follow this exact format:
{
  "detectedIntent": {
    "type": "Informational | Commercial | Transactional",
    "goal": "Teach | Compare | Convert"
  },
  "semanticKeywords": ["nlp keyword 1", "nlp keyword 2", "nlp keyword 3", "nlp keyword 4"],
  "outline": {
    "title": "SEO Optimized Title Suggestion",
    "metaDescription": "SEO Optimized Meta Description Suggestion (140-160 characters, with primary keyword and CTA)",
    "structure": "Markdown list of the outline including H1, Introduction (Hook, Problem, Solution), H2/H3 headings, FAQ sections, Conclusion, and CTA"
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

// Mock LinkedIn publishing
app.post('/api/articles/:id/publish', async (req, res) => {
  const article = db.getArticle(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Update status in local database
  const updated = db.updateArticle(req.params.id, {
    status: 'published',
    publishedAt: new Date().toISOString()
  });

  const config = db.getConfig();
  let webhookStatus = { triggered: false, success: false, error: null };

  // If a webhook URL is configured, trigger it
  if (config.webhookUrl) {
    webhookStatus.triggered = true;
    try {
      // Prepare a clean text version of the post for social media (stripping markdown)
      const cleanBody = updated.content
        .replace(/^#\s+.+$/gm, '') // Remove top level title if present
        .replace(/^##+\s+(.+)$/gm, '\n* $1 *\n') // Simplify headers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bolds
        .replace(/\*(.+?)\*/g, '$1') // Remove italics
        .trim();
      const socialText = `${updated.title}\n\n${cleanBody}`;

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'article_published',
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
      ? (webhookStatus.success ? 'Published successfully and webhook triggered!' : `Published locally, but webhook failed: ${webhookStatus.error}`)
      : 'Published successfully to mock LinkedIn feed!'
  });
});

// 3.5. AI SEO Outline Planning Route
app.post('/api/articles/plan-outline', async (req, res) => {
  const { seoMetadata } = req.body;
  if (!seoMetadata || !seoMetadata.primaryKeyword) {
    return res.status(400).json({ error: 'Primary Keyword is required in seoMetadata' });
  }

  const config = db.getConfig();
  const userPrompt = `Please plan the SEO strategy and outline for:
Primary Keyword: ${seoMetadata.primaryKeyword}
Secondary Keywords: ${seoMetadata.secondaryKeywords ? seoMetadata.secondaryKeywords.join(', ') : 'None'}
Target Audience: ${seoMetadata.targetAudience || 'General'}
Search Intent: ${seoMetadata.searchIntent || 'Not specified'}
Content Type: ${seoMetadata.contentType || 'Blog Post'}
Target Country: ${seoMetadata.targetCountry || 'Global'}
Competitor URLs: ${seoMetadata.competitorUrls ? seoMetadata.competitorUrls.join(', ') : 'None'}
Brand Tone: ${seoMetadata.brandTone || 'Philosophical & Rebellious'}
`;

  try {
    const response = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: OUTLINE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.message?.content || '';
    
    let jsonResult;
    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : resultText;
      jsonResult = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse outline JSON, raw text:', resultText);
      jsonResult = {
        detectedIntent: {
          type: seoMetadata.searchIntent || "Informational",
          goal: "Teach"
        },
        semanticKeywords: ["privacy first network", "anonymous platform", "decentralized ecosystem"],
        outline: {
          title: `Optimized: ${seoMetadata.primaryKeyword}`,
          metaDescription: `Discover the details about ${seoMetadata.primaryKeyword}. Learn more here!`,
          structure: `# H1: ${seoMetadata.primaryKeyword}\n## Introduction\n- Hook\n- Problem\n- Solution\n## Key Aspects of ${seoMetadata.primaryKeyword}\n## FAQ Section\n## Conclusion`
        }
      };
    }

    res.json(jsonResult);
  } catch (error) {
    console.error('Outline planning error:', error);
    res.status(500).json({ error: 'Ollama is unreachable or failed to plan outline.' });
  }
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
        metaDescription
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
        metaDescription
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
