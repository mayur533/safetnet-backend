package com.userapp

import android.view.KeyEvent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "userapp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   * Disabled New Architecture due to ProgressBar compatibility issues with RefreshControl
   * and TurboModule registry errors with gesture handler
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    // Enable New Architecture for AsyncStorage TurboModule support
    // AsyncStorage requires New Architecture to work properly
    val fabricEnabled = true // Enable New Architecture for TurboModule support
    return DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
  }

  /**
   * Override onKeyUp to prevent dev menu from opening when shake detection is active
   * KeyEvent.KEYCODE_MENU (82) is the keycode for the menu button that opens dev menu
   */
  override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
    // If shake detection is active, prevent dev menu from opening
    if (keyCode == KeyEvent.KEYCODE_MENU && DevMenuModule.isShakeDetectionActive()) {
      return true // Consume the event, preventing dev menu from opening
    }
    return super.onKeyUp(keyCode, event)
  }
}
