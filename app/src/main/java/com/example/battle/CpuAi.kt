package com.example.battle

import com.example.model.BattleAction
import com.example.model.BattleFighter
import com.example.model.CpuDifficulty
import kotlin.random.Random

object CpuAi {

  /**
   * Decide CPU action based on current battle status.
   * Actions available: ATTACK, EVADE, BUFF, SPECIAL, ULTIMATE.
   */
  fun decideAction(
    cpu: BattleFighter,
    player: BattleFighter,
    difficulty: CpuDifficulty
  ): BattleAction {
    val cpuUltimateReady = cpu.isUltimateReady
    val cpuSpecialReady = cpu.isSpecialReady
    val cpuBuffBonus = if (cpu.isBuffed) 50 else 0
    val cpuSpecialDmg = cpu.character.specialSkillDamage + cpuBuffBonus
    val cpuUltimateDmg = cpu.character.ultimateSkillDamage + cpuBuffBonus
    val cpuAtk = cpu.effectiveAttack
    val playerDef = player.effectiveDefense

    // Normal attack approximate damage
    val approxNormalDmg = maxOf(15, cpuAtk - playerDef) + cpuBuffBonus

    // 0. Ultimate Lethal / Usage: If Ultimate is ready (3/3)
    if (cpuUltimateReady) {
      if (player.currentHp <= cpuUltimateDmg) {
        return BattleAction.ULTIMATE
      }
      val ultChance = when (difficulty) {
        CpuDifficulty.EXPERT -> 0.85f
        CpuDifficulty.NORMAL -> 0.75f
      }
      if (Random.nextFloat() < ultChance) {
        return BattleAction.ULTIMATE
      }
    }

    // 1. Lethal Finish Check: If CPU can defeat player this turn, execute kill
    if (cpuSpecialReady && player.currentHp <= cpuSpecialDmg) {
      return BattleAction.SPECIAL
    }
    if (player.currentHp <= approxNormalDmg) {
      return if (cpuSpecialReady && Random.nextFloat() < 0.2f) {
        BattleAction.SPECIAL
      } else {
        BattleAction.ATTACK
      }
    }

    // 2. High Threat / Evade Check:
    // If player strikes first (effectiveSpeed comparison) and player special/ultimate is ready
    val playerCanStrikeFirst = player.effectiveSpeed >= cpu.effectiveSpeed
    val playerSpecialThreat = (player.isSpecialReady && (cpu.currentHp <= player.character.specialSkillDamage + 50 || cpu.currentHp < cpu.maxHp * 0.35f)) ||
        (player.isUltimateReady && (cpu.currentHp <= player.character.ultimateSkillDamage + 50 || cpu.currentHp < cpu.maxHp * 0.50f))

    if (playerCanStrikeFirst && playerSpecialThreat) {
      val evadeChance = when (difficulty) {
        CpuDifficulty.EXPERT -> 0.65f
        CpuDifficulty.NORMAL -> 0.45f
      }
      if (Random.nextFloat() < evadeChance) {
        return BattleAction.EVADE
      }
    }

    // 3. Low HP Desperation
    if (cpu.currentHp < cpu.maxHp * 0.20f) {
      val r = Random.nextFloat()
      return when {
        cpuUltimateReady -> BattleAction.ULTIMATE
        cpuSpecialReady && r < 0.40f -> BattleAction.SPECIAL
        r < 0.75f -> BattleAction.EVADE
        !cpu.isBuffed && r < 0.85f -> BattleAction.BUFF
        else -> BattleAction.ATTACK
      }
    }

    // 4. Special Skill Usage
    if (cpuSpecialReady) {
      val specialUsageChance = when (difficulty) {
        CpuDifficulty.EXPERT -> 0.70f
        CpuDifficulty.NORMAL -> 0.60f
      }
      if (Random.nextFloat() < specialUsageChance) {
        return BattleAction.SPECIAL
      }
    }

    // 5. Tactical Buff: If not buffed and not under immediate threat
    if (!cpu.isBuffed && Random.nextFloat() < 0.25f) {
      return BattleAction.BUFF
    }

    // 6. Tactical Evade vs Normal Attack
    val normalEvadeChance = when (difficulty) {
      CpuDifficulty.EXPERT -> if (player.isSpecialReady || player.isUltimateReady) 0.35f else 0.15f
      CpuDifficulty.NORMAL -> if (player.isSpecialReady || player.isUltimateReady) 0.20f else 0.10f
    }

    return if (Random.nextFloat() < normalEvadeChance) {
      BattleAction.EVADE
    } else {
      BattleAction.ATTACK
    }
  }
}
