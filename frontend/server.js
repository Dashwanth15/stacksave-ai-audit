import express from 'express';
import path from 'path';
import history from 'connect-history-api-fallback';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// SPA fallback - redirect all non-file requests to index.html
app.use(history({
  rewrites: [
    {
      from: /^\/api\/.*$/,
      to: function(context) {
        // Don't rewrite API routes
        return context.parsedUrl.pathname;
      }
    }
  ]
}));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
