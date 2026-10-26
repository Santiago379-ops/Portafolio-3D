import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { AdaptiveDpr, OrbitControls, Sparkles, useAnimations, useProgress } from '@react-three/drei'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

/* ------------------------------------------------------------------ */
/*  Configuración editable                                             */
/* ------------------------------------------------------------------ */
const PROFILE = {
  name: 'Santiago Giraldo Sánchez',
  role: 'Desarrollador Creativo · React & Three.js',
  bio: 'Diseño y programo experiencias web interactivas en 3D. Este header corre en tiempo real con React Three Fiber.',
  github: 'https://github.com/Santiago379-ops',
  linkedin: 'https://www.linkedin.com/in/santiago-giraldo-sánchez',
}

// Modelo FBX con animación incluida (colócalo en /public/models/)
const MODEL_URL = '/models/avatar.fbx'

// Paleta de acentos: cada clic sobre el avatar avanza al siguiente color
const ACCENTS = ['#8b5cf6', '#22d3ee', '#ff3b3b', '#facc15']

useLoader.preload(FBXLoader, MODEL_URL)

/* ------------------------------------------------------------------ */
/*  Avatar FBX animado (useLoader + useAnimations)                     */
/* ------------------------------------------------------------------ */
function AnimatedAvatar({ accent, onAccentChange }) {
  const fbx = useLoader(FBXLoader, MODEL_URL)
  const wrapper = useRef()
  const [hovered, setHovered] = useState(false)
  const [excited, setExcited] = useState(false)
  const pulse = useRef(0)

  // Animación integrada del FBX
  const { actions, names } = useAnimations(fbx.animations, fbx)

  useEffect(() => {
    const action = names.length ? actions[names[0]] : null
    if (!action) return
    action.reset().fadeIn(0.5).play()
    return () => {
      action.fadeOut(0.3)
    }
  }, [actions, names])

  // Más velocidad cuando el avatar está "emocionado" (tras un clic)
  useEffect(() => {
    const action = names.length ? actions[names[0]] : null
    if (action) action.timeScale = excited ? 1.7 : 1
  }, [excited, actions, names])

  // Materiales: sombras + copia propia para poder teñir el emissive
  const materials = useMemo(() => {
    const list = []
    fbx.traverse((child) => {
      if (!child.isMesh) return
      // RENDIMIENTO: el raycast sobre un SkinnedMesh recalcula todos los vértices en CPU
      // en cada movimiento del mouse (causa principal de tirones al arrastrar).
      // Lo desactivamos: los clics/hover los captura el cilindro invisible de abajo.
      child.raycast = () => {}
      // Evita parpadeos por culling con el bounding box de la pose inicial
      child.frustumCulled = false
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      const cloned = mats.map((m) => {
        const c = m.clone()
        list.push(c)
        return c
      })
      child.material = Array.isArray(child.material) ? cloned : cloned[0]
    })
    return list
  }, [fbx])

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered])

  const target = useMemo(() => new THREE.Color(), [])
  const accentColor = useMemo(() => new THREE.Color(accent), [accent])

  useFrame((_, delta) => {
    if (!wrapper.current) return
    // Escala suave: hover agranda, el clic da un "pulso" que decae
    pulse.current = THREE.MathUtils.damp(pulse.current, 0, 4, delta)
    const s = (hovered ? 1.06 : 1) + pulse.current * 0.12
    wrapper.current.scale.x = THREE.MathUtils.damp(wrapper.current.scale.x, s, 8, delta)
    wrapper.current.scale.y = wrapper.current.scale.x
    wrapper.current.scale.z = wrapper.current.scale.x

    // Tinte emissive hacia el color de acento
    target.copy(accentColor).multiplyScalar(hovered ? 0.32 : 0.12)
    materials.forEach((m) => {
      if (m.emissive) m.emissive.lerp(target, 1 - Math.exp(-6 * delta))
    })
  })

  return (
    <group
      ref={wrapper}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        pulse.current = 1
        setExcited((v) => !v)
        onAccentChange()
      }}
    >
      <primitive object={fbx} scale={0.01} />
      {/* Caja de colisión invisible: los SkinnedMesh animados dan raycasts imprecisos */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.9, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Formas flotantes (useFrame)                                        */
/* ------------------------------------------------------------------ */
function FloatingShape({ position, kind, speed, size, accent, phase }) {
  const ref = useRef()
  const matRef = useRef()
  const [hovered, setHovered] = useState(false)
  const color = useMemo(() => new THREE.Color(accent), [accent])

  useFrame((state, delta) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime
    m.rotation.x += delta * speed
    m.rotation.y += delta * speed * 1.3
    m.position.y = position[1] + Math.sin(t * speed + phase) * 0.25
    const s = THREE.MathUtils.damp(m.scale.x, hovered ? 1.6 : 1, 8, delta)
    m.scale.setScalar(s)
    if (matRef.current) {
      matRef.current.color.lerp(color, 1 - Math.exp(-5 * delta))
      matRef.current.emissive.lerp(color, 1 - Math.exp(-5 * delta))
      matRef.current.emissiveIntensity = hovered ? 1.2 : 0.35
    }
  })

  return (
    <mesh
      ref={ref}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {kind === 0 && <boxGeometry args={[size, size, size]} />}
      {kind === 1 && <octahedronGeometry args={[size * 0.8]} />}
      {kind === 2 && <icosahedronGeometry args={[size * 0.75]} />}
      {kind === 3 && <torusGeometry args={[size * 0.6, size * 0.2, 8, 20]} />}
      <meshStandardMaterial ref={matRef} metalness={0.4} roughness={0.25} />
    </mesh>
  )
}

