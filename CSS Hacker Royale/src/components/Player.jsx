// ============================================================
//  Player.jsx — Jogador (Robô aliado)
// ============================================================

import React from 'react';
import RobotModel from './RobotModel';

export default function Player({ position, isRevealed, activeTool, isTerminalOpen, meshRef }) {
  return (
    <RobotModel
      position={position}
      isRevealed={isRevealed}
      activeTool={activeTool}
      isTerminalOpen={isTerminalOpen}
      meshRef={meshRef}
    />
  );
}
