package com.testuvccam5

import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap

class UsbCameraModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "UsbCameraModule"
    }

    @ReactMethod
    fun getConnectedDevices(promise: Promise) {
        try {
            val usbManager = reactApplicationContext.getSystemService(Context.USB_SERVICE) as UsbManager
            val deviceList = usbManager.deviceList
            val devices = WritableNativeArray()

            for ((_, device) in deviceList) {
                val deviceInfo = WritableNativeMap()
                deviceInfo.putString("deviceName", device.deviceName)
                deviceInfo.putInt("vendorId", device.vendorId)
                deviceInfo.putInt("productId", device.productId)
                deviceInfo.putString("manufacturerName", device.manufacturerName ?: "Unknown")
                deviceInfo.putString("productName", device.productName ?: "Unknown")
                devices.pushMap(deviceInfo)
            }

            promise.resolve(devices)
        } catch (e: Exception) {
            promise.reject("USB_ERROR", "Failed to get USB devices: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startCamera(deviceName: String, promise: Promise) {
        try {
            // Mock implementation - just return success for now
            // In a real implementation, this would initialize the USB camera
            promise.resolve("Camera started successfully (mock)")
        } catch (e: Exception) {
            promise.reject("CAMERA_ERROR", "Failed to start camera: ${e.message}", e)
        }
    }

    @ReactMethod
    fun stopCamera(promise: Promise) {
        try {
            // Mock implementation - just return success for now
            promise.resolve("Camera stopped successfully (mock)")
        } catch (e: Exception) {
            promise.reject("CAMERA_ERROR", "Failed to stop camera: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getCameraStatus(promise: Promise) {
        try {
            val status = WritableNativeMap()
            status.putBoolean("isConnected", false)
            status.putString("status", "Mock implementation - no camera connected")
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("CAMERA_ERROR", "Failed to get camera status: ${e.message}", e)
        }
    }
}