function FloatingShapes({ accent }) {
  const shapes = useMemo(() => {
    // Generador pseudo-aleatorio determinista (misma escena en cada carga)
    let seed = 7
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    return Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2 + rnd() * 0.6
      const radius = 2.1 + rnd() * 1.6
      return {
        key: i,
        // z siempre negativa: las formas quedan detrás/al costado y nunca tapan al avatar
        position: [Math.cos(angle) * radius * 1.2, 0.4 + rnd() * 2.4, -Math.abs(Math.sin(angle)) * radius - 0.9],
        kind: i % 4,
        speed: 0.35 + rnd() * 0.7,
        size: 0.14 + rnd() * 0.2,
        phase: rnd() * Math.PI * 2,
      }
    })
  }, [])

  return shapes.map(({ key, ...p }) => <FloatingShape key={key} accent={accent} {...p} />)
}

/* ------------------------------------------------------------------ */
/*  Nube de partículas que rota y reacciona al puntero (useFrame)      */
/* ------------------------------------------------------------------ */
function ParticleField({ accent }) {
  const group = useRef()
  const matRef = useRef()
  const color = useMemo(() => new THREE.Color(accent), [accent])

  const positions = useMemo(() => {
    const count = 450
    const arr = new Float32Array(count * 3)
    let seed = 42
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    for (let i = 0; i < count; i++) {
      const r = 3 + rnd() * 6
      const theta = rnd() * Math.PI * 2
      const phi = Math.acos(2 * rnd() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.6 + 1.5
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 2
    }
    return arr
  }, [])

  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.05
    // Parallax: se inclina hacia donde apunta el mouse
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, state.pointer.y * 0.12, 3, delta)
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, state.pointer.x * 0.35, 3, delta)
    if (matRef.current) matRef.current.color.lerp(color, 1 - Math.exp(-5 * delta))
  })

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={matRef} size={0.03} sizeAttenuation transparent opacity={0.75} depthWrite={false} />
      </points>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Plataforma bajo el avatar                                          */
/* ------------------------------------------------------------------ */
const shadowTexture = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.65)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
})()

