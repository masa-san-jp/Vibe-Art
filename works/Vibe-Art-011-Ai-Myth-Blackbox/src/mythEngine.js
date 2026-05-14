// LLM（サーバ経由）またはローカル擬似生成を切り替えて神託を生成

export async function generateOracle({ question, mode='local', mood=40, serverUrl='http://localhost:8787' }){
  if(mode === 'api'){
    const url = serverUrl.replace(/\/$/, '') + '/api/llm'
    const system = `あなたは神話の書記官です。荘厳で詩的、かつ過度に断定しすぎない語りで、日本語の神話テキストを生成します。\n要求:\n- 序句/本論/結句（各2〜4文）で構成。\n- キーワードを象徴や比喩に織り込む。\n- 読後に解釈の余白を残す。\n- 危険行為・医療/法律助言は避け、倫理的配慮を。`
    const user = `問: ${question}\nムード(0-100): ${mood}\n出力フォーマット(JSON): {"title":"...","text":"...","imagePrompt":"..."}\nimagePromptは、神話的イメージを英語で20〜40語。"`

    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ system, user }) })
    if(!res.ok){
      throw new Error('LLM API failed')
    }
    const data = await res.json()
    // 期待: { title, text, imagePrompt }
    return data
  }

  // ---- ローカル擬似生成（テンプレ + ランダム） ----
  const arche = pick([
    '火の鳥','渦の蛇','鏡の花','星降る舟','沈黙の祠','風を編む手','月の書記','海を渡る灯','忘却の守り手'
  ])
  const place = pick(['水鏡の湖','灰の森','東の岬','廃都の境内','深き渕','天蓋の洞','薫る砂庭'])
  const gift = pick(['静けさ','記憶の欠片','呼吸','赦し','約束','余白','名もなき光'])
  const verb = pick(['抱きしめよ','手放せ','見つめよ','受け取れ','祈れ','委ねよ','笑え'])

  const title = `【${arche}の託宣】`
  const text = [
    `はじめに、${place}に一筋の声が降りた。古きものは眠り、幼きものは目覚め、名を持たぬ風だけがあなたの頬を撫でる。`,
    `問いは円環となり、円環は階(きざはし)となって天へかかる。あなたが携えるのは${gift}。その重さは羽根のように軽く、石のように深い。`,
    `やがて${arche}が現れ、言葉の前に沈黙を置いた。「${verb}。それは終わりではなく、はじまりの合図。」`,
  ].join('\n\n')

  const imagePrompt = `${arche} as sacred icon, ${place}, mythic composition, mandala motifs, deep chiaroscuro, soft volumetric light, gold leaf accents, ukiyo-e + baroque fusion, high detail`

  return { title, text, imagePrompt }
}

function pick(arr){
  return arr[Math.floor(Math.random()*arr.length)]
}
