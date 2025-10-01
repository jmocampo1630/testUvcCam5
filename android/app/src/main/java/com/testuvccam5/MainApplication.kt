package com.testuvccam5

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(UvcCameraPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()

    // Defensive global handler: swallow SecurityException thrown from background
    // threads (e.g., USBMonitor threads calling UsbDevice.getSerialNumber without
    // permission) to avoid crashing the whole process. We still log the event.
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      if (throwable is SecurityException) {
        // Log and swallow SecurityException coming from native USB threads.
        // Use android.util.Log to ensure visibility in logcat.
        try {
          android.util.Log.w("MainApplication", "Swallowed SecurityException in thread " + thread.name, throwable)
        } catch (ignored: Throwable) {
        }
        return@setDefaultUncaughtExceptionHandler
      }
      // For other exceptions, delegate to default handler so they are still visible.
      val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
      defaultHandler?.uncaughtException(thread, throwable)
    }

    loadReactNative(this)
  }
}
