const fs = require('fs');
const path = require('path');

class LocalDB {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, 'data', 'database.json');
    this.init();
  }

  init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.dbPath)) {
      const initialData = {
        config: {
          ollamaUrl: 'http://localhost:11434',
          model: 'llama3.2:3b',
          authorName: 'SynQ Social Explorer',
          authorTitle: 'Digital Wellness Advocate, SynQ Social',
          webhookUrl: ''
        },
        articles: []
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }

  read() {
    try {
      const content = fs.readFileSync(this.dbPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading database file:', error);
      // Fallback in case of corruption
      return { config: {}, articles: [] };
    }
  }

  write(data) {
    try {
      // Write to a temporary file first, then rename to ensure atomic write on Windows
      const tempPath = this.dbPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbPath);
      return true;
    } catch (error) {
      console.error('Error writing to database file:', error);
      return false;
    }
  }

  getConfig() {
    const data = this.read();
    return data.config;
  }

  saveConfig(newConfig) {
    const data = this.read();
    data.config = { ...data.config, ...newConfig };
    this.write(data);
    return data.config;
  }

  getArticles() {
    const data = this.read();
    // Sort articles by updatedAt or createdAt descending
    return data.articles.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  getArticle(id) {
    const articles = this.getArticles();
    return articles.find(art => art.id === id);
  }

  addArticle(article) {
    const data = this.read();
    const newArticle = {
      id: 'art_' + Date.now(),
      title: article.title || 'Untitled Article',
      content: article.content || '',
      prompt: article.prompt || '',
      history: article.history || [],
      status: article.status || 'draft',
      keywords: article.keywords || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
      ...article
    };
    data.articles.push(newArticle);
    this.write(data);
    return newArticle;
  }

  updateArticle(id, updatedFields) {
    const data = this.read();
    const index = data.articles.findIndex(art => art.id === id);
    if (index === -1) {
      return null;
    }

    const current = data.articles[index];
    const updated = {
      ...current,
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    // If changing status to published and publishedAt is not set, set it
    if (updatedFields.status === 'published' && !current.publishedAt) {
      updated.publishedAt = new Date().toISOString();
    }

    data.articles[index] = updated;
    this.write(data);
    return updated;
  }

  deleteArticle(id) {
    const data = this.read();
    const index = data.articles.findIndex(art => art.id === id);
    if (index === -1) {
      return false;
    }
    data.articles.splice(index, 1);
    this.write(data);
    return true;
  }
}

module.exports = new LocalDB();
