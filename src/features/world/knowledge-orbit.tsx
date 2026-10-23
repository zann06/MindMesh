import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitNode } from '@/services/graph-engine/orbit';
import { useLanguageStore } from '@/app/language-store';
import { cn } from '@/lib/utils';
import { getGlowTexture, mulberry32 } from './three-support';

const copy = {
  en: {
    dragHint: 'Drag to orbit',
    srHint: (focus: string, count: number) =>
      `Interactive three-dimensional map of ${focus} and ${count} connected concepts. Use the concept list below the map to open a concept.`,
  },
  id: {
    dragHint: 'Seret untuk mengorbit',
    srHint: (focus: string, count: number) =>
      `Peta tiga dimensi interaktif dari ${focus} dan ${count} konsep terhubung. Gunakan daftar konsep di bawah peta untuk membuka konsep.`,
  },
};

const FOCUS_COLOR = '#9ccfb9';

interface OrbitLabel {
  key: string;
  text: string;
  position: [number, number, number];
  color: string;
  offset: number;
  focus: boolean;
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { rootMargin: '140px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

class OrbitBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function OrbitGlow({
  color,
  size,
  opacity,
}: {
  color: string;
  size: number;
  opacity: number;
}) {
  const texture = useMemo(getGlowTexture, []);
  if (!texture) return null;
  return (
    <sprite scale={[size, size, 1]} renderOrder={2} raycast={() => null}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

function OrbitLabels({
  labels,
  hostRef,
}: {
  labels: OrbitLabel[];
  hostRef: RefObject<HTMLDivElement | null>;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const point = useRef(new THREE.Vector3());

  useFrame(() => {
    const host = hostRef.current;
    if (!host) return;
    for (const label of labels) {
      const element = host.querySelector<HTMLElement>(
        `[data-orbit-label="${label.key}"]`,
      );
      if (!element) continue;
      const projected = point.current.set(...label.position).project(camera);
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      const visible = projected.z > -1 && projected.z < 1;
      element.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y + label.offset}px, 0)`;
      element.style.opacity = visible ? '1' : '0';
    }
  });

  return null;
}

function OrbitCore({ reduced }: { reduced: boolean }) {
  const shell = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    const mesh = shell.current;
    if (!mesh || reduced) return;
    mesh.rotation.y += delta * 0.18;
    mesh.rotation.x = Math.sin(state.clock.elapsedTime * 0.28) * 0.18;
  });

  return (
    <group
      onPointerOver={(event) => event.stopPropagation()}
      onPointerOut={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <OrbitGlow color={FOCUS_COLOR} size={3.1} opacity={0.2} />
      <mesh>
        <icosahedronGeometry args={[0.58, 1]} />
        <meshStandardMaterial
          color="#bfe2d4"
          emissive="#2f5f4e"
          emissiveIntensity={0.8}
          roughness={0.28}
          metalness={0.42}
        />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[0.88, 1]} />
        <meshBasicMaterial
          color={FOCUS_COLOR}
          wireframe
          transparent
          opacity={0.22}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function OrbitRings({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!group.current || reduced) return;
    group.current.rotation.z += delta * 0.035;
  });

  return (
    <group ref={group}>
      <mesh rotation={[-Math.PI / 2.35, 0, 0.18]}>
        <ringGeometry args={[2.12, 2.132, 160]} />
        <meshBasicMaterial
          color="#7ebaa3"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2.72, 0, -0.24]}>
        <ringGeometry args={[2.72, 2.728, 160]} />
        <meshBasicMaterial
          color="#8aa2b8"
          transparent
          opacity={0.09}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function OrbitDust() {
  const geometry = useMemo(() => {
    const random = mulberry32(0x0b17);
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 2.9 + random() * 1.7;
      const angle = random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (random() - 0.5) * 2.4;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#7ebaa3"
        size={0.024}
        transparent
        opacity={0.32}
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

function OrbitLink({
  end,
  color,
  active,
}: {
  end: [number, number, number];
  color: string;
  active: boolean;
}) {
  const line = useMemo(() => {
    const start = new THREE.Vector3(0, 0, 0);
    const target = new THREE.Vector3(...end);
    const control = target.clone().multiplyScalar(0.5);
    control.y += 0.55;
    const curve = new THREE.QuadraticBezierCurve3(start, control, target);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(28));
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: active ? 0.6 : 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return new THREE.Line(geometry, material);
  }, [end, color, active]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );

  return <primitive object={line} />;
}

function OrbitSatellite({
  node,
  position,
  index,
  hovered,
  reduced,
  onHover,
  onSelect,
}: {
  node: OrbitNode;
  position: [number, number, number];
  index: number;
  hovered: boolean;
  reduced: boolean;
  onHover: (index: number | null) => void;
  onSelect?: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const mesh = group.current;
    if (!mesh) return;
    const drift = reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.9 + index * 1.4) * 0.07;
    mesh.position.y = THREE.MathUtils.damp(mesh.position.y, position[1] + drift, 3, delta);
    const scale = hovered ? 1.28 : 1;
    mesh.scale.x = THREE.MathUtils.damp(mesh.scale.x, scale, 9, delta);
    mesh.scale.y = THREE.MathUtils.damp(mesh.scale.y, scale, 9, delta);
    mesh.scale.z = THREE.MathUtils.damp(mesh.scale.z, scale, 9, delta);
  });

  return (
    <group
      ref={group}
      position={position}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(index);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHover(null);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(node.id);
      }}
    >
      <OrbitGlow
        color={node.color}
        size={hovered ? 1.15 : 0.82}
        opacity={hovered ? 0.4 : 0.26}
      />
      <mesh>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={hovered ? 1.5 : 0.55}
          roughness={0.3}
          metalness={0.25}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.27, 0.284, 48]} />
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={hovered ? 0.7 : 0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function OrbitScene({
  nodes,
  positions,
  labels,
  hovered,
  reduced,
  labelHostRef,
  onHover,
  onSelect,
}: {
  nodes: OrbitNode[];
  positions: Array<[number, number, number]>;
  labels: OrbitLabel[];
  hovered: number | null;
  reduced: boolean;
  labelHostRef: RefObject<HTMLDivElement | null>;
  onHover: (index: number | null) => void;
  onSelect?: (id: string) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight color="#dfe9e5" groundColor="#08090b" intensity={0.4} />
      <pointLight position={[3.5, 4, 5]} intensity={22} color="#cfe8dd" distance={18} />
      <pointLight position={[-4, -2, -2]} intensity={14} color="#8aa2b8" distance={18} />
      <OrbitDust />
      <OrbitCore reduced={reduced} />
      <OrbitRings reduced={reduced} />
      {nodes.map((node, index) => (
        <group key={node.id}>
          <OrbitLink end={positions[index]} color={node.color} active={hovered === index} />
          <OrbitSatellite
            node={node}
            position={positions[index]}
            index={index}
            hovered={hovered === index}
            reduced={reduced}
            onHover={onHover}
            onSelect={onSelect}
          />
        </group>
      ))}
      <OrbitLabels labels={labels} hostRef={labelHostRef} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.55}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.72}
        autoRotate={!reduced && hovered === null}
        autoRotateSpeed={0.62}
      />
    </>
  );
}

function OrbitStatic({ focusLabel }: { focusLabel: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute inset-0 grid-fade opacity-25" aria-hidden="true" />
      <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-cyan-400/15">
        <div className="absolute inset-5 rounded-full border border-violet-400/15" />
        <div className="absolute inset-10 rounded-full border border-white/[0.06]" />
        <div className="h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(126,186,163,0.7)]" />
        <span className="absolute left-1/2 top-[calc(50%+1.6rem)] -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-300/25 bg-[#090a0e]/85 px-2.5 py-1 text-[10px] text-cyan-100">
          {focusLabel}
        </span>
      </div>
    </div>
  );
}

export default function KnowledgeOrbit({
  focusLabel,
  nodes,
  onSelect,
  height = 260,
  className,
}: {
  focusLabel: string;
  nodes: OrbitNode[];
  onSelect?: (id: string) => void;
  height?: number;
  className?: string;
}) {
  const language = useLanguageStore((state) => state.language);
  const t = copy[language];
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView();
  const [supported] = useState(supportsWebGL);
  const [hovered, setHovered] = useState<number | null>(null);
  const labelHostRef = useRef<HTMLDivElement>(null);

  const positions = useMemo<Array<[number, number, number]>>(
    () =>
      nodes.map((_, index) => {
        const total = Math.max(nodes.length, 1);
        const angle = (index / total) * Math.PI * 2 + 0.55;
        const radius = 2.02 + (index % 2) * 0.34;
        return [
          Math.cos(angle) * radius,
          Math.sin(angle * 1.7) * 0.46,
          Math.sin(angle) * radius,
        ];
      }),
    [nodes],
  );

  const labels = useMemo<OrbitLabel[]>(() => {
    const items: OrbitLabel[] = [
      {
        key: 'focus',
        text: focusLabel,
        position: [0, 0, 0],
        color: FOCUS_COLOR,
        offset: 58,
        focus: true,
      },
    ];
    if (hovered !== null && nodes[hovered]) {
      items.push({
        key: `satellite-${hovered}`,
        text: nodes[hovered].label,
        position: positions[hovered],
        color: nodes[hovered].color,
        offset: -16,
        focus: false,
      });
    }
    return items;
  }, [focusLabel, hovered, nodes, positions]);

  useEffect(() => {
    setHovered(null);
  }, [nodes]);

  useEffect(() => {
    if (hovered === null) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[radial-gradient(circle_at_50%_45%,rgba(126,186,163,0.075),transparent_42%),radial-gradient(circle_at_22%_85%,rgba(138,162,184,0.045),transparent_38%)]',
        className,
      )}
    >
      <div ref={ref} className="relative" style={{ height }}>
        <p className="sr-only">{t.srHint(focusLabel, nodes.length)}</p>
        {supported ? (
          <OrbitBoundary fallback={<OrbitStatic focusLabel={focusLabel} />}>
            <Canvas
              frameloop={inView ? 'always' : 'demand'}
              dpr={[1, 1.75]}
              camera={{ position: [0, 1.25, 6.9], fov: 40, near: 0.1, far: 50 }}
              gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
              style={{ position: 'absolute', inset: 0 }}
              aria-hidden="true"
            >
              <OrbitScene
                nodes={nodes}
                positions={positions}
                labels={labels}
                hovered={hovered}
                reduced={reduced}
                labelHostRef={labelHostRef}
                onHover={setHovered}
                onSelect={onSelect}
              />
            </Canvas>
          </OrbitBoundary>
        ) : (
          <OrbitStatic focusLabel={focusLabel} />
        )}

        <div
          ref={labelHostRef}
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          {labels.map((label) => (
            <span
              key={label.key}
              data-orbit-label={label.key}
              className={cn(
                'absolute left-0 top-0 max-w-[min(240px,72vw)] truncate whitespace-nowrap rounded-full border bg-[#090a0e]/85 px-2.5 py-1 text-[10px] font-medium text-bright shadow-[0_6px_20px_rgba(0,0,0,0.42)] backdrop-blur-md',
                label.focus && 'text-cyan-100',
              )}
              style={{
                borderColor: `${label.color}66`,
                opacity: 0,
                boxShadow: `0 6px 20px rgba(0,0,0,0.42), 0 0 18px ${label.color}22`,
              }}
            >
              <span
                className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{ backgroundColor: label.color }}
              />
              {label.text}
            </span>
          ))}
        </div>

        <span className="pointer-events-none absolute right-3 top-3 rounded-md border border-white/10 bg-[#07080c]/65 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-slate-500 backdrop-blur">
          {t.dragHint}
        </span>
      </div>

      {nodes.length > 0 ? (
        <div className="relative border-t border-line-soft/70 bg-[#090b0f]/45 px-3 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {nodes.map((node) =>
              onSelect ? (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelect(node.id)}
                  title={node.meta}
                  className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/[0.045] hover:text-cyan-100"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: node.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{node.label}</span>
                </button>
              ) : (
                <span
                  key={node.id}
                  title={node.meta}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: node.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{node.label}</span>
                </span>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
