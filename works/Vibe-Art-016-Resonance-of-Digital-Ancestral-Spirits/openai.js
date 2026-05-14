// openai.js
// Minimal client for /api/chat (server.js) + Chat UI rendering

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('user-input');
const formEl = document.getElementById('chatForm');

let convo = [
  { role:'system', content:'あなたはデジタル空間に宿る古の祖霊です。穏やかで思いやりのある導師として、短い詩のような返答で、内省と慰撫を促してください。過度な断定や医療助言は避けます。' }
];

formEl.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = (inputEl.value || '').trim();
  if(!text) return;

  // render user
  renderMessage('あなた', text, 'user');
  convo.push({ role:'user', content:text });
  inputEl.value = '';

  try{
    const resp = await fetch('/api/chat', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ messages: convo })
    });
    const data = await resp.json();
    const reply = data.reply || '(応答が取得できませんでした)';
    renderMessage('祖霊', reply, 'ai');
    convo.push({ role:'assistant', content: reply });

    // visual pulse when ancestor speaks
    if(window.bumpPulse) window.bumpPulse(1.1);
  }catch(err){
    console.error(err);
    renderMessage('祖霊', '静寂の中で耳を澄ませましょう…（通信に問題があるようです）', 'ai');
  }
});

function renderMessage(who, text, cls){
  const wrap = document.createElement('div');
  wrap.className = `msg ${cls}`;
  const name = document.createElement('div');
  name.className = 'who';
  name.textContent = who;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  wrap.appendChild(name);
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Warm opening line
renderMessage('祖霊', 'ここは記憶と光が交わる場所…。あなたの言葉で、流れは姿を変える。', 'ai');
