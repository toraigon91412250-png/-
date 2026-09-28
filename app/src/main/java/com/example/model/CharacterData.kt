package com.example.model

import androidx.annotation.DrawableRes
import com.example.R

/**
 * Character Definition Data
 */
data class CharacterDef(
  val id: String,
  val name: String,
  val title: String,
  val maxHp: Int,
  val attack: Int,
  val defense: Int,
  val speed: Int,
  val evasionRate: Float, // 固有の回避率 (いれーな: 25%, カイザー: 10%)
  val passiveName: String,
  val passiveDescription: String,
  val specialSkillName: String,
  val specialSkillDescription: String,
  val specialSkillDamage: Int,
  val specialSkillCooldown: Int, // e.g. 3 turns or 4 turns
  val statusAilmentName: String,
  val statusAilmentDescription: String,
  val ultimateSkillName: String,
  val ultimateSkillDamage: Int, // 500
  val ultimateSkillDescription: String,
  @DrawableRes val portraitRes: Int,
  val primaryColorHex: Long,
  val secondaryColorHex: Long,
  val attackSlogan: String,
  val specialSlogan: String,
  val ultimateSlogan: String,
  val defeatSlogan: String,
  val victorySlogan: String
)

object CharacterRegistry {
  val IRENA = CharacterDef(
    id = "irena",
    name = "いれーな",
    title = "白羽の風術士",
    maxHp = 1000,
    attack = 180,
    defense = 100,
    speed = 120,
    evasionRate = 0.25f, // 回避率 25%
    passiveName = "先読み",
    passiveDescription = "相手より先に行動するターン、通常攻撃ダメージ+20（クリティカル時は加算後に1.5倍）",
    specialSkillName = "羽弾",
    specialSkillDescription = "敵に350ダメージを与える。3ターンに1回使用可能。ゲージ+1。命中時100%で「出血」付与。",
    specialSkillDamage = 350,
    specialSkillCooldown = 3,
    statusAilmentName = "出血",
    statusAilmentDescription = "3ターン持続。ターン開始時50ダメージ、速度-20、防御-20",
    ultimateSkillName = "羽嵐",
    ultimateSkillDamage = 500,
    ultimateSkillDescription = "ゲージ3消費。敵に500ダメージの必殺技を放つ。",
    portraitRes = R.drawable.img_irena,
    primaryColorHex = 0xFF7E57C2,
    secondaryColorHex = 0xFF64FFDA,
    attackSlogan = "「風よ、刃となって舞い散れ！」",
    specialSlogan = "「光り輝く羽の雨――『羽弾』！」",
    ultimateSlogan = "「すべてを吹き飛ばす暴風――『羽嵐』！」",
    defeatSlogan = "「私の羽が……散ってしまった……」",
    victorySlogan = "「速さこそが勝利の鍵ね！」"
  )

  val KAISER = CharacterDef(
    id = "kaiser",
    name = "カイザー",
    title = "鋼鉄の覇王",
    maxHp = 1200,
    attack = 160,
    defense = 140,
    speed = 80,
    evasionRate = 0.10f, // 回避率 10%
    passiveName = "重装",
    passiveDescription = "通常攻撃を受けたとき、最終ダメージを20軽減（20未満なら0）。特殊技・必殺技は対象外。",
    specialSkillName = "重撃",
    specialSkillDescription = "敵に300ダメージを与える。4ターンに1回使用可能。ゲージ+1。命中時100%で「重圧」付与。",
    specialSkillDamage = 300,
    specialSkillCooldown = 4,
    statusAilmentName = "重圧",
    statusAilmentDescription = "2ターン持続。速度-25、攻撃力-25",
    ultimateSkillName = "超重撃",
    ultimateSkillDamage = 500,
    ultimateSkillDescription = "ゲージ3消費。敵に500ダメージの超強烈な一撃を叩き込む。",
    portraitRes = R.drawable.img_kaiser,
    primaryColorHex = 0xFFFFB300,
    secondaryColorHex = 0xFFFF5252,
    attackSlogan = "「小細工など叩き潰すのみ！」",
    specialSlogan = "「大地を揺るがす我が一撃――『重撃』！」",
    ultimateSlogan = "「天地を両断する必滅の鉄槌――『超重撃』！」",
    defeatSlogan = "「ぬうっ……我が鉄壁が砕かれるとは……」",
    victorySlogan = "「圧倒的な力と防御の前に跪くがよい！」"
  )

  val ALL_CHARACTERS = listOf(IRENA, KAISER)

  fun getById(id: String): CharacterDef {
    return ALL_CHARACTERS.firstOrNull { it.id == id } ?: IRENA
  }
}
