/* ==========================================================================
   SYNQ SOCIAL CLIENT APPLICATION LOGIC
   ========================================================================== */

// Global Application State
const state = {
  currentTab: 'generator',
  config: {
    ollamaUrl: 'http://localhost:11434',
    model: 'llama3.2:3b',
    authorName: 'SynQ Social Explorer',
    authorTitle: 'Digital Wellness Advocate, SynQ Social',
    webhookUrl: ''
  },
  keywords: {}, // Populated from server
  selectedKeywords: new Set(),
  activeArticle: null, // Currently loaded article in workspace
  editorMode: 'edit', // 'edit' or 'preview'
  articles: [] // Loaded from DB
};

// Inspiring quotes to cycle through during loading overlay
const WRITING_QUOTES = [
  "\"Privacy is not about having something to hide. It is about having something to protect.\"",
  "\"We build technology to amplify humanity, not attention metrics.\"",
  "\"In an attention economy, silence and ownership are revolutionary acts.\"",
  "\"Own your memories. Protect your conversations. Be human.\"",
  "\"Algorithms should serve communities, not manipulate them.\"",
  "\"Reclaiming our digital identity begins with reclaiming our focus.\""
];
let quoteInterval = null;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  initLucide();
  await loadConfig();
  await loadKeywords();
  await refreshLibrary();
  setupEventListeners();
  updateStats();
});

// Init Lucide Icons
function initLucide() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --------------------------------------------------------------------------
// API CLIENT WRAPPERS
// --------------------------------------------------------------------------

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      state.config = await res.json();
      applyConfigToUI();
    }
  } catch (err) {
    showToast('Failed to load configuration.', 'error');
  }
}

function applyConfigToUI() {
  // Settings Panel Inputs
  document.getElementById('settings-ollama-url').value = state.config.ollamaUrl;
  document.getElementById('settings-ollama-model').value = state.config.model;
  document.getElementById('settings-webhook-url').value = state.config.webhookUrl || '';
  document.getElementById('settings-author-name').value = state.config.authorName;
  document.getElementById('settings-author-title').value = state.config.authorTitle;

  // Header System Status Label
  document.querySelector('.status-label').innerText = `Ollama ${state.config.model} Active`;

  // Profile Preview Card
  document.getElementById('aps-preview-name').innerText = state.config.authorName;
  document.getElementById('aps-preview-title').innerText = state.config.authorTitle;
}

async function loadKeywords() {
  try {
    const res = await fetch('/api/keywords');
    if (res.ok) {
      state.keywords = await res.json();
      renderKeywordSelectors();
    }
  } catch (err) {
    showToast('Failed to fetch SEO keywords.', 'error');
  }
}

async function refreshLibrary() {
  try {
    const res = await fetch('/api/articles');
    if (res.ok) {
      state.articles = await res.json();
      renderLibraryArticles();
      updateStats();
    }
  } catch (err) {
    showToast('Failed to sync library drafts.', 'error');
  }
}

// --------------------------------------------------------------------------
// KEYWORDS ACCORDION & CHECKBOX SELECTORS
// --------------------------------------------------------------------------

function renderKeywordSelectors() {
  const container = document.getElementById('keywords-accordion');
  container.innerHTML = '';

  const categories = [
    { key: 'decentralized', label: 'Decentralized Social / Web3' },
    { key: 'privacy', label: 'Privacy & Secure Chat' },
    { key: 'alternatives', label: 'Platform Alternatives' }
  ];

  categories.forEach(cat => {
    const section = document.createElement('div');
    section.className = 'kw-cat-section';

    // Header
    const header = document.createElement('div');
    header.className = 'kw-cat-header';
    header.innerHTML = `<span>${cat.label}</span> <i data-lucide="chevron-down"></i>`;
    header.addEventListener('click', () => {
      header.classList.toggle('collapsed');
      list.classList.toggle('collapsed');
    });

    // Checklist
    const list = document.createElement('div');
    list.className = 'kw-cat-list';
    
    // Add keywords
    const keywordsList = state.keywords[cat.key] || [];
    keywordsList.forEach(kw => {
      const label = document.createElement('label');
      label.className = 'kw-item-checkbox';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = kw;
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          state.selectedKeywords.add(kw);
        } else {
          state.selectedKeywords.delete(kw);
        }
        updateSelectedKeywordsCount();
        updateKeywordTracker();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(` ${kw}`));
      list.appendChild(label);
    });

    section.appendChild(header);
    section.appendChild(list);
    container.appendChild(section);
  });

  initLucide();
}

