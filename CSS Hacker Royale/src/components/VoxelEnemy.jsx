// ============================================================
//  VoxelEnemy.jsx — NPC Bot (Inimigo)
// ============================================================

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { gridToPosition3D } from '../utils/GameEngine';
import RobotModel from './RobotModel';

export default function VoxelEnemy({ enemy, botTool, meshRef, arenaSize = 10 }) {
  const [damageTrigger, setDamageTrigger] = useState(0);
  const prevHp = useRef(enemy.hp);

  useEffect(() => {
    if (enemy.hp < prevHp.current) {
      setDamageTrigger(Date.now());
    }
    prevHp.current = enemy.hp;
  }, [enemy.hp]);

  const pos = useMemo(() => {
      const centerCol = enemy.position[1] + (enemy.size[0] - 1) / 2;
      const centerRow = enemy.position[0] + (enemy.size[1] - 1) / 2;
      return gridToPosition3D(centerCol, centerRow, arenaSize);
    },
    [enemy.position[0], enemy.position[1], enemy.size[0], enemy.size[1], arenaSize]
  );
  
  const scaleMult = Math.max(enemy.size[0], enemy.size[1]);

  return (
    <RobotModel
      position={pos}
      isRevealed={enemy.revealed}
      activeTool={botTool || null}
      isTerminalOpen={false}
      meshRef={meshRef}
      modelType="npc"
      scaleMultiplier={scaleMult}
      isChargingBomb={enemy.isChargingBomb}
      damageTrigger={damageTrigger}
    />
  );
}
