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

class SimpleUVCCameraModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "SimpleUVCCameraModule"
    private var usbManager: UsbManager? = null
    private val ACTION_USB_PERMISSION = "com.testuvccam5.USB_PERMISSION"
    private var isMonitoring = false
    
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
                        if (isUVCDevice(it)) {
                            sendEvent("onUVCDeviceAttached", createDeviceMap(it))
                        }
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
                        if (isUVCDevice(it)) {
                            sendEvent("onUVCDeviceDetached", createDeviceMap(it))
                        }
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
            
            Log.d(TAG, "SimpleUVCCameraModule initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize SimpleUVCCameraModule", e)
        }
    }

    override fun getName(): String = "UVCCameraModule"

    @ReactMethod
    fun startUSBMonitoring(promise: Promise) {
        try {
            isMonitoring = true
            Log.d(TAG, "USB monitoring started (simple mode)")
            promise.resolve("USB monitoring started successfully (simple mode)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start USB monitoring", e)
            promise.reject("USB_MONITOR_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopUSBMonitoring(promise: Promise) {
        try {
            isMonitoring = false
            Log.d(TAG, "USB monitoring stopped")
            promise.resolve("USB monitoring stopped successfully")
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
            Log.d(TAG, "Found ${deviceArray.size()} UVC devices")
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
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check USB permission", e)
            promise.reject("PERMISSION_CHECK_ERROR", e.message, e)
        }
    }

    private fun isUVCDevice(device: UsbDevice): Boolean {
        try {
            // Check if device has Video interface class (class 14 = Video)
            for (i in 0 until device.interfaceCount) {
                val usbInterface = device.getInterface(i)
                if (usbInterface.interfaceClass == 14) { // USB_CLASS_VIDEO
                    return true
                }
            }
            
            // Additional check for common UVC vendor IDs
            val commonUVCVendorIds = listOf(
                0x046d, // Logitech
                0x0ac8, // Z-Star
                0x1415, // Nam Tai E&E Products
                0x05a3, // ARC International
                0x174f, // Syntek
                0x13d3, // IMC Networks
                0x0c45, // Microdia
                0x090c, // Silicon Motion
                0x1e4e, // Cubeternet
                0x0bda  // Realtek
            )
            
            return commonUVCVendorIds.contains(device.vendorId)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if device is UVC", e)
            return false
        }
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
        } catch (e: Exception) {
            Log.e(TAG, "Error during cleanup", e)
        }
    }
}