function updateSelectedKeywordsCount() {
  const countSpan = document.getElementById('kw-selected-count');
  countSpan.innerText = `${state.selectedKeywords.size} selected`;
}

// --------------------------------------------------------------------------
// LIVE KEYWORD COVERAGE TRACKER (RIGHT SIDEBAR)
// --------------------------------------------------------------------------

function updateKeywordTracker() {
  const container = document.getElementById('tracker-keywords-container');
  const countMatched = document.getElementById('kw-tracker-matched');
  const countTotal = document.getElementById('kw-tracker-total');
  const progressBar = document.getElementById('kw-tracker-progress');

  if (state.selectedKeywords.size === 0) {
    container.innerHTML = `<div class="text-muted text-center" style="padding: 20px 0;">No target keywords selected.</div>`;
    countMatched.innerText = '0';
    countTotal.innerText = '0';
    progressBar.style.width = '0%';
    return;
  }

  container.innerHTML = '';
  
  // Get text content of active editor
  const text = document.getElementById('article-editor-textarea').value.toLowerCase();
  let matchedCount = 0;

  state.selectedKeywords.forEach(kw => {
    const isMatched = text.includes(kw.toLowerCase());
    if (isMatched) matchedCount++;

    const item = document.createElement('div');
    item.className = `tracker-kw-item ${isMatched ? 'matched' : 'unmatched'}`;
    item.innerHTML = `
      <span>${kw}</span>
      <i data-lucide="${isMatched ? 'check-circle' : 'circle'}"></i>
    `;
    
    // Quick copy helper on click
    item.addEventListener('click', () => {
      navigator.clipboard.writeText(kw);
      showToast(`Copied "${kw}" to clipboard!`);
    });

    container.appendChild(item);
  });

  countMatched.innerText = matchedCount;
  countTotal.innerText = state.selectedKeywords.size;
  
  const percentage = Math.round((matchedCount / state.selectedKeywords.size) * 100);
  progressBar.style.width = `${percentage}%`;

  // Update top bar stat as well
  document.getElementById('stats-keywords').innerText = `${percentage}%`;
  initLucide();
}

// --------------------------------------------------------------------------
// MARKDOWN RENDERING HELPER
// --------------------------------------------------------------------------

