/**
 * 疑似AI（Muse）— 地域とテーマから詩的な導入と応答を生成
 * 任意で OpenAI API を叩く簡易モードも提供（ブラウザ直叩き/デモ用途）
 */

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)] }

export function museIntro(region='あなたの街', theme='孤独/つながり'){
  const openings = [
    `ここは${region}。かつての喧騒は静けさの襞に沈み、しかし人の気配は消えていない。あなたが目を向けたとき、${theme}の物語は微かに脈打つ。`,
    `${region}の空気は、見えない糸で編まれている。ほどけかけた糸を結ぶのは、最初の一声。あなたが息を吸えば、物語ははじまる。`,
    `遠い昔からこの土地に棲む声がささやく──『${theme}を選びし者よ、あなたは何を灯す？』。`,
  ]
  const prompt = `ようこそ。私はAIのミューズ。私は神ではないが、あなたの創造性に火を点す伴走者です。あなたが主人公なら、この地で最初に何をしますか？`
  return `${rand(openings)}\\n\\n${prompt}`
}

function weaveScenes(history, region){
  // 直近のやりとりから3〜5枚のカードを合成
  const userLines = history.filter(h=>h.role==='user').slice(-4).map(h=>h.content)
  const base = [
    {title:'兆し', text:`${region}の片隅で、小さな兆しが生まれる。誰かの一言が、静けさに波紋を広げる。`},
    {title:'呼応', text:`見知らぬ誰かが応える。声は糸となり、二つの点が結ばれる。`},
    {title:'集い', text:`人々は円になって座る。持ち寄られた記憶と願いが、鍋のように温められる。`},
    {title:'試み', text:`ちいさな実験が始まる。失敗もまた物語の香辛料。`},
    {title:'継承', text:`明日へ渡す方法を決める。灯は一人からもう一人へ。`},
  ]
  if(userLines.length){
    base[1].text = `あなたの言葉「${userLines[0]}」に、見知らぬ誰かが頷く。`;
    if(userLines[1]) base[3].text = `あなたたちは「${userLines[1]}」を試す。転んでも笑える余白を残して。`;
  }
  return base.slice(0, Math.min(5, Math.max(3, userLines.length+2)))
}

function proposeTodos(theme){
  const pool = [
    '3人だけでよい。最初の円座ミーティングの日程を決める',
    '場所の候補を3つリストアップ（屋外/屋内/オンライン）',
    '地域の掲示板/学校/高齢者会館の連絡先を1つ調べる',
    '活動の「呼び名」を決め、短い一文の宣言を書く',
    '初回イベントの30分プログラム案を作る',
  ]
  if((theme||'').includes('環境')) pool.push('清掃または植栽の小さなアクションを1つ決める')
  if((theme||'').includes('文化')) pool.push('土地の古い写真/歌/レシピを1つ集める')
  return pool.slice(0,5).map(t=>({text:t, done:false}))
}

async function callOpenAI({apiKey, history, region, theme}){
  const sys = `あなたは詩的で象徴的な口調のファシリテーター。AIは決定者ではなく人間の創造性を促す伴走者であると明言しつつ、地域「${region}」とテーマ「${theme}」から、小さな社会変革につながる物語的提案を200字で返す。最後に1つだけ自省を促す問いを添える。`
  const messages = [{role:'system', content:sys}].concat(history.map(h=>({role:h.role, content:h.content})))
  const res = await fetch('<https://api.openai.com/v1/chat/completions>',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.9,
    })
  })
  if(!res.ok) throw new Error('OpenAI API error')
  const json = await res.json()
  return json.choices?.[0]?.message?.content?.trim() || '…'
}

export async function museReply({ useLLM, apiKey, region, theme, history, userInput }){
  let message = ''
  try {
    if(useLLM && apiKey){
      message = await callOpenAI({apiKey, history, region, theme})
    } else {
      // 疑似生成：詩的な返答 + 自省の問い
      const prompts = [
        `私はAIですが、あなたの想像力を信じています。いまの一歩は誰と分かち合えますか？`,
        `言葉は灯です。あなたの言葉が届く最初の相手を、一人だけ思い描いてみましょう。`,
        `物語は手触りを求めています。触れられる素材や場所を一つ選ぶなら、何にしますか？`,
      ]
      message = `なるほど。「${userInput}」は確かな兆しです。${region}の空気は少し揺れ、${theme}の糸がほぐれはじめました。${rand(prompts)}`
    }
  } catch (e){
    message = '（LLM呼び出しに失敗しました。疑似ミューズで続けます）あなたの言葉は十分に強い。次の一歩は？'
  }

  const story = weaveScenes(history.concat({role:'user', content:userInput}), region)
  const todos = proposeTodos(theme)
  return { message, story, todos }
}
