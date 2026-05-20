import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, PerspectiveCamera, Environment, Float, PresentationControls } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  coverUrl: string;
}

const CartridgeModel: React.FC<SceneProps> = ({ coverUrl }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // V9: Fallback texture if cover fails
  const texture = useTexture(coverUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400');
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group>
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          {/* Main Cartridge Body */}
          <boxGeometry args={[3, 4, 0.4]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
          
          {/* Label Area */}
          <mesh position={[0, 0, 0.21]}>
             <planeGeometry args={[2.6, 3.6]} />
             <meshStandardMaterial map={texture} roughness={0.5} />
          </mesh>
        </mesh>
      </Float>
      
      {/* Decorative inner electronics glow inspired by 'HY-World-2.0' tech style */}
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#4f46e5" />
    </group>
  );
};

export const ThreeDGameCartridge: React.FC<{ coverUrl: string }> = ({ coverUrl }) => {
  return (
    <div className="w-full h-full min-h-[300px] cursor-grab active:cursor-grabbing">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={40} />
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <PresentationControls
          global
          snap
          speed={1.5}
          zoom={1}
          polar={[-Math.PI / 4, Math.PI / 4]}
          azimuth={[-Math.PI / 4, Math.PI / 4]}
        >
          <CartridgeModel coverUrl={coverUrl} />
        </PresentationControls>
      </Canvas>
    </div>
  );
};
