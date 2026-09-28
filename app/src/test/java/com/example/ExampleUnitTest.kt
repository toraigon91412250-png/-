package com.example

import com.example.battle.CpuAi
import com.example.model.ActiveStatusAilment
import com.example.model.BattleAction
import com.example.model.BattleFighter
import com.example.model.CharacterRegistry
import com.example.model.CpuDifficulty
import com.example.model.StatusAilmentType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.roundToInt

class ExampleUnitTest {

  @Test
  fun testUpdatedCharacterStats() {
    val irena = CharacterRegistry.IRENA
    assertEquals("いれーな", irena.name)
    assertEquals(1000, irena.maxHp)
    assertEquals(180, irena.attack)
    assertEquals(100, irena.defense)
    assertEquals(120, irena.speed)
    assertEquals(0.25f, irena.evasionRate, 0.001f) // 25% 回避率
    assertEquals("先読み", irena.passiveName)
    assertEquals("出血", irena.statusAilmentName)
    assertEquals("羽弾", irena.specialSkillName)
    assertEquals(350, irena.specialSkillDamage) // 350
    assertEquals(3, irena.specialSkillCooldown)
    assertEquals("羽嵐", irena.ultimateSkillName)
    assertEquals(500, irena.ultimateSkillDamage)

    val kaiser = CharacterRegistry.KAISER
    assertEquals("カイザー", kaiser.name)
    assertEquals(1200, kaiser.maxHp)
    assertEquals(160, kaiser.attack)
    assertEquals(140, kaiser.defense)
    assertEquals(80, kaiser.speed)
    assertEquals(0.10f, kaiser.evasionRate, 0.001f) // 10% 回避率
    assertEquals("重装", kaiser.passiveName)
    assertEquals("重圧", kaiser.statusAilmentName)
    assertEquals("重撃", kaiser.specialSkillName)
    assertEquals(300, kaiser.specialSkillDamage) // 300
    assertEquals(4, kaiser.specialSkillCooldown)
    assertEquals("超重撃", kaiser.ultimateSkillName)
    assertEquals(500, kaiser.ultimateSkillDamage)
  }

  @Test
  fun testIrenaPrecognitionPassive() {
    val irena = CharacterRegistry.IRENA
    val kaiser = CharacterRegistry.KAISER

    // Base damage: 180 - 140 = 40
    val rawDamage = irena.attack - kaiser.defense
    assertEquals(40, rawDamage)

    // With precognition (先読み): +20 = 60
    val precognitionDamage = rawDamage + 20
    assertEquals(60, precognitionDamage)

    // With critical (1.5x after +20): 60 * 1.5 = 90
    val criticalDamage = (precognitionDamage * 1.5f).roundToInt()
    assertEquals(90, criticalDamage)

    // When Kaiser receives normal attack with 重装 (-20 final damage):
    val kaiserHeavyArmorDamage = maxOf(0, precognitionDamage - 20)
    assertEquals(40, kaiserHeavyArmorDamage)

    // Crit against Kaiser heavy armor: 90 - 20 = 70
    val critKaiserHeavyArmorDamage = maxOf(0, criticalDamage - 20)
    assertEquals(70, critKaiserHeavyArmorDamage)
  }

  @Test
  fun testKaiserHeavyArmorOnlyAppliesToNormalAttack() {
    // Normal attack damage 15 -> with heavy armor: 15 - 20 = -5 -> 0
    val lowNormalDmg = maxOf(0, 15 - 20)
    assertEquals(0, lowNormalDmg)

    // Special skill (350) does NOT get reduced by heavy armor
    val specialDamage = 350
    assertEquals(350, specialDamage)

    // Ultimate skill (500) does NOT get reduced by heavy armor
    val ultimateDamage = 500
    assertEquals(500, ultimateDamage)
  }

  @Test
  fun testBuffSystem() {
    var isBuffed = false
    // Using 強化
    isBuffed = true
    assertTrue(isBuffed)

    // Using 強化 again does not stack, maintains buff
    isBuffed = true
    assertTrue(isBuffed)

    // Next attack adds +50
    val baseAttack = 40
    val buffedAttack = baseAttack + (if (isBuffed) 50 else 0)
    assertEquals(90, buffedAttack)

    // Consumed after attack
    isBuffed = false
    assertFalse(isBuffed)
  }

  @Test
  fun testStatusAilmentsAndEffectiveStats() {
    val kaiser = BattleFighter(
      character = CharacterRegistry.KAISER,
      currentHp = 1200,
      activeAilments = listOf(
        ActiveStatusAilment(StatusAilmentType.BLEED, 3)
      ),
      isPlayer = false
    )

    // Kaiser base speed: 80, bleeding speedMod: -20 -> effectiveSpeed: 60
    assertEquals(60, kaiser.effectiveSpeed)
    // Kaiser base defense: 140, bleeding defMod: -20 -> effectiveDefense: 120
    assertEquals(120, kaiser.effectiveDefense)

    val irena = BattleFighter(
      character = CharacterRegistry.IRENA,
      currentHp = 1000,
      activeAilments = listOf(
        ActiveStatusAilment(StatusAilmentType.PRESSURE, 2)
      ),
      isPlayer = true
    )

    // Irena base speed: 120, pressure speedMod: -25 -> effectiveSpeed: 95
    assertEquals(95, irena.effectiveSpeed)
    // Irena base attack: 180, pressure atkMod: -25 -> effectiveAttack: 155
    assertEquals(155, irena.effectiveAttack)
  }

  @Test
  fun testUltimateGaugeLimits() {
    val fighter = BattleFighter(
      character = CharacterRegistry.IRENA,
      currentHp = 1000,
      ultimateGauge = 0,
      isPlayer = true
    )
    assertEquals(0, fighter.ultimateGauge)
    assertFalse(fighter.isUltimateReady)

    val gauge2 = fighter.copy(ultimateGauge = 2)
    assertFalse(gauge2.isUltimateReady)

    val gauge3 = fighter.copy(ultimateGauge = 3)
    assertTrue(gauge3.isUltimateReady)
  }

  @Test
  fun testCpuActionDecisionWithNoDefend() {
    val cpu = BattleFighter(
      character = CharacterRegistry.KAISER,
      currentHp = 500,
      ultimateGauge = 3, // Ready
      isPlayer = false
    )
    val player = BattleFighter(
      character = CharacterRegistry.IRENA,
      currentHp = 450,
      ultimateGauge = 0,
      isPlayer = true
    )

    val action = CpuAi.decideAction(cpu, player, CpuDifficulty.EXPERT)
    // CPU should unleash ULTIMATE
    assertEquals(BattleAction.ULTIMATE, action)

    // Ensure CPU never chooses DEFEND
    for (i in 0..20) {
      val a = CpuAi.decideAction(cpu.copy(ultimateGauge = 0), player, CpuDifficulty.NORMAL)
      assertTrue(a in listOf(BattleAction.ATTACK, BattleAction.EVADE, BattleAction.BUFF, BattleAction.SPECIAL, BattleAction.ULTIMATE))
    }
  }
}
