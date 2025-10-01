import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, StyleSheet, SafeAreaView } from 'react-native';
import UvcCamera from './UvcCamera';

export default function ExampleUvcScreenTS() {
  const [status, setStatus] = useState<'idle'|'starting'|'streaming'|'stopping'|'stopped'|'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const subs = useRef<any[]>([]);

  useEffect(() => {
    try {
      const s1 = UvcCamera.addListener('uvc_device_attached', () => setLog(l => ['device_attached', ...l]));
      const s2 = UvcCamera.addListener('uvc_device_connected', () => setLog(l => ['device_connected', ...l]));
      const s3 = UvcCamera.addListener('uvc_device_disconnected', () => setLog(l => ['device_disconnected', ...l]));
      subs.current = [s1, s2, s3];
    } catch (e) {
      console.warn('Event subscription failed', e);
    }
    return () => subs.current.forEach(s => s && s.remove && s.remove());
  }, []);

  const onStart = async () => {
    setStatus('starting');
    try {
      await UvcCamera.start();
      setStatus('streaming');
    } catch (e) {
      setStatus('error');
      setLog(l => [String(e), ...l]);
    }
  };

  const onStop = async () => {
    setStatus('stopping');
    try {
      await UvcCamera.stop();
      setStatus('stopped');
    } catch (e) {
      setStatus('error');
      setLog(l => [String(e), ...l]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>UVC Camera Example (TS)</Text>
      <View style={styles.previewContainer}>
  <UvcCamera.View style={styles.preview as any} />
      </View>
      <View style={styles.controls}>
        <Button title="Start" onPress={onStart} />
        <Button title="Stop" onPress={onStop} />
      </View>
      <Text>Status: {status}</Text>
      <View style={styles.log}>
        {log.map((l, i) => (
          <Text key={i} style={styles.logLine}>{l}</Text>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  previewContainer: { alignItems: 'center', justifyContent: 'center' },
  preview: { width: 320, height: 240, backgroundColor: '#000' },
  controls: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 },
  log: { marginTop: 12 },
  logLine: { fontSize: 12, color: '#333' },
});
