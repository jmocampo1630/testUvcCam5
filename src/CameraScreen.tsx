import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  StatusBar,
  NativeModules,
} from 'react-native';
import { UvcCamera } from 'react-native-uvc-camera';

const { UsbPermissionModule } = NativeModules;

interface CameraState {
  flashMode: number;
  cameraType: number;
  isRecording: boolean;
  lastPhoto: string | null;
  cameraReady: boolean;
  usbPermissionGranted: boolean;
  initializingUsb: boolean;
}

class CameraScreen extends Component<{}, CameraState> {
  private camera: UvcCamera | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      flashMode: UvcCamera.Constants.FlashMode.off,
      cameraType: UvcCamera.Constants.Type.back,
      isRecording: false,
      lastPhoto: null,
      cameraReady: false,
      usbPermissionGranted: false,
      initializingUsb: true,
    };
  }

  componentDidMount() {
    this.requestUsbPermissions();
  }

  requestUsbPermissions = async () => {
    try {
      console.log('Requesting USB permissions...');
      
      // First, get the list of USB devices
      const devices = await UsbPermissionModule.getUsbDevices();
      console.log('USB devices found:', devices);

      // Request permissions for all devices
      const granted = await UsbPermissionModule.requestPermissionForAllDevices();
      console.log('USB permission granted:', granted);
      
      this.setState({ 
        usbPermissionGranted: granted,
        initializingUsb: false 
      });

      if (!granted) {
        Alert.alert(
          'USB Permission Required',
          'Please grant USB permission to use UVC cameras. You may need to restart the app after granting permission.',
          [
            { text: 'Retry', onPress: this.requestUsbPermissions },
            { text: 'Cancel', onPress: () => {} }
          ]
        );
      }
    } catch (error) {
      console.error('USB permission error:', error);
      this.setState({ 
        initializingUsb: false,
        usbPermissionGranted: false 
      });
      Alert.alert(
        'USB Permission Error', 
        'Failed to request USB permissions: ' + error,
        [
          { text: 'Retry', onPress: this.requestUsbPermissions },
          { text: 'Cancel', onPress: () => {} }
        ]
      );
    }
  };

  takePicture = async () => {
    if (this.camera && this.state.cameraReady) {
      try {
        const options = { 
          quality: 0.8, 
          base64: false,
          width: 1920,
        };
        const data = await this.camera.takePictureAsync(options);
        console.log('Picture taken:', data.uri);
        this.setState({ lastPhoto: data.uri });
        Alert.alert('Success', `Photo saved to: ${data.uri}`);
      } catch (error) {
        console.error('Take picture error:', error);
        Alert.alert('Error', 'Failed to take picture: ' + error);
      }
    } else {
      Alert.alert('Warning', 'Camera is not ready yet. Please wait...');
    }
  };

  recordVideo = async () => {
    if (this.camera && this.state.cameraReady && !this.state.isRecording) {
      try {
        this.setState({ isRecording: true });
        const options = {
          quality: UvcCamera.Constants.VideoQuality['720p'],
          maxDuration: 30,
        };
        const data = await this.camera.recordAsync(options);
        console.log('Video recorded:', data.uri);
        Alert.alert('Success', `Video saved to: ${data.uri}`);
      } catch (error) {
        console.error('Record video error:', error);
        Alert.alert('Error', 'Failed to record video: ' + error);
      } finally {
        this.setState({ isRecording: false });
      }
    } else if (!this.state.cameraReady) {
      Alert.alert('Warning', 'Camera is not ready yet. Please wait...');
    }
  };

  stopRecording = () => {
    if (this.camera && this.state.isRecording) {
      this.camera.stopRecording();
      this.setState({ isRecording: false });
    }
  };

  toggleFlash = () => {
    if (!this.state.cameraReady) {
      Alert.alert('Warning', 'Camera is not ready yet. Please wait...');
      return;
    }
    
    const { flashMode } = this.state;
    const flashModes = [
      UvcCamera.Constants.FlashMode.off,
      UvcCamera.Constants.FlashMode.on,
      UvcCamera.Constants.FlashMode.auto,
      UvcCamera.Constants.FlashMode.torch,
    ];
    const currentIndex = flashModes.indexOf(flashMode);
    const nextMode = flashModes[(currentIndex + 1) % flashModes.length];
    this.setState({ flashMode: nextMode });
  };

  toggleCamera = () => {
    if (!this.state.cameraReady) {
      Alert.alert('Warning', 'Camera is not ready yet. Please wait...');
      return;
    }
    
    this.setState(prevState => ({
      cameraType: prevState.cameraType === UvcCamera.Constants.Type.back 
        ? UvcCamera.Constants.Type.front 
        : UvcCamera.Constants.Type.back,
      cameraReady: false, // Reset ready state when switching cameras
    }));
  };

  onCameraReady = () => {
    console.log('UVC Camera is ready!');
    this.setState({ cameraReady: true });
  };

  onMountError = (error: any) => {
    console.error('Camera mount error:', error);
    this.setState({ cameraReady: false });
    
    let errorMessage = 'Failed to mount camera';
    if (error?.message) {
      errorMessage += `: ${error.message}`;
    }
    
    // Check for common USB permission issues
    if (error?.message?.includes('permission') || error?.message?.includes('USB')) {
      errorMessage = 'USB Camera permission required. Please allow USB access and restart the app.';
    }
    
    Alert.alert('Camera Error', errorMessage);
  };

  onBarCodeRead = (event: any) => {
    if (!this.state.cameraReady) return;
    
    console.log('Barcode detected:', event.data, 'Type:', event.type);
    Alert.alert('Barcode Detected', `Data: ${event.data}\nType: ${event.type}`);
  };

  getFlashModeText() {
    const { flashMode } = this.state;
    switch (flashMode) {
      case UvcCamera.Constants.FlashMode.on: return 'ON';
      case UvcCamera.Constants.FlashMode.auto: return 'AUTO';
      case UvcCamera.Constants.FlashMode.torch: return 'TORCH';
      default: return 'OFF';
    }
  }

  getCameraTypeText() {
    return this.state.cameraType === UvcCamera.Constants.Type.front ? 'FRONT' : 'BACK';
  }

  render() {
    const { flashMode, cameraType, isRecording, cameraReady, usbPermissionGranted, initializingUsb } = this.state;

    // Show USB permission screen if not granted
    if (initializingUsb) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.permissionScreen}>
            <Text style={styles.permissionTitle}>Initializing USB Camera</Text>
            <Text style={styles.permissionText}>Checking USB permissions...</Text>
            <Text style={styles.permissionSubText}>Please allow USB access if prompted</Text>
          </View>
        </View>
      );
    }

    if (!usbPermissionGranted) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.permissionScreen}>
            <Text style={styles.permissionTitle}>USB Permission Required</Text>
            <Text style={styles.permissionText}>
              This app needs permission to access USB cameras.
            </Text>
            <Text style={styles.permissionSubText}>
              Please grant USB permission and restart the app.
            </Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={this.requestUsbPermissions}
            >
              <Text style={styles.retryButtonText}>Retry Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        <UvcCamera
          ref={(ref: UvcCamera) => {
            this.camera = ref;
          }}
          style={styles.preview}
          type={cameraType}
          flashMode={flashMode}
          autoFocus={UvcCamera.Constants.AutoFocus.on}
          permissionDialogTitle={'Permission to use USB camera'}
          permissionDialogMessage={'This app needs access to USB camera devices to function properly. Please allow access.'}
          onCameraReady={this.onCameraReady}
          onMountError={this.onMountError}
          onBarCodeRead={this.onBarCodeRead}
          barCodeTypes={[
            UvcCamera.Constants.BarCodeType.qr,
            UvcCamera.Constants.BarCodeType.code128,
            UvcCamera.Constants.BarCodeType.code39,
            UvcCamera.Constants.BarCodeType.ean13,
            UvcCamera.Constants.BarCodeType.ean8,
          ]}
        >
          <View style={styles.overlay}>
            {/* Camera Status */}
            {!cameraReady && (
              <View style={styles.statusOverlay}>
                <Text style={styles.statusText}>Initializing UVC Camera...</Text>
                <Text style={styles.statusSubText}>USB permission granted - connecting to camera</Text>
              </View>
            )}
            
            {/* Top Controls */}
            <View style={styles.topControls}>
              <TouchableOpacity 
                style={[styles.controlButton, !cameraReady && styles.disabled]} 
                onPress={this.toggleFlash}
                disabled={!cameraReady}
              >
                <Text style={styles.controlText}>Flash: {this.getFlashModeText()}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.controlButton, !cameraReady && styles.disabled]} 
                onPress={this.toggleCamera}
                disabled={!cameraReady}
              >
                <Text style={styles.controlText}>Camera: {this.getCameraTypeText()}</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={[styles.captureBtn, !cameraReady && styles.disabled]}
                onPress={this.takePicture}
                disabled={!cameraReady}
              >
                <Text style={styles.captureBtnText}>📷 PHOTO</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.captureBtn, 
                  isRecording ? styles.recording : null,
                  !cameraReady && styles.disabled
                ]}
                onPress={isRecording ? this.stopRecording : this.recordVideo}
                disabled={!cameraReady}
              >
                <Text style={styles.captureBtnText}>
                  {isRecording ? '🛑 STOP' : '🎥 VIDEO'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </UvcCamera>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#000000',
  },
  permissionTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionSubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  statusOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 40,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusSubText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 10,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 15,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  controlText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  captureBtn: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 20,
    paddingHorizontal: 30,
    alignSelf: 'center',
    margin: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  recording: {
    backgroundColor: '#ff0000',
  },
  captureBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default CameraScreen;