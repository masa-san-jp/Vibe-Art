import { xorshift32, seedFromText } from '../utils/rng.js';

const MYTHIC = {
  themes: ['創造','破壊','再生','循環','無常','沈黙','祈り','余白','光','闇','記憶','忘却','風','水','炎','土','星','種','円環','世界樹'],
  openings: [
    'はじめに、静かな呼吸だけがあった。',
    '誰も知らない夜の底で、ひとつの光点が芽吹いた。',
    '砂の上に描かれた輪は、やがて風に融けた。',
    '声なき合唱が、見えない天蓋を震わせる。',
  ],
  bodies: [
    '粒子は寄り集まり、模様は自らの中心を忘れ、また想い出す。',
    '円環はほどけ、ほどけた糸は世界樹の根へ帰る。',
    '名づけられたものは崩れ、名づけられないものが立ち上がる。',
    'あなたが手放した息は、遠い地平の雲をつくる。',
    '火は踊り、水は記憶を冷やし、風は語り、土は沈黙する。',
  ],
  turns: [
    'やがて儀式の終わりが始まりとなると、誰もが頷いた。',
    '破壊ののちに残った粉は、次の季節の種である。',
    '沈黙にまさる言葉はなく、名付けにまさる無名はない。',
    '円は満ち、欠け、また満ちる。',
  ],
  closings: [
    'ここに在るものは、もう在らない。けれど、たしかに在った。',
    'あなたの指先に残る微かな光沢が、新しい始まりの兆し。',
    '砂を払えば、地中で芽吹く音が聴こえる。',
    '目を閉じて、もう一度だけ、呼吸を重ねる。',
  ]
};

export function generateText(prompt='') {
  const seed = seedFromText(prompt);
  const rand = xorshift32(seed);
  const pick = (arr) => arr[Math.floor(rand()*arr.length)];
  const theme = pick(MYTHIC.themes);
  const kwLine = prompt ? `【奉納】${prompt}` : `【主題】${theme}`;

  const lines = [
    kwLine,
    '',
    pick(MYTHIC.openings),
    pick(MYTHIC.bodies),
    pick(MYTHIC.bodies),
    pick(MYTHIC.turns),
    pick(MYTHIC.closings)
  ];
  return lines.join('\n');
}
