import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Load .env file for local development (Cloud Run will use process.env directly)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

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
