package com.example.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin
import kotlin.random.Random

/**
 * Self-contained Sound Effects Manager using synthesized audio waveforms.
 * Guaranteed 0 latency, requires no external assets or network.
 */
class SoundManager {

  private val coroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
  var isSoundEnabled: Boolean = true

  private val sampleRate = 44100

  // Play normal attack: crisp punchy slash & hit
  fun playAttack() {
    if (!isSoundEnabled) return
    coroutineScope.launch {
      val durationMs = 180
      val numSamples = (sampleRate * (durationMs / 1000.0)).toInt()
      val buffer = ShortArray(numSamples)
      val random = Random(42)

      for (i in 0 until numSamples) {
        val t = i.toDouble() / sampleRate
        val progress = i.toDouble() / numSamples

        // Pitch drop from 400Hz to 80Hz + punch
        val freq = 400.0 * (1.0 - progress * 0.8)
        val sine = sin(2.0 * PI * freq * t)
        val noise = (random.nextDouble() * 2.0 - 1.0) * (1.0 - progress) * 0.4
        val envelope = exp(-8.0 * progress)

        val sampleVal = ((sine * 0.7 + noise * 0.3) * envelope * 0.55 * Short.MAX_VALUE).toInt()
        buffer[i] = sampleVal.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
      }
      playPcm(buffer)
    }
  }

  // Play critical hit: heavy metallic clash + powerful double-impact
  fun playCritical() {
    if (!isSoundEnabled) return
    coroutineScope.launch {
      val durationMs = 320
      val numSamples = (sampleRate * (durationMs / 1000.0)).toInt()
      val buffer = ShortArray(numSamples)
      val random = Random(123)

      for (i in 0 until numSamples) {
        val t = i.toDouble() / sampleRate
        val progress = i.toDouble() / numSamples

        // Sharp metallic overtone (950Hz & 1420Hz) + low rumble (90Hz)
        val toneHigh = sin(2.0 * PI * 950.0 * t) * 0.4 + sin(2.0 * PI * 1420.0 * t) * 0.3
        val toneLow = sin(2.0 * PI * 85.0 * t) * 0.6
        val noise = (random.nextDouble() * 2.0 - 1.0) * 0.4 * exp(-12.0 * progress)
        val envelope = exp(-6.0 * progress)

        val combined = (toneHigh + toneLow + noise) * envelope
        val sampleVal = (combined * 0.65 * Short.MAX_VALUE).toInt()
        buffer[i] = sampleVal.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
      }
      playPcm(buffer)
    }
  }

  // Play Feather Shot (羽弾): ethereal magical wind chime arpeggio
  fun playFeatherShot() {
    if (!isSoundEnabled) return
    coroutineScope.launch {
      val durationMs = 400
      val numSamples = (sampleRate * (durationMs / 1000.0)).toInt()
      val buffer = ShortArray(numSamples)

      val freqs = doubleArrayOf(880.0, 1174.66, 1479.98, 1760.0) // A5, D6, F#6, A6

      for (i in 0 until numSamples) {
        val t = i.toDouble() / sampleRate
        val progress = i.toDouble() / numSamples

        var tone = 0.0
        for ((idx, f) in freqs.withIndex()) {
          val noteStart = idx * 0.06
          if (t >= noteStart) {
            val noteT = t - noteStart
            tone += sin(2.0 * PI * f * noteT) * exp(-10.0 * noteT)
          }
        }
        val envelope = (1.0 - progress) * 0.8
        val sampleVal = (tone * envelope * 0.50 * Short.MAX_VALUE).toInt()
        buffer[i] = sampleVal.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
      }
      playPcm(buffer)
    }
  }

  // Play Heavy Strike (重撃): deep crushing ground smash & iron impact
  fun playHeavyStrike() {
    if (!isSoundEnabled) return
    coroutineScope.launch {
      val durationMs = 450
      val numSamples = (sampleRate * (durationMs / 1000.0)).toInt()
      val buffer = ShortArray(numSamples)
      val random = Random(999)

      for (i in 0 until numSamples) {
        val t = i.toDouble() / sampleRate
        val progress = i.toDouble() / numSamples

        // Low heavy sweep 160Hz -> 40Hz
        val pitch = 160.0 * (1.0 - progress * 0.75)
        val bass = sin(2.0 * PI * pitch * t)
        val crunch = (random.nextDouble() * 2.0 - 1.0) * exp(-10.0 * progress) * 0.5
        val envelope = exp(-4.5 * progress)

        val sampleVal = ((bass * 0.8 + crunch * 0.4) * envelope * 0.65 * Short.MAX_VALUE).toInt()
        buffer[i] = sampleVal.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
      }
      playPcm(buffer)
    }
  }

