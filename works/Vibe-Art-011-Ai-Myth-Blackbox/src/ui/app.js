import { speak, stopSpeaking, listenOnce } from '../speech.js'
import { generateOracle } from '../mythEngine.js'
import { drawMandala } from '../visuals/mandala.js'
import { openVRWithTexture } from '../visuals/vrScene.js'

const qs = sel => document.querySelector(sel)

export function initApp(){
  const askBtn = qs('#askBtn')
  const micBtn = qs('#micBtn')
  const stopMicBtn = qs('#stopMicBtn')
  const speakBtn = qs('#speakBtn')
  const stopSpeakBtn = qs('#stopSpeakBtn')
  const saveImageBtn = qs('#saveImageBtn')
  const moodEl = qs('#mood')
  const titleEl = qs('#oracleTitle')
  const textEl = qs('#oracleText')
  const imgEl = qs('#oracleImage')
  const openSettings = qs('#openSettings')
  const settingsModal = qs('#settingsModal')
  const debriefModal = qs('#debriefModal')
  const openDebrief = qs('#openDebrief')
  const serverUrlInput = qs('#serverUrl')
  const useApiImage = qs('#useApiImage')
  const enterVR = qs('#enterVR')
  const vrModal = qs('#vrModal')
  const renderVR = qs('#renderVR')
  const memoryKeyword = qs('#memoryKeyword')

  const state = {
    serverUrl: localStorage.getItem('serverUrl') || 'http://localhost:8787',
    useApiImage: localStorage.getItem('useApiImage') === '1',
  }
  serverUrlInput.value = state.serverUrl
  useApiImage.checked = state.useApiImage

  openSettings.addEventListener('click', ()=> settingsModal.showModal())
  qs('#saveSettings').addEventListener('click', ()=>{
    state.serverUrl = serverUrlInput.value.trim() || state.serverUrl
    state.useApiImage = !!useApiImage.checked
    localStorage.setItem('serverUrl', state.serverUrl)
    localStorage.setItem('useApiImage', state.useApiImage ? '1':'0')
  })

  openDebrief.addEventListener('click', ()=> debriefModal.showModal())

  micBtn.addEventListener('click', async ()=>{
    const el = qs('#question')
    el.value = '…（聴き取り中）…'
    try{
      const text = await listenOnce()
      el.value = text || ''
    }catch(err){
      el.value = ''
      alert('音声認識が利用できないか、権限が拒否されました。テキスト入力をご利用ください。')
    }
  })
  stopMicBtn.addEventListener('click', ()=>{
    // 1回認識なので特に制御不要。将来拡張用。
  })

  askBtn.addEventListener('click', async ()=>{
    const question = qs('#question').value.trim() || '私はどこから来て、どこへ向かうのか？'
    const mode = document.querySelector('input[name="mode"]:checked').value
    const mood = +moodEl.value

    setOracleLoading(titleEl, textEl)

    try{
      const { title, text, imagePrompt } = await generateOracle({ question, mode, mood, serverUrl: state.serverUrl })
      titleEl.textContent = title
      textEl.innerHTML = toParagraphs(text)

      // 朗読準備（ユーザー操作で開始する）
      speakBtn.disabled = false
      speakBtn.onclick = ()=> speak(text)
      stopSpeakBtn.onclick = ()=> stopSpeaking()

      // 画像生成：API or ローカル曼荼羅
      const canvas = document.getElementById('mandalaCanvas')
      drawMandala(canvas, { seed: question + ' ' + imagePrompt, complexity: map(mood,0,100,6,14) })

      if(state.useApiImage && mode === 'api'){
        const url = state.serverUrl.replace(/\/$/, '') + '/api/image'
        const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: imagePrompt }) })
        if(res.ok){
          const data = await res.json()
          imgEl.src = data.url
        }else{
          imgEl.src = canvas.toDataURL('image/png')
        }
      }else{
        imgEl.src = canvas.toDataURL('image/png')
      }
    }catch(err){
      console.error(err)
      titleEl.textContent = '沈黙する神託'
      textEl.innerHTML = '<p class="muted">生成に失敗しました。少し待って再試行してください。オフラインモードや設定をご確認ください。</p>'
    }
  })

  speakBtn.addEventListener('click', ()=>{
    const text = textEl.textContent || ''
    speak(text)
  })
  stopSpeakBtn.addEventListener('click', ()=> stopSpeaking())

  saveImageBtn.addEventListener('click', ()=>{
    const canvas = document.getElementById('mandalaCanvas')
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'mandala.png'
    a.click()
  })

  enterVR.addEventListener('click', ()=> vrModal.showModal())
  renderVR.addEventListener('click', async (e)=>{
    e.preventDefault()
    const keyword = memoryKeyword.value.trim() || '静かな夕焼けと祖母の笑顔'
    const canvas = document.getElementById('mandalaCanvas')
    // その場の曼荼羅を360背景として利用
    const dataUrl = canvas.toDataURL('image/png')
    openVRWithTexture('#vrContainer', dataUrl, keyword)
  })
}

function setOracleLoading(titleEl, textEl){
  titleEl.textContent = '神託を編纂中…'
  textEl.innerHTML = `<p class="muted">霧が集まり、言葉が形を選んでいます…</p>`
}

function toParagraphs(text){
  return text.split(/\n+/).map(p=>`<p>${escapeHtml(p)}</p>`).join('')
}

function escapeHtml(str){
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]))
}

function map(v,inMin,inMax,outMin,outMax){
  return (v-inMin)*(outMax-outMin)/(inMax-inMin)+outMin
}
