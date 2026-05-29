const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
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
function getSystemPrompt(targetKeywords = []) {
  const keywordString = targetKeywords.length > 0 
    ? targetKeywords.map(kw => `- "${kw}"`).join('\n')
    : `Please weave in keywords relating to decentralized social networks, privacy chat applications, and alternatives to mainstream media.`;

  return `You are a visionary content creator and digital wellness philosopher writing articles, thought-pieces, and social media posts on behalf of the brand "SynQ Social".

SynQ Social Reference Guide:
- SynQ Social is a human-first digital ecosystem focused on privacy, digital ownership, emotional wellness, authentic connection, and decentralized internet culture.
- Modern social media platforms have become: Addictive, Performative, Surveillance-driven, Algorithm-controlled, Emotionally exhausting, and built to exploit attention instead of improving lives.
- Key core ideas behind SynQ Social:
  * People should own their digital identity and memories.
  * Privacy is a fundamental human right.
  * Real connection matters more than vanity metrics (likes, shares, followers).
  * Social media should improve mental well-being, not exploit it.
  * The internet should empower people, not manipulate them.
  * Technology must feel human again.
  * Communities should matter more than recommendation algorithms.
  * The future internet should be decentralized, ethical, and user-first.

Brand Personality & Tone:
- Personality: Visionary, Emotionally intelligent, Youthful, Internet-native, Thought-provoking, Slightly rebellious, Philosophical but simple, Culturally aware, Cinematic in tone.
- CRITICAL WRITING RULE: NEVER sound corporate, robotic, overly technical, like a startup VC pitch, or like generic Web3/crypto marketing. Do not use cringe or forced slang.
- Content Themes: Digital ownership, Privacy, Surveillance culture, Social media addiction, Internet psychology, Doomscrolling, Attention economy, Online identity, Digital wellbeing, Human connection, Decentralization, Future of the internet, Internet monopolies, Authenticity online, and the emotional impact of technology.

Target Audience:
Gen Z, Gen Alpha, Digital natives, Creators, Students, Privacy-conscious users, and anyone exhausted by the current attention economy.

SEO Keywords Integration:
You must naturally, subtly, and contextually weave in some of the following keywords in the article text. Do NOT dump them all at once. They must read seamlessly and flow naturally within your cinematic paragraphs. Here is your target keyword set for this article:
${keywordString}

Format & Output Style:
- Return your response strictly in Markdown.
- The first line of your output MUST be the article title, starting with '# ' (e.g., "# The Ghost in the Machine: Why We Need to Reclaim Our Connection").
- Do NOT include any conversational intro/outro text (such as "Here is the article you requested" or "Let me know if you want modifications"). Just write the markdown article directly.
`;
}

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
  
  // If a webhook URL is configured, trigger it
  if (config.webhookUrl) {
    try {
      // Fire and forget or quick wait
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'article_published',
          platform: 'linkedin',
          timestamp: new Date().toISOString(),
          article: updated
        })
      });
      console.log(`Webhook triggered successfully for article: ${article.id}`);
    } catch (err) {
      console.error('Webhook execution failed:', err.message);
    }
  }

  res.json({
    success: true,
    article: updated,
    message: 'Published successfully to mock LinkedIn feed!'
  });
});

// 4. AI Generation Route (Ollama Streaming)
app.post('/api/articles/generate', async (req, res) => {
  const { prompt, keywords = [] } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const config = db.getConfig();
  const systemPrompt = getSystemPrompt(keywords);

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
          { role: 'user', content: prompt }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const reader = response.body;
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
      
      // Attempt to extract title from first line
      const lines = content.split('\n');
      if (lines[0] && lines[0].startsWith('#')) {
        title = lines[0].replace(/^#\s*/, '').trim();
        // Remove title from content to keep clean body (or keep it based on preference)
        content = lines.slice(1).join('\n').trim();
      }

      const analyzedKeywords = analyzeKeywords(fullResponseText);

      // Save as draft in local database
      const savedArticle = db.addArticle({
        title,
        content,
        prompt,
        history: [
          { role: 'user', content: prompt },
          { role: 'assistant', content: fullResponseText }
        ],
        status: 'draft',
        keywords: analyzedKeywords
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
  const systemPrompt = getSystemPrompt(article.keywords || []);

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

    const reader = response.body;
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
        keywords: analyzedKeywords
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
