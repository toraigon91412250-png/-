package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.data.BattleStatsRepository
import com.example.model.CharacterDef
import com.example.model.CharacterRegistry
import com.example.model.CpuDifficulty
import com.example.ui.battle.BattleScreen
import com.example.ui.battle.BattleViewModel
import com.example.ui.select.CharacterSelectScreen
import com.example.ui.theme.MyApplicationTheme

enum class Screen {
  CHARACTER_SELECT,
  BATTLE
}

class MainActivity : ComponentActivity() {

  private val statsRepository by lazy {
    BattleStatsRepository(applicationContext)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        Surface(
          modifier = Modifier.fillMaxSize(),
          color = MaterialTheme.colorScheme.background
        ) {
          DuelArenaApp(statsRepository = statsRepository)
        }
      }
    }
  }
}

@Composable
fun DuelArenaApp(
  statsRepository: BattleStatsRepository,
  modifier: Modifier = Modifier
) {
  var currentScreen by remember { mutableStateOf(Screen.CHARACTER_SELECT) }
  var playerCharacter by remember { mutableStateOf(CharacterRegistry.IRENA) }
  var enemyCharacter by remember { mutableStateOf(CharacterRegistry.KAISER) }
  var selectedDifficulty by remember { mutableStateOf(CpuDifficulty.NORMAL) }

  val overallStats by statsRepository.stats.collectAsStateWithLifecycle()

  val battleViewModel = remember(playerCharacter, enemyCharacter, selectedDifficulty) {
    BattleViewModel(
      statsRepository = statsRepository,
      playerChar = playerCharacter,
      enemyChar = enemyCharacter
    ).apply {
      setCpuDifficulty(selectedDifficulty)
    }
  }

  when (currentScreen) {
    Screen.CHARACTER_SELECT -> {
      CharacterSelectScreen(
        overallStats = overallStats,
        currentDifficulty = selectedDifficulty,
        onStartBattle = { selectedPlayer, selectedEnemy, difficulty ->
          playerCharacter = selectedPlayer
          enemyCharacter = selectedEnemy
          selectedDifficulty = difficulty
          battleViewModel.restartBattle(selectedPlayer, selectedEnemy)
          battleViewModel.setCpuDifficulty(difficulty)
          currentScreen = Screen.BATTLE
        },
        modifier = modifier
      )
    }

    Screen.BATTLE -> {
      BackHandler {
        currentScreen = Screen.CHARACTER_SELECT
      }
      BattleScreen(
        viewModel = battleViewModel,
        onBackToSelect = {
          currentScreen = Screen.CHARACTER_SELECT
        },
        modifier = modifier
      )
    }
  }
}
