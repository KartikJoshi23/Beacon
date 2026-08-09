import { Canvas, useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { Suspense, useMemo, useRef, Component } from 'react';
import * as THREE from 'three';

// Three candidate sites -> three beacons. B (centre) is the recommended one.
const SITES = [
  { x: -3.4, color: '#f6b73c', h: 4.6 }, // A — amber
  { x: 0, color: '#2fd4bd', h: 6.2, recommended: true }, // B — teal (recommended)
  { x: 3.4, color: '#b483f5', h: 4.6 }, // C — violet
];

function Beacon({ x, color, h, recommended, i }) {
  const beam = useRef();
  const core = useRef();
  const glow = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7);
    if (core.current) core.current.scale.setScalar((recommended ? 0.34 : 0.26) + pulse * 0.12);
    if (beam.current) beam.current.material.opacity = (recommended ? 0.2 : 0.12) + pulse * 0.07;
    if (glow.current) glow.current.material.opacity = 0.1 + pulse * 0.12;
  });
  return (
    <group position={[x, 0, 0]}>
      <mesh ref={beam} position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.34, 0.05, h, 24, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={core} position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.2, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Embers({ count = 320 }) {
  const ref = useRef();
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
      speeds[i] = 0.12 + Math.random() * 0.5;
    }
    return { positions, speeds };
  }, [count]);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const arr = g.geometry.attributes.position.array;
    const d = Math.min(delta, 0.05);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * d;
      if (arr[i * 3 + 1] > 8.2) {
        arr[i * 3 + 1] = 0;
        arr[i * 3] = (Math.random() - 0.5) * 18;
      }
    }
    g.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} color="#f6b73c" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Rig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.11) * 1.3;
    state.camera.position.y = 2.5 + Math.sin(t * 0.15) * 0.15;
    state.camera.lookAt(0, 1.9, 0);
  });
  return null;
}

function Scene({ reduced }) {
  return (
    <Canvas
      camera={{ position: [0, 2.5, 8], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={reduced ? 'demand' : 'always'}
    >
      <fogExp2 attach="fog" args={['#0b0806', 0.05]} />
      <Suspense fallback={null}>
        <Grid
          position={[0, 0, 0]}
          args={[40, 40]}
          cellSize={0.8}
          cellThickness={0.55}
          cellColor="#3a2c1e"
          sectionSize={4}
          sectionThickness={1}
          sectionColor="#f6b73c"
          fadeDistance={28}
          fadeStrength={2.5}
          infiniteGrid
        />
        {SITES.map((s, i) => (
          <Beacon key={i} i={i} {...s} />
        ))}
        <Embers />
      </Suspense>
      {!reduced && <Rig />}
    </Canvas>
  );
}

/** Renders nothing if WebGL/three throws — the hero text still shows. */
class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export default function HeroScene() {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  return (
    <div className="hero__scene" aria-hidden>
      <SceneBoundary>
        <Scene reduced={reduced} />
      </SceneBoundary>
    </div>
  );
}
