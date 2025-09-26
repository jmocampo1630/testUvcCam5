# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Keep essential classes for UVC camera functionality
-keep class com.serenegiant.uvccamera.widget.IAspectRatioView { *; }
-keep class com.serenegiant.uvccamera.widget.UVCCameraTextureView { *; }
-keep class com.serenegiant.utils.FpsCounter { *; }

# Keep UVC camera native interface classes
-keep class com.serenegiant.uvccamera.** { *; }
-keep class com.serenegiant.common.** { *; }
-keep class com.serenegiant.widget.** { *; }

# Handle duplicate IAspectRatioView class by keeping only the one from uvccamera
-keep class com.serenegiant.widget.IAspectRatioView { *; }
-dontwarn com.serenegiant.usbcameracommon.**
