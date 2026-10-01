package com.example.raidboss.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.example.raidboss.engine.RaidBattleEngine
import com.example.raidboss.model.RaidDifficulty
import com.example.raidboss.ui.battle.BattleScreen
import com.example.raidboss.ui.prebattle.PreBattleScreen
import com.example.raidboss.ui.result.BattleResultDialog

enum class ScreenState {
    PRE_BATTLE,
    BATTLE
}

@Composable
fun RaidMainContainer(
    modifier: Modifier = Modifier
) {
    var currentScreen by remember { mutableStateOf(ScreenState.PRE_BATTLE) }
    val battleEngine = remember { RaidBattleEngine() }
    val battleResult by battleEngine.battleResult.collectAsState()
    var lastSelectedDifficulty by remember { mutableStateOf(RaidDifficulty.NORMAL) }
    var lastStartAtPhase2 by remember { mutableStateOf(false) }

    // バックボタン制御
    BackHandler(enabled = currentScreen == ScreenState.BATTLE) {
        currentScreen = ScreenState.PRE_BATTLE
    }

    AnimatedContent(
        targetState = currentScreen,
        label = "screen_transition",
        transitionSpec = {
            if (targetState == ScreenState.BATTLE) {
                slideInVertically { height -> height } + fadeIn() togetherWith
                        slideOutVertically { height -> -height / 3 } + fadeOut()
            } else {
                slideInVertically { height -> -height } + fadeIn() togetherWith
                        slideOutVertically { height -> height / 3 } + fadeOut()
            }
        },
        modifier = modifier.fillMaxSize()
    ) { screen ->
        when (screen) {
            ScreenState.PRE_BATTLE -> {
                PreBattleScreen(
                    onStartBattle = { difficulty, startAtPhase2 ->
                        lastSelectedDifficulty = difficulty
                        lastStartAtPhase2 = startAtPhase2
                        battleEngine.startBattle(difficulty, startAtPhase2)
                        currentScreen = ScreenState.BATTLE
                    }
                )
            }
            ScreenState.BATTLE -> {
                BattleScreen(
                    engine = battleEngine,
                    onRetire = {
                        currentScreen = ScreenState.PRE_BATTLE
                    }
                )
            }
        }
    }

    // 討伐完了または敗北時のリザルトダイアログ
    battleResult?.let { result ->
        BattleResultDialog(
            result = result,
            onRetry = {
                battleEngine.startBattle(lastSelectedDifficulty, lastStartAtPhase2)
            },
            onReturnToPreBattle = {
                currentScreen = ScreenState.PRE_BATTLE
            }
        )
    }
}
