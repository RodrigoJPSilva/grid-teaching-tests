import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { parsePlayerCode, gridToPosition3D } from '../utils/GameEngine';
import VoxelEnemy from './VoxelEnemy';
import Player from './Player';
import Bomb from './Bomb';

export default function Arena3D({
  cssCode, activeRoom, enemies,
  isTerminalOpen, activeTool,
  playerRevealed, setPlayerRevealed, lastPlayerPos,
  bombCountdown,
}) {
  const gameState = useMemo(() => parsePlayerCode(cssCode), [cssCode]);

  // Detectar movimento do jogador → esconder no radar
  const isMoving =
    gameState.player.col !== lastPlayerPos.current.col ||
    gameState.player.row !== lastPlayerPos.current.row;

  if (isMoving) {
    lastPlayerPos.current = { col: gameState.player.col, row: gameState.player.row };
    setTimeout(() => { if (playerRevealed) setPlayerRevealed(false); }, 0);
  }

  const playerPos3D = gridToPosition3D(gameState.player.col, gameState.player.row);
  const bombaPos3D = gameState.bomba
    ? gridToPosition3D(gameState.bomba.col, gameState.bomba.row)
    : null;

  const enemiesInRoom = Object.values(enemies).filter(
    e => e.hp > 0 && e.room === activeRoom
  );

  return (
    <Canvas>
      <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={40} />
      <OrbitControls />

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} color="#e2e8f0" />
      <pointLight position={[-5, 2, -5]} color="#00d4ff" intensity={2} distance={15} />
      <pointLight position={[5, 2, 5]} color="#ff00ff" intensity={2} distance={15} />

      <gridHelper args={[10, 6, '#ff00ff', '#00d4ff']} position={[0, -0.6, 0]} />

      <Player
        position={playerPos3D}
        isRevealed={playerRevealed}
        activeTool={activeTool}
        isTerminalOpen={isTerminalOpen}
      />

      {enemiesInRoom.map(enemy => (
        <VoxelEnemy key={enemy.id} enemy={enemy} />
      ))}

      {bombaPos3D && <Bomb position={bombaPos3D} countdown={bombCountdown} />}
    </Canvas>
  );
}
