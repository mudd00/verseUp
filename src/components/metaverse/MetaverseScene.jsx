import { Canvas } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useRef, useState } from 'react'
import MapModel from './MapModel.jsx'
import Player from './Player.jsx'
import ThirdPersonCamera from './ThirdPersonCamera.jsx'

export default function MetaverseScene({ onReady }) {
  const playerRef = useRef(null)
  const [cameraAngle, setCameraAngle] = useState(0)

  return (
    <div className="w-full h-screen">
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        shadows
        onCreated={() => onReady?.()}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[50, 50, 25]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />

        {/* Sky */}
        <Sky
          sunPosition={[100, 20, 100]}
          turbidity={8}
          rayleigh={2}
        />

        {/* Environment */}
        <Environment preset="sunset" />

        {/* Fog */}
        <fog attach="fog" args={['#87CEEB', 10, 100]} />

        {/* Physics World */}
        <Physics gravity={[0, -20, 0]}>
          {/* Map Model */}
          <MapModel />

          {/* Player with ref and camera angle */}
          <Player ref={playerRef} cameraAngle={cameraAngle} />
        </Physics>

        {/* Third Person Camera - follows player */}
        <ThirdPersonCamera target={playerRef} onAngleChange={setCameraAngle} />
      </Canvas>
    </div>
  )
}
