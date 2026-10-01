package com.example

import androidx.compose.ui.test.junit4.createComposeRule
import com.example.vfx.model.AuthorityType
import com.example.vfx.render.FeatherSystem
import com.example.vfx.render.SwordSystem
import com.example.vfx.ui.VfxStageScreen
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ExampleUnitTest {
  @get:Rule
  val composeTestRule = createComposeRule()

  @Test
  fun testComposeScreenRenders() {
    composeTestRule.setContent {
      VfxStageScreen()
    }
    composeTestRule.waitForIdle()
  }

  @Test
  fun testAuthorityTypesExist() {
    val types = AuthorityType.values()
    assertTrue(types.any { it.name == "ALL_GODS" })
    assertTrue(types.any { it.name == "RUIN" })
    assertTrue(types.any { it.name == "FUSION_CATACLYSM" })
  }

  @Test
  fun testVfxSystemsInitialization() {
    val featherSystem = FeatherSystem()
    assertNotNull(featherSystem)

    val swordSystem = SwordSystem()
    assertEquals(11, swordSystem.swords.size)
    assertTrue(swordSystem.swords.any { it.isMasterSword })

    val clashSystem = com.example.vfx.render.OmnipotentClashSystem()
    assertNotNull(clashSystem)
  }
}
