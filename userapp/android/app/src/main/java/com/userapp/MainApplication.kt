package com.userapp

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.google.firebase.FirebaseApp
import com.swmansion.gesturehandler.RNGestureHandlerPackage
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage
import com.th3rdwave.safeareacontext.SafeAreaContextPackage
import com.swmansion.rnscreens.RNScreensPackage
import com.BV.LinearGradient.LinearGradientPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
            PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
            // AsyncStorage is autolinked - don't add manually to avoid conflicts
            add(VibrationPackage())
            add(DevMenuPackage())
            add(ShakeDetectionServicePackage())
            // Manually add gesture handler package to ensure it's registered
            add(RNGestureHandlerPackage())
            // Manually add SafeAreaContext package to ensure ViewManagers are registered
            add(SafeAreaContextPackage())
            // Manually add Screens package to ensure ViewManagers are registered
            add(RNScreensPackage())
            // Manually add LinearGradient package to ensure ViewManagers are registered
            add(LinearGradientPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    try {
      if (FirebaseApp.getApps(this).isEmpty()) {
        FirebaseApp.initializeApp(this)
      }
    } catch (exception: IllegalStateException) {
      Log.w("MainApplication", "Firebase not configured: ${exception.message}")
    } catch (exception: Exception) {
      Log.e("MainApplication", "Failed to initialize Firebase", exception)
    }
    loadReactNative(this)
  }
}