function parseMarkdown(md) {
  if (!md) return '';
  let html = md;

  // Escape HTML tags to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold / Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Unordered Lists
  html = html.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
  // Wrap sequential <li> tags in <ul>
  html = html.replace(/(<li>.+?<\/li>)+/gs, '<ul>$&</ul>');

  // Paragraph breaks (two newlines to paragraph tags, simple line breaks)
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap inside outer paragraph if not already block-wrapped
  if (!html.startsWith('<h') && !html.startsWith('<blockquote') && !html.startsWith('<ul')) {
    html = `<p>${html}</p>`;
  }

  // Remove empty paragraphs
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

// --------------------------------------------------------------------------
// MAIN EDITOR & TOOLBAR CONTROLS
// --------------------------------------------------------------------------

function setEditorMode(mode) {
  state.editorMode = mode;
  const editBtn = document.getElementById('tb-edit-tab');
  const prevBtn = document.getElementById('tb-preview-tab');
  const textarea = document.getElementById('article-editor-textarea');
  const previewer = document.getElementById('article-markdown-preview');

  if (mode === 'edit') {
    editBtn.classList.add('active');
    prevBtn.classList.remove('active');
    textarea.classList.remove('hidden');
    previewer.classList.add('hidden');
    textarea.focus();
  } else {
    editBtn.classList.remove('active');
    prevBtn.classList.add('active');
    textarea.classList.add('hidden');
    previewer.classList.remove('hidden');

    // Parse and render MD
    previewer.innerHTML = parseMarkdown(textarea.value);
  }
}

function updateWordCount() {
  const text = document.getElementById('article-editor-textarea').value;
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('editor-word-count').innerText = `${count} words`;
}

// Load draft into active workspace
function loadArticleIntoWorkspace(article) {
  state.activeArticle = article;
  
  // Set input fields
  document.getElementById('article-title-input').value = article.title;
  document.getElementById('article-title-input').readOnly = false;
  document.getElementById('article-editor-textarea').value = article.content;
  
  // Setup editor mode
  setEditorMode('edit');
  updateWordCount();

  // Reset selected keywords and select keywords from database
  state.selectedKeywords.clear();
  // Clear HTML checkboxes
  const checkBoxes = document.querySelectorAll('#keywords-accordion input[type="checkbox"]');
  checkBoxes.forEach(cb => {
    cb.checked = false;
    if (article.keywords && article.keywords.includes(cb.value)) {
      cb.checked = true;
      state.selectedKeywords.add(cb.value);
    }
  });

  updateSelectedKeywordsCount();
  updateKeywordTracker();

  // Show refinement panel
  document.getElementById('refinement-container').classList.remove('hidden');
  renderRefinementHistory();

  // Enable action buttons
  document.getElementById('btn-save-draft').disabled = false;
  document.getElementById('btn-preview-publish').disabled = false;

  // Un-hide workspace if empty
  document.getElementById('editor-empty').classList.add('hidden');
  document.getElementById('editor-wrapper').classList.remove('hidden');

  // Scroll viewport to top
  document.querySelector('.content-viewport').scrollTop = 0;
  showToast(`Loaded "${article.title}" into workspace.`);
}

function renderRefinementHistory() {
  const historyList = document.getElementById('refinement-history-list');
  historyList.innerHTML = '';
  
  if (!state.activeArticle || !state.activeArticle.history) return;

  // Group refinement chats (skipping initial system prompt if inside)
  const prompts = state.activeArticle.history.filter(item => item.role === 'user');
  
  prompts.forEach((prompt, index) => {
    const bubble = document.createElement('div');
    bubble.className = 'history-bubble user-prompt';
    bubble.innerHTML = `<span>Prompt #${index + 1}:</span> ${prompt.content}`;
    historyList.appendChild(bubble);
  });

  // Scroll to bottom of history
  historyList.scrollTop = historyList.scrollHeight;
}

// --------------------------------------------------------------------------
// STREAMING GENERATION ENGINE
// --------------------------------------------------------------------------

function startLoadingOverlay(statusText) {
  const overlay = document.getElementById('editor-loading');
  overlay.querySelector('.loading-status-text').innerText = statusText;
  overlay.classList.remove('hidden');

  // Cycle inspiring quotes
  const quoteEl = document.getElementById('loading-quote');
  let index = 0;
  quoteEl.innerText = WRITING_QUOTES[0];
  
  quoteInterval = setInterval(() => {
    index = (index + 1) % WRITING_QUOTES.length;
    quoteEl.innerText = WRITING_QUOTES[index];
  }, 3500);
}

function stopLoadingOverlay() {
  clearInterval(quoteInterval);
  document.getElementById('editor-loading').classList.add('hidden');
}

// --------------------------------------------------------------------------
// APP CONTROLLER EVENT ACTIONS
// --------------------------------------------------------------------------

async function handleGenerateArticle() {
  const prompt = document.getElementById('prompt-input').value.trim();
  if (!prompt) {
    showToast('Please specify a theme prompt.', 'warning');
    return;
  }

  // Clear workspace for fresh generation
  document.getElementById('article-title-input').value = 'Weaving content...';
  document.getElementById('article-editor-textarea').value = '';
  document.getElementById('editor-empty').classList.add('hidden');
  document.getElementById('editor-wrapper').classList.remove('hidden');
  document.getElementById('refinement-container').classList.add('hidden');
  updateWordCount();

  startLoadingOverlay('Consulting Ollama Llama 3.2...');

  try {
    const response = await fetch('/api/articles/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        keywords: Array.from(state.selectedKeywords)
      })
    });

    if (!response.ok) {
      throw new Error(`Generation failed with HTTP status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep last incomplete line in buffer

      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('data: ')) {
          const rawData = cleanLine.slice(6);
          try {
            const parsed = JSON.parse(rawData);
            
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            
            if (parsed.text) {
              accumulatedText += parsed.text;
              // Render title / content splits in real-time
              const linesSplit = accumulatedText.split('\n');
              let title = 'Weaving content...';
              let body = accumulatedText;

              if (linesSplit[0] && linesSplit[0].startsWith('#')) {
                title = linesSplit[0].replace(/^#\s*/, '').trim();
                body = linesSplit.slice(1).join('\n').trim();
              }
              
              document.getElementById('article-title-input').value = title;
              document.getElementById('article-editor-textarea').value = body;
              updateWordCount();
              updateKeywordTracker();
            }

            if (parsed.done && parsed.article) {
              state.activeArticle = parsed.article;
              loadArticleIntoWorkspace(parsed.article);
              await refreshLibrary();
              showToast('Article generated successfully!', 'success');
            }

          } catch (e) {
            // Json parse error on partial lines
          }
        }
      }
    }

  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('editor-empty').classList.remove('hidden');
    document.getElementById('editor-wrapper').classList.add('hidden');
  } finally {
    stopLoadingOverlay();
  }
}

async function handleRefineArticle() {
  if (!state.activeArticle) return;
  const refinementPrompt = document.getElementById('refine-prompt-input').value.trim();
  
  if (!refinementPrompt) {
    showToast('Please type a refinement request.', 'warning');
    return;
  }

  document.getElementById('refine-prompt-input').value = '';
  startLoadingOverlay('Regenerating draft sections...');

  try {
    const response = await fetch(`/api/articles/${state.activeArticle.id}/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refinementPrompt })
    });

    if (!response.ok) {
      throw new Error(`Refinement request failed with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('data: ')) {
          const rawData = cleanLine.slice(6);
          try {
            const parsed = JSON.parse(rawData);
            
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.text) {
              accumulatedText += parsed.text;
              const linesSplit = accumulatedText.split('\n');
              let title = state.activeArticle.title;
              let body = accumulatedText;

              if (linesSplit[0] && linesSplit[0].startsWith('#')) {
                title = linesSplit[0].replace(/^#\s*/, '').trim();
                body = linesSplit.slice(1).join('\n').trim();
              }

              document.getElementById('article-title-input').value = title;
              document.getElementById('article-editor-textarea').value = body;
              updateWordCount();
              updateKeywordTracker();
            }

            if (parsed.done && parsed.article) {
              state.activeArticle = parsed.article;
              loadArticleIntoWorkspace(parsed.article);
              await refreshLibrary();
              showToast('Article refined successfully!', 'success');
            }

          } catch (e) {}
        }
      }
    }

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    stopLoadingOverlay();
  }
}

async function handleSaveDraft() {
  if (!state.activeArticle) return;
  
  const title = document.getElementById('article-title-input').value.trim();
  const content = document.getElementById('article-editor-textarea').value;

  try {
    const res = await fetch(`/api/articles/${state.activeArticle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        keywords: Array.from(state.selectedKeywords)
      })
    });

    if (res.ok) {
      const updated = await res.json();
      state.activeArticle = updated;
      await refreshLibrary();
      showToast('Draft saved successfully.', 'success');
    }
  } catch (err) {
    showToast('Failed to save draft content.', 'error');
  }
}