  // Play Defend (防御): solid metal shield block resonance
  fun playDefend() {
    if (!isSoundEnabled) return
    coroutineScope.launch {
      val durationMs = 280
      val numSamples = (sampleRate * (durationMs / 1000.0)).toInt()
      val buffer = ShortArray(numSamples)

      for (i in 0 until numSamples) {
        val t = i.toDouble() / sampleRate
        val progress = i.toDouble() / numSamples

        // Shield resonance around 520Hz + 1040Hz
        val ring = sin(2.0 * PI * 520.0 * t) * 0.6 + sin(2.0 * PI * 1040.0 * t) * 0.4
        val envelope = exp(-7.0 * progress)

        val sampleVal = (ring * envelope * 0.55 * Short.MAX_VALUE).toInt()
        buffer[i] = sampleVal.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
      }
      playPcm(buffer)
    }
  }

  // Play Victory (勝利): uplifting triumphant fanfare
  fun playVictory() {
    if (!isSoundEnabled) return
    coroutineScope.launch {
      val durationMs = 850
      val numSamples = (sampleRate * (durationMs / 1000.0)).toInt()
      val buffer = ShortArray(numSamples)

      // C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
      val notes = listOf(
        Pair(0.00, 523.25),
        Pair(0.15, 659.25),
        Pair(0.30, 783.99),
        Pair(0.48, 1046.50)
      )

      for (i in 0 until numSamples) {
        val t = i.toDouble() / sampleRate
        var total = 0.0

        for ((startSec, freq) in notes) {
          if (t >= startSec) {
            val dt = t - startSec
            val env = exp(-3.5 * dt)
            total += (sin(2.0 * PI * freq * dt) + 0.3 * sin(2.0 * PI * freq * 2.0 * dt)) * env * 0.35
          }
        }

        val sampleVal = (total * 0.60 * Short.MAX_VALUE).toInt()
        buffer[i] = sampleVal.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
      }
      playPcm(buffer)
    }
  }

  // Play Defeat (敗北): descending sad cadence
  fun playDefeat() {
    if (!isSoundEnabled) return
    coroutineScope.launch {
      val durationMs = 800
      val numSamples = (sampleRate * (durationMs / 1000.0)).toInt()
      val buffer = ShortArray(numSamples)

      // Minor descending: G4 (392.0), Eb4 (311.13), C4 (261.63)
      val notes = listOf(
        Pair(0.00, 392.0),
        Pair(0.22, 311.13),
        Pair(0.44, 261.63)
      )

      for (i in 0 until numSamples) {
        val t = i.toDouble() / sampleRate
        var total = 0.0

        for ((startSec, freq) in notes) {
          if (t >= startSec) {
            val dt = t - startSec
            val env = exp(-4.0 * dt)
            total += sin(2.0 * PI * freq * dt) * env * 0.4
          }
        }

        val sampleVal = (total * 0.55 * Short.MAX_VALUE).toInt()
        buffer[i] = sampleVal.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
      }
      playPcm(buffer)
    }
  }

  private fun playPcm(buffer: ShortArray) {
    try {
      val audioTrack = AudioTrack.Builder()
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        .setAudioFormat(
          AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(sampleRate)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build()
        )
        .setBufferSizeInBytes(buffer.size * 2)
        .setTransferMode(AudioTrack.MODE_STATIC)
        .build()

      audioTrack.write(buffer, 0, buffer.size)
      audioTrack.play()

      // Release after playback finishes
      coroutineScope.launch {
        val sleepMs = ((buffer.size.toDouble() / sampleRate) * 1000).toLong() + 100
        kotlinx.coroutines.delay(sleepMs)
        try {
          audioTrack.stop()
          audioTrack.release()
        } catch (_: Exception) {}
      }
    } catch (_: Exception) {
      // Audio playback fallback
    }
  }
}
