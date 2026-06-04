/* ==========================================================================
   SYNQ SOCIAL CLIENT APPLICATION LOGIC
   ========================================================================== */

// Global Application State
const state = {
  currentTab: 'generator',
  currentStep: 1,
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
  articles: [], // Loaded from DB
  seoMetadata: {
    primaryKeyword: '',
    secondaryKeywords: [],
    targetAudience: 'Gen Z, Digital Natives',
    searchIntent: 'Informational',
    contentType: 'Blog Post',
    targetCountry: 'United States',
    competitorUrls: [],
    brandTone: 'Philosophical, Youthful, Rebellious'
  },
  outline: null,
  detectedIntent: { type: 'Informational', goal: 'Teach' },
  semanticKeywords: []
};

const intentGoals = {
  Informational: 'Teach',
  Commercial: 'Compare',
  Transactional: 'Convert'
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
  await refreshLibrary();
  setupEventListeners();
  updateStats();
  
  // Set to initial step
  setStep(1);
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

  // Reset state parameters from loaded article
  state.seoMetadata = article.seoMetadata || {
    primaryKeyword: article.title || '',
    secondaryKeywords: article.keywords || [],
    targetAudience: 'Gen Z, Digital Natives',
    searchIntent: 'Informational',
    contentType: 'Blog Post',
    targetCountry: 'United States',
    competitorUrls: [],
    brandTone: 'Philosophical, Youthful, Rebellious'
  };
  state.outline = article.outline || null;
  state.semanticKeywords = (article.outline && article.outline.semanticKeywords) || article.keywords || [];

  // Update Step 1 form fields to match loaded article if user navigates back
  document.getElementById('seo-primary-keyword').value = state.seoMetadata.primaryKeyword;
  document.getElementById('seo-secondary-keywords').value = state.seoMetadata.secondaryKeywords.join(', ');
  document.getElementById('seo-target-audience').value = state.seoMetadata.targetAudience;
  document.getElementById('seo-intent-type').value = state.seoMetadata.searchIntent;
  document.getElementById('seo-intent-goal').value = intentGoals[state.seoMetadata.searchIntent] || 'Teach';
  document.getElementById('seo-content-type').value = state.seoMetadata.contentType;
  document.getElementById('seo-target-country').value = state.seoMetadata.targetCountry;
  document.getElementById('seo-competitor-urls').value = state.seoMetadata.competitorUrls.join('\n');
  document.getElementById('seo-brand-tone').value = state.seoMetadata.brandTone;

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

// Reset workspace state and clear input forms for new generation
function startNewArticle() {
  if (state.activeArticle) {
    const currentTitle = document.getElementById('article-title-input').value.trim();
    const currentContent = document.getElementById('article-editor-textarea').value;
    const isModified = currentTitle !== state.activeArticle.title || currentContent !== state.activeArticle.content;
    
    if (isModified) {
      if (!confirm("You have unsaved changes in your current workspace. Are you sure you want to discard them and start a new article?")) {
        return;
      }
    }
  }

  // Clear workspace active article
  state.activeArticle = null;
  state.outline = null;
  state.detectedIntent = { type: 'Informational', goal: 'Teach' };
  state.semanticKeywords = [];
  state.selectedKeywords.clear();

  // Reset parameters metadata to default values
  state.seoMetadata = {
    primaryKeyword: '',
    secondaryKeywords: [],
    targetAudience: 'Gen Z, Digital Natives',
    searchIntent: 'Informational',
    contentType: 'Blog Post',
    targetCountry: 'United States',
    competitorUrls: [],
    brandTone: 'Philosophical, Youthful, Rebellious'
  };

  // Reset Wizard step 1 forms
  document.getElementById('seo-primary-keyword').value = '';
  document.getElementById('seo-secondary-keywords').value = '';
  document.getElementById('seo-target-audience').value = 'Gen Z, Digital Natives';
  document.getElementById('seo-intent-type').value = 'Informational';
  document.getElementById('seo-intent-goal').value = 'Teach';
  document.getElementById('seo-content-type').value = 'Blog Post';
  document.getElementById('seo-target-country').value = 'United States';
  document.getElementById('seo-competitor-urls').value = '';
  document.getElementById('seo-brand-tone').value = 'Philosophical, Youthful, Rebellious';

  // Reset Wizard step 2 outline suggestion forms
  document.getElementById('outline-title-suggestion').value = '';
  document.getElementById('outline-meta-suggestion').value = '';
  document.getElementById('outline-structure-editor').value = '';
  const tagContainer = document.getElementById('semantic-keywords-tags');
  if (tagContainer) tagContainer.innerHTML = '';

  // Reset editor text areas
  document.getElementById('article-title-input').value = '';
  document.getElementById('article-title-input').readOnly = true;
  document.getElementById('article-editor-textarea').value = '';
  updateWordCount();

  // Reset audit scores
  document.getElementById('seo-score-text').innerText = '0%';
  document.getElementById('seo-score-status').innerText = 'Needs Content';
  document.getElementById('seo-score-fill').setAttribute('stroke-dashoffset', '251.2');

  // Disable workspace action buttons
  document.getElementById('btn-save-draft').disabled = true;
  document.getElementById('btn-preview-publish').disabled = true;

  // Toggle visible workspace nodes back to empty state
  document.getElementById('editor-empty').classList.remove('hidden');
  document.getElementById('editor-wrapper').classList.add('hidden');
  document.getElementById('refinement-container').classList.add('hidden');
  document.getElementById('seo-audit-sidebar').classList.add('hidden');

  // Navigate to Step 1 & switch to Generator view
  setStep(1);
  switchTab('generator');

  showToast('Started a new content workspace.', 'success');
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

// --------------------------------------------------------------------------
// AI WIZARD & SEO AUDITOR ACTIONS
// --------------------------------------------------------------------------

function setStep(stepNum) {
  state.currentStep = stepNum;
  
  // Update step indicators
  for (let i = 1; i <= 5; i++) {
    const indicator = document.getElementById(`step-${i}-indicator`);
    if (!indicator) continue;
    
    indicator.classList.remove('active', 'completed');
    if (i < stepNum) {
      indicator.classList.add('completed');
    } else if (i === stepNum) {
      indicator.classList.add('active');
    }
  }

  // Update layout wrapper step class for responsive grid templates
  const layoutEl = document.querySelector('.generator-layout');
  if (layoutEl) {
    layoutEl.classList.remove('step-setup', 'step-writing', 'step-audit');
    if (stepNum === 1 || stepNum === 2) {
      layoutEl.classList.add('step-setup');
    } else if (stepNum === 3) {
      layoutEl.classList.add('step-writing');
    } else if (stepNum === 4) {
      layoutEl.classList.add('step-audit');
    }
  }

  // Toggle Left Panels
  const panelStep1 = document.getElementById('panel-step-1');
  const panelStep2 = document.getElementById('panel-step-2');
  const sidebarLeft = document.querySelector('.generator-sidebar-left');
  
  if (stepNum === 1) {
    if (sidebarLeft) sidebarLeft.classList.remove('hidden');
    if (panelStep1) panelStep1.classList.remove('hidden');
    if (panelStep2) panelStep2.classList.add('hidden');
    
    document.getElementById('editor-empty').classList.remove('hidden');
    document.getElementById('editor-wrapper').classList.add('hidden');
    document.getElementById('seo-audit-sidebar').classList.add('hidden');
    document.getElementById('refinement-container').classList.add('hidden');
  } else if (stepNum === 2) {
    if (sidebarLeft) sidebarLeft.classList.remove('hidden');
    if (panelStep1) panelStep1.classList.add('hidden');
    if (panelStep2) panelStep2.classList.remove('hidden');
    
    document.getElementById('editor-empty').classList.remove('hidden');
    document.getElementById('editor-wrapper').classList.add('hidden');
    document.getElementById('seo-audit-sidebar').classList.add('hidden');
    document.getElementById('refinement-container').classList.add('hidden');
  } else if (stepNum === 3) {
    if (sidebarLeft) sidebarLeft.classList.add('hidden');
    
    document.getElementById('editor-empty').classList.add('hidden');
    document.getElementById('editor-wrapper').classList.remove('hidden');
    document.getElementById('seo-audit-sidebar').classList.add('hidden');
    document.getElementById('refinement-container').classList.add('hidden');
  } else if (stepNum === 4) {
    if (sidebarLeft) sidebarLeft.classList.add('hidden');
    
    document.getElementById('editor-empty').classList.add('hidden');
    document.getElementById('editor-wrapper').classList.remove('hidden');
    document.getElementById('seo-audit-sidebar').classList.remove('hidden');
    document.getElementById('refinement-container').classList.remove('hidden');
    
    // Trigger SEO Audit
    runSeoAudit();
  } else if (stepNum === 5) {
    openPublishModal();
  }
}

async function handleAutoGenerate() {
  const primaryKeyword = document.getElementById('seo-primary-keyword').value.trim();
  if (!primaryKeyword) {
    showToast('Primary Keyword is required.', 'warning');
    return;
  }
  
  const secondaryKeywords = document.getElementById('seo-secondary-keywords').value.split(',').map(s => s.trim()).filter(Boolean);
  const targetAudience = document.getElementById('seo-target-audience').value.trim();
  const searchIntent = document.getElementById('seo-intent-type').value;
  const contentType = document.getElementById('seo-content-type').value;
  const targetCountry = document.getElementById('seo-target-country').value.trim();
  const competitorUrls = document.getElementById('seo-competitor-urls').value.split('\n').map(s => s.trim()).filter(Boolean);
  const brandTone = document.getElementById('seo-brand-tone').value.trim();

  state.seoMetadata = {
    primaryKeyword,
    secondaryKeywords,
    targetAudience,
    searchIntent,
    contentType,
    targetCountry,
    competitorUrls,
    brandTone
  };

  startLoadingOverlay('Step 1/2: Designing SEO Outline & Intent Analysis...');

  try {
    // 1. Fetch search intent analysis and outline behind the scenes
    const res = await fetch('/api/articles/plan-outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seoMetadata: state.seoMetadata })
    });
    
    if (!res.ok) {
      throw new Error(`Outline planning failed: ${res.statusText}`);
    }
    
    const data = await res.json();
    state.outline = data.outline;
    state.detectedIntent = data.detectedIntent;
    state.semanticKeywords = data.semanticKeywords || [];

    // Automatically transit UI to Step 3 (Editor View) showing live generation
    setStep(3);
    startLoadingOverlay('Step 2/2: Weaving SEO Article and AI social media copy...');

    // 2. Trigger stream generation
    const response = await fetch('/api/articles/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seoMetadata: state.seoMetadata,
        outline: state.outline
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
              
              const metaStartTag = '[META_DESCRIPTION_START]';
              const metaEndTag = '[META_DESCRIPTION_END]';
              let displayBody = accumulatedText;
              
              if (displayBody.includes(metaStartTag) && displayBody.includes(metaEndTag)) {
                const endIdx = displayBody.indexOf(metaEndTag) + metaEndTag.length;
                displayBody = displayBody.substring(endIdx).trim();
              } else if (displayBody.includes(metaStartTag)) {
                displayBody = displayBody.substring(displayBody.indexOf(metaStartTag)).trim();
              }

              const socialStartTag = '[SOCIAL_POST_START]';
              const socialEndTag = '[SOCIAL_POST_END]';
              if (displayBody.includes(socialStartTag) && displayBody.includes(socialEndTag)) {
                displayBody = displayBody.substring(0, displayBody.indexOf(socialStartTag)).trim();
              } else if (displayBody.includes(socialStartTag)) {
                displayBody = displayBody.substring(0, displayBody.indexOf(socialStartTag)).trim();
              }
              
              let displayTitle = state.outline.title;
              const linesSplit = displayBody.split('\n');
              if (linesSplit[0] && linesSplit[0].startsWith('#')) {
                displayTitle = linesSplit[0].replace(/^#\s*/, '').trim();
                displayBody = linesSplit.slice(1).join('\n').trim();
              }
              
              document.getElementById('article-title-input').value = displayTitle;
              document.getElementById('article-editor-textarea').value = displayBody;
              updateWordCount();
            }

            if (parsed.done && parsed.article) {
              state.activeArticle = parsed.article;
              
              // Load saved metadata (restores refinement list, tags)
              loadArticleIntoWorkspace(parsed.article);
              await refreshLibrary();

              // Automatically shift to Step 4 (SEO Audit page)
              setStep(4);
              showToast('Article generated and SEO audited successfully!', 'success');
            }

          } catch (e) {}
        }
      }
    }

  } catch (err) {
    showToast(err.message, 'error');
    setStep(1);
  } finally {
    stopLoadingOverlay();
  }
}

