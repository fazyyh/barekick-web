import { useCallback, useEffect, useRef, useState } from 'react';
import type { FootPose, TrackingState } from './useFootTracking';
import type { Shoe } from '../models/shoeCatalog';

type Calibration = { scale: number; x: number; y: number; rotation: number };
export function useWebARFootTracking(shoe: Shoe, calibration: Calibration, size: number, footMode: 'barefoot' | 'shoes', occlusion: boolean) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [active, setActive] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [session, setSession] = useState(0), [feet, setFeet] = useState<FootPose[]>([]), [fps, setFps] = useState(0);
  const [modelReady, setModelReady] = useState(false), [modelStatus, setModelStatus] = useState('loading');
  const [captureError, setCaptureError] = useState(''), [captured, setCaptured] = useState('');
  const config = useRef({ modelUrl: shoe.modelUrl, calibration, size, facing, footMode, occlusion });
  config.current = { modelUrl: shoe.modelUrl, calibration, size, facing, footMode, occlusion };
  const post = useCallback((type: string, extra = {}) => frameRef.current?.contentWindow?.postMessage({ source: 'sole-parent', type, ...extra }, location.origin), []);
  const onLoad = useCallback(() => post('start', { config: config.current }), [post]);
  const start = useCallback(async () => {
    setError(''); setFeet([]); setModelReady(false); setLoading(true); setSession(s => s + 1); setActive(true);
  }, []);
  const stop = useCallback(() => { setActive(false); setLoading(false); setModelReady(false); setFeet([]); setError(''); }, []);
  const switchCamera = useCallback(() => { setFacing(f => f === 'environment' ? 'user' : 'environment'); setLoading(true); setModelReady(false); setFeet([]); setSession(s => s + 1); }, []);
  const previousMode = useRef(footMode);
  useEffect(() => {
    if (previousMode.current !== footMode && active) { setLoading(true); setModelReady(false); setFeet([]); setSession(s => s + 1); }
    previousMode.current = footMode;
  }, [footMode, active]);
  useEffect(() => { if (modelReady) post('configure', { config: config.current }); }, [shoe, calibration, size, occlusion, modelReady, post]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frameRef.current?.contentWindow || event.data?.source !== 'sole-webar') return;
      const m = event.data;
      if (m.type === 'ready') { setModelReady(true); setLoading(false); }
      if (m.type === 'error') { setError(`Foot tracker could not start: ${m.message}. Check camera permission and try again.`); setLoading(false); setFeet([]); }
      if (m.type === 'tracking') { setFeet(m.feet); setFps(m.fps); }
      if (m.type === 'model') setModelStatus(m.status);
      if (m.type === 'capture') { setCaptured(m.url); setCaptureError(''); }
      if (m.type === 'capture-error') setCaptureError('Could not capture this frame. Please try again.');
    };
    addEventListener('message', receive); return () => removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    if (!active || !loading) return;
    const timeout = setTimeout(() => { setError('Tracker is taking longer than expected. Check the network and camera permission, or stop and start again.'); setLoading(false); }, 60000);
    return () => clearTimeout(timeout);
  }, [active, loading, session]);
  const capture = () => { setCaptureError(''); post('capture'); };
  const trackingState: TrackingState = loading ? 'loading' : feet.length ? 'tracking' : 'waiting';
  return { frameRef, onLoad, active, loading, error, facing, session, start, stop, switchCamera, feet, fps, modelReady, modelLoading: loading, modelStatus, trackingState, capture, captured, setCaptured, captureError, setCaptureError };
}
