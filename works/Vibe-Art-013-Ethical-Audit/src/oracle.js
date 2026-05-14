// src/oracle.js
import { state } from './state.js';

function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

function toneForMetrics(m){
  const tones = [];
  if(m.privacy < .35 && m.safety > .65) tones.push('監視の影が延びる');
  if(m.privacy > .65) tones.push('静謐な秘匿が息づく');
  if(m.trust < .35) tones.push('疑念が街路に漂う');
  if(m.trust > .65) tones.push('人々は互いを信じ合う');
  if(m.exploitation > .65) tones.push('見えざる労働の呻き');
  if(m.fairness > .65) tones.push('秤は均衡を取り戻す');
  if(m.loneliness > .65) tones.push('孤独の結晶が砕ける音');
  if(m.wellbeing > .65) tones.push('心の灯が暖かくともる');
  if(tones.length === 0) tones.push('選択は静かに波紋を広げた');
  return pick(tones);
}

export function makeOracleLine(lastChoice){
  const m = state.metrics;
  const motifA = toneForMetrics(m);
  const motifB = (m.transparency > .6) ? '透明な記録は忘却を拒む' : '曖昧な記録は神話を孕む';
  const motifC = (m.humanAgency > .6) ? '決定はなお人に帰す' : '機械の手が舵を取る';
  const motifD = (m.sustainability > .6) ? '循環は未来へと続く' : '資源は軋みを上げる';

  const line = `《神託》 ${motifA}。\n— ${motifB}。${motifC}。${motifD}。`;
  return line + (lastChoice ? `\n〔選択〕${lastChoice.label}` : '');
}
