const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot Token (set this in environment variable)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const STRICT_TELEGRAM_MODE = process.env.STRICT_TELEGRAM_MODE === 'true' || TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE';

// Data files
const USERS_FILE = 'users.json';
const GAME_DATA_FILE = 'gamedata.json';

// Initialize data files
function initDataFiles() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
  }
  if (!fs.existsSync(GAME_DATA_FILE)) {
    fs.writeFileSync(GAME_DATA_FILE, JSON.stringify({}));
  }
}

// Load data from files with error handling
function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error);
    return {};
  }
}

function loadGameData() {
  try {
    const data = fs.readFileSync(GAME_DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading game data:', error);
    return {};
  }
}

// Save data to files with atomic writes
function saveUsers(users) {
  try {
    const tempFile = USERS_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(users, null, 2));
    fs.renameSync(tempFile, USERS_FILE);
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

function saveGameData(gameData) {
  try {
    const tempFile = GAME_DATA_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(gameData, null, 2));
    fs.renameSync(tempFile, GAME_DATA_FILE);
  } catch (error) {
    console.error('Error saving game data:', error);
  }
}

// Improved password hashing with salt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch (error) {
    return false;
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Click rate limiting
const clickLimiter = rateLimit({
  windowMs: 1000,
  max: 20,
  message: { error: 'Too many clicks, slow down!' }
});

// Upgrade rate limiting
const upgradeLimiter = rateLimit({
  windowMs: 1000,
  max: 10,
  message: { error: 'Too many upgrades, slow down!' }
});

// Auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
});

app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static('public'));

// Session configuration with secure settings
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict'
  }
}));

// Initialize data files
initDataFiles();

// XSS protection function
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Validate game data integrity
function validateGameData(data) {
  return {
    tokens: Math.max(0, Math.floor(Number(data.tokens) || 0)),
    rebirth_level: Math.max(0, Math.min(5, Math.floor(Number(data.rebirth_level) || 0))),
    click_power: Math.max(1, Math.floor(Number(data.click_power) || 1)),
    auto_clicker: Math.max(0, Math.min(20, Math.floor(Number(data.auto_clicker) || 0))),
    multiplier: Math.max(1, Math.min(50, Math.floor(Number(data.multiplier) || 1)))
  };
}

// Validate Telegram Web App initData
function validateTelegramWebApp(initData) {
  if (!initData) return false;
  
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    // Sort parameters alphabetically
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Create secret key
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(TELEGRAM_BOT_TOKEN)
      .digest();
    
    // Calculate hash
    const calculatedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Telegram validation error:', error);
    return false;
  }
}

// Extract user data from Telegram initData
function extractTelegramUser(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const userJson = urlParams.get('user');
    if (!userJson) return null;
    
    const user = JSON.parse(userJson);
    return {
      id: user.id,
      username: user.username || `user${user.id}`,
      first_name: user.first_name,
      last_name: user.last_name
    };
  } catch (error) {
    console.error('Error extracting Telegram user:', error);
    return null;
  }
}

