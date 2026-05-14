import { useEffect, useRef } from 'react'
import { useNLStore } from '../state/store'
import * as Tone from 'tone'

function useSoundscape(active: boolean, tags: string[]) {
  const synths = useRef<{ cricket?: Tone.FMSynth; drum?: Tone.MembraneSynth; noise?: Tone.Noise; filt?: Tone.Filter } | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!active) return
    let mounted = true

    async function start() {
      if (started.current) return
      await Tone.start()

      const cricket = new Tone.FMSynth({ modulationIndex: 12 }).toDestination()
      cricket.volume.value = -24

      const drum = new Tone.MembraneSynth().toDestination()
      drum.volume.value = -18

      const noise = new Tone.Noise('brown')
      const filt = new Tone.Filter(400, 'lowpass').toDestination()
      noise.connect(filt)
      noise.start()
      filt.frequency.rampTo(tags.includes('ocean') ? 500 : 200, 2)
      filt.gain = 0.3 as any

      synths.current = { cricket, drum, noise, filt }

      // crickets
      const cricketLoop = new Tone.Loop((time) => {
        if (!mounted) return
        const f = 800 + Math.random()*400
        cricket.triggerAttackRelease(f, '32n', time)
      }, tags.includes('summer') ? '8n' : '4n').start(0)

      // festival drums (sparse)
      const drumLoop = new Tone.Loop((time) => {
        if (!mounted) return
        if (!tags.includes('festival')) return
        if (Math.random() < 0.35) drum.triggerAttackRelease('C2', '8n', time)
      }, '2n').start(0)

      // distant horn (train/ocean)
      const horn = new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination()
      horn.volume.value = -20
      const hornLoop = new Tone.Loop((time) => {
        if (!mounted) return
        if (!tags.some(t => t === 'train' || t === 'ocean')) return
        if (Math.random() < 0.15) horn.triggerAttackRelease('A2', '2n', time)
      }, '1m').start(0)

      Tone.Transport.bpm.value = 50
      Tone.Transport.start()

      return () => {
        cricketLoop.dispose(); drumLoop.dispose(); hornLoop.dispose()
      }
    }

    start()

    return () => {
      mounted = false
      Tone.Transport.stop()
      Tone.Transport.cancel()
      if (synths.current) {
        synths.current.cricket?.dispose()
        synths.current.drum?.dispose()
        synths.current.noise?.dispose()
        synths.current.filt?.dispose()
      }
      synths.current = null
      started.current = false
    }
  }, [active, tags])
}

export default function Soundscape() {
  const { scene, sessionActive, culturalTags, audioOn } = useNLStore()
  useSoundscape(Boolean(scene && sessionActive && audioOn), culturalTags)
  return null
}
