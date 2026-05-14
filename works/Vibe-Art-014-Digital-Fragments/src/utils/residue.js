// 極めて単純な頻出語抽出（日本語/英語混在のゆるい対応）
const STOP = new Set(['の','に','は','を','が','と','た','て','で','な','も','へ','から','まで','より','そして','また','しかし','the','a','an','to','and','or','of','in','on','for','with','is','are']);

export function extractKeywords(text, max=8) {
  if (!text) return [];
  const words = text
    .replace(/[、。.,!?！？\-\(\)\[\]"'：:\n]/g,' ')
    .split(/\s+/)
    .filter(Boolean);
  const freq = new Map();
  for (const w of words) {
    if (w.length <= 1 || STOP.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,max).map(([w])=>w);
}

// 簡易パレット抽出：画素を粗くサンプリングして RGB を量子化（バケット化）
export function extractPalette(imageData, buckets = 6) {
  const { data, width, height } = imageData;
  const hist = new Map();
  const step = Math.max(1, Math.floor(Math.min(width, height) / 80));
  for (let y=0; y<height; y+=step) {
    for (let x=0; x<width; x+=step) {
      const i = (y*width + x)*4;
      let r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
      if (a<16) continue;
      // 量子化（32段階）
      r = r & 0xE0; g = g & 0xE0; b = b & 0xE0;
      const key = (r<<16)|(g<<8)|b;
      hist.set(key, (hist.get(key)||0)+1);
    }
  }
  const top = [...hist.entries()].sort((a,b)=>b[1]-a[1]).slice(0,buckets).map(([rgb])=>{
    const r=(rgb>>16)&0xFF, g=(rgb>>8)&0xFF, b=rgb&0xFF;
    return `rgb(${r}, ${g}, ${b})`;
  });
  return top.length? top : ['#8f79f9','#f6cf6b','#6bdcff'];
}
