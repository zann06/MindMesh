import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getGlowTexture, mulberry32 } from './three-support';
import { ORB_LOOKS, type OrbShape, type OrbVariant } from './feature-orb-types';

function OrbGlow({ color }: { color: string }) {
  const texture = useMemo(getGlowTexture, []);
  if (!texture) return null;
  return (
    <sprite scale={[2.55, 2.55, 1]} renderOrder={2} raycast={() => null}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={0.36}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

function CoreGeometry({ shape }: { shape: OrbShape }) {
  switch (shape) {
    case 'octahedron':
      return <octahedronGeometry args={[0.62, 0]} />;
    case 'torus':
      return <torusGeometry args={[0.4, 0.15, 20, 56]} />;
    case 'torus-knot':
      return <torusKnotGeometry args={[0.34, 0.1, 96, 16]} />;
    case 'box':
      return <boxGeometry args={[0.62, 0.8, 0.24]} />;
    case 'dodecahedron':
      return <dodecahedronGeometry args={[0.58, 0]} />;
    case 'tetrahedron':
      return <tetrahedronGeometry args={[0.66, 0]} />;
    case 'sphere':
      return <sphereGeometry args={[0.54, 32, 32]} />;
    default:
      return <icosahedronGeometry args={[0.56, 1]} />;
  }
}

function OrbCore({ variant, reduced }: { variant: OrbVariant; reduced: boolean }) {
  const look = ORB_LOOKS[variant];
  const shell = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const core = useRef<THREE.Group>(null);
  const pulse = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [alternate, setAlternate] = useState(false);
  const color = alternate ? look.accent : look.color;

  useFrame((state, delta) => {
    pulse.current = Math.max(0, pulse.current - delta * 2.4);
    if (shell.current && !reduced) {
      shell.current.rotation.y += delta * 0.42;
      shell.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.16;
    }
    if (ring.current && !reduced) {
      ring.current.rotation.z += delta * 0.14;
    }
    if (core.current) {
      const target = 1 + Math.sin(pulse.current * Math.PI) * 0.16 + (hovered ? 0.05 : 0);
      const scale = THREE.MathUtils.damp(core.current.scale.x, target, 8, delta);
      core.current.scale.setScalar(scale);
      core.current.position.y = THREE.MathUtils.damp(
        core.current.position.y,
        reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.9) * 0.045,
        3,
        delta,
      );
    }
  });

  return (
    <group>
      <OrbGlow color={color} />
      <group
        ref={core}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
        onClick={(event) => {
          event.stopPropagation();
          pulse.current = 1;
          setAlternate((current) => !current);
        }}
      >
        <mesh castShadow>
          <CoreGeometry shape={look.shape} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.9 : 0.42}
            roughness={0.26}
            metalness={0.46}
          />
        </mesh>
        <group ref={shell} scale={1.26}>
          <mesh>
            <icosahedronGeometry args={[0.62, 1]} />
            <meshBasicMaterial
              color={look.accent}
              wireframe
              transparent
              opacity={hovered ? 0.4 : 0.22}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>
      <group ref={ring}>
        <mesh rotation={[Math.PI / 2.15, 0.12, 0]}>
          <ringGeometry args={[0.88, 0.89, 96]} />
          <meshBasicMaterial
            color={look.color}
            transparent
            opacity={0.34}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.6, -0.24, 0]}>
          <ringGeometry args={[1.08, 1.086, 96]} />
          <meshBasicMaterial
            color={look.accent}
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
      <OrbSatellites variant={variant} reduced={reduced} />
    </group>
  );
}

const SATELLITE_POSITIONS: Array<[number, number, number]> = [
  [0.82, 0.22, 0.18],
  [-0.72, 0.34, -0.24],
  [0.24, -0.74, 0.32],
  [-0.34, -0.58, -0.46],
  [0.52, 0.58, -0.42],
];

function OrbSatellites({ variant, reduced }: { variant: OrbVariant; reduced: boolean }) {
  const look = ORB_LOOKS[variant];
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!reduced && group.current) group.current.rotation.y += delta * 0.16;
  });

  return (
    <group ref={group}>
      {SATELLITE_POSITIONS.map((position, index) => (
        <mesh key={position.join(':')} position={position} scale={index % 2 === 0 ? 0.075 : 0.055}>
          {index % 2 === 0 ? (
            <tetrahedronGeometry args={[1, 0]} />
          ) : (
            <icosahedronGeometry args={[1, 0]} />
          )}
          <meshBasicMaterial
            color={index % 2 === 0 ? look.accent : look.color}
            transparent
            opacity={index % 2 === 0 ? 0.92 : 0.7}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function OrbDust({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const random = mulberry32(0x51a7);
    const count = 34;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 1.15 + random() * 0.72;
      const angle = random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (random() - 0.5) * 1.45;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color={color}
        size={0.018}
        transparent
        opacity={0.38}
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

export default function FeatureOrbScene({
  variant,
  reduced,
}: {
  variant: OrbVariant;
  reduced: boolean;
}) {
  const look = ORB_LOOKS[variant];
  return (
    <Canvas
      frameloop="always"
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.18, 3.05], fov: 42, near: 0.1, far: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.85} />
      <hemisphereLight color="#dfe9e5" groundColor="#08090b" intensity={0.35} />
      <pointLight position={[2.8, 3.4, 3.6]} intensity={18} color="#cfe8dd" distance={14} />
      <pointLight position={[-3, -1.4, -2]} intensity={11} color={look.accent} distance={14} />
      <OrbDust color={look.color} />
      <OrbCore variant={variant} reduced={reduced} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.09}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.85}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.72}
        autoRotate={!reduced}
        autoRotateSpeed={0.55}
      />
    </Canvas>
  );
}
