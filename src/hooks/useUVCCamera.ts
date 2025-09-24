import { NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';

const { UVCCameraModule } = NativeModules;

interface UVCDevice {
  deviceName: string;
  vendorId: number;
  productId: number;
  deviceClass: string;
  deviceSubclass: string;
  deviceProtocol: string;
  interfaceCount: number;
  manufacturerName?: string;
  productName?: string;
}

interface UVCCameraHook {
  devices: UVCDevice[];
  isMonitoring: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  requestPermission: (deviceName: string) => Promise<void>;
  hasPermission: (deviceName: string) => Promise<boolean>;
  refreshDevices: () => Promise<void>;
  error: string | null;
}

export const useUVCCamera = (): UVCCameraHook => {
  const [devices, setDevices] = useState<UVCDevice[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventEmitterRef = useRef<any>(null);

  const refreshDevices = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      if (UVCCameraModule) {
        const connectedDevices = await UVCCameraModule.getConnectedUVCDevices();
        console.log('Connected UVC devices:', connectedDevices);
        setDevices(connectedDevices || []);
      } else {
        throw new Error('UVCCameraModule not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to get connected UVC devices:', err);
      throw err;
    }
  }, []);

  const handleDeviceAttached = useCallback((device: UVCDevice) => {
    console.log('USB Device attached:', device);
    refreshDevices();
  }, [refreshDevices]);

  const handleDeviceDetached = useCallback((device: UVCDevice) => {
    console.log('USB Device detached:', device);
    refreshDevices();
  }, [refreshDevices]);

  const handleUVCDeviceAttached = useCallback((device: UVCDevice) => {
    console.log('UVC Device attached:', device);
    refreshDevices();
  }, [refreshDevices]);

  const handleUVCDeviceDetached = useCallback((device: UVCDevice) => {
    console.log('UVC Device detached:', device);
    refreshDevices();
  }, [refreshDevices]);

  const handleUVCDeviceConnected = useCallback((device: UVCDevice) => {
    console.log('UVC Device connected:', device);
  }, []);

  const handleUVCDeviceDisconnected = useCallback((device: UVCDevice) => {
    console.log('UVC Device disconnected:', device);
  }, []);

  const handlePermissionGranted = useCallback((device: UVCDevice) => {
    console.log('USB Permission granted for:', device);
    setError(null);
  }, []);

  const handlePermissionDenied = useCallback(() => {
    console.log('USB Permission denied');
    setError('USB permission was denied by the user');
  }, []);

  useEffect(() => {
    // Initialize event emitter
    if (UVCCameraModule) {
      eventEmitterRef.current = new NativeEventEmitter(UVCCameraModule);

      // Set up event listeners
      const subscriptions = [
        DeviceEventEmitter.addListener('onUSBDeviceAttached', handleDeviceAttached),
        DeviceEventEmitter.addListener('onUSBDeviceDetached', handleDeviceDetached),
        DeviceEventEmitter.addListener('onUVCDeviceAttached', handleUVCDeviceAttached),
        DeviceEventEmitter.addListener('onUVCDeviceDetached', handleUVCDeviceDetached),
        DeviceEventEmitter.addListener('onUVCDeviceConnected', handleUVCDeviceConnected),
        DeviceEventEmitter.addListener('onUVCDeviceDisconnected', handleUVCDeviceDisconnected),
        DeviceEventEmitter.addListener('onUSBPermissionGranted', handlePermissionGranted),
        DeviceEventEmitter.addListener('onUSBPermissionDenied', handlePermissionDenied),
      ];

      // Cleanup subscriptions
      return () => {
        subscriptions.forEach(subscription => subscription.remove());
      };
    }
  }, [handleDeviceAttached, handleDeviceDetached, handleUVCDeviceAttached, handleUVCDeviceDetached, handleUVCDeviceConnected, handleUVCDeviceDisconnected, handlePermissionGranted, handlePermissionDenied]);

  const startMonitoring = async (): Promise<void> => {
    try {
      setError(null);
      if (UVCCameraModule) {
        const result = await UVCCameraModule.startUSBMonitoring();
        console.log('USB Monitoring started:', result);
        setIsMonitoring(true);
        await refreshDevices();
      } else {
        throw new Error('UVCCameraModule not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to start USB monitoring:', err);
      throw err;
    }
  };

  const stopMonitoring = async (): Promise<void> => {
    try {
      setError(null);
      if (UVCCameraModule) {
        const result = await UVCCameraModule.stopUSBMonitoring();
        console.log('USB Monitoring stopped:', result);
        setIsMonitoring(false);
      } else {
        throw new Error('UVCCameraModule not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to stop USB monitoring:', err);
      throw err;
    }
  };

  const requestPermission = useCallback(async (deviceName: string): Promise<void> => {
    try {
      setError(null);
      if (UVCCameraModule) {
        const result = await UVCCameraModule.requestUSBPermission(deviceName);
        console.log('USB Permission requested:', result);
      } else {
        throw new Error('UVCCameraModule not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to request USB permission:', err);
      throw err;
    }
  }, []);

  const hasPermission = useCallback(async (deviceName: string): Promise<boolean> => {
    try {
      setError(null);
      if (UVCCameraModule) {
        const permissionResult = await UVCCameraModule.hasUSBPermission(deviceName);
        return permissionResult;
      } else {
        throw new Error('UVCCameraModule not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to check USB permission:', err);
      throw err;
    }
  }, []); // Empty dependencies since UVCCameraModule is stable

  return {
    devices,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    requestPermission,
    hasPermission,
    refreshDevices,
    error,
  };
};