async function handlePlanOutline() {
  const primaryKeyword = document.getElementById('seo-primary-keyword').value.trim();
  if (!primaryKeyword) {
    showToast('Primary Keyword is required.', 'warning');
    return;
  }
  
  const secondaryKeywords = document.getElementById('seo-secondary-keywords').value.split(',').map(s => s.trim()).filter(Boolean);
  const targetAudience = document.getElementById('seo-target-audience').value.trim();
  const searchIntent = document.getElementById('seo-intent-type').value;
  const contentType = document.getElementById('seo-content-type').value;
  const targetCountry = document.getElementById('seo-target-country').value.trim();
  const competitorUrls = document.getElementById('seo-competitor-urls').value.split('\n').map(s => s.trim()).filter(Boolean);
  const brandTone = document.getElementById('seo-brand-tone').value.trim();

  state.seoMetadata = {
    primaryKeyword,
    secondaryKeywords,
    targetAudience,
    searchIntent,
    contentType,
    targetCountry,
    competitorUrls,
    brandTone
  };

  startLoadingOverlay('Detecting Search Intent & Planning Outline...');

  try {
    const res = await fetch('/api/articles/plan-outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seoMetadata: state.seoMetadata })
    });
    
    if (!res.ok) {
      throw new Error(`Outline planning failed: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    state.outline = data.outline;
    state.detectedIntent = data.detectedIntent;
    state.semanticKeywords = data.semanticKeywords || [];
    
    // Populate Outline approval panel fields
    document.getElementById('detected-intent-badge').innerText = `Intent: ${data.detectedIntent.type}`;
    document.getElementById('detected-goal-badge').innerText = `Goal: ${data.detectedIntent.goal}`;
    
    const tagContainer = document.getElementById('semantic-keywords-tags');
    tagContainer.innerHTML = '';
    state.semanticKeywords.forEach(kw => {
      const tag = document.createElement('span');
      tag.className = 'semantic-tag';
      tag.innerText = kw;
      tag.title = 'Click to copy';
      tag.addEventListener('click', () => {
        navigator.clipboard.writeText(kw);
        showToast(`Copied NLP term: "${kw}"`);
      });
      tagContainer.appendChild(tag);
    });
    
    document.getElementById('outline-title-suggestion').value = data.outline.title || '';
    document.getElementById('outline-meta-suggestion').value = data.outline.metaDescription || '';
    document.getElementById('outline-structure-editor').value = data.outline.structure || '';
    
    setStep(2);
    showToast('Search intent detected and outline planned!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    stopLoadingOverlay();
  }
}

async function handleApproveAndGenerate() {
  const title = document.getElementById('outline-title-suggestion').value.trim();
  const metaDescription = document.getElementById('outline-meta-suggestion').value.trim();
  const structure = document.getElementById('outline-structure-editor').value.trim();
  
  if (!title || !structure) {
    showToast('Outline Title and Structure are required.', 'warning');
    return;
  }
  
  state.outline = { title, metaDescription, structure };
  setStep(3);
  
  startLoadingOverlay('Weaving structured SEO article...');
  
  try {
    const response = await fetch('/api/articles/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seoMetadata: state.seoMetadata,
        outline: state.outline
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
              
              const metaStartTag = '[META_DESCRIPTION_START]';
              const metaEndTag = '[META_DESCRIPTION_END]';
              let displayBody = accumulatedText;
              
              if (displayBody.includes(metaStartTag) && displayBody.includes(metaEndTag)) {
                const endIdx = displayBody.indexOf(metaEndTag) + metaEndTag.length;
                displayBody = displayBody.substring(endIdx).trim();
              } else if (displayBody.includes(metaStartTag)) {
                displayBody = displayBody.substring(displayBody.indexOf(metaStartTag)).trim();
              }
              
              const socialStartTag = '[SOCIAL_POST_START]';
              const socialEndTag = '[SOCIAL_POST_END]';
              if (displayBody.includes(socialStartTag) && displayBody.includes(socialEndTag)) {
                displayBody = displayBody.substring(0, displayBody.indexOf(socialStartTag)).trim();
              } else if (displayBody.includes(socialStartTag)) {
                displayBody = displayBody.substring(0, displayBody.indexOf(socialStartTag)).trim();
              }
              
              let displayTitle = state.outline.title;
              const linesSplit = displayBody.split('\n');
              if (linesSplit[0] && linesSplit[0].startsWith('#')) {
                displayTitle = linesSplit[0].replace(/^#\s*/, '').trim();
                displayBody = linesSplit.slice(1).join('\n').trim();
              }
              
              document.getElementById('article-title-input').value = displayTitle;
              document.getElementById('article-editor-textarea').value = displayBody;
              updateWordCount();
            }

            if (parsed.done && parsed.article) {
              state.activeArticle = parsed.article;
              
              // Load the saved article (loads Step 4 and shows Toast)
              loadArticleIntoWorkspace(parsed.article);
              await refreshLibrary();
            }

          } catch (e) {}
        }
      }
    }

  } catch (err) {
    showToast(err.message, 'error');
    setStep(2);
  } finally {
    stopLoadingOverlay();
  }
}

function runSeoAudit() {
  const title = document.getElementById('article-title-input').value.trim();
  const content = document.getElementById('article-editor-textarea').value;
  const primaryKeyword = (state.seoMetadata && state.seoMetadata.primaryKeyword) || '';
  const secondaryKeywords = (state.seoMetadata && state.seoMetadata.secondaryKeywords) || [];
  const metaDescription = (state.activeArticle && state.activeArticle.metaDescription) || (state.outline && state.outline.metaDescription) || '';
  
  if (!content) {
    updateScoreUI(0, 'Needs Content');
    return;
  }

  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount === 0) {
    updateScoreUI(0, 'Needs Content');
    return;
  }

  let totalScore = 0;

  const containsAny = (str, list) => list.some(item => str.toLowerCase().includes(item.toLowerCase()));
  const updateRuleState = (elementId, passed) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = passed ? 'passed' : 'failed';
    const icon = el.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', passed ? 'check-circle-2' : 'circle');
    }
  };

  // 1. Title Check (15 pts)
  let titleScore = 0;
  const hasTitleKeyword = primaryKeyword ? title.toLowerCase().includes(primaryKeyword.toLowerCase()) : false;
  const isTitleLengthOk = title.length >= 45 && title.length <= 65;
  const hasTitleCtr = containsAny(title, ['best', 'reclaim', 'future', 'rebellious', 'free', 'privacy', 'trust', 'genuine', 'owner', 'why', 'how', 'escape', 'machine', 'ghost', 'wellness', 'social']);
  
  if (hasTitleKeyword) titleScore += 5;
  if (isTitleLengthOk) titleScore += 5;
  if (hasTitleCtr) titleScore += 5;
  
  document.getElementById('title-char-count').innerText = title.length;
  updateRuleState('rule-title-keyword', hasTitleKeyword);
  updateRuleState('rule-title-length', isTitleLengthOk);
  updateRuleState('rule-title-trigger', hasTitleCtr);
  
  const statusTitle = document.getElementById('status-title');
  statusTitle.className = `audit-status-icon ${titleScore === 15 ? 'success' : titleScore >= 5 ? 'warning' : 'danger'}`;
  statusTitle.innerHTML = titleScore === 15 ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="alert-circle"></i>';
  totalScore += titleScore;

  // 2. Meta Description Check (15 pts)
  let metaScore = 0;
  const hasMetaKeyword = primaryKeyword ? metaDescription.toLowerCase().includes(primaryKeyword.toLowerCase()) : false;
  const isMetaLengthOk = metaDescription.length >= 130 && metaDescription.length <= 170;
  const hasMetaCta = containsAny(metaDescription, ['read', 'discover', 'learn', 'join', 'start', 'explore', 'find', 'own', 'reclaim', 'why']);
  
  if (hasMetaKeyword) metaScore += 5;
  if (isMetaLengthOk) metaScore += 5;
  if (hasMetaCta) metaScore += 5;
  
  document.getElementById('meta-desc-text').innerText = metaDescription || 'No meta description found.';
  document.getElementById('meta-char-count').innerText = metaDescription.length;
  updateRuleState('rule-meta-length', isMetaLengthOk);
  updateRuleState('rule-meta-keyword', hasMetaKeyword);
  updateRuleState('rule-meta-cta', hasMetaCta);
  
  const statusMeta = document.getElementById('status-meta');
  statusMeta.className = `audit-status-icon ${metaScore === 15 ? 'success' : metaScore >= 5 ? 'warning' : 'danger'}`;
  statusMeta.innerHTML = metaScore === 15 ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="alert-circle"></i>';
  totalScore += metaScore;

  // 3. Heading Structure Check (15 pts)
  let headingScore = 0;
  const lines = content.split('\n');
  const h1s = lines.filter(line => line.trim().startsWith('# '));
  const countH1 = h1s.length;
  
  let nestingValid = true;
  let prevLevel = 1;
  const headings = lines.filter(line => line.trim().startsWith('#')).map(line => {
    const match = line.trim().match(/^(#{1,6})\s/);
    return match ? match[1].length : null;
  }).filter(Boolean);
  
  for (const h of headings) {
    if (h - prevLevel > 1) {
      nestingValid = false;
      break;
    }
    prevLevel = h;
  }
  
  const headingQuestions = lines.some(line => line.trim().startsWith('#') && line.trim().endsWith('?'));
  const headingKeyword = primaryKeyword ? lines.some(line => line.trim().startsWith('#') && line.toLowerCase().includes(primaryKeyword.toLowerCase())) : false;
  
  if (countH1 === 1) headingScore += 5;
  if (nestingValid && headings.length > 0) headingScore += 4;
  if (headingQuestions) headingScore += 3;
  if (headingKeyword) headingScore += 3;
  
  document.getElementById('count-h1').innerText = countH1;
  updateRuleState('rule-heading-h1', countH1 === 1);
  updateRuleState('rule-heading-hierarchy', nestingValid && headings.length > 0);
  updateRuleState('rule-heading-questions', headingQuestions);
  updateRuleState('rule-heading-keyword', headingKeyword);
  
  const statusHeadings = document.getElementById('status-headings');
  statusHeadings.className = `audit-status-icon ${headingScore === 15 ? 'success' : headingScore >= 7 ? 'warning' : 'danger'}`;
  statusHeadings.innerHTML = headingScore === 15 ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="alert-circle"></i>';
  totalScore += headingScore;

  // 4. Keyword Density Check (15 pts)
  let kwScore = 0;
  let density = 0;
  if (primaryKeyword && wordCount > 0) {
    const escapedKw = primaryKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKw}\\b`, 'gi');
    const matches = content.match(regex);
    const count = matches ? matches.length : 0;
    density = parseFloat(((count / wordCount) * 100).toFixed(2));
  }
  
  let secondaryMatches = 0;
  secondaryKeywords.forEach(skw => {
    if (content.toLowerCase().includes(skw.toLowerCase())) {
      secondaryMatches++;
    }
  });
  
  const densityOk = density >= 0.8 && density <= 2.5;
  const secondaryOk = secondaryKeywords.length === 0 || secondaryMatches > 0;
  const noStuffing = density < 3.5;
  
  if (densityOk) kwScore += 5;
  if (secondaryOk) kwScore += 5;
  if (noStuffing) kwScore += 5;
  
  document.getElementById('density-primary-val').innerText = `${density}%`;
  updateRuleState('rule-keyword-density', densityOk);
  updateRuleState('rule-keyword-secondary', secondaryOk);
  updateRuleState('rule-keyword-stuffing', noStuffing);
  
  const statusKeywords = document.getElementById('status-keywords');
  statusKeywords.className = `audit-status-icon ${kwScore === 15 ? 'success' : kwScore >= 5 ? 'warning' : 'danger'}`;
  statusKeywords.innerHTML = kwScore === 15 ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="alert-circle"></i>';
  totalScore += kwScore;

  // 5. Semantic SEO NLP (10 pts)
  const semanticAuditList = document.getElementById('semantic-audit-list');
  semanticAuditList.innerHTML = '';
  let matchedSemantics = 0;
  
  if (state.semanticKeywords && state.semanticKeywords.length > 0) {
    state.semanticKeywords.forEach(skw => {
      const isMatched = content.toLowerCase().includes(skw.toLowerCase());
      if (isMatched) matchedSemantics++;
      
      const item = document.createElement('div');
      item.className = `semantic-checklist-item ${isMatched ? 'matched' : 'unmatched'}`;
      item.innerHTML = `
        <span>${skw}</span>
        <i data-lucide="${isMatched ? 'check-circle' : 'circle'}"></i>
      `;
      semanticAuditList.appendChild(item);
    });
    
    const semanticPts = Math.round((matchedSemantics / state.semanticKeywords.length) * 10);
    totalScore += semanticPts;
    
    const statusSemantic = document.getElementById('status-semantic');
    statusSemantic.className = `audit-status-icon ${semanticPts === 10 ? 'success' : semanticPts >= 4 ? 'warning' : 'danger'}`;
    statusSemantic.innerHTML = semanticPts === 10 ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="alert-circle"></i>';
  } else {
    semanticAuditList.innerHTML = '<span class="text-muted" style="font-size: 10px;">Select keywords first.</span>';
    totalScore += 5;
  }

  // 6. Readability & Humanization (15 pts)
  let readScore = 0;
  
  const sentences = content.split(/[.!?]+\s+/).filter(Boolean);
  let avgSentenceWords = 0;
  if (sentences.length > 0) {
    const totalWordsInSentences = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0);
    avgSentenceWords = parseFloat((totalWordsInSentences / sentences.length).toFixed(1));
  }
  const isSentenceLengthOk = avgSentenceWords < 20;
  
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  let avgParagraphWords = 0;
  if (paragraphs.length > 0) {
    const totalWordsInParagraphs = paragraphs.reduce((sum, p) => sum + p.trim().split(/\s+/).length, 0);
    avgParagraphWords = parseFloat((totalWordsInParagraphs / paragraphs.length).toFixed(1));
  }
  const isParagraphSizeOk = avgParagraphWords < 65;
  
  const transitions = ['however', 'therefore', 'consequently', 'first', 'second', 'finally', 'because', 'although', 'since', 'besides', 'furthermore', 'but', 'yet', 'instead'];
  const hasTransitions = containsAny(content, transitions);
  
  const aiClichés = ['delve', 'tapestry', 'testament', 'not only', 'but also', 'in summary', 'robust', 'double-edged sword', 'beacon', 'crucial', 'furthermore', 'relevance', 'in conclusion'];
  const flaggedPhrases = [];
  aiClichés.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase.replace(' ', '\\s+')}\\b`, 'gi');
    if (regex.test(content)) {
      flaggedPhrases.push(phrase);
    }
  });
  
  const isHumanTone = flaggedPhrases.length === 0;
  
  if (isSentenceLengthOk) readScore += 4;
  if (isParagraphSizeOk) readScore += 4;
  if (hasTransitions) readScore += 3;
  if (isHumanTone) readScore += 4;
  
  document.getElementById('sentence-length-val').innerText = avgSentenceWords;
  updateRuleState('rule-read-sentence', isSentenceLengthOk);
  updateRuleState('rule-read-paragraph', isParagraphSizeOk);
  updateRuleState('rule-read-transitions', hasTransitions);
  updateRuleState('rule-read-human', isHumanTone);
  
  const warningBox = document.getElementById('ai-phrase-warnings-box');
  const warningList = document.getElementById('ai-phrase-list');
  if (flaggedPhrases.length > 0) {
    warningBox.classList.remove('hidden');
    warningList.innerHTML = flaggedPhrases.map(p => `<span class="ai-phrase-tag">${p}</span>`).join(' ');
  } else {
    warningBox.classList.add('hidden');
    warningList.innerHTML = '';
  }
  
  const statusReadability = document.getElementById('status-readability');
  statusReadability.className = `audit-status-icon ${readScore === 15 ? 'success' : readScore >= 8 ? 'warning' : 'danger'}`;
  statusReadability.innerHTML = readScore === 15 ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="alert-circle"></i>';
  totalScore += readScore;

  // 7. EEAT & Freshness (15 pts)
  let eeatScore = 0;
  const hasStats = content.includes('%') || /\b(19|20)\d{2}\b/.test(content) || /\b\d+(\.\d+)?\b/.test(content);
  const hasExamples = content.includes('"') || containsAny(content, ['for example', 'such as', 'instance', 'says', 'study', 'case']);
  const hasYear = content.includes('2026');
  
  if (hasStats) eeatScore += 5;
  if (hasExamples) eeatScore += 5;
  if (hasYear) eeatScore += 5;
  
  updateRuleState('rule-eeat-stats', hasStats);
  updateRuleState('rule-eeat-examples', hasExamples);
  updateRuleState('rule-eeat-year', hasYear);
  
  const statusEeat = document.getElementById('status-eeat');
  statusEeat.className = `audit-status-icon ${eeatScore === 15 ? 'success' : eeatScore >= 5 ? 'warning' : 'danger'}`;
  statusEeat.innerHTML = eeatScore === 15 ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="alert-circle"></i>';
  totalScore += eeatScore;

  updateScoreUI(totalScore);
}

function updateScoreUI(score, customStatus = '') {
  document.getElementById('seo-score-text').innerText = `${score}%`;
  document.getElementById('stats-keywords').innerText = `${score}%`;
  
  const offset = 251.2 - (score / 100) * 251.2;
  document.getElementById('seo-score-fill').setAttribute('stroke-dashoffset', offset);
  
  const fillRing = document.getElementById('seo-score-fill');
  if (score >= 80) {
    fillRing.style.stroke = 'var(--color-success)';
  } else if (score >= 55) {
    fillRing.style.stroke = 'var(--color-warning)';
  } else {
    fillRing.style.stroke = 'var(--color-accent)';
  }

  const statusEl = document.getElementById('seo-score-status');
  if (customStatus) {
    statusEl.innerText = customStatus;
  } else if (score >= 85) {
    statusEl.innerText = 'Excellent SEO!';
  } else if (score >= 70) {
    statusEl.innerText = 'Good Optimization';
  } else if (score >= 50) {
    statusEl.innerText = 'Needs Tweaking';
  } else {
    statusEl.innerText = 'Poor Optimization';
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
              
              const metaStartTag = '[META_DESCRIPTION_START]';
              const metaEndTag = '[META_DESCRIPTION_END]';
              let displayBody = accumulatedText;
              
              if (displayBody.includes(metaStartTag) && displayBody.includes(metaEndTag)) {
                const endIdx = displayBody.indexOf(metaEndTag) + metaEndTag.length;
                displayBody = displayBody.substring(endIdx).trim();
              } else if (displayBody.includes(metaStartTag)) {
                displayBody = displayBody.substring(displayBody.indexOf(metaStartTag)).trim();
              }
              
              const socialStartTag = '[SOCIAL_POST_START]';
              const socialEndTag = '[SOCIAL_POST_END]';
              if (displayBody.includes(socialStartTag) && displayBody.includes(socialEndTag)) {
                displayBody = displayBody.substring(0, displayBody.indexOf(socialStartTag)).trim();
              } else if (displayBody.includes(socialStartTag)) {
                displayBody = displayBody.substring(0, displayBody.indexOf(socialStartTag)).trim();
              }
              
              let displayTitle = state.activeArticle.title;
              const linesSplit = displayBody.split('\n');
              if (linesSplit[0] && linesSplit[0].startsWith('#')) {
                displayTitle = linesSplit[0].replace(/^#\s*/, '').trim();
                displayBody = linesSplit.slice(1).join('\n').trim();
              }

              document.getElementById('article-title-input').value = displayTitle;
              document.getElementById('article-editor-textarea').value = displayBody;
              updateWordCount();
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
  const metaDescription = (state.activeArticle && state.activeArticle.metaDescription) || (state.outline && state.outline.metaDescription) || '';

  try {
    const res = await fetch(`/api/articles/${state.activeArticle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        keywords: state.semanticKeywords.length > 0 ? state.semanticKeywords : (state.seoMetadata.primaryKeyword ? [state.seoMetadata.primaryKeyword] : []),
        seoMetadata: state.seoMetadata,
        outline: state.outline,
        metaDescription
      })
    });

    if (res.ok) {
      const updated = await res.json();
      state.activeArticle = updated;
      await refreshLibrary();
      showToast('Draft saved successfully. Click "+ New Article" to clear & start another!', 'success');
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
  
  // Use AI-generated social copy if available, otherwise fall back to formatted body text
  let bodyText = (state.activeArticle && state.activeArticle.socialText) || '';
  if (!bodyText) {
    bodyText = rawContent
      .replace(/^#\s+.+$/gm, '') // Remove top level title if present
      .replace(/^##+\s+(.+)$/gm, '\n* $1 *\n') // Simplify headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bolds
      .replace(/\*(.+?)\*/g, '$1');
  }

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

      // Prompt user to start next article workspace after successfully publishing
      setTimeout(() => {
        if (confirm("Article published successfully! Do you want to start a new workspace for your next article?")) {
          startNewArticle();
        }
      }, 1000);
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

  if (state.activeArticle && state.currentStep >= 4) {
    runSeoAudit();
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
    if (state.activeArticle && state.currentStep >= 4) {
      runSeoAudit();
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

  // Sidebar New Article trigger
  const sidebarNewBtn = document.getElementById('btn-sidebar-new-article');
  if (sidebarNewBtn) {
    sidebarNewBtn.addEventListener('click', startNewArticle);
  }

  // Stepper Indicator click nav
  document.getElementById('step-1-indicator').addEventListener('click', () => {
    if (state.currentStep > 1) setStep(1);
  });
  document.getElementById('step-2-indicator').addEventListener('click', () => {
    if (state.currentStep > 2) setStep(2);
  });
  document.getElementById('step-3-indicator').addEventListener('click', () => {
    if (state.currentStep > 3) setStep(3);
  });
  document.getElementById('step-4-indicator').addEventListener('click', () => {
    if (state.currentStep > 4) setStep(4);
  });
  document.getElementById('step-5-indicator').addEventListener('click', () => {
    if (state.currentStep >= 4) openPublishModal();
  });

  // Search Intent Type change listener to autofill goal
  const intentTypeSelect = document.getElementById('seo-intent-type');
  if (intentTypeSelect) {
    intentTypeSelect.addEventListener('change', (e) => {
      document.getElementById('seo-intent-goal').value = intentGoals[e.target.value] || 'Teach';
    });
  }

  // Step 1: Auto-Generate click
  const autoGenBtn = document.getElementById('btn-auto-generate');
  if (autoGenBtn) {
    autoGenBtn.addEventListener('click', handleAutoGenerate);
  }

  // Step 1: Plan Outline click
  document.getElementById('btn-plan-outline').addEventListener('click', handlePlanOutline);

  // Step 2: Approve & back actions
  document.getElementById('btn-back-to-step-1').addEventListener('click', () => setStep(1));
  document.getElementById('btn-approve-outline').addEventListener('click', handleApproveAndGenerate);

  // Editor Key Press events for live word count and SEO audit
  const editorTextArea = document.getElementById('article-editor-textarea');
  editorTextArea.addEventListener('input', () => {
    updateWordCount();
    if (state.currentStep >= 4) {
      runSeoAudit();
    }
  });

  // Title typing event to update active state and audit
  const titleInput = document.getElementById('article-title-input');
  titleInput.addEventListener('input', () => {
    if (state.activeArticle) {
      state.activeArticle.title = titleInput.value.trim();
    }
    if (state.currentStep >= 4) {
      runSeoAudit();
    }
  });

  // Accordion toggle click for SEO Audit Sidebar
  document.querySelectorAll('.audit-item-header').forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.parentElement;
      parent.classList.toggle('expanded');
    });
  });

  // Editor Toolbar Tabs
  document.getElementById('tb-edit-tab').addEventListener('click', () => setEditorMode('edit'));
  document.getElementById('tb-preview-tab').addEventListener('click', () => setEditorMode('preview'));

  // Refine Button click / Enter Key Press
  document.getElementById('btn-refine-article').addEventListener('click', handleRefineArticle);
  document.getElementById('refine-prompt-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRefineArticle();
  });

  // Save Draft Button
  document.getElementById('btn-save-draft').addEventListener('click', handleSaveDraft);

  // Preview & Publish trigger
  document.getElementById('btn-preview-publish').addEventListener('click', () => setStep(5));

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