function Stage({ accent }) {
  const ring = useRef()
  const matRef = useRef()
  const color = useMemo(() => new THREE.Color(accent), [accent])

  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 0.4
    if (matRef.current) {
      matRef.current.color.lerp(color, 1 - Math.exp(-5 * delta))
      matRef.current.emissive.lerp(color, 1 - Math.exp(-5 * delta))
    }
  })

  return (
    <group position={[0, -0.02, 0]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.12, 64, 1]} />
        <meshStandardMaterial ref={matRef} emissiveIntensity={1.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Sombra falsa (textura estática): mucho más barata que ContactShadows,
          que re-renderiza toda la escena en cada frame */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} renderOrder={-1}>
        <circleGeometry args={[1.6, 32]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Luces que cambian con el acento                                    */
/* ------------------------------------------------------------------ */
function Lights({ accent }) {
  const rim = useRef()
  const fill = useRef()
  const color = useMemo(() => new THREE.Color(accent), [accent])

  useFrame((state, delta) => {
    const k = 1 - Math.exp(-5 * delta)
    rim.current?.color.lerp(color, k)
    fill.current?.color.lerp(color, k)
    // La luz de relleno orbita lentamente alrededor del avatar
    if (fill.current) {
      const t = state.clock.elapsedTime * 0.6
      fill.current.position.set(Math.cos(t) * 3, 1.6, Math.sin(t) * 3)
    }
  })

  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#ffffff', '#1a1033', 0.5]} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />
      {/* Contraluz de color */}
      <pointLight ref={rim} position={[-3, 2.5, -2.5]} intensity={28} distance={14} />
      <pointLight ref={fill} position={[3, 1.6, 0]} intensity={14} distance={10} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Desplaza la escena a la derecha en escritorio para dejar sitio     */
/*  al texto (setViewOffset no rompe OrbitControls)                    */
/* ------------------------------------------------------------------ */
function ResponsiveOffset() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useEffect(() => {
    const desktop = size.width >= 1024
    if (desktop) {
      camera.setViewOffset(size.width, size.height, -size.width * 0.2, 0, size.width, size.height)
    } else {
      camera.clearViewOffset()
    }
    camera.updateProjectionMatrix()
    return () => {
      camera.clearViewOffset()
      camera.updateProjectionMatrix()
    }
  }, [camera, size])

  return null
}

/* ------------------------------------------------------------------ */
/*  Pantalla de carga (HTML) mientras baja el FBX                      */
/* ------------------------------------------------------------------ */
function LoadingOverlay() {
  const { active, progress } = useProgress()
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setGone(true), 500)
      return () => clearTimeout(t)
    }
  }, [active, progress])

  if (gone) return null
  const done = !active && progress >= 100

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07070d] transition-opacity duration-500 ${
        done ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-violet-400 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm tracking-widest text-white/50">CARGANDO MODELO 3D · {Math.round(progress)}%</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */
export default function HeroHeader() {
  const [accentIdx, setAccentIdx] = useState(0)
  const accent = ACCENTS[accentIdx]
  const nextAccent = () => setAccentIdx((i) => (i + 1) % ACCENTS.length)

  return (
    <header className="relative h-screen min-h-[640px] w-full overflow-hidden bg-[#07070d]" style={{ '--accent': accent }}>
      {/* ---------- Capa 3D ---------- */}
      <div className="absolute inset-0 z-0">
        <Canvas
          dpr={[1, 1.5]}
          performance={{ min: 0.5 }}
          camera={{ position: [0, 1.5, 4.6], fov: 42 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          {/* Baja la resolución mientras mueves la cámara y la restaura al soltar */}
          <AdaptiveDpr />
          <color attach="background" args={['#07070d']} />
          <fog attach="fog" args={['#07070d', 8, 16]} />

          <Lights accent={accent} />
          <ResponsiveOffset />

          <Suspense fallback={null}>
            <AnimatedAvatar accent={accent} onAccentChange={nextAccent} />
          </Suspense>

          <Stage accent={accent} />
          <FloatingShapes accent={accent} />
          <ParticleField accent={accent} />
          <Sparkles count={35} scale={[8, 4, 6]} position={[0, 1.8, -1]} size={3} speed={0.4} color={accent} />

          <OrbitControls
            target={[0, 1, 0]}
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 2 + 0.05}
            minAzimuthAngle={-Math.PI / 3}
            maxAzimuthAngle={Math.PI / 3}
            regress
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.6}
          />
        </Canvas>
      </div>

      {/* Degradado para dar contraste al texto */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#07070d]/90 via-[#07070d]/30 to-transparent lg:via-[#07070d]/10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[#07070d] to-transparent" />

      {/* ---------- Capa UI (HTML + Tailwind) ---------- */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <nav className="pointer-events-auto mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <a href="#" className="text-lg font-bold tracking-tight">
            <span style={{ color: accent }} className="transition-colors duration-500">
              &lt;/&gt;
            </span>{' '}
            {PROFILE.name}
          </a>
          <div className="hidden gap-8 text-sm text-white/70 sm:flex">
            <a href="#proyectos" className="transition hover:text-white">Proyectos</a>
            <a href={PROFILE.github} target="_blank" rel="noreferrer" className="transition hover:text-white">GitHub</a>
            <a href={PROFILE.linkedin} target="_blank" rel="noreferrer" className="transition hover:text-white">LinkedIn</a>
          </div>
        </nav>

        <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6">
          <div className="max-w-xl">
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs tracking-wider text-white/70 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full transition-colors duration-500" style={{ background: accent }} />
              DISPONIBLE PARA PROYECTOS
            </span>

            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Hola, soy{' '}
              <span className="transition-colors duration-500" style={{ color: accent }}>
                {PROFILE.name}
              </span>
            </h1>

            <p className="mt-4 text-xl font-medium text-white/80">{PROFILE.role}</p>
            <p className="mt-3 max-w-md text-base text-white/55">{PROFILE.bio}</p>

            <div className="pointer-events-auto mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#proyectos"
                className="rounded-full px-7 py-3 font-medium text-black shadow-lg transition duration-500 hover:scale-105"
                style={{ background: accent, boxShadow: `0 0 30px ${accent}66` }}
              >
                Ver Proyectos
              </a>
              <a
                href={PROFILE.github}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-6 py-3 text-white/80 backdrop-blur transition hover:border-white/50 hover:text-white"
              >
                GitHub
              </a>
              <a
                href={PROFILE.linkedin}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-6 py-3 text-white/80 backdrop-blur transition hover:border-white/50 hover:text-white"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        <p className="pb-6 text-center text-xs tracking-widest text-white/40">
          ARRASTRA PARA GIRAR · HAZ CLIC EN EL AVATAR PARA CAMBIAR EL COLOR
        </p>
      </div>

      <LoadingOverlay />
    </header>
  )
}
