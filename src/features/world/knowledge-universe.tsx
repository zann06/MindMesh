import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Billboard, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type {
  Concept,
  GraphNodePosition,
  RelationType,
  Relationship,
} from '@/core/domain/types';
import type { RegionInfo } from '@/services/graph-engine/graph';
import { getGlowTexture, mulberry32 } from './three-support';

const RELATION_COLORS: Record<RelationType, string> = {
  prerequisite: '#7ebaa3',
  'part-of': '#8aa2b8',
  'related-to': '#7d8998',
  'contrasts-with': '#cb9089',
  causes: '#c9b283',
  'example-of': '#9fb07a',
};

const SELECTED_COLOR = '#b8e0ce';
const HOVER_COLOR = '#eef5f1';
const EDGE_SEGMENTS = 14;

function nodeScale(degree: Map<string, number>, conceptId: string): number {
  return 0.4 + Math.min(0.48, Math.sqrt(degree.get(conceptId) ?? 0) * 0.15);
}

interface OverlayLabel {
  key: string;
  text: string;
  position: [number, number, number];
  color: string;
  opacity: number;
  prominent: boolean;
  region: boolean;
  priority: number;
}

function labelChipStyle(label: OverlayLabel): CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: label.region ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    padding: label.region ? '0 0 3px' : label.prominent ? '4px 10px' : '3px 8px',
    borderRadius: label.region ? 0 : '999px',
    border: label.region ? 0 : `1px solid ${label.color}55`,
    borderBottom: label.region ? `1px solid ${label.color}45` : undefined,
    background: label.region ? 'transparent' : 'rgba(7, 8, 10, 0.8)',
    color: label.region ? label.color : '#f1f2ef',
    fontFamily: label.region
      ? '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif'
      : 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: label.region ? '9px' : label.prominent ? '12px' : '10.5px',
    fontWeight: 500,
    lineHeight: 1.25,
    letterSpacing: label.region ? '0.26em' : '0.012em',
    textTransform: label.region ? 'uppercase' : 'none',
    opacity: label.opacity,
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.92)',
    boxShadow: label.region ? 'none' : '0 6px 18px rgba(0, 0, 0, 0.38)',
    backdropFilter: label.region ? undefined : 'blur(8px)',
  };
}

function LabelChip({ label }: { label: OverlayLabel }) {
  return (
    <span style={labelChipStyle(label)}>
      {label.region ? null : (
        <span
          style={{
            display: 'inline-block',
            width: 5,
            height: 5,
            marginRight: 6,
            borderRadius: '50%',
            background: label.color,
            boxShadow: `0 0 7px ${label.color}`,
          }}
        />
      )}
      {label.text}
    </span>
  );
}

const LABEL_GAP = 2;

