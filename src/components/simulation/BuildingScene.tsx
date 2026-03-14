"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import type { Building, HazardZone } from "@/types/command-types";

interface BuildingSceneProps {
  building: Building;
  zones: HazardZone[];
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

function BuildingMesh({ building }: { building: Building }) {
  return (
    <mesh position={[0, building.estimatedHeightMeters / 12, 0]} castShadow receiveShadow>
      <boxGeometry args={[10, Math.max(2.6, building.estimatedHeightMeters / 6), 8]} />
      <meshStandardMaterial color="#9ca3af" metalness={0.22} roughness={0.5} />
    </mesh>
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
        const opacity = Math.max(0.2, Math.min(0.65, zone.severity));

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

export function BuildingScene({ building, zones }: BuildingSceneProps) {
  const cameraPosition = useMemo<[number, number, number]>(() => [14, 12, 14], []);

  return (
    <div className="h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-black/35">
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
          <BuildingMesh building={building} />
          <HazardOverlays zones={zones} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.85} metalness={0.08} />
          </mesh>
          <OrbitControls enablePan enableZoom autoRotate autoRotateSpeed={0.42} minDistance={8} maxDistance={34} />
        </Suspense>
      </Canvas>
    </div>
  );
}
