package com.example.raidboss.model

object RaidSkillCatalog {

    val PLAYER_NORMAL_ATTACK = PlayerSkill(
        id = "normal_attack",
        name = "烈風滅斬",
        shortName = "通常攻撃",
        description = "剣気の斬撃を放つ基本攻撃。MPを消費せず、必殺技ゲージ(TP)を大きく蓄積する。",
        mpCost = 0,
        tpGain = 22,
        baseDamageMultiplier = 1.0f,
        breakGaugeBonus = 12f,
        effectType = EffectType.SLASH
    )

    val PLAYER_SKILL_ICE = PlayerSkill(
        id = "ice_dragon",
        name = "極光氷竜波",
        shortName = "氷竜波",
        description = "冷気刃を打ち出し極寒の竜巻を発生させる。第1形態の弱点属性。ブレイクゲージを大きく削る。",
        mpCost = 25,
        tpGain = 25,
        baseDamageMultiplier = 2.2f,
        breakGaugeBonus = 32f,
        effectType = EffectType.ICE_STRIKE
    )

    val PLAYER_SKILL_HOLY = PlayerSkill(
        id = "holy_smite",
        name = "聖光天破断",
        shortName = "天破断",
        description = "聖なる光の刃を叩き込む強撃。第2形態の弱点属性。ボスの防御力を2ターンの間低下させる。",
        mpCost = 30,
        tpGain = 25,
        baseDamageMultiplier = 2.4f,
        breakGaugeBonus = 28f,
        effectType = EffectType.HOLY_LIGHT
    )

    val PLAYER_SKILL_GUARD = PlayerSkill(
        id = "sacred_guard",
        name = "神聖の鉄壁",
        shortName = "鉄壁展開",
        description = "聖騎士の加護障壁を展開。1400のシールド獲得 + HP600回復。次ターンの被ダメージを半減する。",
        mpCost = 15,
        tpGain = 18,
        baseDamageMultiplier = 0f,
        breakGaugeBonus = 0f,
        effectType = EffectType.GUARD_SHIELD
    )

    val PLAYER_ULTIMATE = PlayerSkill(
        id = "ultimate_burst",
        name = "神技・崩天覇皇滅殺刃",
        shortName = "必殺技",
        description = "TP100%解放！神速の7連斬撃で巨悪を断ち切る究極奥義。超絶大ダメージ＋ブレイクゲージ+50%！",
        mpCost = 0,
        tpGain = 0,
        baseDamageMultiplier = 7.5f,
        breakGaugeBonus = 50f,
        effectType = EffectType.PLAYER_ULTIMATE_BURST,
        isUltimate = true
    )

    // Phase 1 Boss Skills
    val BOSS_P1_CLEAVE = BossSkill(
        id = "p1_cleave",
        name = "巨腕薙ぎ払い",
        description = "巨大な黒曜石の腕を豪快に振り抜き粉砕する。",
        basePower = 750,
        effectType = EffectType.BOSS_CLAW
    )

    val BOSS_P1_SMOKE = BossSkill(
        id = "p1_smoke",
        name = "黒煙焼夷噴流",
        description = "炉心から黒煙と火の粉を撒き散らす高熱攻撃。",
        basePower = 950,
        effectType = EffectType.BOSS_BLAST
    )

    val BOSS_P1_OVERHEAT = BossSkill(
        id = "p1_charge",
        name = "炉心過熱チャージ",
        description = "胸部の魔導炉が赤熱化！次ターンに破滅の一撃を放つ予兆。",
        basePower = 0,
        isChargeAttack = true,
        chargeTurns = 1,
        warningMessage = "⚠️ 警告：古代巨兵が魔導炉を最大過熱！次ターン【破滅の紅蓮炉】発動！"
    )

    val BOSS_P1_MELTDOWN = BossSkill(
        id = "p1_meltdown",
        name = "破滅の紅蓮炉",
        description = "限界突破した熱エネルギーを一斉放射する超絶破壊光線！",
        basePower = 2400,
        effectType = EffectType.BOSS_ULTIMATE_CATACLYSM
    )

    // Phase 2 Boss Skills
    val BOSS_P2_CLAW = BossSkill(
        id = "p2_claw",
        name = "獄炎魔翼爪",
        description = "真紅の翼爪で空間ごと引き裂く猛撃。",
        basePower = 1250,
        effectType = EffectType.BOSS_CLAW
    )

    val BOSS_P2_ROAR = BossSkill(
        id = "p2_roar",
        name = "冥府真覚醒咆哮",
        description = "世界の理を揺るがす咆哮。衝撃波と共にボスの攻撃力が上昇！",
        basePower = 900,
        effectType = EffectType.BOSS_BLAST
    )

    val BOSS_P2_CATACLYSM = BossSkill(
        id = "p2_cataclysm",
        name = "天火滅亡崩壊",
        description = "天空から黒炎の隕石群を降らせ大地を熔解させる。",
        basePower = 1850,
        effectType = EffectType.BOSS_BLAST
    )

    val BOSS_P2_VOID_CHARGE = BossSkill(
        id = "p2_void_charge",
        name = "滅びの魔光収束",
        description = "紫黒の虚無エネルギーが口元に極限凝縮！次ターン即死級奥義！",
        basePower = 0,
        isChargeAttack = true,
        chargeTurns = 1,
        warningMessage = "⚠️⚠️ 絶望的警告：【神滅の虚無閃】カウントダウン開始！防御を固めよ！"
    )

    val BOSS_P2_VOID_BEAM = BossSkill(
        id = "p2_void_beam",
        name = "神滅の虚無閃",
        description = "すべてを無に帰す虚無の閃光が直撃！",
        basePower = 3400,
        effectType = EffectType.BOSS_ULTIMATE_CATACLYSM
    )
}
