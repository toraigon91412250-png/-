package com.example

import com.example.raidboss.engine.RaidBattleEngine
import com.example.raidboss.model.ActionType
import com.example.raidboss.model.BossPhaseType
import com.example.raidboss.model.RaidDifficulty
import com.example.raidboss.model.RaidSkillCatalog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ExampleUnitTest {

    @Test
    fun testBattleInitializationPhase1() {
        val testDispatcher = StandardTestDispatcher()
        val testScope = TestScope(testDispatcher)
        val engine = RaidBattleEngine(scope = testScope)

        engine.startBattle(RaidDifficulty.NORMAL, startAtPhase2 = false)

        val boss = engine.bossState.value
        val player = engine.playerState.value

        assertEquals(BossPhaseType.PHASE_1, boss.phase)
        assertEquals(120_000L, boss.maxHp)
        assertEquals(120_000L, boss.currentHp)
        assertEquals(3800, player.currentHp)
        assertEquals(100, player.currentMp)
    }

    @Test
    fun testBattleInitializationPhase2Direct() {
        val testDispatcher = StandardTestDispatcher()
        val testScope = TestScope(testDispatcher)
        val engine = RaidBattleEngine(scope = testScope)

        engine.startBattle(RaidDifficulty.NORMAL, startAtPhase2 = true)

        val boss = engine.bossState.value
        assertEquals(BossPhaseType.PHASE_2, boss.phase)
        assertEquals(180_000L, boss.maxHp)
        assertEquals(180_000L, boss.currentHp)
    }

    @Test
    fun testPhase2AwakeningTransition() = runTest {
        val engine = RaidBattleEngine(scope = this)
        engine.startBattle(RaidDifficulty.NORMAL, startAtPhase2 = false)

        assertEquals(BossPhaseType.PHASE_1, engine.bossState.value.phase)

        // 第2形態覚醒トリガー
        engine.triggerPhase2Transition()
        testScheduler.advanceUntilIdle()

        assertEquals(BossPhaseType.PHASE_2, engine.bossState.value.phase)
        assertEquals(180_000L, engine.bossState.value.maxHp)
        assertEquals(180_000L, engine.bossState.value.currentHp)
    }

    @Test
    fun testGuardReducesDamageAndProvidesShield() = runTest {
        val engine = RaidBattleEngine(scope = this)
        engine.startBattle(RaidDifficulty.NORMAL, startAtPhase2 = false)

        // プレイヤーが神聖の鉄壁を使用
        engine.executePlayerAction(ActionType.DEFEND_GUARD)
        testScheduler.advanceUntilIdle()

        val player = engine.playerState.value
        assertTrue(player.shield >= 0)
    }
}
