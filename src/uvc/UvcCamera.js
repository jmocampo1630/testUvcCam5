import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import UvcCameraView from './UvcCameraView';
import { NativeEventEmitter } from 'react-native';

const { UvcCameraModule } = NativeModules;

const start = async () => {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA).then((granted) => {
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          reject(new Error('Camera permission denied'))
          return
        }
        // proceed
      }).catch(err => {
        reject(err)
        return
      })
    }
    if (!UvcCameraModule || !UvcCameraModule.startCamera) {
      reject(new Error('Native module not available'));
      return;
    }
    UvcCameraModule.startCamera((msg) => {
      if (msg === 'Camera started') resolve(msg);
      else reject(new Error(msg));
    });
  });
};

const stop = () => {
  return new Promise((resolve, reject) => {
    if (!UvcCameraModule || !UvcCameraModule.stopCamera) {
      reject(new Error('Native module not available'));
      return;
    }
    UvcCameraModule.stopCamera((msg) => {
      if (msg === 'Camera stopped') resolve(msg);
      else reject(new Error(msg));
    });
  });
};

const addListener = (eventName, handler) => {
  const emitter = new NativeEventEmitter(UvcCameraModule);
  return emitter.addListener(eventName, handler);
}

const removeListener = (subscription) => {
  subscription.remove();
}

export default {
  start,
  stop,
  View: UvcCameraView,
};
