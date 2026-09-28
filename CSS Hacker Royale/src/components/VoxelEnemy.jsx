// ============================================================
//  VoxelEnemy.jsx — NPC Bot (Inimigo)
// ============================================================

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { gridToPosition3D } from '../utils/GameEngine';
import RobotModel from './RobotModel';

export default function VoxelEnemy({ enemy, botTool, meshRef, arenaSize = 10, isAwaitingSpawn, scaleOverride, onLanded, isFloorElevated = false }) {
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

  const jumpStartPos3D = useMemo(() => {
    if (!enemy.jumpState?.startPos) return null;
    const centerCol = enemy.jumpState.startPos[1] + (enemy.size[0] - 1) / 2;
    const centerRow = enemy.jumpState.startPos[0] + (enemy.size[1] - 1) / 2;
    return gridToPosition3D(centerCol, centerRow, arenaSize);
  }, [enemy.jumpState?.startPos, enemy.size, arenaSize]);

  const jumpTargetPos3D = useMemo(() => {
    if (!enemy.jumpState?.targetPos) return null;
    const centerCol = enemy.jumpState.targetPos[1] + (enemy.size[0] - 1) / 2;
    const centerRow = enemy.jumpState.targetPos[0] + (enemy.size[1] - 1) / 2;
    return gridToPosition3D(centerCol, centerRow, arenaSize);
  }, [enemy.jumpState?.targetPos, enemy.size, arenaSize]);

  return (
    <RobotModel
      position={pos}
      isRevealed={enemy.revealed}
      activeTool={botTool || null}
      isTerminalOpen={false}
      meshRef={meshRef}
      modelType={enemy.type === 'boss' ? 'boss' : 'npc'}
      scaleMultiplier={scaleOverride || scaleMult}
      damageTrigger={damageTrigger}
      spawnTime={enemy.spawnTime}
      isAwaitingSpawn={isAwaitingSpawn !== undefined ? isAwaitingSpawn : (enemy.isIntroActive && enemy.spawnTime === 0)}
      onLanded={onLanded}
      jumpState={enemy.jumpState}
      jumpStartPos3D={jumpStartPos3D}
      jumpTargetPos3D={jumpTargetPos3D}
      landingState={enemy.landingState}
      skyBombAttack={enemy.skyBombAttack}
      bombAttack={enemy.bombAttack}
      isDead={enemy.hp <= 0 || !!enemy.isDead}
      isFloorElevated={isFloorElevated}
    />
  );
}
