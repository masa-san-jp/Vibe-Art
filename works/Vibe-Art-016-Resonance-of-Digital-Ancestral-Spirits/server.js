// server.js
// Minimal Express server: serves static files + proxies OpenAI API using .env
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
app.use(express.json({ limit:'1mb' }));

// static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));

// API proxy
app.post('/api/chat', async (req, res) => {
  try{
    const apiKey = process.env.OPENAI_API_KEY;
    if(!apiKey) return res.status(500).json({ error:'Missing OPENAI_API_KEY' });
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const body = {
      model,
      messages: req.body.messages || [],
      temperature: 0.8,
    };
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    if(!r.ok){
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || '';
    res.json({ reply });
  }catch(err){
    console.error(err);
    res.status(500).json({ error:'Upstream error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`➡  http://localhost:${PORT}`));
