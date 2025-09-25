declare module 'react-native-uvc-camera' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface PictureOptions {
    quality?: number;
    base64?: boolean;
    mirrorImage?: boolean;
    exif?: boolean;
    width?: number;
    fixOrientation?: boolean;
    forceUpOrientation?: boolean;
  }

  export interface RecordingOptions {
    maxDuration?: number;
    maxFileSize?: number;
    quality?: number | string;
    codec?: string;
    mute?: boolean;
  }

  export interface PictureResponse {
    uri: string;
    width: number;
    height: number;
    base64?: string;
  }

  export interface RecordingResponse {
    uri: string;
  }

  export interface BarCodeReadEvent {
    data: string;
    type: string;
  }

  export interface FaceFeature {
    bounds: {
      size: { width: number; height: number };
      origin: { x: number; y: number };
    };
    faceID?: number;
  }

  export interface UvcCameraProps extends ViewProps {
    rotation?: number;
    zoom?: number;
    ratio?: string;
    focusDepth?: number;
    type?: number | string;
    onCameraReady?: () => void;
    onMountError?: (event: any) => void;
    onBarCodeRead?: (event: BarCodeReadEvent) => void;
    faceDetectionMode?: number;
    flashMode?: number | string;
    barCodeTypes?: string[];
    whiteBalance?: number | string;
    autoFocus?: string | boolean | number;
    onFacesDetected?: (event: { faces: FaceFeature[] }) => void;
    captureAudio?: boolean;
    useCamera2Api?: boolean;
    playSoundOnCapture?: boolean;
    permissionDialogTitle?: string;
    permissionDialogMessage?: string;
    notAuthorizedView?: React.ReactNode;
    pendingAuthorizationView?: React.ReactNode;
  }

  export class UvcCamera extends Component<UvcCameraProps> {
    static Constants: {
      Type: {
        back: number;
        front: number;
      };
      FlashMode: {
        off: number;
        on: number;
        auto: number;
        torch: number;
      };
      AutoFocus: {
        on: number;
        off: number;
      };
      WhiteBalance: {
        sunny: number;
        cloudy: number;
        shadow: number;
        incandescent: number;
        fluorescent: number;
        auto: number;
      };
      VideoQuality: {
        '2160p': number;
        '1080p': number;
        '720p': number;
        '480p': number;
        '4:3': number;
      };
      VideoCodec: {
        H264: string;
        JPEG: string;
      };
      BarCodeType: {
        aztec: string;
        codabar: string;
        code128: string;
        code39: string;
        code93: string;
        datamatrix: string;
        ean13: string;
        ean8: string;
        interleaved2of5: string;
        itf14: string;
        maxicode: string;
        pdf417: string;
        qr: string;
        rss14: string;
        rssexpanded: string;
        upc_a: string;
        upc_e: string;
        upc_ean: string;
      };
      FaceDetection: {
        fast: number;
        accurate: number;
        Mode: {
          fast: number;
          accurate: number;
        };
        Landmarks: {
          all: number;
          none: number;
        };
        Classifications: {
          all: number;
          none: number;
        };
      };
    };

    takePictureAsync(options?: PictureOptions): Promise<PictureResponse>;
    recordAsync(options?: RecordingOptions): Promise<RecordingResponse>;
    stopRecording(): void;
    getSupportedRatiosAsync(): Promise<string[]>;
  }

  export interface FaceDetectorProps {
    // Add face detector props if needed
  }

  export class FaceDetector extends Component<FaceDetectorProps> {
    // Face detector methods
  }
}