function LabelProjector({
  labels,
  overlayRef,
}: {
  labels: OverlayLabel[];
  overlayRef: RefObject<HTMLDivElement | null>;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const point = useRef(new THREE.Vector3());
  const frame = useRef(0);

  useFrame(() => {
    const host = overlayRef.current;
    if (!host) return;
    frame.current += 1;

    const wrappers = new Map<string, HTMLElement>();
    for (const child of Array.from(host.children)) {
      if (child instanceof HTMLElement && child.dataset.labelKey) {
        wrappers.set(child.dataset.labelKey, child);
      }
    }

    const projected: Array<{
      label: OverlayLabel;
      wrapper: HTMLElement;
      visible: boolean;
    }> = [];

    for (const label of labels) {
      const wrapper = wrappers.get(label.key);
      if (!wrapper) continue;
      const projectedPoint = point.current.set(...label.position).project(camera);
      const x = (projectedPoint.x * 0.5 + 0.5) * size.width;
      const y = (-projectedPoint.y * 0.5 + 0.5) * size.height;
      const visible =
        projectedPoint.z > -1 &&
        projectedPoint.z < 1 &&
        x > -120 &&
        x < size.width + 120 &&
        y > -80 &&
        y < size.height + 80;
      wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      wrapper.style.zIndex = String(label.priority);
      if (!visible) wrapper.style.visibility = 'hidden';
      projected.push({ label, wrapper, visible });
    }

    if (frame.current % 5 !== 0) return;
    const overlayRect = host.getBoundingClientRect();
    const ordered = projected
      .filter((item) => item.visible)
      .sort((a, b) => b.label.priority - a.label.priority);
    const kept: DOMRect[] = [];

    for (const item of ordered) {
      item.wrapper.style.visibility = '';
      const chip = item.wrapper.firstElementChild;
      if (!(chip instanceof HTMLElement)) continue;
      const rect = chip.getBoundingClientRect();
      const outside =
        rect.right < overlayRect.left + 4 ||
        rect.left > overlayRect.right - 4 ||
        rect.bottom < overlayRect.top + 4 ||
        rect.top > overlayRect.bottom - 4;
      const overlaps = kept.some(
        (other) =>
          rect.left < other.right + LABEL_GAP &&
          rect.right + LABEL_GAP > other.left &&
          rect.top < other.bottom + LABEL_GAP &&
          rect.bottom + LABEL_GAP > other.top,
      );
      if (outside || overlaps) item.wrapper.style.visibility = 'hidden';
      else kept.push(rect);
    }
  });

  return null;
}

function GlowSprite({
  position,
  color,
  size,
  opacity,
  depthTest = false,
  order = 2,
}: {
  position: [number, number, number];
  color: string;
  size: number;
  opacity: number;
  depthTest?: boolean;
  order?: number;
}) {
  const texture = useMemo(getGlowTexture, []);
  if (!texture) return null;
  return (
    <sprite position={position} scale={[size, size, 1]} renderOrder={order}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={depthTest}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

function Starfield() {
  const geometry = useMemo(() => {
    const starGeometry = new THREE.BufferGeometry();
    const count = 1300;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const random = mulberry32(0x4d696e64);
    for (let index = 0; index < count; index += 1) {
      const radius = 38 + random() * 42;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi);
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const warmth = random();
      const brightness = 0.35 + random() * 0.45;
      colors[index * 3] = brightness * (warmth > 0.82 ? 1 : 0.72);
      colors[index * 3 + 1] = brightness * (warmth > 0.82 ? 0.83 : 0.73);
      colors[index * 3 + 2] = brightness * (warmth > 0.82 ? 0.6 : 0.7);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return starGeometry;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={0.11}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

function regionLabelPosition(region: RegionInfo, regionCount: number): [number, number, number] {
  const angle = (region.index / Math.max(1, regionCount)) * Math.PI * 2;
  return [
    region.center.x + Math.cos(angle) * 6.2,
    region.center.y - 2.4,
    region.center.z + Math.sin(angle) * 6.2,
  ];
}

function RegionRings({ regions }: { regions: RegionInfo[] }) {
  if (regions.length <= 1) return null;
  return (
    <group>
      {regions.map((region) => (
        <group
          key={`ring-${region.name}`}
          position={[region.center.x, region.center.y - 1.8, region.center.z]}
        >
          {[6.4, 9.15].map((radius, index) => (
            <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius, radius + (index === 0 ? 0.07 : 0.035), 96]} />
              <meshBasicMaterial
                color={region.color}
                transparent
                opacity={index === 0 ? 0.16 : 0.06}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function GraphEdges({
  nodes,
  relationships,
  selectedId,
}: {
  nodes: GraphNodePosition[];
  relationships: Relationship[];
  selectedId: string | null;
}) {
  const geometry = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.conceptId, node]));
    const valid = relationships.flatMap((relationship) => {
      const source = byId.get(relationship.sourceConceptId);
      const target = byId.get(relationship.targetConceptId);
      return source && target ? [{ relationship, source, target }] : [];
    });
    const positions = new Float32Array(valid.length * EDGE_SEGMENTS * 2 * 3);
    const colors = new Float32Array(valid.length * EDGE_SEGMENTS * 2 * 3);
    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    const midpoint = new THREE.Vector3();
    const control = new THREE.Vector3();
    const previous = new THREE.Vector3();
    const point = new THREE.Vector3();
    const relationColor = new THREE.Color();
    const muted = new THREE.Color('#24282e');
    const sourceTint = new THREE.Color();
    const targetTint = new THREE.Color();
    const colorFrom = new THREE.Color();
    const colorTo = new THREE.Color();
    const colorPrevious = new THREE.Color();
    const colorPoint = new THREE.Color();
    let offset = 0;

    for (const { relationship, source, target } of valid) {
      start.set(source.x, source.y, source.z);
      end.set(target.x, target.y, target.z);
      midpoint.addVectors(start, end).multiplyScalar(0.5);
      control.copy(midpoint).multiplyScalar(0.82);
      control.y += 0.85;
      const connected =
        !selectedId ||
        relationship.sourceConceptId === selectedId ||
        relationship.targetConceptId === selectedId;
      relationColor.set(connected ? RELATION_COLORS[relationship.relationType] : muted);
      sourceTint.set(source.color);
      targetTint.set(target.color);
      colorFrom.copy(relationColor).lerp(sourceTint, connected ? 0.3 : 0.08);
      colorTo.copy(relationColor).lerp(targetTint, connected ? 0.3 : 0.08);
      previous.copy(start);
      for (let segment = 1; segment <= EDGE_SEGMENTS; segment += 1) {
        const t = segment / EDGE_SEGMENTS;
        const inverse = 1 - t;
        point.set(
          inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
          inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
          inverse * inverse * start.z + 2 * inverse * t * control.z + t * t * end.z,
        );
        const tFrom = (segment - 1) / EDGE_SEGMENTS;
        colorPrevious.copy(colorFrom).lerp(colorTo, tFrom);
        colorPoint.copy(colorFrom).lerp(colorTo, t);
        positions[offset] = previous.x;
        positions[offset + 1] = previous.y;
        positions[offset + 2] = previous.z;
        positions[offset + 3] = point.x;
        positions[offset + 4] = point.y;
        positions[offset + 5] = point.z;
        colors[offset] = colorPrevious.r;
        colors[offset + 1] = colorPrevious.g;
        colors[offset + 2] = colorPrevious.b;
        colors[offset + 3] = colorPoint.r;
        colors[offset + 4] = colorPoint.g;
        colors[offset + 5] = colorPoint.b;
        offset += 6;
        previous.copy(point);
      }
    }

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    edgeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return edgeGeometry;
  }, [nodes, relationships, selectedId]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.52}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

function GraphNodes({
  nodes,
  selectedId,
  hoveredId,
  degree,
  neighbors,
  onHover,
  onSelect,
  onOpen,
}: {
  nodes: GraphNodePosition[];
  selectedId: string | null;
  hoveredId: string | null;
  degree: Map<string, number>;
  neighbors: Map<string, Set<string>>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const haloRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentScales = useRef<Float32Array>(new Float32Array(0));
  const currentColors = useRef<THREE.Color[]>([]);
  const layoutKeyRef = useRef('');
  const animating = useRef(false);

  const targets = useMemo(() => {
    const dim = new THREE.Color('#22262c');
    return nodes.map((node) => {
      const base = nodeScale(degree, node.conceptId);
      const scale =
        node.conceptId === selectedId
          ? base * 1.55
          : node.conceptId === hoveredId
            ? base * 1.22
            : base;
      const related =
        !selectedId || node.conceptId === selectedId || neighbors.get(selectedId)?.has(node.conceptId);
      const color =
        node.conceptId === selectedId
          ? SELECTED_COLOR
          : node.conceptId === hoveredId
            ? HOVER_COLOR
            : related
              ? node.color
              : dim;
      return { scale, color: new THREE.Color(color) };
    });
  }, [nodes, selectedId, hoveredId, degree, neighbors]);

  useEffect(
    () => () => {
      if (typeof document !== 'undefined') document.body.style.cursor = '';
    },
    [],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const halo = haloRef.current;
    if (!mesh) return;
    const layoutKey = nodes.map((node) => node.conceptId).join('\u0001');
    const layoutChanged =
      layoutKey !== layoutKeyRef.current || currentScales.current.length !== nodes.length;

    if (layoutChanged) {
      currentScales.current = new Float32Array(targets.map((target) => target.scale));
      currentColors.current = targets.map((target) => target.color.clone());
      layoutKeyRef.current = layoutKey;
      animating.current = false;
      nodes.forEach((node, index) => {
        dummy.position.set(node.x, node.y, node.z);
        dummy.scale.setScalar(currentScales.current[index]);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        mesh.setColorAt(index, currentColors.current[index]);
        if (halo) {
          dummy.scale.setScalar(currentScales.current[index] * 1.6);
          dummy.updateMatrix();
          halo.setMatrixAt(index, dummy.matrix);
          halo.setColorAt(index, currentColors.current[index]);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (halo) {
        halo.instanceMatrix.needsUpdate = true;
        if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
      }
    } else {
      animating.current = true;
    }
  }, [targets, nodes, dummy]);

  useFrame((_, delta) => {
    if (!animating.current) return;
    const mesh = meshRef.current;
    const halo = haloRef.current;
    if (!mesh) return;
    const smoothing = 1 - Math.exp(-11 * delta);
    let settled = true;

    nodes.forEach((node, index) => {
      const target = targets[index];
      if (!target) return;
      const nextScale = THREE.MathUtils.lerp(
        currentScales.current[index] ?? target.scale,
        target.scale,
        smoothing,
      );
      if (Math.abs(nextScale - target.scale) > 0.0015) settled = false;
      currentScales.current[index] = nextScale;

      const color = currentColors.current[index] ?? target.color.clone();
      color.lerp(target.color, smoothing);
      if (
        Math.abs(color.r - target.color.r) +
          Math.abs(color.g - target.color.g) +
          Math.abs(color.b - target.color.b) >
        0.004
      ) {
        settled = false;
      }
      currentColors.current[index] = color;

      dummy.position.set(node.x, node.y, node.z);
      dummy.scale.setScalar(nextScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, color);
      if (halo) {
        dummy.scale.setScalar(nextScale * 1.6);
        dummy.updateMatrix();
        halo.setMatrixAt(index, dummy.matrix);
        halo.setColorAt(index, color);
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (halo) {
      halo.instanceMatrix.needsUpdate = true;
      if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
    }
    if (settled) animating.current = false;
  });

  return (
    <>
      <instancedMesh
        ref={haloRef}
        args={[undefined, undefined, Math.max(1, nodes.length)]}
        frustumCulled={false}
        renderOrder={-1}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0.16}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(1, nodes.length)]}
        frustumCulled={false}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
          if (event.instanceId !== undefined) onHover(nodes[event.instanceId]?.conceptId ?? null);
        }}
        onPointerOut={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          if (typeof document !== 'undefined') document.body.style.cursor = '';
          onHover(null);
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          if (event.instanceId !== undefined) {
            const node = nodes[event.instanceId];
            if (node) onSelect(node.conceptId);
          }
        }}
        onDoubleClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          if (event.instanceId !== undefined) {
            const node = nodes[event.instanceId];
            if (node) onOpen(node.conceptId);
          }
        }}
      >
        <sphereGeometry args={[1, 28, 28]} />
        <meshStandardMaterial
          roughness={0.34}
          metalness={0.18}
          emissive="#16241f"
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2;
}

function CameraDirector({
  nodes,
  regions,
  controlsRef,
  fitRequest,
}: {
  nodes: GraphNodePosition[];
  regions: RegionInfo[];
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>;
  fitRequest: number;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const animation = useRef<{
    fromPosition: THREE.Vector3;
    toPosition: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    progress: number;
  } | null>(null);

  const framing = useMemo(() => {
    if (nodes.length === 0) {
      return { center: new THREE.Vector3(0, 0, 0), points: [] as THREE.Vector3[] };
    }
    const center = new THREE.Vector3();
    for (const node of nodes) center.add(new THREE.Vector3(node.x, node.y, node.z));
    center.divideScalar(nodes.length);
    const points: THREE.Vector3[] = [];
    for (const node of nodes) {
      points.push(new THREE.Vector3(node.x, node.y, node.z));
      points.push(new THREE.Vector3(node.x, node.y + 2.1, node.z));
    }
    for (const region of regions) {
      points.push(new THREE.Vector3(...regionLabelPosition(region, regions.length)));
    }
    return { center, points };
  }, [nodes, regions]);

  useEffect(() => {
    const controls = controlsRef.current;
    const perspective = camera as THREE.PerspectiveCamera;
    if (!controls || !perspective.isPerspectiveCamera) return;
    const verticalFov = THREE.MathUtils.degToRad(perspective.fov);
    const aspect = size.width / Math.max(1, size.height);
    const tanVertical = Math.tan(verticalFov / 2);
    const tanHorizontal = tanVertical * aspect;
    const direction = new THREE.Vector3(0.5, 0.3, 0.8).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const relative = new THREE.Vector3();

    let required = 10;
    for (const point of framing.points) {
      relative.copy(point).sub(framing.center);
      const x = Math.abs(relative.dot(right));
      const y = Math.abs(relative.dot(up));
      const towardCamera = relative.dot(direction);
      required = Math.max(
        required,
        x / tanHorizontal + towardCamera,
        y / tanVertical + towardCamera,
      );
    }

    const distance = required * 1.2;
    const toPosition = framing.center.clone().addScaledVector(direction, distance);
    animation.current = {
      fromPosition: camera.position.clone(),
      toPosition,
      fromTarget: controls.target.clone(),
      toTarget: framing.center.clone(),
      progress: 0,
    };
  }, [framing, fitRequest, camera, size.width, size.height, controlsRef]);

  useFrame((_, delta) => {
    const current = animation.current;
    const controls = controlsRef.current;
    if (!current || !controls) return;
    current.progress = Math.min(1, current.progress + delta * 2.4);
    const eased = easeInOutCubic(current.progress);
    camera.position.lerpVectors(current.fromPosition, current.toPosition, eased);
    controls.target.lerpVectors(current.fromTarget, current.toTarget, eased);
    controls.update();
    if (current.progress >= 1) animation.current = null;
  });

  return null;
}

export interface UniverseCanvasProps {
  nodes: GraphNodePosition[];
  regions: RegionInfo[];
  concepts: Concept[];
  relationships: Relationship[];
  selectedId: string | null;
  labelMode: 'all' | 'related' | 'selected';
  showEdges: boolean;
  fitRequest: number;
  onSelect: (conceptId: string | null) => void;
  onOpen: (conceptId: string) => void;
}

export default function KnowledgeUniverse({
  nodes,
  regions,
  concepts,
  relationships,
  selectedId,
  labelMode,
  showEdges,
  fitRequest,
  onSelect,
  onOpen,
}: UniverseCanvasProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const degree = useMemo(() => {
    const map = new Map<string, number>();
    for (const node of nodes) map.set(node.conceptId, 0);
    for (const relationship of relationships) {
      map.set(relationship.sourceConceptId, (map.get(relationship.sourceConceptId) ?? 0) + 1);
      map.set(relationship.targetConceptId, (map.get(relationship.targetConceptId) ?? 0) + 1);
    }
    return map;
  }, [nodes, relationships]);

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const relationship of relationships) {
      if (!map.has(relationship.sourceConceptId)) map.set(relationship.sourceConceptId, new Set());
      if (!map.has(relationship.targetConceptId)) map.set(relationship.targetConceptId, new Set());
      map.get(relationship.sourceConceptId)?.add(relationship.targetConceptId);
      map.get(relationship.targetConceptId)?.add(relationship.sourceConceptId);
    }
    return map;
  }, [relationships]);

  const labelIds = useMemo(() => {
    const allowed = new Set<string>();
    if (!selectedId) {
      const limit = labelMode === 'all' ? 70 : 12;
      [...nodes]
        .sort((a, b) => (degree.get(b.conceptId) ?? 0) - (degree.get(a.conceptId) ?? 0))
        .slice(0, limit)
        .forEach((node) => allowed.add(node.conceptId));
      if (hoveredId) allowed.add(hoveredId);
      return allowed;
    }
    allowed.add(selectedId);
    if (labelMode !== 'selected') {
      for (const id of neighbors.get(selectedId) ?? []) allowed.add(id);
    }
    if (hoveredId) allowed.add(hoveredId);
    return allowed;
  }, [labelMode, selectedId, nodes, degree, neighbors, hoveredId]);

  const conceptById = useMemo(
    () => new Map(concepts.map((concept) => [concept.id, concept])),
    [concepts],
  );

  const selectedNode = selectedId
    ? nodes.find((node) => node.conceptId === selectedId)
    : undefined;
  const hoveredNode =
    hoveredId && hoveredId !== selectedId
      ? nodes.find((node) => node.conceptId === hoveredId)
      : undefined;
  const selectedScale = selectedNode ? nodeScale(degree, selectedNode.conceptId) * 1.55 : 0;
  const hoveredScale = hoveredNode ? nodeScale(degree, hoveredNode.conceptId) * 1.22 : 0;

  const overlayLabels = useMemo(() => {
    const labels: OverlayLabel[] = [];
    for (const node of nodes) {
      if (!labelIds.has(node.conceptId)) continue;
      const concept = conceptById.get(node.conceptId);
      if (!concept) continue;
      const selected = node.conceptId === selectedId;
      const scale = nodeScale(degree, node.conceptId);
      labels.push({
        key: node.conceptId,
        text: concept.label,
        position: [node.x, node.y + scale + 0.8, node.z],
        color: selected ? SELECTED_COLOR : node.color,
        opacity: selected ? 1 : 0.84,
        prominent: selected,
        region: false,
        priority:
          selected
            ? 1000
            : node.conceptId === hoveredId
              ? 900
              : 20 + (degree.get(node.conceptId) ?? 0) * 10,
      });
    }
    if (regions.length > 1) {
      for (const region of regions) {
        labels.push({
          key: `region-${region.name}`,
          text: region.name.toUpperCase(),
          position: regionLabelPosition(region, regions.length),
          color: region.color,
          opacity: 0.48,
          prominent: false,
          region: true,
          priority: 1,
        });
      }
    }
    return labels;
  }, [nodes, regions, labelIds, conceptById, degree, selectedId, hoveredId]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [16, 10, 26], fov: 45, near: 0.1, far: 620 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => onSelect(null)}
        aria-label="Interactive 3D knowledge universe. Use the list view for keyboard-only navigation."
      >
        <color attach="background" args={['#07080a']} />
        <fogExp2 attach="fog" args={['#07080a', 0.0055]} />
        <ambientLight intensity={0.68} />
        <hemisphereLight intensity={0.7} color="#dfe9e5" groundColor="#08090b" />
        <directionalLight position={[10, 17, 9]} intensity={1.55} color="#eaf2ee" />
        <pointLight position={[-18, 8, -12]} intensity={30} color="#63a18b" distance={48} />
        <pointLight position={[16, -6, 16]} intensity={24} color="#7ebaa3" distance={44} />
        <pointLight position={[0, -18, -8]} intensity={16} color="#8aa2b8" distance={60} />
        <Starfield />
        <RegionRings regions={regions} />
        {showEdges ? (
          <GraphEdges nodes={nodes} relationships={relationships} selectedId={selectedId} />
        ) : null}
        <GraphNodes
          nodes={nodes}
          selectedId={selectedId}
          hoveredId={hoveredId}
          degree={degree}
          neighbors={neighbors}
          onHover={setHoveredId}
          onSelect={(id) => onSelect(id)}
          onOpen={onOpen}
        />
        {selectedNode ? (
          <>
            <GlowSprite
              position={[selectedNode.x, selectedNode.y, selectedNode.z]}
              color={SELECTED_COLOR}
              size={selectedScale * 7.4}
              opacity={0.52}
              order={3}
            />
            <Billboard position={[selectedNode.x, selectedNode.y, selectedNode.z]}>
              <mesh>
                <ringGeometry args={[selectedScale * 1.55, selectedScale * 1.62, 64]} />
                <meshBasicMaterial
                  color={SELECTED_COLOR}
                  transparent
                  opacity={0.6}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </Billboard>
          </>
        ) : null}
        {hoveredNode ? (
          <GlowSprite
            position={[hoveredNode.x, hoveredNode.y, hoveredNode.z]}
            color={HOVER_COLOR}
            size={hoveredScale * 6.2}
            opacity={0.3}
            order={2}
          />
        ) : null}
        <LabelProjector labels={overlayLabels} overlayRef={overlayRef} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.065}
          rotateSpeed={0.5}
          zoomSpeed={0.65}
          minDistance={4}
          maxDistance={260}
          maxPolarAngle={Math.PI * 0.9}
        />
        <CameraDirector
          nodes={nodes}
          regions={regions}
          controlsRef={controlsRef}
          fitRequest={fitRequest}
        />
      </Canvas>
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {overlayLabels.map((label) => (
          <div
            key={label.key}
            data-universe-label=""
            data-label-key={label.key}
            data-label-priority={label.priority}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              visibility: 'hidden',
              transform: 'translate3d(-9999px, -9999px, 0)',
            }}
          >
            <LabelChip label={label} />
          </div>
        ))}
      </div>
    </div>
  );
}
