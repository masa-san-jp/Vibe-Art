import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const PORT = process.env.PORT || 8787

// ---- LLM プロキシ（OpenAI Chat Completions想定） ----
app.post('/api/llm', async (req, res) => {
  try{
    const { system, user } = req.body || {}
    if(!process.env.OPENAI_API_KEY){
      return res.status(501).json({ error: 'OPENAI_API_KEY not set' })
    }
    const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system || '' },
          { role: 'user', content: user || '' }
        ],
        temperature: 0.9,
        max_tokens: 700
      })
    })

    if(!r.ok){
      const t = await r.text()
      return res.status(500).json({ error: 'Upstream failed', details: t })
    }
    const json = await r.json()
    const content = json.choices?.[0]?.message?.content || ''

    // content はJSON文字列が期待値。安全にパース
    let parsed
    try{ parsed = JSON.parse(safeExtractJson(content)) } catch{ parsed = null }

    if(!parsed || !parsed.title || !parsed.text || !parsed.imagePrompt){
      // フォールバック：素のテキストから整形
      const fallback = {
        title: '神託',
        text: content,
        imagePrompt: 'mythic icon, luminous mandala, chiaroscuro, gold leaf, high detail'
      }
      return res.json(fallback)
    }
    return res.json(parsed)
  }catch(err){
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ---- 画像生成 プロキシ（OpenAI Images想定） ----
app.post('/api/image', async (req, res) => {
  try{
    const { prompt } = req.body || {}
    if(!process.env.OPENAI_API_KEY){
      return res.status(501).json({ error: 'OPENAI_API_KEY not set' })
    }
    const model = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3'

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        size: '1024x1024',
        n: 1
      })
    })

    if(!r.ok){
      const t = await r.text()
      return res.status(500).json({ error: 'Upstream failed', details: t })
    }
    const json = await r.json()
    const url = json.data?.[0]?.url
    if(!url) return res.status(500).json({ error: 'No image URL' })
    res.json({ url })
  }catch(err){
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.listen(PORT, ()=>{
  console.log(`[ai-myth-blackbox] server on http://localhost:${PORT}`)
})

// JSON以外を含む応答から安全にJSONブロックを抽出
function safeExtractJson(str){
  const match = str.match(/[\{\[].*[\}\]]/s)
  return match ? match[0] : '{}'
}
