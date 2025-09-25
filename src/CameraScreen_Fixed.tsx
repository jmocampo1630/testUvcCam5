import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { RNCamera } from 'react-native-uvc-camera';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CameraState {
  flashMode: string;
  cameraType: string;
  isRecording: boolean;
  lastPhoto: string | null;
}

const PendingView = () => (
  <View style={styles.pendingView}>
    <Text style={styles.pendingText}>Waiting for Camera...</Text>
  </View>
);

class CameraScreen extends Component<{}, CameraState> {
  private camera: any = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      flashMode: 'off',
      cameraType: 'back',
      isRecording: false,
      lastPhoto: null,
    };
  }

  takePicture = async () => {
    if (this.camera) {
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
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  recordVideo = async () => {
    if (this.camera && !this.state.isRecording) {
      try {
        this.setState({ isRecording: true });
        const options = {
          quality: RNCamera.Constants.VideoQuality['720p'],
          maxDuration: 30,
        };
        const data = await this.camera.recordAsync(options);
        console.log('Video recorded:', data.uri);
        Alert.alert('Success', `Video saved to: ${data.uri}`);
      } catch (error) {
        console.error('Record video error:', error);
        Alert.alert('Error', 'Failed to record video');
      } finally {
        this.setState({ isRecording: false });
      }
    }
  };

  stopRecording = () => {
    if (this.camera && this.state.isRecording) {
      this.camera.stopRecording();
      this.setState({ isRecording: false });
    }
  };

  toggleFlash = () => {
    const { flashMode } = this.state;
    const modes = ['off', 'on', 'auto', 'torch'];
    const currentIndex = modes.indexOf(flashMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.setState({ flashMode: nextMode });
  };

  toggleCamera = () => {
    this.setState(prevState => ({
      cameraType: prevState.cameraType === 'back' ? 'front' : 'back'
    }));
  };

  onCameraReady = () => {
    console.log('UVC Camera is ready!');
  };

  onMountError = (error: any) => {
    console.error('Camera mount error:', error);
    Alert.alert('Camera Error', 'Failed to mount camera');
  };

  onBarCodeRead = (event: any) => {
    console.log('Barcode detected:', event.data, 'Type:', event.type);
    Alert.alert('Barcode Detected', `Data: ${event.data}\nType: ${event.type}`);
  };

  getFlashMode() {
    const { flashMode } = this.state;
    switch (flashMode) {
      case 'on': return RNCamera.Constants.FlashMode.on;
      case 'auto': return RNCamera.Constants.FlashMode.auto;
      case 'torch': return RNCamera.Constants.FlashMode.torch;
      default: return RNCamera.Constants.FlashMode.off;
    }
  }

  getCameraType() {
    return this.state.cameraType === 'front' 
      ? RNCamera.Constants.Type.front 
      : RNCamera.Constants.Type.back;
  }

  render() {
    const { flashMode, cameraType, isRecording, lastPhoto } = this.state;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        <RNCamera
          ref={(ref: any) => {
            this.camera = ref;
          }}
          style={styles.preview}
          type={this.getCameraType()}
          flashMode={this.getFlashMode()}
          autoFocus={RNCamera.Constants.AutoFocus.on}
          permissionDialogTitle={'Permission to use camera'}
          permissionDialogMessage={'We need your permission to use your camera phone'}
          onCameraReady={this.onCameraReady}
          onMountError={this.onMountError}
          onBarCodeRead={this.onBarCodeRead}
          barCodeTypes={[
            RNCamera.Constants.BarCodeType.qr,
            RNCamera.Constants.BarCodeType.code128,
            RNCamera.Constants.BarCodeType.code39,
            RNCamera.Constants.BarCodeType.ean13,
            RNCamera.Constants.BarCodeType.ean8,
          ]}
        >
          {({ camera, status }) => {
            if (status !== 'READY') return <PendingView />;
            return (
              <View style={styles.captureContainer}>
                {/* Camera Controls */}
                <View style={styles.topControls}>
                  <TouchableOpacity style={styles.controlButton} onPress={this.toggleFlash}>
                    <Text style={styles.controlText}>Flash: {flashMode.toUpperCase()}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.controlButton} onPress={this.toggleCamera}>
                    <Text style={styles.controlText}>Camera: {cameraType.toUpperCase()}</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom Controls */}
                <View style={styles.bottomControls}>
                  <TouchableOpacity
                    style={styles.captureBtn}
                    onPress={() => this.takePicture()}
                  >
                    <Text style={styles.captureBtnText}>📷 PHOTO</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.captureBtn, isRecording ? styles.recording : null]}
                    onPress={isRecording ? this.stopRecording : this.recordVideo}
                  >
                    <Text style={styles.captureBtnText}>
                      {isRecording ? '🛑 STOP' : '🎥 VIDEO'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Photo Preview */}
                {lastPhoto && (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: lastPhoto }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.closePreview}
                      onPress={() => this.setState({ lastPhoto: null })}
                    >
                      <Text style={styles.closeText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        </RNCamera>
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
  pendingView: {
    flex: 1,
    backgroundColor: 'lightgreen',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 18,
    color: '#000',
  },
  captureContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-between',
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
  photoPreview: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#fff',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  closePreview: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CameraScreen;