async function handleDeleteArticle(id, title) {
  if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

  try {
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (state.activeArticle && state.activeArticle.id === id) {
        // Reset editor
        state.activeArticle = null;
        document.getElementById('editor-empty').classList.remove('hidden');
        document.getElementById('editor-wrapper').classList.add('hidden');
        document.getElementById('refinement-container').classList.add('hidden');
        document.getElementById('article-title-input').value = '';
        document.getElementById('article-editor-textarea').value = '';
      }
      await refreshLibrary();
      showToast('Article deleted.', 'info');
    }
  } catch (err) {
    showToast('Failed to delete article.', 'error');
  }
}

// --------------------------------------------------------------------------
// SOCIAL MEDIA PUBLISHING PREVIEW MODAL
// --------------------------------------------------------------------------

function openPublishModal() {
  if (!state.activeArticle) return;

  // Title and Content loading
  const title = document.getElementById('article-title-input').value.trim();
  const rawContent = document.getElementById('article-editor-textarea').value;

  // Setup authors profile details
  document.getElementById('li-post-author').innerText = state.config.authorName;
  document.getElementById('li-post-title').innerText = state.config.authorTitle;
  
  const initials = state.config.authorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('li-post-avatar').innerText = initials;

  // Render content preview inside LinkedIn card
  document.getElementById('li-post-headline-text').innerText = title;
  
  // Format body text with simple markdown converter for a LinkedIn feed style
  const bodyText = rawContent
    .replace(/^#\s+.+$/gm, '') // Remove top level title if present
    .replace(/^##+\s+(.+)$/gm, '\n* $1 *\n') // Simplify headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bolds
    .replace(/\*(.+?)\*/g, '$1');

  document.getElementById('li-post-body-text').innerText = bodyText.trim();

  // Show Modal
  document.getElementById('publish-modal').classList.remove('hidden');
  initLucide();
}

function closePublishModal() {
  document.getElementById('publish-modal').classList.add('hidden');
}

async function handleConfirmPublish() {
  if (!state.activeArticle) return;

  try {
    const res = await fetch(`/api/articles/${state.activeArticle.id}/publish`, {
      method: 'POST'
    });

    if (res.ok) {
      const data = await res.json();
      state.activeArticle = data.article;
      
      closePublishModal();
      await refreshLibrary();
      
      if (data.webhookStatus && data.webhookStatus.triggered) {
        if (data.webhookStatus.success) {
          showToast('Published successfully! LinkedIn webhook triggered.', 'success');
        } else {
          showToast(`Published locally, but webhook failed: ${data.webhookStatus.error}`, 'error');
        }
      } else {
        showToast('Published successfully to LinkedIn (mock mode, no webhook URL).', 'success');
      }
      
      // Trigger celebrate confetti!
      triggerConfetti();
    } else {
      const errData = await res.json();
      showToast(errData.error || 'Error publishing article.', 'error');
    }
  } catch (err) {
    showToast('Error publishing article to social webhook.', 'error');
  }
}

function handleCopyPostText() {
  const headline = document.getElementById('li-post-headline-text').innerText;
  const body = document.getElementById('li-post-body-text').innerText;
  const fullPostText = `${headline}\n\n${body}`;

  navigator.clipboard.writeText(fullPostText);
  showToast('LinkedIn post text copied!', 'success');
}

// --------------------------------------------------------------------------
// SETTINGS EVENT ACTIONS
// --------------------------------------------------------------------------

async function handleSaveSettings() {
  const ollamaUrl = document.getElementById('settings-ollama-url').value.trim();
  const model = document.getElementById('settings-ollama-model').value.trim();
  const webhookUrl = document.getElementById('settings-webhook-url').value.trim();
  const authorName = document.getElementById('settings-author-name').value.trim();
  const authorTitle = document.getElementById('settings-author-title').value.trim();

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ollamaUrl, model, webhookUrl, authorName, authorTitle })
    });

    if (res.ok) {
      state.config = await res.json();
      applyConfigToUI();
      showToast('Settings saved successfully.', 'success');
    }
  } catch (err) {
    showToast('Failed to save settings.', 'error');
  }
}

