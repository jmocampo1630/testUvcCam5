import { NativeModules, PermissionsAndroid, Platform, NativeEventEmitter, EmitterSubscription, requireNativeComponent } from 'react-native';

type NativeUvcModule = {
  startCamera: (cb: (msg: string) => void) => void;
  stopCamera: (cb: (msg: string) => void) => void;
};

const { UvcCameraModule } = NativeModules as { UvcCameraModule?: NativeUvcModule };
const emitter = UvcCameraModule ? new NativeEventEmitter(UvcCameraModule as any) : null;

export async function start(): Promise<string> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Camera permission denied');
    }
  }
  return new Promise((resolve, reject) => {
    if (!UvcCameraModule || !UvcCameraModule.startCamera) {
      reject(new Error('Native module not available'));
      return;
    }
    UvcCameraModule.startCamera((msg: string) => {
      if (msg === 'Camera started') resolve(msg);
      else reject(new Error(msg));
    });
  });
}

export async function stop(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!UvcCameraModule || !UvcCameraModule.stopCamera) {
      reject(new Error('Native module not available'));
      return;
    }
    UvcCameraModule.stopCamera((msg: string) => {
      if (msg === 'Camera stopped') resolve(msg);
      else reject(new Error(msg));
    });
  });
}

export function addListener(eventName: string, handler: (...args: any[]) => void): EmitterSubscription | null {
  if (!emitter) return null;
  return emitter.addListener(eventName, handler);
}

export function removeListener(subscription: EmitterSubscription | null) {
  subscription?.remove();
}

// typed native view
export const View = requireNativeComponent<any>('UvcCameraView');

export default { start, stop, addListener, removeListener, View };
