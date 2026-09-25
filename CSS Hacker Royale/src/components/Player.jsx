// ============================================================
//  Player.jsx — Jogador (Robô com contorno neon CIANO)
// ============================================================

import React from 'react';
import RobotModel from './RobotModel';

export default function Player({
  position,
  isRevealed,
  activeTool,
  isTerminalOpen,
  throwTrigger,
  shootTrigger,
  lookAtTarget,
  damageTrigger
}) {
  return (
    <RobotModel
      position={position}
      outlineColor="#00ffcc"
      isRevealed={isRevealed}
      activeTool={activeTool}
      isTerminalOpen={isTerminalOpen}
      throwTrigger={throwTrigger}
      shootTrigger={shootTrigger}
      lookAtTarget={lookAtTarget}
      damageTrigger={damageTrigger}
    />
  );
}
