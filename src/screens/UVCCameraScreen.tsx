import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useUVCCamera } from '../hooks/useUVCCamera';
import UVCCameraView, { UVCCameraViewRef } from '../UVCCameraView';

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

const UVCCameraScreen: React.FC = () => {
  const cameraViewRef = useRef<UVCCameraViewRef>(null);
  const {
    devices,
    isMonitoring,
    isStreaming,
    startMonitoring,
    stopMonitoring,
    requestPermission,
    hasPermission,
    stopVideoStream,
    refreshDevices,
    error,
  } = useUVCCamera();

  const [selectedDevice, setSelectedDevice] = React.useState<UVCDevice | null>(null);
  const [devicePermissions, setDevicePermissions] = React.useState<Record<string, boolean>>({});

  // Cleanup on unmount only
  React.useEffect(() => {
    return () => {
      if (isMonitoring) {
        stopMonitoring().catch(err => {
          console.error('Failed to stop monitoring during cleanup:', err);
        });
      }
    };
  }, [isMonitoring, stopMonitoring]);

  // Check permissions for all devices when devices list changes
  useEffect(() => {
    const checkAllPermissions = async () => {
      const permissions: Record<string, boolean> = {};
      for (const device of devices) {
        try {
          const hasPerms = await hasPermission(device.deviceName);
          permissions[device.deviceName] = hasPerms;
        } catch (err) {
          console.error(`Failed to check permission for ${device.deviceName}:`, err);
          permissions[device.deviceName] = false;
        }
      }
      setDevicePermissions(permissions);
    };

    if (devices.length > 0) {
      checkAllPermissions();
    }
  }, [devices, hasPermission]); // hasPermission is now memoized with useCallback

  const handleSelectDevice = (device: UVCDevice) => {
    setSelectedDevice(device);
    Alert.alert(
      'Device Selected',
      `Selected: ${device.productName || device.deviceName}\nVendor ID: 0x${device.vendorId.toString(16).toUpperCase()}\nProduct ID: 0x${device.productId.toString(16).toUpperCase()}`,
      [{ text: 'OK' }]
    );
  };

  const handleRequestPermission = async (device: UVCDevice) => {
    try {
      const hasPerms = await hasPermission(device.deviceName);
      if (hasPerms) {
        Alert.alert('Permission', 'Device already has permission!');
        return;
      }
      
      await requestPermission(device.deviceName);
      Alert.alert('Permission', 'Permission request sent! Please check your notifications and allow USB access.');
      
      // Refresh permissions after a short delay
      setTimeout(async () => {
        try {
          const updatedPerms = await hasPermission(device.deviceName);
          setDevicePermissions(prev => ({
            ...prev,
            [device.deviceName]: updatedPerms
          }));
        } catch (err) {
          console.error('Failed to refresh permission status:', err);
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to request permission:', err);
      Alert.alert('Error', 'Failed to request permission');
    }
  };

  const handleStartStream = async () => {
    if (!selectedDevice) {
      Alert.alert('Error', 'Please select a device first');
      return;
    }

    try {
      const hasPerms = await hasPermission(selectedDevice.deviceName);
      if (!hasPerms) {
        Alert.alert('Permission Required', 'Please grant USB permission first');
        return;
      }
      
      // Use the camera view to start preview
      if (cameraViewRef.current) {
        await cameraViewRef.current.startPreview();
        Alert.alert('Streaming', 'Video stream started! Camera view should show video.');
      } else {
        Alert.alert('Error', 'Camera view is not ready');
      }
    } catch (err) {
      console.error('Failed to start video stream:', err);
      Alert.alert('Error', `Failed to start video stream: ${err}`);
    }
  };

  const handleStopStream = async () => {
    try {
      // Use the camera view to stop preview
      if (cameraViewRef.current) {
        await cameraViewRef.current.stopPreview();
        Alert.alert('Streaming', 'Video stream stopped!');
      } else {
        // Fallback to module method
        await stopVideoStream();
        Alert.alert('Streaming', 'Video stream stopped!');
      }
    } catch (err) {
      console.error('Failed to stop video stream:', err);
      Alert.alert('Error', 'Failed to stop video stream');
    }
  };

  const handleCheckPermission = async (device: UVCDevice) => {
    try {
      const hasPerms = await hasPermission(device.deviceName);
      setDevicePermissions(prev => ({
        ...prev,
        [device.deviceName]: hasPerms
      }));
      Alert.alert('Permission Status', hasPerms ? '✅ Has Permission' : '❌ No Permission');
    } catch (err) {
      console.error('Failed to check permission:', err);
      Alert.alert('Error', 'Failed to check permission');
    }
  };

  const renderDevice = ({ item }: { item: UVCDevice }) => {
    const hasDevicePermission = devicePermissions[item.deviceName] || false;
    const isSelected = selectedDevice?.deviceName === item.deviceName;
    
    return (
      <TouchableOpacity
        style={[
          styles.deviceCard,
          isSelected && styles.selectedDeviceCard
        ]}
        onPress={() => handleSelectDevice(item)}
        activeOpacity={0.7}
      >
        <View style={styles.deviceHeader}>
          <Text style={[styles.deviceTitle, isSelected && styles.selectedText]}>
            {item.productName || `Device ${item.deviceName}`}
          </Text>
          <View style={styles.statusIndicators}>
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>SELECTED</Text>
              </View>
            )}
            <View style={[
              styles.permissionBadge,
              hasDevicePermission ? styles.permissionGranted : styles.permissionDenied
            ]}>
              <Text style={styles.permissionBadgeText}>
                {hasDevicePermission ? '✅' : '❌'}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.deviceDetail}>Name: {item.deviceName}</Text>
        <Text style={styles.deviceDetail}>
          Vendor ID: 0x{item.vendorId.toString(16).toUpperCase()}
        </Text>
        <Text style={styles.deviceDetail}>
          Product ID: 0x{item.productId.toString(16).toUpperCase()}
        </Text>
        <Text style={styles.deviceDetail}>
          Manufacturer: {item.manufacturerName || 'Unknown'}
        </Text>
        <Text style={styles.deviceDetail}>
          Interface Count: {item.interfaceCount}
        </Text>
        <Text style={styles.deviceDetail}>
          Permission: {hasDevicePermission ? 'Granted' : 'Not Granted'}
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              hasDevicePermission && styles.disabledButton
            ]}
            onPress={() => handleRequestPermission(item)}
            disabled={hasDevicePermission}
          >
            <Text style={[
              styles.buttonText,
              hasDevicePermission && styles.disabledButtonText
            ]}>
              {hasDevicePermission ? 'Permission Granted' : 'Request Permission'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => handleCheckPermission(item)}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Check Status
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button, 
              styles.streamButton,
              !hasDevicePermission && styles.disabledButton
            ]}
            onPress={() => handleStartStream()}
            disabled={!hasDevicePermission || isStreaming}
          >
            <Text style={[
              styles.buttonText,
              styles.streamButtonText,
              (!hasDevicePermission || isStreaming) && styles.disabledButtonText
            ]}>
              {isStreaming ? 'Streaming...' : 'Start Stream'}
            </Text>
          </TouchableOpacity>
          
          {isStreaming && (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={() => handleStopStream()}
            >
              <Text style={[styles.buttonText, styles.stopButtonText]}>
                Stop Stream
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>UVC Camera Detector</Text>
      
      {/* Video Preview Area */}
      <View style={styles.videoPreviewContainer}>
        <UVCCameraView
          ref={cameraViewRef}
          style={styles.cameraView}
          onSurfaceCreated={() => console.log('Camera surface created')}
          onSurfaceDestroyed={() => console.log('Camera surface destroyed')}
          onPreviewStarted={() => console.log('Camera preview started')}
          onPreviewStopped={() => console.log('Camera preview stopped')}
          onError={(cameraError) => {
            console.error('Camera error:', cameraError);
            Alert.alert('Camera Error', cameraError.message);
          }}
        />
        {!isStreaming && (
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraOverlayText}>
              📹 Connect a UVC Camera and Start Streaming
            </Text>
            <Text style={styles.cameraOverlaySubtext}>
              Video will appear here when streaming
            </Text>
          </View>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isMonitoring ? '🟢 Monitoring' : '🔴 Not Monitoring'}
        </Text>
        <Text style={styles.statusText}>
          Devices Found: {devices.length}
        </Text>
        <Text style={styles.statusText}>
          Selected Device: {selectedDevice ? 
            `${selectedDevice.productName || selectedDevice.deviceName}` : 
            'None'
          }
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.controlButton,
            isMonitoring ? styles.stopButton : styles.startButton,
          ]}
          onPress={isMonitoring ? stopMonitoring : startMonitoring}
        >
          <Text style={styles.buttonText}>
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.controlButton, styles.refreshButton]}
          onPress={refreshDevices}
        >
          <Text style={styles.buttonText}>Refresh Devices</Text>
        </TouchableOpacity>
      </View>

      {devices.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Connected UVC Devices:</Text>
          {selectedDevice && (
            <View style={styles.selectedDeviceInfo}>
              <Text style={styles.selectedDeviceTitle}>
                🎯 Selected Device: {selectedDevice.productName || selectedDevice.deviceName}
              </Text>
              <Text style={styles.selectedDeviceDetails}>
                Ready for camera operations • {devicePermissions[selectedDevice.deviceName] ? 'Permission Granted' : 'Permission Required'}
              </Text>
            </View>
          )}
          <FlatList
            data={devices}
            keyExtractor={(item) => item.deviceName}
            renderItem={renderDevice}
            scrollEnabled={false}
            style={styles.devicesList}
          />
        </>
      ) : (
        <View style={styles.noDevicesContainer}>
          <Text style={styles.noDevicesText}>
            {isMonitoring 
              ? 'No UVC cameras detected. Try connecting a USB camera.'
              : 'Start monitoring to detect UVC cameras.'
            }
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  controlButton: {
    flex: 1,
  },
  startButton: {
    backgroundColor: '#4caf50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  refreshButton: {
    backgroundColor: '#2196f3',
  },
  streamButton: {
    backgroundColor: '#ff9800',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  selectedDeviceInfo: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  selectedDeviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  selectedDeviceDetails: {
    fontSize: 14,
    color: '#388e3c',
  },
  devicesList: {
    maxHeight: 400,
  },
  deviceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDeviceCard: {
    borderColor: '#4caf50',
    backgroundColor: '#f8fff8',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  permissionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 30,
    alignItems: 'center',
  },
  permissionGranted: {
    backgroundColor: '#e8f5e8',
  },
  permissionDenied: {
    backgroundColor: '#ffebee',
  },
  permissionBadgeText: {
    fontSize: 12,
  },
  deviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  selectedText: {
    color: '#4caf50',
  },
  deviceDetail: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196f3',
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196f3',
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#2196f3',
  },
  disabledButtonText: {
    color: '#9e9e9e',
  },
  streamButtonText: {
    color: '#fff',
  },
  stopButtonText: {
    color: '#fff',
  },
  noDevicesContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  noDevicesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  videoPreviewContainer: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    borderWidth: 2,
    borderColor: '#4caf50',
    position: 'relative',
  },
  cameraView: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  cameraOverlayText: {
    color: '#4caf50',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  cameraOverlaySubtext: {
    color: '#81c784',
    fontSize: 14,
    textAlign: 'center',
  },
  videoPreviewText: {
    color: '#4caf50',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoPreviewSubtext: {
    color: '#81c784',
    fontSize: 14,
  },
});

export default UVCCameraScreen;