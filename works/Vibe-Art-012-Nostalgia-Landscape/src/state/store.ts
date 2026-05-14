import { create } from 'zustand'

export type SceneParams = {
  mode: 'local' | 'image';
  imageUrl?: string;
  timeOfDay: 'dawn' | 'sunset' | 'night';
  hueA: number; // 0..1
  hueB: number; // 0..1
  fireflies: boolean;
  waves: boolean;
  festival: boolean;
}

export type DebriefData = {
  userPrompt: string;
  culturalTags: string[];
  excluded: string[];
  usedExternal: boolean;
  generatedWith: string; // provider or 'local'
}

type NLState = {
  userPrompt: string;
  culturalTags: string[];
  excluded: string[];
  consent: boolean;
  sessionMinutes: number;
  sessionActive: boolean;
  showDebrief: boolean;
  scene: SceneParams | null;
  debrief: DebriefData | null;
  audioOn: boolean;
  set: (p: Partial<NLState>) => void;
}

export const useNLStore = create<NLState>((set) => ({
  userPrompt: '',
  culturalTags: [],
  excluded: [],
  consent: false,
  sessionMinutes: 6,
  sessionActive: false,
  showDebrief: false,
  scene: null,
  debrief: null,
  audioOn: true,
  set: (p) => set(p),
}))
