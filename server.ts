import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import yts from 'yt-search';
import ytdl from '@distube/ytdl-core';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) return res.status(400).json({ error: 'Query is required' });
      
      const results = await yts(query);
      res.json(results.videos.slice(0, 10));
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Failed to search videos' });
    }
  });

  app.get('/api/suggestions', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) return res.json([]);
      
      // yt-search doesn't have a direct suggestions API, but we can use a simple fetch to Google's autocomplete
      const response = await fetch(`https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`);
      const text = await response.text();
      // Extract suggestions from JSONP-like response: window.google.ac.h(["query",[["suggestion1",0],["suggestion2",0]],...])
      const match = text.match(/\["(.*?)",\[(.*?)\]/);
      if (match && match[2]) {
        const suggestions = JSON.parse(`[${match[2]}]`).map((s: any) => s[0]);
        res.json(suggestions);
      } else {
        res.json([]);
      }
    } catch (error) {
      res.json([]);
    }
  });

  app.get('/api/info', async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: 'URL is required' });
      
      const info = await ytdl.getInfo(url);
      const formats = info.formats.map(f => ({
        quality: f.qualityLabel || (f.audioBitrate ? `${f.audioBitrate}kbps` : 'Unknown'),
        container: f.container,
        url: f.url,
        hasVideo: f.hasVideo,
        hasAudio: f.hasAudio,
        contentLength: f.contentLength,
        mimeType: f.mimeType,
        itag: f.itag
      }));

      res.json({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails[0].url,
        duration: info.videoDetails.lengthSeconds,
        formats
      });
    } catch (error) {
      console.error('Info error:', error);
      res.status(500).json({ error: 'Failed to get video info' });
    }
  });

  // Download proxy to handle CORS and headers
  app.get('/api/download', async (req, res) => {
    try {
      const url = req.query.url as string;
      const filename = req.query.filename as string || 'download';
      const itag = req.query.itag as string;

      if (!url) return res.status(400).send('URL is required');

      res.header('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (itag) {
        // Use ytdl to stream the specific format
        ytdl(url, { 
          filter: format => format.itag === parseInt(itag),
          quality: 'highest'
        }).pipe(res);
      } else {
        // Fallback for direct URLs (if any)
        const response = await fetch(url);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      }
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).send('Download failed');
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
