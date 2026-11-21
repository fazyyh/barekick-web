import { useCallback, useEffect, useRef, useState } from 'react';
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const request = useRef(0);
  const [active, setActive] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const start = useCallback(async (nextFacing = facing) => {
    const version = ++request.current;
    setError(''); setLoading(true);
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS on your phone. Open the secure app URL in Safari or Chrome.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (request.current !== version) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Camera preview is not ready. Please try again.');
      videoRef.current.srcObject = stream; await videoRef.current.play();
      if (request.current !== version) { stream.getTracks().forEach(t => t.stop()); return; }
      setFacing(nextFacing); setActive(true);
      stream.getVideoTracks().forEach(t => { t.onended = () => { if (request.current === version) { setActive(false); setError('Camera disconnected. Start try-on to reconnect.'); } }; });
    } catch (e) {
      if (request.current !== version) return;
      streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
      const name = e instanceof Error ? e.name : '';
      setError(name === 'NotAllowedError' ? 'Camera permission was denied. Allow this site to use your camera, then try again.' : name === 'NotFoundError' ? 'No camera was found on this device.' : e instanceof Error ? e.message : 'Unable to access camera. Please try again.');
      setActive(false);
    } finally { if (request.current === version) setLoading(false); }
  }, [facing]);
  const stop = useCallback(() => {
    request.current++; streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false); setLoading(false); setError('');
  }, []);
  useEffect(() => () => { request.current++; streamRef.current?.getTracks().forEach(t => t.stop()); }, []);
  const switchCamera = useCallback(() => start(facing === 'environment' ? 'user' : 'environment'), [facing, start]);
  return { videoRef, active, facing, error, loading, start, stop, switchCamera };
}
