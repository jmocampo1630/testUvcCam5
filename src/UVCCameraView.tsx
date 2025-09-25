import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { requireNativeComponent, findNodeHandle, ViewStyle, NativeModules } from 'react-native';

const { UVCCameraModule } = NativeModules;

// Define the native component interface
interface NativeUVCCameraViewProps {
  style?: ViewStyle;
  onSurfaceCreated?: () => void;
  onSurfaceDestroyed?: () => void;
  onPreviewStarted?: () => void;
  onPreviewStopped?: () => void;
  onError?: (event: { nativeEvent: { message: string } }) => void;
}

// Define the native component
const NativeUVCCameraView = requireNativeComponent<NativeUVCCameraViewProps>('UVCCameraView');

// Define the component props
interface UVCCameraViewProps {
  style?: ViewStyle;
  onSurfaceCreated?: () => void;
  onSurfaceDestroyed?: () => void;
  onPreviewStarted?: () => void;
  onPreviewStopped?: () => void;
  onError?: (error: { message: string }) => void;
}

// Define the ref methods
export interface UVCCameraViewRef {
  startPreview: () => Promise<any>;
  stopPreview: () => Promise<any>;
  getStatus: () => Promise<any>;
}

// Create the component
const UVCCameraView = forwardRef<UVCCameraViewRef, UVCCameraViewProps>((props, ref) => {
  const nativeViewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    startPreview: async () => {
      const viewTag = findNodeHandle(nativeViewRef.current);
      if (viewTag) {
        try {
          const result = await UVCCameraModule.startVideoStream(viewTag);
          console.log('UVCCameraView: Preview started', result);
          return result;
        } catch (error) {
          console.error('UVCCameraView: Failed to start preview', error);
          throw error;
        }
      } else {
        throw new Error('UVCCameraView: Cannot find view tag');
      }
    },

    stopPreview: async () => {
      try {
        const result = await UVCCameraModule.stopVideoStream();
        console.log('UVCCameraView: Preview stopped', result);
        return result;
      } catch (error) {
        console.error('UVCCameraView: Failed to stop preview', error);
        throw error;
      }
    },

    getStatus: async () => {
      try {
        const status = await UVCCameraModule.getStreamingStatus();
        console.log('UVCCameraView: Status', status);
        return status;
      } catch (error) {
        console.error('UVCCameraView: Failed to get status', error);
        throw error;
      }
    },
  }));

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      UVCCameraModule.stopVideoStream().catch((error: any) => {
        console.warn('UVCCameraView: Cleanup failed', error);
      });
    };
  }, []);

  const handleSurfaceCreated = () => {
    console.log('UVCCameraView: Surface created');
    props.onSurfaceCreated?.();
  };

  const handleSurfaceDestroyed = () => {
    console.log('UVCCameraView: Surface destroyed');
    props.onSurfaceDestroyed?.();
  };

  const handlePreviewStarted = () => {
    console.log('UVCCameraView: Preview started');
    props.onPreviewStarted?.();
  };

  const handlePreviewStopped = () => {
    console.log('UVCCameraView: Preview stopped');
    props.onPreviewStopped?.();
  };

  const handleError = (event: { nativeEvent: { message: string } }) => {
    const error = { message: event.nativeEvent.message };
    console.error('UVCCameraView: Error', error);
    props.onError?.(error);
  };

  return (
    <NativeUVCCameraView
      ref={nativeViewRef}
      style={props.style}
      onSurfaceCreated={handleSurfaceCreated}
      onSurfaceDestroyed={handleSurfaceDestroyed}
      onPreviewStarted={handlePreviewStarted}
      onPreviewStopped={handlePreviewStopped}
      onError={handleError}
    />
  );
});

UVCCameraView.displayName = 'UVCCameraView';

export default UVCCameraView;