package com.testuvccam5

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.NativeViewHierarchyManager
import com.facebook.react.uimanager.UIBlock
import com.facebook.react.uimanager.UIManagerModule
import com.jiangdg.usb.USBMonitor
import com.jiangdg.uvc.UVCCamera
import com.jiangdg.utils.HandlerThreadHandler
import com.jiangdg.utils.BuildCheck

class UVCCameraModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "UVCCameraModule"
    private var usbManager: UsbManager? = null
    private var usbMonitor: USBMonitor? = null
    private var uvcCamera: UVCCamera? = null
    private val ACTION_USB_PERMISSION = "com.testuvccam5.USB_PERMISSION"
    private var isInitialized = false
    private var isStreaming = false
    private var currentStreamingDevice: String? = null
    private var currentCameraView: UVCCameraView? = null
    
    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    synchronized(this) {
                        val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                        }
                        
                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            device?.let {
                                Log.d(TAG, "USB permission granted for device: ${it.deviceName}")
                                sendEvent("onUSBPermissionGranted", createDeviceMap(it))
                            }
                        } else {
                            Log.d(TAG, "USB permission denied")
                            sendEvent("onUSBPermissionDenied", null)
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    device?.let {
                        Log.d(TAG, "USB device attached: ${it.deviceName}")
                        sendEvent("onUSBDeviceAttached", createDeviceMap(it))
                    }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    device?.let {
                        Log.d(TAG, "USB device detached: ${it.deviceName}")
                        sendEvent("onUSBDeviceDetached", createDeviceMap(it))
                    }
                }
            }
        }
    }

    init {
        try {
            usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
            
            // Register USB broadcast receiver
            val filter = IntentFilter().apply {
                addAction(ACTION_USB_PERMISSION)
                addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
                addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                reactContext.registerReceiver(usbReceiver, filter)
            }
            
            // Try to initialize USBMonitor with error handling
            initializeUSBMonitor()
            
            Log.d(TAG, "UVCCameraModule initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize UVCCameraModule", e)
        }
    }

    private fun initializeUSBMonitor() {
        try {
            Log.d(TAG, "Attempting to initialize USBMonitor from AAR...")
            Log.d(TAG, "Checking if USBMonitor class is available...")
            
            // Test if the class is available from jiangdg library
            val usbMonitorClass = Class.forName("com.jiangdg.usb.USBMonitor")
            Log.d(TAG, "USBMonitor class found: ${usbMonitorClass.name}")
            
            val uvcCameraClass = Class.forName("com.jiangdg.uvc.UVCCamera")
            Log.d(TAG, "UVCCamera class found: ${uvcCameraClass.name}")
            
            // Initialize USBMonitor
            Log.d(TAG, "Creating USBMonitor instance...")
            usbMonitor = USBMonitor(reactApplicationContext, object : USBMonitor.OnDeviceConnectListener {
                override fun onAttach(device: UsbDevice?) {
                    device?.let {
                        Log.d(TAG, "USBMonitor: Device attached - ${it.deviceName}")
                        sendEvent("onUVCDeviceAttached", createDeviceMap(it))
                    }
                }

                override fun onConnect(device: UsbDevice?, ctrlBlock: USBMonitor.UsbControlBlock?, createNew: Boolean) {
                    device?.let {
                        Log.d(TAG, "USBMonitor: Device connected - ${it.deviceName}")
                        
                        try {
                            // Create UVC camera for streaming
                            ctrlBlock?.let { controlBlock ->
                                Log.d(TAG, "Creating UVCCamera instance...")
                                uvcCamera = UVCCamera()
                                uvcCamera?.open(controlBlock)
                                
                                Log.d(TAG, "UVC Camera opened successfully for device: ${it.deviceName}")
                                sendEvent("onUVCCameraReady", createDeviceMap(it))
                                
                                // If we have a camera view, start preview automatically
                                currentCameraView?.let { cameraView ->
                                    uvcCamera?.let { camera ->
                                        cameraView.startPreview(camera)
                                        isStreaming = true
                                        currentStreamingDevice = it.deviceName
                                        Log.d(TAG, "Started preview on camera view")
                                    }
                                }
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to open UVC camera", e)
                            sendEvent("onUVCCameraError", Arguments.createMap().apply {
                                putString("error", e.message)
                                putString("deviceName", it.deviceName)
                            })
                        }
                        
                        sendEvent("onUVCDeviceConnected", createDeviceMap(it))
                    }
                }

                override fun onDisconnect(device: UsbDevice?, ctrlBlock: USBMonitor.UsbControlBlock?) {
                    device?.let {
                        Log.d(TAG, "USBMonitor: Device disconnected - ${it.deviceName}")
                        
                        // Stop preview and clean up
                        currentCameraView?.stopPreview()
                        uvcCamera?.close()
                        uvcCamera = null
                        isStreaming = false
                        currentStreamingDevice = null
                        
                        sendEvent("onUVCDeviceDisconnected", createDeviceMap(it))
                    }
                }

                override fun onDetach(device: UsbDevice?) {
                    device?.let {
                        Log.d(TAG, "USBMonitor: Device detached - ${it.deviceName}")
                        sendEvent("onUVCDeviceDetached", createDeviceMap(it))
                    }
                }

                override fun onCancel(device: UsbDevice?) {
                    device?.let {
                        Log.d(TAG, "USBMonitor: Device cancelled - ${it.deviceName}")
                        sendEvent("onUVCDeviceCancelled", createDeviceMap(it))
                    }
                }
            })
            
            Log.d(TAG, "USBMonitor instance created successfully")
            isInitialized = true
            Log.d(TAG, "USBMonitor initialized successfully from AAR")
        } catch (e: ClassNotFoundException) {
            Log.e(TAG, "AAR classes not found: ${e.message}", e)
            Log.e(TAG, "This indicates the AAR file is not properly integrated")
            isInitialized = false
        } catch (e: NoClassDefFoundError) {
            Log.e(TAG, "AAR class definition error: ${e.message}", e)
            Log.e(TAG, "This indicates missing dependencies or library loading issues")
            isInitialized = false
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "Native library loading error: ${e.message}", e)
            Log.e(TAG, "This indicates native .so files are not properly loaded")
            isInitialized = false
        } catch (e: Exception) {
            Log.e(TAG, "General initialization error: ${e.message}", e)
            isInitialized = false
        }
    }

    override fun getName(): String = "UVCCameraModule"

    @ReactMethod
    fun startUSBMonitoring(promise: Promise) {
        try {
            if (!isInitialized) {
                promise.reject("USB_MONITOR_ERROR", "Module not properly initialized")
                return
            }
            
            if (usbMonitor != null) {
                // Use UVC library's USBMonitor if available
                usbMonitor?.register()
                Log.d(TAG, "UVC USB monitoring started")
                promise.resolve("UVC USB monitoring started successfully")
            } else {
                // Fall back to standard USB monitoring
                Log.d(TAG, "Using standard USB monitoring (UVC USBMonitor not available)")
                promise.resolve("Standard USB monitoring active")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start USB monitoring", e)
            promise.reject("USB_MONITOR_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopUSBMonitoring(promise: Promise) {
        try {
            if (usbMonitor != null) {
                usbMonitor?.unregister()
                Log.d(TAG, "UVC USB monitoring stopped")
                promise.resolve("UVC USB monitoring stopped successfully")
            } else {
                Log.d(TAG, "Standard USB monitoring stopped")
                promise.resolve("Standard USB monitoring stopped successfully")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop USB monitoring", e)
            promise.reject("USB_MONITOR_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getConnectedUVCDevices(promise: Promise) {
        try {
            val deviceArray = Arguments.createArray()
            usbManager?.deviceList?.values?.forEach { device ->
                if (isUVCDevice(device)) {
                    deviceArray.pushMap(createDeviceMap(device))
                }
            }
            promise.resolve(deviceArray)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get connected UVC devices", e)
            promise.reject("GET_DEVICES_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestUSBPermission(deviceName: String, promise: Promise) {
        try {
            val device = usbManager?.deviceList?.values?.find { it.deviceName == deviceName }
            if (device == null) {
                promise.reject("DEVICE_NOT_FOUND", "Device with name $deviceName not found")
                return
            }

            if (usbManager?.hasPermission(device) == true) {
                Log.d(TAG, "Device ${device.deviceName} already has permission")
                promise.resolve("Permission already granted")
                return
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                0
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                0,
                Intent(ACTION_USB_PERMISSION),
                flags
            )
            
            Log.d(TAG, "Requesting permission for device: ${device.deviceName}")
            usbManager?.requestPermission(device, pendingIntent)
            promise.resolve("Permission request sent")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request USB permission", e)
            promise.reject("PERMISSION_REQUEST_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun hasUSBPermission(deviceName: String, promise: Promise) {
        try {
            val device = usbManager?.deviceList?.values?.find { it.deviceName == deviceName }
            if (device == null) {
                promise.reject("DEVICE_NOT_FOUND", "Device with name $deviceName not found")
                return
            }

            val hasPermission = usbManager?.hasPermission(device) == true
            Log.d(TAG, "Permission check for ${device.deviceName}: $hasPermission")
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check USB permission", e)
            promise.reject("PERMISSION_CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startVideoStream(viewTag: Int, promise: Promise) {
        try {
            Log.d(TAG, "Starting video stream for view tag: $viewTag")
            
            val uiManager = reactApplicationContext.getNativeModule(UIManagerModule::class.java)
            val view = uiManager?.resolveView(viewTag)
            if (view is UVCCameraView) {
                currentCameraView = view
                
                uvcCamera?.let { camera ->
                    view.startPreview(camera)
                    isStreaming = true
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("success", true)
                        putString("message", "Video stream started")
                        putString("deviceName", currentStreamingDevice)
                    })
                    Log.d(TAG, "Video stream started successfully")
                } ?: run {
                    promise.reject("NO_CAMERA", "No UVC camera available")
                    Log.e(TAG, "No UVC camera available for streaming")
                }
            } else {
                promise.reject("INVALID_VIEW", "View is not a UVCCameraView")
                Log.e(TAG, "Invalid view type for video streaming")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start video stream", e)
            promise.reject("STREAM_ERROR", "Failed to start video stream: ${e.message}")
        }
    }

    @ReactMethod
    fun stopVideoStream(promise: Promise) {
        try {
            Log.d(TAG, "Stopping video stream")
            
            currentCameraView?.let { view ->
                view.stopPreview()
            }
            
            uvcCamera?.close()
            uvcCamera = null
            
            // Update streaming status
            isStreaming = false
            val stoppedDevice = currentStreamingDevice
            currentStreamingDevice = null
            
            // Send stop event
            if (stoppedDevice != null) {
                val deviceInfo = Arguments.createMap().apply {
                    putString("deviceName", stoppedDevice)
                    putString("status", "stopped")
                }
                sendEvent("onCameraStopped", deviceInfo)
            }
            
            promise.resolve(Arguments.createMap().apply {
                putBoolean("success", true)
                putString("message", "Video stream stopped")
                putString("deviceName", stoppedDevice)
            })
            Log.d(TAG, "Video stream stopped successfully for device: $stoppedDevice")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop video stream", e)
            promise.reject("STREAM_STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getStreamingStatus(promise: Promise) {
        try {
            val statusMap = Arguments.createMap().apply {
                putBoolean("isStreaming", isStreaming)
                putString("streamingDevice", currentStreamingDevice)
                putBoolean("hasCamera", uvcCamera != null)
                putBoolean("hasView", currentCameraView != null)
                putBoolean("isInitialized", isInitialized)
            }
            promise.resolve(statusMap)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get streaming status", e)
            promise.reject("STREAM_STATUS_ERROR", e.message, e)
        }
    }

    private fun isUVCDevice(device: UsbDevice): Boolean {
        // Check if device has Video interface class (class 14 = Video)
        for (i in 0 until device.interfaceCount) {
            val usbInterface = device.getInterface(i)
            if (usbInterface.interfaceClass == 14) { // USB_CLASS_VIDEO
                return true
            }
        }
        return false
    }

    private fun createDeviceMap(device: UsbDevice): WritableMap {
        val deviceMap = Arguments.createMap()
        deviceMap.putString("deviceName", device.deviceName)
        deviceMap.putInt("vendorId", device.vendorId)
        deviceMap.putInt("productId", device.productId)
        deviceMap.putString("deviceClass", device.deviceClass.toString())
        deviceMap.putString("deviceSubclass", device.deviceSubclass.toString())
        deviceMap.putString("deviceProtocol", device.deviceProtocol.toString())
        deviceMap.putInt("interfaceCount", device.interfaceCount)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            deviceMap.putString("manufacturerName", device.manufacturerName ?: "Unknown")
            deviceMap.putString("productName", device.productName ?: "Unknown")
        }
        
        return deviceMap
    }

    private fun sendEvent(eventName: String, params: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            reactApplicationContext.unregisterReceiver(usbReceiver)
            if (isInitialized) {
                usbMonitor?.unregister()
            }
            uvcCamera?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error during cleanup", e)
        }
    }
}