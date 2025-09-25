package com.testuvccam5;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.HashMap;

public class UsbPermissionModule extends ReactContextBaseJavaModule {

    private static final String ACTION_USB_PERMISSION = "com.testuvccam5.USB_PERMISSION";
    private ReactApplicationContext reactContext;
    private UsbManager usbManager;
    private Promise permissionPromise;

    public UsbPermissionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.usbManager = (UsbManager) reactContext.getSystemService(Context.USB_SERVICE);
        
        // Register broadcast receiver for USB permission results
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        reactContext.registerReceiver(usbReceiver, filter);
    }

    @Override
    public String getName() {
        return "UsbPermissionModule";
    }

    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice device = (UsbDevice) intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        if (device != null) {
                            // Permission granted
                            if (permissionPromise != null) {
                                permissionPromise.resolve(true);
                                permissionPromise = null;
                            }
                        }
                    } else {
                        // Permission denied
                        if (permissionPromise != null) {
                            permissionPromise.resolve(false);
                            permissionPromise = null;
                        }
                    }
                }
            }
        }
    };

    @ReactMethod
    public void requestPermissionForAllDevices(Promise promise) {
        this.permissionPromise = promise;
        
        HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
        if (deviceList.isEmpty()) {
            promise.resolve(true); // No devices, so no permissions needed
            return;
        }

        boolean hasPermissionForAll = true;
        UsbDevice firstDeviceNeedingPermission = null;

        // Check if we have permission for all devices
        for (UsbDevice device : deviceList.values()) {
            if (!usbManager.hasPermission(device)) {
                hasPermissionForAll = false;
                if (firstDeviceNeedingPermission == null) {
                    firstDeviceNeedingPermission = device;
                }
            }
        }

        if (hasPermissionForAll) {
            promise.resolve(true);
            return;
        }

        // Request permission for the first device that needs it
        if (firstDeviceNeedingPermission != null) {
            PendingIntent permissionIntent = PendingIntent.getBroadcast(
                reactContext,
                0,
                new Intent(ACTION_USB_PERMISSION),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );
            usbManager.requestPermission(firstDeviceNeedingPermission, permissionIntent);
        } else {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void getUsbDevices(Promise promise) {
        try {
            HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
            WritableArray devices = Arguments.createArray();
            
            for (UsbDevice device : deviceList.values()) {
                WritableMap deviceInfo = Arguments.createMap();
                deviceInfo.putString("deviceName", device.getDeviceName());
                deviceInfo.putInt("deviceId", device.getDeviceId());
                deviceInfo.putInt("vendorId", device.getVendorId());
                deviceInfo.putInt("productId", device.getProductId());
                deviceInfo.putBoolean("hasPermission", usbManager.hasPermission(device));
                devices.pushMap(deviceInfo);
            }
            
            promise.resolve(devices);
        } catch (Exception e) {
            promise.reject("USB_ERROR", e.getMessage());
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        try {
            reactContext.unregisterReceiver(usbReceiver);
        } catch (Exception e) {
            // Receiver was not registered
        }
    }
}