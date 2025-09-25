package com.testuvccam5

import android.content.Context
import android.graphics.SurfaceTexture
import android.util.AttributeSet
import android.util.Log
import android.view.Surface
import android.view.TextureView
import com.jiangdg.usb.USBMonitor
import com.jiangdg.uvc.UVCCamera

class UVCCameraView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : TextureView(context, attrs, defStyleAttr), TextureView.SurfaceTextureListener {
    
    companion object {
        private const val TAG = "UVCCameraView"
        private const val DEFAULT_WIDTH = 640
        private const val DEFAULT_HEIGHT = 480
    }
    
    private var uvcCamera: UVCCamera? = null
    private var surface: Surface? = null
    private var isActive = false
    private var previewWidth = DEFAULT_WIDTH
    private var previewHeight = DEFAULT_HEIGHT
    private var aspectRatio = previewWidth.toFloat() / previewHeight.toFloat()
    
    init {
        surfaceTextureListener = this
    }
    
    override fun onSurfaceTextureAvailable(surfaceTexture: SurfaceTexture, width: Int, height: Int) {
        Log.d(TAG, "Surface texture available: ${width}x${height}")
        surface = Surface(surfaceTexture)
    }
    
    override fun onSurfaceTextureSizeChanged(surfaceTexture: SurfaceTexture, width: Int, height: Int) {
        Log.d(TAG, "Surface texture size changed: ${width}x${height}")
    }
    
    override fun onSurfaceTextureDestroyed(surfaceTexture: SurfaceTexture): Boolean {
        Log.d(TAG, "Surface texture destroyed")
        stopPreview()
        surface?.release()
        surface = null
        return true
    }
    
    override fun onSurfaceTextureUpdated(surfaceTexture: SurfaceTexture) {
        // Called when the surface texture has been updated
    }
    
    fun startPreview(camera: UVCCamera) {
        Log.d(TAG, "Starting preview with UVC camera")
        
        try {
            this.uvcCamera = camera
            surface?.let { surf ->
                // Get supported sizes from camera
                val supportedSizes = camera.supportedSizeList
                Log.d(TAG, "Supported sizes: $supportedSizes")
                
                // Choose best size (prefer 640x480 or closest)
                val bestSize = chooseBestSize(supportedSizes)
                previewWidth = bestSize.first
                previewHeight = bestSize.second
                aspectRatio = previewWidth.toFloat() / previewHeight.toFloat()
                
                Log.d(TAG, "Setting preview size: ${previewWidth}x${previewHeight}")
                
                // Set preview size
                camera.setPreviewSize(previewWidth, previewHeight, 1, 31, UVCCamera.FRAME_FORMAT_YUYV, 1.0f)
                
                // Set preview display
                camera.setPreviewDisplay(surf)
                
                // Start preview
                camera.startPreview()
                isActive = true
                
                Log.d(TAG, "UVC camera preview started successfully")
                
                // Request layout update to maintain aspect ratio
                post {
                    requestLayout()
                }
            } ?: run {
                Log.e(TAG, "Surface is null, cannot start preview")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting preview", e)
            isActive = false
        }
    }
    
    fun stopPreview() {
        Log.d(TAG, "Stopping preview")
        
        try {
            if (isActive) {
                uvcCamera?.stopPreview()
                isActive = false
                Log.d(TAG, "UVC camera preview stopped")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping preview", e)
        }
        
        uvcCamera = null
    }
    
    private fun chooseBestSize(supportedSizes: List<android.util.Size>): Pair<Int, Int> {
        // Prefer 640x480, or find closest match
        val preferred = listOf(
            Pair(640, 480),
            Pair(320, 240),
            Pair(1280, 720),
            Pair(800, 600)
        )
        
        for (preferredSize in preferred) {
            val match = supportedSizes.find { 
                it.width == preferredSize.first && it.height == preferredSize.second 
            }
            if (match != null) {
                return Pair(match.width, match.height)
            }
        }
        
        // Fall back to first available size
        return if (supportedSizes.isNotEmpty()) {
            Pair(supportedSizes[0].width, supportedSizes[0].height)
        } else {
            Pair(DEFAULT_WIDTH, DEFAULT_HEIGHT)
        }
    }
    
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec)
        
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val height = MeasureSpec.getSize(heightMeasureSpec)
        
        val newWidth: Int
        val newHeight: Int
        
        if (width < height * aspectRatio) {
            newWidth = width
            newHeight = (width / aspectRatio).toInt()
        } else {
            newWidth = (height * aspectRatio).toInt()
            newHeight = height
        }
        
        setMeasuredDimension(newWidth, newHeight)
    }
    
    fun getPreviewWidth() = previewWidth
    fun getPreviewHeight() = previewHeight
    fun isPreviewActive() = isActive
}