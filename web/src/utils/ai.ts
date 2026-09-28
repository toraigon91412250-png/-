import { BattleAction, BattleFighter, CpuDifficulty, getEffectiveAttack, getEffectiveDefense, getEffectiveSpeed } from '../types/game';

export const CpuAi = {
  decideAction(
    cpu: BattleFighter,
    player: BattleFighter,
    difficulty: CpuDifficulty
  ): BattleAction {
    const cpuUltimateReady = cpu.ultimateGauge >= 3;
    const cpuSpecialReady = cpu.specialCooldownRemaining <= 0;
    const cpuBuffBonus = cpu.isBuffed ? 50 : 0;
    const cpuSpecialDmg = cpu.character.specialSkillDamage + cpuBuffBonus;
    const cpuUltimateDmg = cpu.character.ultimateSkillDamage + cpuBuffBonus;
    const cpuAtk = getEffectiveAttack(cpu);
    const playerDef = getEffectiveDefense(player);

    // Normal attack approximate damage
    const approxNormalDmg = Math.max(15, cpuAtk - playerDef) + cpuBuffBonus;

    // 0. Ultimate Lethal / Usage: If Ultimate is ready (3/3)
    if (cpuUltimateReady) {
      if (player.currentHp <= cpuUltimateDmg) {
        return 'ULTIMATE';
      }
      const ultChance = difficulty === 'EXPERT' ? 0.85 : 0.75;
      if (Math.random() < ultChance) {
        return 'ULTIMATE';
      }
    }

    // 1. Lethal Finish Check: If CPU can defeat player this turn, execute kill
    if (cpuSpecialReady && player.currentHp <= cpuSpecialDmg) {
      return 'SPECIAL';
    }
    if (player.currentHp <= approxNormalDmg) {
      return (cpuSpecialReady && Math.random() < 0.2) ? 'SPECIAL' : 'ATTACK';
    }

    // 2. High Threat / Evade Check:
    // If player strikes first (effectiveSpeed comparison) and player special/ultimate is ready
    const playerCanStrikeFirst = getEffectiveSpeed(player) >= getEffectiveSpeed(cpu);
    const playerSpecialThreat =
      (player.specialCooldownRemaining <= 0 && (cpu.currentHp <= player.character.specialSkillDamage + 50 || cpu.currentHp < cpu.character.maxHp * 0.35)) ||
      (player.ultimateGauge >= 3 && (cpu.currentHp <= player.character.ultimateSkillDamage + 50 || cpu.currentHp < cpu.character.maxHp * 0.50));

    if (playerCanStrikeFirst && playerSpecialThreat) {
      const evadeChance = difficulty === 'EXPERT' ? 0.65 : 0.45;
      if (Math.random() < evadeChance) {
        return 'EVADE';
      }
    }

    // 3. Low HP Desperation
    if (cpu.currentHp < cpu.character.maxHp * 0.20) {
      const r = Math.random();
      if (cpuUltimateReady) return 'ULTIMATE';
      if (cpuSpecialReady && r < 0.40) return 'SPECIAL';
      if (r < 0.75) return 'EVADE';
      if (!cpu.isBuffed && r < 0.85) return 'BUFF';
      return 'ATTACK';
    }

    // 4. Special Skill Usage
    if (cpuSpecialReady) {
      const specialUsageChance = difficulty === 'EXPERT' ? 0.70 : 0.60;
      if (Math.random() < specialUsageChance) {
        return 'SPECIAL';
      }
    }

    // 5. Tactical Buff: If not buffed and not under immediate threat
    if (!cpu.isBuffed && Math.random() < 0.25) {
      return 'BUFF';
    }

    // 6. Tactical Evade vs Normal Attack
    const normalEvadeChance = difficulty === 'EXPERT'
      ? (player.specialCooldownRemaining <= 0 || player.ultimateGauge >= 3 ? 0.35 : 0.15)
      : (player.specialCooldownRemaining <= 0 || player.ultimateGauge >= 3 ? 0.20 : 0.10);

    return Math.random() < normalEvadeChance ? 'EVADE' : 'ATTACK';
  },
};
