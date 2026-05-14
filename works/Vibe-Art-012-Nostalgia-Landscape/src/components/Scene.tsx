import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sparkles, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'
import { useNLStore } from '../state/store'

function GradientBackdrop() {
  const { scene } = useNLStore()
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (!mat.current || !scene) return
    mat.current.uniforms.uTime.value = clock.elapsedTime
    mat.current.uniforms.uHueA.value = scene.hueA
    mat.current.uniforms.uHueB.value = scene.hueB
  })

  return (
    <mesh ref={mesh} scale={[50, 50, 50]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial ref={mat} side={THREE.BackSide} uniforms={{
        uTime: { value: 0 },
        uHueA: { value: 0.1 },
        uHueB: { value: 0.8 },
      }} vertexShader={`
        varying vec3 vPos;
        void main(){
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `} fragmentShader={`
        uniform float uTime; uniform float uHueA; uniform float uHueB;
        varying vec3 vPos;
        // simple hue to rgb
        vec3 h2rgb(float h){
          float r = abs(h*6.0-3.0)-1.0;
          float g = 2.0-abs(h*6.0-2.0);
          float b = 2.0-abs(h*6.0-4.0);
          return clamp(vec3(r,g,b),0.0,1.0);
        }
        void main(){
          // vertical gradient based on y
          float t = smoothstep(-1.0, 1.0, normalize(vPos).y);
          float hue = mix(uHueB, uHueA, t);
          vec3 col = h2rgb(hue);
          // gentle vignette
          float v = pow(1.0-abs(normalize(vPos).y), 1.2);
          col *= mix(1.0, 0.88, v);
          // subtle flicker
          col *= 0.98 + 0.02 * sin(uTime*0.8);
          gl_FragColor = vec4(col, 1.0);
        }
      `} />
    </mesh>
  )
}

function Fireflies() {
  const { scene } = useNLStore()
  if (!scene?.fireflies) return null
  return <Sparkles count={120} scale={40} size={2.5} speed={0.2} noise={0.6} />
}

function GroundHaze() {
  return (
    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0,-2,0]}>
      <planeGeometry args={[200,200]} />
      <meshBasicMaterial color="#0a0a0a" transparent opacity={0.4} />
    </mesh>
  )
}

export default function Scene() {
  const { scene } = useNLStore()

  const inclination = scene?.timeOfDay === 'dawn' ? 0.05 : scene?.timeOfDay === 'sunset' ? 0.49 : 0.6
  const azimuth = scene?.timeOfDay === 'night' ? 0.25 : 0.15

  return (
    <Canvas camera={{ position: [0, 1.5, 5], fov: 60 }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5,5,5]} intensity={0.6} />
      <Sky distance={450000} sunPosition={[10, 20, 10]} inclination={inclination} azimuth={azimuth} turbidity={4} mieCoefficient={0.02} mieDirectionalG={0.8} rayleigh={1.0} />
      <GradientBackdrop />
      <GroundHaze />
      <Fireflies />
      <OrbitControls enablePan={false} />
    </Canvas>
  )
}
