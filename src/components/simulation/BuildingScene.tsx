"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Grid, OrbitControls } from "@react-three/drei";
import type { Group, Mesh } from "three";
import type { Building, HazardZone, ScenarioType } from "@/types/command-types";

interface BuildingSceneProps {
  building: Building;
  zones: HazardZone[];
  scenarioType?: ScenarioType;
}

const zoneColor = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#facc15",
  blue: "#38bdf8",
  green: "#22c55e",
  cyan: "#06b6d4",
  purple: "#a855f7",
} as const;

const scenarioLabel: Record<ScenarioType, string> = {
  fire: "Fire",
  earthquake_damage: "Earthquake Damage",
  flood_risk: "Flood Risk",
  smoke_spread: "Smoke Spread",
  structural_compromise: "Structural Compromise",
  evacuation_stress: "Evacuation Stress",
};

function BuildingMesh({ building, scenarioType }: { building: Building; scenarioType: ScenarioType }) {
  const groupRef = useRef<Group | null>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const t = clock.getElapsedTime();
    group.position.y = building.estimatedHeightMeters / 12;

    if (scenarioType === "earthquake_damage" || scenarioType === "structural_compromise") {
      group.position.x = Math.sin(t * 24) * 0.08;
      group.position.z = Math.cos(t * 26) * 0.08;
      group.rotation.z = Math.sin(t * 20) * 0.015;
    } else {
      group.position.x = 0;
      group.position.z = 0;
      group.rotation.z = 0;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[10, Math.max(2.6, building.estimatedHeightMeters / 6), 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.22} roughness={0.5} />
      </mesh>
    </group>
  );
}

