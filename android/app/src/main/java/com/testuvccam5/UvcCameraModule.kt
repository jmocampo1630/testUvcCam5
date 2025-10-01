package com.testuvccam5

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback
import android.app.Activity
import android.content.Context
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import com.serenegiant.usb.USBMonitor
import com.serenegiant.usb.UVCCamera
import com.serenegiant.usb.DeviceFilter
import android.util.Log
import android.content.Intent
import android.content.IntentFilter
import android.app.PendingIntent
import android.content.BroadcastReceiver
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.view.Surface

class UvcCameraModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var usbMonitor: USBMonitor? = null
    private var uvcCamera: UVCCamera? = null
    private var previewSurface: Surface? = null
    private var isUsbMonitorRegistered: Boolean = false
    private val ACTION_USB_PERMISSION = "com.testuvccam5.USB_PERMISSION"
    private var permissionReceiver: BroadcastReceiver? = null

    // Listener used by the USBMonitor; defined once so it can be used by init and elsewhere
    private val deviceListener = object : USBMonitor.OnDeviceConnectListener {
        override fun onAttach(device: UsbDevice?) {
            Log.d("UvcCameraModule", "Device attached")
            sendEvent("uvc_device_attached", null)
            // Do not attempt to request permission here. Permission flow is
            // handled explicitly via startCamera() to ensure usbMonitor is not
            // constructed or started before the user grants permission.
        }
        override fun onDettach(device: UsbDevice?) {
            Log.d("UvcCameraModule", "Device detached")
            sendEvent("uvc_device_detached", null)
        }
        override fun onConnect(device: UsbDevice?, ctrlBlock: USBMonitor.UsbControlBlock?, createNew: Boolean) {
            Log.d("UvcCameraModule", "Device connected")
            sendEvent("uvc_device_connected", null)
            uvcCamera = UVCCamera()
            uvcCamera?.open(ctrlBlock)
            uvcCamera?.setPreviewSize(640, 480, UVCCamera.FRAME_FORMAT_MJPEG)
            // Attach preview surface if available
            try {
                if (previewSurface != null) {
                    uvcCamera?.setPreviewDisplay(previewSurface)
                    uvcCamera?.startPreview()
                }
            } catch (e: Exception) {
                Log.e("UvcCameraModule", "Failed to start preview: ${e.message}")
            }
        }
        override fun onDisconnect(device: UsbDevice?, ctrlBlock: USBMonitor.UsbControlBlock?) {
            Log.d("UvcCameraModule", "Device disconnected")
            sendEvent("uvc_device_disconnected", null)
            uvcCamera?.destroy()
        }
        override fun onCancel(device: UsbDevice?) {
            Log.d("UvcCameraModule", "Device cancel")
            sendEvent("uvc_device_cancel", null)
        }
    }

    init {
        // Initialize and register the USBMonitor early so the app can detect attachments
        try {
            // Install a defensive uncaught exception handler to avoid the process being killed
            // when the USBMonitor background thread attempts to read device serials without
            // permission (SecurityException). We only swallow SecurityException coming from
            // the USBMonitor thread and delegate other exceptions to the previous handler.
            try {
                val previousHandler = Thread.getDefaultUncaughtExceptionHandler()
                Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
                    // Defensive: swallow SecurityException thrown anywhere to avoid background
                    // USBMonitor or other threads killing the process when permissions are
                    // not yet granted. We still forward other exceptions to the previous
                    // handler so they can be handled/logged as before.
                    if (throwable is SecurityException) {
                        Log.w("UvcCameraModule", "Swallowed SecurityException from ${thread?.name}: ${throwable.message}")
                        return@setDefaultUncaughtExceptionHandler
                    }
                    // Fallback: pass to previous handler if present, otherwise print stack
                    if (previousHandler != null) {
                        previousHandler.uncaughtException(thread, throwable)
                    } else {
                        throwable.printStackTrace()
                    }
                }
            } catch (e: Exception) {
                Log.w("UvcCameraModule", "Failed to set UncaughtExceptionHandler: ${e.message}")
            }

            // NOTE: do NOT create the USBMonitor here. The USBMonitor implementation
            // starts a background HandlerThread during construction which may call
            // UsbDevice.getSerialNumber() while the app does not yet have permission
            // and cause a SecurityException that kills the process. We'll create
            // and register the USBMonitor only after the user has explicitly granted
            // permission (see startCamera -> BroadcastReceiver flow below).
        } catch (e: Exception) {
            Log.w("UvcCameraModule", "Failed to initialize USBMonitor: ${e.message}")
        }
    }

    override fun getName(): String {
        return "UvcCameraModule"
    }

    @ReactMethod
    fun startCamera(callback: Callback) {
        val activity: Activity? = reactApplicationContext.currentActivity
        if (activity == null) {
            callback.invoke("No activity")
            return
        }
        val usbManager = activity.getSystemService(Context.USB_SERVICE) as UsbManager
        val deviceList = usbManager.deviceList

        // For demo, pick the first device if any (may be null)
        val device: UsbDevice? = if (deviceList.isNotEmpty()) deviceList.values.first() else null

        if (device == null) {
            // No device right now; let JS know we're waiting
            sendEvent("uvc_waiting_for_device", null)
            callback.invoke("Waiting for device")
            return
        }

        try {
            // Register a BroadcastReceiver to receive the USB permission result.
            if (permissionReceiver == null) {
                permissionReceiver = object : BroadcastReceiver() {
                    override fun onReceive(context: Context?, intent: Intent?) {
                        if (intent == null) return
                        val action = intent.action
                        if (ACTION_USB_PERMISSION == action) {
                            val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                            try {
                                reactApplicationContext.unregisterReceiver(this)
                            } catch (e: Exception) {
                                // ignore
                            }
                            permissionReceiver = null

                            if (granted) {
                                // Only register USBMonitor after permission is granted to
                                // avoid background threads trying to access device info
                                // before permission exists.
                                try {
                                    if (usbMonitor == null) {
                                        // create USBMonitor now that we have permission
                                        usbMonitor = USBMonitor(reactApplicationContext, deviceListener)
                                    }
                                    if (!isUsbMonitorRegistered) {
                                        usbMonitor?.register()
                                        isUsbMonitorRegistered = true
                                    }
                                } catch (e: Exception) {
                                    Log.w("UvcCameraModule", "usbMonitor.register failed: ${e.message}")
                                }
                                // Now notify JS that permission was granted and let the
                                // USBMonitor flow continue (it should invoke onConnect).
                                sendEvent("uvc_permission_granted", null)
                            } else {
                                sendEvent("uvc_permission_denied", null)
                            }
                        }
                    }
                }
                val filter = IntentFilter(ACTION_USB_PERMISSION)
                reactApplicationContext.registerReceiver(permissionReceiver, filter)
            }

            // Request permission via UsbManager with a PendingIntent. The result will
            // be delivered to the BroadcastReceiver above. We intentionally avoid
            // calling usbMonitor.register() until permission is granted.
            val intent = Intent(ACTION_USB_PERMISSION)
            val pending = PendingIntent.getBroadcast(reactApplicationContext, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT)
            usbManager.requestPermission(device, pending)
            callback.invoke("Permission requested")
        } catch (e: Exception) {
            Log.w("UvcCameraModule", "requestPermission flow failed: ${e.message}")
            sendEvent("uvc_permission_error", e.message)
            callback.invoke("Permission request failed")
        }
    }

    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.w("UvcCameraModule", "sendEvent failed: ${e.message}")
        }
    }

    // Called by the native view manager when its Surface becomes available or is destroyed
    fun setPreviewSurface(surface: Surface?) {
        previewSurface = surface
        try {
            if (uvcCamera != null && previewSurface != null) {
                uvcCamera?.setPreviewDisplay(previewSurface)
                uvcCamera?.startPreview()
            }
        } catch (e: Exception) {
            Log.w("UvcCameraModule", "Failed to set preview surface: ${e.message}")
        }
    }

    @ReactMethod
    fun stopCamera(callback: Callback) {
        uvcCamera?.destroy()
        try {
            if (usbMonitor != null && isUsbMonitorRegistered) {
                usbMonitor?.unregister()
                isUsbMonitorRegistered = false
            }
            // If there is a pending permission receiver, unregister it now
            if (permissionReceiver != null) {
                try {
                    reactApplicationContext.unregisterReceiver(permissionReceiver)
                } catch (e: Exception) {
                    // ignore
                }
                permissionReceiver = null
            }
        } catch (e: Exception) {
            Log.w("UvcCameraModule", "usbMonitor.unregister failed: ${e.message}")
        }
        previewSurface?.release()
        previewSurface = null
        callback.invoke("Camera stopped")
    }
}
