let utterance

export function speak(text){
  stopSpeaking()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = 0.98
  u.pitch = 1.0
  u.volume = 1.0
  utterance = u
  speechSynthesis.speak(u)
}

export function stopSpeaking(){
  if(speechSynthesis.speaking) speechSynthesis.cancel()
  utterance = null
}

export function listenOnce(){
  return new Promise((resolve, reject)=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR){
      return reject(new Error('SpeechRecognition not available'))
    }
    const rec = new SR()
    rec.lang = 'ja-JP'
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onresult = (e)=>{
      const t = e.results[0][0].transcript
      resolve(t)
    }
    rec.onerror = (e)=> reject(e.error || e)
    rec.onend = ()=>{}

    rec.start()
  })
}