function HazardOverlays({ zones }: { zones: HazardZone[] }) {
  return (
    <group>
      {zones.map((zone, index) => {
        const width = Math.max(2, Math.abs(zone.vertices[1]?.[0] ?? 3));
        const height = Math.max(2, Math.abs(zone.vertices[2]?.[1] ?? 2));
        const offsetX = -4 + index * 1.35;
        const offsetZ = -2 + index * 0.9;
        const opacity = Math.max(0.2, Math.min(0.68, zone.severity));

        return (
          <mesh key={zone.id} position={[offsetX, 0.15 + index * 0.04, offsetZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial color={zoneColor[zone.color]} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
}

function FloodEffect({ intensity }: { intensity: number }) {
  const waterRef = useRef<Mesh | null>(null);

  useFrame(({ clock }) => {
    if (!waterRef.current) {
      return;
    }

    const t = clock.getElapsedTime();
    const rise = 0.25 + intensity * 1.8;
    waterRef.current.position.y = 0.2 + rise + Math.sin(t * 2.2) * 0.06;
    waterRef.current.scale.set(1, 1 + Math.sin(t * 1.6) * 0.04, 1);
  });

  return (
    <mesh ref={waterRef} position={[0, 0.7, 0]}>
      <boxGeometry args={[18, 1.1, 14]} />
      <meshStandardMaterial color="#38bdf8" transparent opacity={0.32} metalness={0.15} roughness={0.2} />
    </mesh>
  );
}

function FireSmokeEffect({ intensity, smoke, embers }: { intensity: number; smoke?: boolean; embers?: boolean }) {
  const fireRef = useRef<Mesh | null>(null);
  const smokeRefs = useRef<Array<Mesh | null>>([]);
  const emberRefs = useRef<Array<Mesh | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (fireRef.current) {
      fireRef.current.scale.setScalar(1 + Math.sin(t * 5.4) * 0.14 + intensity * 0.2);
      fireRef.current.position.y = 1.7 + Math.sin(t * 4.2) * 0.15;
    }

    smokeRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const drift = index * 0.22;
      mesh.position.y = 2.2 + ((t + drift) % 4.4) * 0.5;
      mesh.position.x = -1.2 + index * 0.8 + Math.sin(t * 1.4 + index) * 0.18;
      mesh.position.z = -0.8 + index * 0.4 + Math.cos(t * 1.3 + index) * 0.16;
      mesh.scale.setScalar(0.7 + ((t + index) % 3.2) * 0.2);
    });

    emberRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const cycle = (t * (1.8 + index * 0.1) + index) % 3.6;
      mesh.position.y = 1.3 + cycle * 1.6;
      mesh.position.x = -0.9 + index * 0.3 + Math.sin(t * 2.6 + index) * 0.15;
      mesh.position.z = -0.6 + index * 0.2 + Math.cos(t * 2.1 + index) * 0.12;
      mesh.scale.setScalar(0.7 + Math.max(0, Math.sin(t * 6 + index)) * 0.6);
    });
  });

  return (
    <group>
      <pointLight position={[0, 4.2, 0]} color="#f97316" intensity={2.2 + intensity * 1.5} distance={26} />
      <pointLight position={[1.2, 2.8, -0.6]} color="#ef4444" intensity={1.2 + intensity * 1.1} distance={18} />
      <mesh ref={fireRef} position={[0, 1.8, 0]}>
        <sphereGeometry args={[1.1 + intensity * 0.8, 20, 20]} />
        <meshStandardMaterial color="#ef4444" emissive="#f97316" emissiveIntensity={1.4} transparent opacity={0.72} />
      </mesh>

      {smoke
        ? Array.from({ length: 5 }).map((_, index) => (
            <mesh
              key={`smoke-${index}`}
              ref={(node) => {
                smokeRefs.current[index] = node;
              }}
              position={[index * 0.5, 2 + index * 0.2, 0]}
            >
              <sphereGeometry args={[0.7, 18, 18]} />
              <meshStandardMaterial color="#6b7280" transparent opacity={0.25} />
            </mesh>
          ))
        : null}

      {embers
        ? Array.from({ length: 8 }).map((_, index) => (
            <mesh
              key={`ember-${index}`}
              ref={(node) => {
                emberRefs.current[index] = node;
              }}
              position={[0, 1.3, 0]}
            >
              <sphereGeometry args={[0.08 + (index % 3) * 0.02, 10, 10]} />
              <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={1.2} transparent opacity={0.4} />
            </mesh>
          ))
        : null}
    </group>
  );
}

function StructuralStressEffect() {
  const crackRef = useRef<Group | null>(null);

  useFrame(({ clock }) => {
    if (!crackRef.current) {
      return;
    }

    const t = clock.getElapsedTime();
    crackRef.current.rotation.y = Math.sin(t * 0.8) * 0.08;
  });

  return (
    <group ref={crackRef}>
      {Array.from({ length: 4 }).map((_, index) => (
        <mesh key={`stress-${index}`} position={[-2 + index * 1.35, 3 + index * 0.6, 4.05]}>
          <boxGeometry args={[0.12, 2.4 + index * 0.3, 0.08]} />
          <meshStandardMaterial color="#facc15" emissive="#f97316" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function ScenarioEffects({ scenarioType, zones }: { scenarioType: ScenarioType; zones: HazardZone[] }) {
  const intensity = Math.max(0.35, Math.min(0.95, zones[0]?.severity ?? 0.55));

  if (scenarioType === "flood_risk") {
    return <FloodEffect intensity={intensity} />;
  }

  if (scenarioType === "fire") {
    return <FireSmokeEffect intensity={Math.min(0.95, intensity + 0.14)} smoke embers />;
  }

  if (scenarioType === "smoke_spread") {
    return <FireSmokeEffect intensity={Math.max(0.3, intensity - 0.1)} smoke />;
  }

  if (scenarioType === "earthquake_damage" || scenarioType === "structural_compromise") {
    return <StructuralStressEffect />;
  }

  return null;
}

export function BuildingScene({ building, zones, scenarioType = "fire" }: BuildingSceneProps) {
  const cameraPosition = useMemo<[number, number, number]>(() => [14, 12, 14], []);

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-black/35">
      <Canvas shadows camera={{ position: cameraPosition, fov: 42 }}>
        <Suspense fallback={null}>
          <Environment preset="city" />
          <ambientLight intensity={0.58} />
          <directionalLight position={[14, 18, 6]} intensity={1.05} castShadow />
          <Grid
            args={[60, 60]}
            cellColor="#404040"
            sectionColor="#737373"
            fadeDistance={36}
            fadeStrength={1.2}
            position={[0, 0, 0]}
          />
          <BuildingMesh building={building} scenarioType={scenarioType} />
          <HazardOverlays zones={zones} />
          <ScenarioEffects scenarioType={scenarioType} zones={zones} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.85} metalness={0.08} />
          </mesh>
          <OrbitControls enablePan enableZoom autoRotate autoRotateSpeed={0.42} minDistance={8} maxDistance={34} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 text-[11px] text-zinc-200">
        Scenario: {scenarioLabel[scenarioType]}
      </div>
    </div>
  );
}
