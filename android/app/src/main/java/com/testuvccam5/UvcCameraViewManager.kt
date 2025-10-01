package com.testuvccam5

import android.view.TextureView
import android.view.Surface
import android.graphics.SurfaceTexture
import android.widget.FrameLayout
import android.view.ViewGroup
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.bridge.ReactApplicationContext

class UvcCameraViewManager(private val appContext: ReactApplicationContext) : SimpleViewManager<FrameLayout>() {
    override fun getName(): String = "UvcCameraView"

    override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
        // Use a FrameLayout container so RN can safely apply background/color props
        val container = FrameLayout(reactContext)
        val tv = TextureView(reactContext)
        val lp = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        tv.layoutParams = lp
        container.addView(tv)

        tv.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
            override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
                val surfaceObj = Surface(surface)
                // Inform module about the surface
                val module = appContext.getNativeModule(UvcCameraModule::class.java)
                module?.setPreviewSurface(surfaceObj)
            }

            override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {}

            override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
                val module = appContext.getNativeModule(UvcCameraModule::class.java)
                module?.setPreviewSurface(null)
                return true
            }

            override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {}
        }

        return container
    }

    override fun onDropViewInstance(view: FrameLayout) {
        super.onDropViewInstance(view)
        // Clean up: remove surface reference from native module
        val child = if (view.childCount > 0) view.getChildAt(0) else null
        if (child is TextureView) {
            appContext.getNativeModule(UvcCameraModule::class.java)?.setPreviewSurface(null)
            child.surfaceTextureListener = null
        }
    }
}
