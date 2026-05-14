// src/state.js
export const METRICS = [
  { key: 'privacy', label: 'プライバシー', icon: 'privacy' },
  { key: 'safety', label: '安全', icon: 'safety' },
  { key: 'fairness', label: '公平', icon: 'fairness' },
  { key: 'transparency', label: '透明性', icon: 'transparency' },
  { key: 'humanAgency', label: '人間主体', icon: 'agency' },
  { key: 'sustainability', label: '持続性', icon: 'sustain' },
  { key: 'wellbeing', label: '幸福', icon: 'wellbeing' },
  { key: 'trust', label: '信頼', icon: 'trust' },
  { key: 'exploitation', label: '搾取', icon: 'exploitation' },
  { key: 'loneliness', label: '孤独', icon: 'loneliness' }
];

export const state = {
  metrics: {
    privacy: 0.6,
    safety: 0.5,
    fairness: 0.5,
    transparency: 0.5,
    humanAgency: 0.5,
    sustainability: 0.5,
    wellbeing: 0.5,
    trust: 0.5,
    exploitation: 0.4,
    loneliness: 0.4
  },
  history: [],
  scenarioIndex: 0,
  finished: false
};

export function clamp01(x){ return Math.max(0, Math.min(1, x)); }

export function applyChoice(choice){
  const snapshotBefore = { ...state.metrics };
  const deltas = choice.deltas || {};
  Object.keys(state.metrics).forEach(k => {
    const d = deltas[k] || 0;
    state.metrics[k] = clamp01(state.metrics[k] + d);
  });
  state.history.push({
    t: Date.now(),
    choiceId: choice.id,
    title: choice.label,
    deltas,
    before: snapshotBefore,
    after: { ...state.metrics }
  });
}

export function resetState(){
  Object.assign(state.metrics, {
    privacy: 0.6,
    safety: 0.5,
    fairness: 0.5,
    transparency: 0.5,
    humanAgency: 0.5,
    sustainability: 0.5,
    wellbeing: 0.5,
    trust: 0.5,
    exploitation: 0.4,
    loneliness: 0.4
  });
  state.history.length = 0;
  state.scenarioIndex = 0;
  state.finished = false;
}
