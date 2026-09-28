package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.BattleStatsRepository
import com.example.model.CharacterRegistry
import com.example.ui.battle.BattleViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ExampleRobolectricTest {

  @Test
  fun testAppNameString() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("デュエルアリーナ", appName)
  }

  @Test
  fun testStatsRepositoryAndViewModelInit() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val repository = BattleStatsRepository(context)
    val viewModel = BattleViewModel(
      statsRepository = repository,
      playerChar = CharacterRegistry.IRENA,
      enemyChar = CharacterRegistry.KAISER
    )

    val state = viewModel.uiState.value
    assertNotNull(state)
    assertEquals("いれーな", state.player.character.name)
    assertEquals("カイザー", state.enemy.character.name)
    assertEquals(1000, state.player.currentHp)
    assertEquals(1200, state.enemy.currentHp)
    assertEquals(1, state.turnNumber)
  }
}