async function handleTestWebhook() {
  const webhookUrl = document.getElementById('settings-webhook-url').value.trim();
  if (!webhookUrl) {
    showToast('Please enter a Webhook URL to test.', 'warning');
    return;
  }

  const testBtn = document.getElementById('btn-test-webhook');
  const originalText = testBtn.innerHTML;
  testBtn.disabled = true;
  testBtn.innerHTML = '<i class="loading-spinner-inline" style="display:inline-block; width:10px; height:10px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite; margin-right:6px;"></i> Testing...';

  try {
    const res = await fetch('/api/config/test-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl })
    });

    if (res.ok) {
      showToast('Webhook integration test succeeded!', 'success');
    } else {
      const errData = await res.json();
      showToast(`Webhook test failed: ${errData.error || res.statusText}`, 'error');
    }
  } catch (err) {
    showToast(`Webhook test failed: ${err.message}`, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.innerHTML = originalText;
  }
}

// --------------------------------------------------------------------------
// LIBRARY VIEWS RENDERER
// --------------------------------------------------------------------------

function renderLibraryArticles() {
  const grid = document.getElementById('library-articles-grid');
  grid.innerHTML = '';

  const filterBtn = document.querySelector('.library-filters .filter-btn.active');
  const filter = filterBtn ? filterBtn.getAttribute('data-filter') : 'all';
  const query = document.getElementById('library-search-input').value.toLowerCase().trim();

  let filtered = state.articles;

  // Filter by status
  if (filter !== 'all') {
    filtered = filtered.filter(art => art.status === filter);
  }

  // Filter by search query
  if (query) {
    filtered = filtered.filter(art => {
      const matchTitle = art.title.toLowerCase().includes(query);
      const matchContent = art.content.toLowerCase().includes(query);
      const matchPrompt = art.prompt && art.prompt.toLowerCase().includes(query);
      const matchKeywords = art.keywords && art.keywords.some(kw => kw.toLowerCase().includes(query));
      return matchTitle || matchContent || matchPrompt || matchKeywords;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="card text-center" style="grid-column: 1 / -1; padding: 40px 20px;">
        <i data-lucide="inbox" style="width: 32px; height: 32px; color: var(--text-dim); margin-bottom: 12px;"></i>
        <h4 style="color: #fff;">No articles found</h4>
        <p class="text-muted" style="font-size: 13px; margin-top: 4px;">Start by generating a new piece using the AI Generator workspace.</p>
      </div>
    `;
    initLucide();
    return;
  }

  filtered.forEach(art => {
    const card = document.createElement('div');
    card.className = 'article-card card';

    const date = new Date(art.updatedAt || art.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const cleanSnippet = art.content.replace(/^#.*$/gm, '').replace(/[\*\#\>]/g, '').trim();

    card.innerHTML = `
      <div class="article-card-header">
        <span class="status-badge ${art.status}">
          <i data-lucide="${art.status === 'published' ? 'check-circle-2' : 'file-edit'}"></i>
          <span>${art.status}</span>
        </span>
        <span class="article-card-date">${date}</span>
      </div>
      <h3 class="article-card-title">${art.title}</h3>
      <p class="article-card-snippet">${cleanSnippet || 'No content yet...'}</p>
      <div class="article-card-footer">
        <span class="card-kw-count">${art.keywords ? art.keywords.length : 0} keywords</span>
        <div class="article-actions">
          <button class="action-icon-btn btn-edit" title="Load into Editor"><i data-lucide="edit"></i></button>
          <button class="action-icon-btn btn-publish-preview" title="Preview & Publish"><i data-lucide="share-2"></i></button>
          <button class="action-icon-btn btn-delete" title="Delete Article"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `;

    // Hook buttons
    card.querySelector('.btn-edit').addEventListener('click', () => {
      switchTab('generator');
      loadArticleIntoWorkspace(art);
    });

    card.querySelector('.btn-publish-preview').addEventListener('click', () => {
      state.activeArticle = art;
      openPublishModal();
    });

    card.querySelector('.btn-delete').addEventListener('click', () => {
      handleDeleteArticle(art.id, art.title);
    });

    grid.appendChild(card);
  });

  initLucide();
}

// --------------------------------------------------------------------------
// GLOBAL STATS DASHBOARD UPDATE
// --------------------------------------------------------------------------

function updateStats() {
  const drafts = state.articles.filter(art => art.status === 'draft').length;
  const published = state.articles.filter(art => art.status === 'published').length;

  document.getElementById('stats-drafts').innerText = drafts;
  document.getElementById('stats-published').innerText = published;
  document.getElementById('library-count').innerText = state.articles.length;

  // Compute overall match percentage across all articles
  if (state.activeArticle) {
    updateKeywordTracker();
  } else {
    document.getElementById('stats-keywords').innerText = '0%';
  }
}

// --------------------------------------------------------------------------
// APP TABS CONTROLLER
// --------------------------------------------------------------------------

function switchTab(tabId) {
  state.currentTab = tabId;

  // Update navbar active state
  document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    }
  });

  // Switch display viewport tabs
  document.querySelectorAll('.content-viewport .tab-content').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(`tab-${tabId}`).classList.add('active');

  // Page header texts
  const title = document.getElementById('page-title');
  const subtitle = document.getElementById('page-subtitle');

  if (tabId === 'generator') {
    title.innerText = 'Content Workspace';
    subtitle.innerText = 'Draft, refine, and publish cinematic content in favor of SynQ Social';
    if (state.activeArticle) {
      updateKeywordTracker();
    }
  } else if (tabId === 'library') {
    title.innerText = 'Articles Library';
    subtitle.innerText = 'Review generated articles, organize your drafts and manage published items';
    refreshLibrary();
  } else if (tabId === 'settings') {
    title.innerText = 'Platform Settings';
    subtitle.innerText = 'Configure LLM model details, webhook hooks, and your mock writer profiles';
  }
}

// --------------------------------------------------------------------------
// EVENT LISTENERS REGISTER
// --------------------------------------------------------------------------

function setupEventListeners() {
  // Sidebar tab click
  document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // Clear Keywords selection
  document.getElementById('kw-clear-all').addEventListener('click', () => {
    state.selectedKeywords.clear();
    document.querySelectorAll('#keywords-accordion input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
    updateSelectedKeywordsCount();
    updateKeywordTracker();
    showToast('Cleared all selected target keywords.');
  });

  // Editor Key Press events for live word count and keyword matching
  const editorTextArea = document.getElementById('article-editor-textarea');
  editorTextArea.addEventListener('input', () => {
    updateWordCount();
    updateKeywordTracker();
  });

  // Title typing event to update active state
  const titleInput = document.getElementById('article-title-input');
  titleInput.addEventListener('input', () => {
    if (state.activeArticle) {
      state.activeArticle.title = titleInput.value.trim();
    }
  });

  // Editor Toolbar Tabs
  document.getElementById('tb-edit-tab').addEventListener('click', () => setEditorMode('edit'));
  document.getElementById('tb-preview-tab').addEventListener('click', () => setEditorMode('preview'));

  // Generate Button Click
  document.getElementById('btn-generate-article').addEventListener('click', handleGenerateArticle);

  // Refine Button click / Enter Key Press
  document.getElementById('btn-refine-article').addEventListener('click', handleRefineArticle);
  document.getElementById('refine-prompt-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRefineArticle();
  });

  // Save Draft Button
  document.getElementById('btn-save-draft').addEventListener('click', handleSaveDraft);

  // Preview & Publish trigger
  document.getElementById('btn-preview-publish').addEventListener('click', openPublishModal);

  // Modal Actions
  document.getElementById('btn-close-modal').addEventListener('click', closePublishModal);
  document.getElementById('btn-copy-post-text').addEventListener('click', handleCopyPostText);
  document.getElementById('btn-confirm-publish').addEventListener('click', handleConfirmPublish);

  // Settings Actions
  document.getElementById('btn-save-settings').addEventListener('click', handleSaveSettings);
  document.getElementById('btn-test-webhook').addEventListener('click', handleTestWebhook);

  // Webhook guide toggle
  const toggleBtn = document.getElementById('toggle-webhook-schema');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const content = document.getElementById('webhook-schema-content');
      const chevron = document.getElementById('schema-chevron');
      if (content && chevron) {
        content.classList.toggle('hidden');
        if (content.classList.contains('hidden')) {
          chevron.style.transform = 'rotate(0deg)';
        } else {
          chevron.style.transform = 'rotate(180deg)';
        }
      }
    });
  }

  // Profile fields sync on typing
  document.getElementById('settings-author-name').addEventListener('input', (e) => {
    document.getElementById('aps-preview-name').innerText = e.target.value;
  });
  document.getElementById('settings-author-title').addEventListener('input', (e) => {
    document.getElementById('aps-preview-title').innerText = e.target.value;
  });

  // Library views filters
  document.querySelectorAll('.library-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.library-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLibraryArticles();
    });
  });

  document.getElementById('library-search-input').addEventListener('input', renderLibraryArticles);
}

// --------------------------------------------------------------------------
// UI NOTIFICATION COMPONENT (TOAST)
// --------------------------------------------------------------------------

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
  
  toast.innerHTML = `
    <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
    <div class="toast-body">${message}</div>
  `;
  
  container.appendChild(toast);
  initLucide();

  // Slide out and remove toast
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// --------------------------------------------------------------------------
// CELEBRATION EFFECTS ENGINE (CONFETTI CANVAS)
// --------------------------------------------------------------------------

function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  canvas.classList.remove('hidden');
  const ctx = canvas.getContext('2d');
  
  // Resize to viewport
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const confettiCount = 150;
  const particles = [];
  const colors = ['#8b5cf6', '#a78bfa', '#ec4899', '#f472b6', '#0891b2', '#06b6d4'];

  for (let i = 0; i < confettiCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height, // start above viewport
      r: Math.random() * 6 + 4,
      d: Math.random() * confettiCount,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }

  let animationFrameId;
  const startTime = Date.now();

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each particle
    particles.forEach((p) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 5;

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });

    // Loop logic - stop after 4.5 seconds
    if (Date.now() - startTime < 4500) {
      animationFrameId = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.classList.add('hidden');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  draw();

  // Handle window resizing dynamically
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}
