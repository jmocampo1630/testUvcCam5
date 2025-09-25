package com.testuvccam5

import android.util.Log
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class UVCCameraViewManager : SimpleViewManager<UVCCameraView>() {
    
    companion object {
        private const val TAG = "UVCCameraViewManager"
        const val REACT_CLASS = "UVCCameraView"
    }
    
    override fun getName() = REACT_CLASS
    
    override fun createViewInstance(reactContext: ThemedReactContext): UVCCameraView {
        Log.d(TAG, "Creating UVCCameraView instance")
        return UVCCameraView(reactContext)
    }
    
    override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put("onCameraReady", MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", "onCameraReady")))
            .put("onCameraError", MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", "onCameraError")))
            .build()
    }
    
    override fun receiveCommand(root: UVCCameraView, commandId: String, args: ReadableArray?) {
        when (commandId) {
            "startPreview" -> {
                Log.d(TAG, "Received startPreview command")
                // Will be handled by the module
            }
            "stopPreview" -> {
                Log.d(TAG, "Received stopPreview command")
                root.stopPreview()
            }
        }
    }
    
    override fun getCommandsMap(): Map<String, Int> {
        return MapBuilder.of(
            "startPreview", 1,
            "stopPreview", 2
        )
    }
}