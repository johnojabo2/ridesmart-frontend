import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';

// Load .env file for local development (Cloud Run will use process.env directly)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Google Auth for identity tokens
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Get backend URL from environment
const BACKEND_URL = process.env.VITE_LIVE_APP_URL || process.env.VITE_DEV_APP_URL || '';

// Cache for identity token (refresh every 50 minutes, tokens last 1 hour)
let cachedToken = null;
let tokenExpiry = 0;

async function getIdentityToken() {
  const now = Date.now();
  
  // Return cached token if still valid (with 10 minute buffer)
  if (cachedToken && now < tokenExpiry - 600000) {
    return cachedToken;
  }
  
  try {
    const client = await auth.getIdTokenClient(BACKEND_URL);
    const token = await client.idTokenProvider.fetchIdToken(BACKEND_URL);
    cachedToken = token;
    tokenExpiry = now + 3600000; // 1 hour
    return token;
  } catch (error) {
    console.error('Error fetching identity token:', error);
    // In development, return empty token (backend might be public)
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using empty token for development');
      return '';
    }
    throw error;
  }
}

// Middleware to parse JSON bodies for proxy requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function to get environment variables from OS
function getEnvVars() {
  return {
    NODE_ENV: process.env.NODE_ENV || 'production',
    PORT: process.env.PORT || '8080',
    VITE_DEV_APP_URL: process.env.VITE_DEV_APP_URL || '',
    VITE_LIVE_APP_URL: process.env.VITE_LIVE_APP_URL || '',
    VITE_FLWPUBKTEST: process.env.VITE_FLWPUBKTEST || '',
    VITE_UPLOAD_LOGO: process.env.VITE_UPLOAD_LOGO || '',
    VITE_APP_URL: process.env.VITE_APP_URL || '',
  };
}

// Proxy endpoint for backend API requests (adds identity token for private Cloud Run)
app.use('/api', async (req, res) => {
  if (!BACKEND_URL) {
    return res.status(500).json({ 
      error: 'Backend URL not configured. Set VITE_LIVE_APP_URL or VITE_DEV_APP_URL' 
    });
  }
  
  try {
    // Get identity token for private backend
    const identityToken = await getIdentityToken();
    
    // Forward the request to the private backend
    // req.path includes the full path including /api, so we use it directly
    const backendUrl = `${BACKEND_URL}${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    
    // Prepare headers
    const headers = {
      'Content-Type': req.headers['content-type'] || 'application/json',
    };
    
    // Add identity token for private backend
    if (identityToken) {
      headers['Authorization'] = `Bearer ${identityToken}`;
    }
    
    // Forward user's authorization token if present (for authenticated requests)
    if (req.headers['authorization']) {
      headers['X-User-Authorization'] = req.headers['authorization'];
    }
    
    // Make request to backend
    const response = await axios({
      method: req.method,
      url: backendUrl,
      headers,
      data: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      validateStatus: () => true, // Don't throw on any status
    });
    
    // Forward response
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy request to backend',
      message: error.message 
    });
  }
});

// Serve static files from dist directory (CSS, JS, images, etc.)
app.use(express.static(join(__dirname, 'dist'), {
  // Don't serve index.html as static file, we'll handle it separately
  index: false
}));

// Inject environment variables into HTML for all routes (SPA routing)
app.get('*', (req, res) => {
  // If the request has a file extension, it's a static file request
  // If static middleware couldn't serve it, return 404
  if (extname(req.path)) {
    return res.status(404).send('Not found');
  }
  
  try {
    const indexPath = join(__dirname, 'dist', 'index.html');
    
    if (!existsSync(indexPath)) {
      return res.status(500).send('Application not built. Please run npm run build first.');
    }
    
    let html = readFileSync(indexPath, 'utf-8');
    
    const envVars = getEnvVars();
    const envScript = `
    <script>
      window.__ENV__ = ${JSON.stringify(envVars)};
    </script>
    `;
    
    // Inject the script before the closing </head> tag, or before the root div if no head tag
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${envScript}</head>`);
    } else {
      html = html.replace('<div id="root">', `${envScript}<div id="root">`);
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});
