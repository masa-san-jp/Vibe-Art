// シード可能な簡易 PRNG（xorshift32）
export function xorshift32(seed) {
  let x = seed | 0; if (x === 0) x = 0x12345678;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    // 0..1 の浮動小数
    return (x >>> 0) / 0xFFFFFFFF;
  };
}

export function seedFromText(text) {
  const s = (text || '').split('').reduce((a,ch)=> (a*131 + ch.charCodeAt(0)) >>> 0, 2166136261);
  return s >>> 0;
}
