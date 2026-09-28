package com.example.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class OverallStats(
  val totalBattles: Int = 0,
  val wins: Int = 0,
  val losses: Int = 0,
  val winRatePercent: Int = 0,
  val irenaPicks: Int = 0,
  val kaiserPicks: Int = 0
)

class BattleStatsRepository(context: Context) {
  private val prefs: SharedPreferences =
    context.getSharedPreferences("duel_arena_stats", Context.MODE_PRIVATE)

  private val _stats = MutableStateFlow(loadStats())
  val stats: StateFlow<OverallStats> = _stats.asStateFlow()

  private fun loadStats(): OverallStats {
    val total = prefs.getInt("total_battles", 0)
    val wins = prefs.getInt("player_wins", 0)
    val losses = prefs.getInt("player_losses", 0)
    val irena = prefs.getInt("irena_picks", 0)
    val kaiser = prefs.getInt("kaiser_picks", 0)
    val rate = if (total > 0) ((wins.toFloat() / total) * 100).toInt() else 0
    return OverallStats(
      totalBattles = total,
      wins = wins,
      losses = losses,
      winRatePercent = rate,
      irenaPicks = irena,
      kaiserPicks = kaiser
    )
  }

  fun recordBattleResult(playerWon: Boolean, characterId: String) {
    val total = prefs.getInt("total_battles", 0) + 1
    val wins = prefs.getInt("player_wins", 0) + (if (playerWon) 1 else 0)
    val losses = prefs.getInt("player_losses", 0) + (if (!playerWon) 1 else 0)
    val irena = prefs.getInt("irena_picks", 0) + (if (characterId == "irena") 1 else 0)
    val kaiser = prefs.getInt("kaiser_picks", 0) + (if (characterId == "kaiser") 1 else 0)

    prefs.edit()
      .putInt("total_battles", total)
      .putInt("player_wins", wins)
      .putInt("player_losses", losses)
      .putInt("irena_picks", irena)
      .putInt("kaiser_picks", kaiser)
      .apply()

    _stats.value = loadStats()
  }

  fun resetStats() {
    prefs.edit().clear().apply()
    _stats.value = OverallStats()
  }
}