// Middleware to check Telegram Web App
function requireTelegramWebApp(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body.initData || req.query.initData;
  
  // For development: allow bypass if not in strict mode
  if (!STRICT_TELEGRAM_MODE) {
    console.warn('WARNING: Telegram validation disabled - set TELEGRAM_BOT_TOKEN or STRICT_TELEGRAM_MODE=true');
    return next();
  }
  
  if (!validateTelegramWebApp(initData)) {
    // Return HTML error page for main route
    if (req.path === '/' && req.method === 'GET') {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Доступ запрещен</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
              color: #ffffff;
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 20px;
            }
            .error-container {
              background: linear-gradient(145deg, #333333, #2a2a2a);
              padding: 3rem;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
              border: 1px solid #444;
              max-width: 500px;
              text-align: center;
            }
            .error-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            h1 {
              font-size: 1.8rem;
              margin-bottom: 1rem;
              background: linear-gradient(45deg, #FF6B6B, #FF5252);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            p {
              color: #cccccc;
              line-height: 1.6;
              margin-bottom: 1rem;
              font-size: 1.1rem;
            }
            .telegram-logo {
              width: 80px;
              height: 80px;
              margin: 2rem auto;
              background: linear-gradient(45deg, #2AABEE, #229ED9);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 3rem;
            }
            .info {
              background: rgba(255, 107, 107, 0.1);
              border: 1px solid #FF6B6B;
              border-radius: 10px;
              padding: 1rem;
              margin-top: 1.5rem;
              font-size: 0.9rem;
              color: #ffcccc;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-icon">🔒</div>
            <h1>Доступ запрещен</h1>
            <div class="telegram-logo">✈️</div>
            <p>Это приложение доступно только через Telegram Web App</p>
            <p>Пожалуйста, откройте приложение из Telegram бота</p>
            <div class="info">
              ℹ️ Для доступа найдите бота в Telegram и запустите Web App через меню
            </div>
          </div>
        </body>
        </html>
      `);
    }
    
    // Return JSON error for API routes
    return res.status(403).json({ error: 'Access denied. Please open from Telegram.' });
  }
  
  req.telegramUser = extractTelegramUser(initData);
  next();
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// Routes
app.get('/', requireTelegramWebApp, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Telegram Web App authentication
app.post('/telegram-auth', authLimiter, [
  body('initData').isString().notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const { initData } = req.body;
  
  if (!validateTelegramWebApp(initData)) {
    return res.status(403).json({ error: 'Invalid Telegram data' });
  }

  const telegramUser = extractTelegramUser(initData);
  if (!telegramUser) {
    return res.status(400).json({ error: 'Could not extract user data' });
  }

  const users = loadUsers();
  const userId = `tg_${telegramUser.id}`;
  const username = sanitizeInput(telegramUser.username);

  // Create or update user
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      telegram_id: telegramUser.id,
      username: username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      created_at: new Date().toISOString()
    };
    saveUsers(users);

    // Initialize game data
    const gameData = loadGameData();
    gameData[userId] = {
      tokens: 0,
      rebirth_level: 0,
      click_power: 1,
      auto_clicker: 0,
      multiplier: 1,
      last_updated: new Date().toISOString()
    };
    saveGameData(gameData);
  }

  req.session.userId = userId;
  req.session.username = username;
  req.session.telegramId = telegramUser.id;
  
  res.json({ 
    success: true, 
    username: username,
    telegram_id: telegramUser.id
  });
});

// Register (legacy - now using Telegram auth)
app.post('/register', requireTelegramWebApp, authLimiter, [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-20 alphanumeric characters'),
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be 6-100 characters')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input: ' + errors.array()[0].msg });
  }

  const { username, password } = req.body;
  const sanitizedUsername = sanitizeInput(username.toLowerCase());

  const users = loadUsers();
  
  if (users[sanitizedUsername]) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const hashedPassword = hashPassword(password);
  const userId = crypto.randomBytes(16).toString('hex');
  
  users[sanitizedUsername] = {
    id: userId,
    username: sanitizedUsername,
    password: hashedPassword,
    created_at: new Date().toISOString()
  };
  
  saveUsers(users);
  
  // Initialize game data
  const gameData = loadGameData();
  gameData[userId] = {
    tokens: 0,
    rebirth_level: 0,
    click_power: 1,
    auto_clicker: 0,
    multiplier: 1,
    last_updated: new Date().toISOString()
  };
  saveGameData(gameData);
  
  req.session.userId = userId;
  req.session.username = sanitizedUsername;
  res.json({ success: true, username: sanitizedUsername });
});

// Login (legacy - now using Telegram auth)
app.post('/login', requireTelegramWebApp, authLimiter, [
  body('username').trim().isLength({ min: 1, max: 20 }),
  body('password').isLength({ min: 1, max: 100 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { username, password } = req.body;
  const sanitizedUsername = sanitizeInput(username.toLowerCase());

  const users = loadUsers();
  const user = users[sanitizedUsername];
  
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, username: user.username });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get game data
app.get('/game-data', requireTelegramWebApp, requireAuth, (req, res) => {
  const gameData = loadGameData();
  const userData = gameData[req.session.userId];
  
  if (!userData) {
    return res.json({ tokens: 0, rebirth_level: 0, click_power: 1, auto_clicker: 0, multiplier: 1 });
  }
  
  const validatedData = validateGameData(userData);
  res.json(validatedData);
});

// Click action
app.post('/click', requireTelegramWebApp, clickLimiter, requireAuth, (req, res) => {
  const gameData = loadGameData();
  const currentData = gameData[req.session.userId] || { tokens: 0, rebirth_level: 0, click_power: 1, multiplier: 1 };
  
  const validatedData = validateGameData(currentData);
  const tokensEarned = validatedData.click_power * validatedData.multiplier;
  const newTokens = Math.min(validatedData.tokens + tokensEarned, Number.MAX_SAFE_INTEGER);

  gameData[req.session.userId] = {
    ...validatedData,
    tokens: newTokens,
    last_updated: new Date().toISOString()
  };
  
  saveGameData(gameData);
  res.json({ tokens: newTokens, earned: tokensEarned });
});

// Buy upgrade
app.post('/buy-upgrade', requireTelegramWebApp, upgradeLimiter, requireAuth, [
  body('type').isIn(['click_power', 'auto_clicker', 'multiplier'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid upgrade type' });
  }

  const { type } = req.body;
  const gameData = loadGameData();
  const currentData = gameData[req.session.userId] || { tokens: 0, rebirth_level: 0, click_power: 1, auto_clicker: 0, multiplier: 1 };
  
  const validatedData = validateGameData(currentData);
  
  // Check max limits
  const maxLimits = {
    auto_clicker: 20,
    multiplier: 50
  };
  
  if (maxLimits[type] && validatedData[type] >= maxLimits[type]) {
    return res.status(400).json({ error: 'Maximum level reached' });
  }
  
  // Calculate upgrade costs
  const costs = {
    click_power: Math.floor(10 * Math.pow(1.5, validatedData.click_power - 1)),
    auto_clicker: Math.floor(100 * Math.pow(2, validatedData.auto_clicker)),
    multiplier: Math.floor(1000 * Math.pow(3, validatedData.multiplier - 1))
  };

  const cost = costs[type];
  
  if (validatedData.tokens < cost) {
    return res.status(400).json({ error: 'Insufficient tokens' });
  }

  const newTokens = validatedData.tokens - cost;
  const newValue = validatedData[type] + 1;

  gameData[req.session.userId] = {
    ...validatedData,
    tokens: newTokens,
    [type]: newValue,
    last_updated: new Date().toISOString()
  };
  
  saveGameData(gameData);
  res.json({ success: true, tokens: newTokens, [type]: newValue });
});

// Rebirth
app.post('/rebirth', requireTelegramWebApp, upgradeLimiter, requireAuth, (req, res) => {
  const gameData = loadGameData();
  const currentData = gameData[req.session.userId] || { tokens: 0, rebirth_level: 0, click_power: 1, auto_clicker: 0, multiplier: 1 };
  
  const validatedData = validateGameData(currentData);
  
  if (validatedData.rebirth_level >= 5) {
    return res.status(400).json({ error: 'Maximum rebirth level reached' });
  }

  const rebirthCost = Math.floor(10000 * Math.pow(10, validatedData.rebirth_level));
  
  if (validatedData.tokens < rebirthCost) {
    return res.status(400).json({ error: 'Insufficient tokens for rebirth' });
  }

  const newRebirthLevel = validatedData.rebirth_level + 1;
  
  gameData[req.session.userId] = {
    tokens: 0,
    rebirth_level: newRebirthLevel,
    click_power: 1,
    auto_clicker: 0,
    multiplier: newRebirthLevel + 1,
    last_updated: new Date().toISOString()
  };
  
  saveGameData(gameData);
  res.json({ success: true, rebirth_level: newRebirthLevel });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Bosinn Elite Clicker server running on port ${PORT}`);
  console.log(`Telegram strict mode: ${STRICT_TELEGRAM_MODE ? 'ENABLED' : 'DISABLED'}`);
  if (!STRICT_TELEGRAM_MODE) {
    console.log('⚠️  WARNING: App is accessible without Telegram. Set TELEGRAM_BOT_TOKEN for production!');
  }
});