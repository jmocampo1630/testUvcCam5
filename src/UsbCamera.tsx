import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { NativeModules } from 'react-native';

const { UsbCameraModule } = NativeModules;

interface Device {
  deviceName: string;
  productName: string;
  manufacturerName: string;
  vendorId: number;
  productId: number;
}

interface CameraStatus {
  isConnected: boolean;
  status: string;
}

export const UsbCamera: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<CameraStatus>({ isConnected: false, status: 'Not connected' });
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  const getDevices = async () => {
    try {
      setError('');
      const deviceList = await UsbCameraModule.getConnectedDevices();
      setDevices(deviceList || []);
      console.log('Found devices:', deviceList);
    } catch (err: any) {
      const errorMessage = `Failed to get devices: ${err.message || err}`;
      setError(errorMessage);
      console.error('Get devices error:', err);
    }
  };

  const getStatus = async () => {
    try {
      const cameraStatus = await UsbCameraModule.getCameraStatus();
      setStatus(cameraStatus);
    } catch (err: any) {
      console.error('Get status error:', err);
    }
  };

  useEffect(() => {
    getDevices();
    getStatus();
  }, []);

  const startCamera = async () => {
    if (devices.length === 0) {
      Alert.alert('Error', 'No USB devices found');
      return;
    }

    const deviceToUse = devices[0]; // Use first device
    try {
      setError('');
      const result = await UsbCameraModule.startCamera(deviceToUse.deviceName);
      console.log('Camera start result:', result);
      setSelectedDevice(deviceToUse.deviceName);
      await getStatus();
      Alert.alert('Success', result);
    } catch (err: any) {
      const errorMessage = `Failed to start camera: ${err.message || err}`;
      setError(errorMessage);
      console.error('Camera start error:', err);
      Alert.alert('Error', errorMessage);
    }
  };

  const stopCamera = async () => {
    try {
      setError('');
      const result = await UsbCameraModule.stopCamera();
      console.log('Camera stop result:', result);
      setSelectedDevice('');
      await getStatus();
      Alert.alert('Success', result);
    } catch (err: any) {
      const errorMessage = `Failed to stop camera: ${err.message || err}`;
      setError(errorMessage);
      console.error('Camera stop error:', err);
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>USB Camera Controls</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {status.status}
        </Text>
        <Text style={styles.statusText}>
          Connected: {status.isConnected ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.statusText}>
          Devices found: {devices.length}
        </Text>
        {selectedDevice && (
          <Text style={styles.statusText}>
            Selected: {selectedDevice}
          </Text>
        )}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.deviceList}>
        <Text style={styles.deviceTitle}>Connected USB Devices:</Text>
        {devices.length > 0 ? (
          devices.map((device, index) => (
            <View key={index} style={styles.deviceItem}>
              <Text style={styles.deviceText}>
                {device.productName || 'Unknown'} 
                {device.manufacturerName ? ` (${device.manufacturerName})` : ''}
              </Text>
              <Text style={styles.deviceSubText}>
                VID: {device.vendorId.toString(16).toUpperCase()}, 
                PID: {device.productId.toString(16).toUpperCase()}
              </Text>
              <Text style={styles.deviceSubText}>
                Device: {device.deviceName}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDeviceText}>No USB devices detected</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Refresh Devices" 
          onPress={getDevices}
        />
        <Button 
          title="Start Camera" 
          onPress={startCamera}
          disabled={devices.length === 0 || selectedDevice !== ''}
        />
        <Button 
          title="Stop Camera" 
          onPress={stopCamera}
          disabled={selectedDevice === ''}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  errorText: {
    color: '#cc0000',
    fontSize: 14,
  },
  deviceList: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  deviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  deviceItem: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    marginBottom: 8,
  },
  deviceText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  deviceSubText: {
    fontSize: 12,
    color: '#666',
  },
  noDeviceText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 10,
  },
});