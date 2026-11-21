import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export type FootPose = { x: number; y: number; angle: number; length: number; confidence: number; depthRatio: number; side: 'left' | 'right' };

export type TrackingState = 'loading' | 'waiting' | 'detecting' | 'tracking';

export function useFootTracking(video: HTMLVideoElement | null, active: boolean) {
  const landmarker = useRef<PoseLandmarker | null>(null);
  const previous = useRef<FootPose[]>([]);
  const [feet, setFeet] = useState<FootPose[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState('');
  const [fps, setFps] = useState(0);
  const [trackingState, setTrackingState] = useState<TrackingState>('loading');

  // How many consecutive frames we've had a body detection
  const bodyDetectedFrames = useRef(0);
  // How many consecutive frames we've had feet tracked
  const feetTrackedFrames = useRef(0);
  // How many consecutive frames with NO detection
  const noDetectionFrames = useRef(0);

  useEffect(() => {
    if (!active) {
      setTrackingState('loading');
      bodyDetectedFrames.current = 0;
      feetTrackedFrames.current = 0;
      noDetectionFrames.current = 0;
      previous.current = [];
      setModelReady(false); setModelLoading(false);
      return;
    }
    let cancelled = false;
    setError(''); setModelReady(false); setModelLoading(true);
    setTrackingState('loading');
    (async () => {
      try {
        const files = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        const modelAssetPath = '/models/pose_landmarker_lite.task';
        const options = {
          runningMode: 'VIDEO' as const,
          numPoses: 1,
          minPoseDetectionConfidence: 0.3,
          minPosePresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        };
        let lm: PoseLandmarker;
        try {
          lm = await PoseLandmarker.createFromOptions(files, { ...options, baseOptions: { modelAssetPath, delegate: 'GPU' } });
        } catch {
          lm = await PoseLandmarker.createFromOptions(files, { ...options, baseOptions: { modelAssetPath, delegate: 'CPU' } });
        }
        if (cancelled) lm.close();
        else {
          landmarker.current = lm;
          setModelReady(true);
          setTrackingState('waiting');
        }
      } catch (e) {
        if (!cancelled) setError(`Could not load foot tracking model: ${e instanceof Error ? e.message : 'unknown error'}`);
      } finally {
        if (!cancelled) setModelLoading(false);
      }
    })();
    return () => { cancelled = true; landmarker.current?.close(); landmarker.current = null; };
  }, [active]);

  useEffect(() => {
    if (!active || !video || !modelReady || !landmarker.current) {
      setFeet([]);
      return;
    }
    let raf = 0, last = -1, lastInference = 0, lastFps = performance.now(), frames = 0;
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    const track = () => {
      raf = requestAnimationFrame(track);
      if (video.readyState < 2 || video.currentTime === last || !landmarker.current || performance.now() - lastInference < 33) return;
      last = video.currentTime;
      lastInference = performance.now();
      try {
        const result = landmarker.current.detectForVideo(video, performance.now());
        const lm = result.landmarks?.[0];
        const next: FootPose[] = [];

        // Check if we have ANY body landmark at all
        const hasBody = lm && lm.length > 0;

        if (hasBody && lm) {
          // Check if we can see enough of the body for reliable foot detection
          // Key body landmarks: hips (23,24), knees (25,26), ankles (27,28)
          const hasLowerBody = [23,24,25,26].filter(i => (lm[i]?.visibility ?? 0) > .45).length >= 2;
          const hasAnkles = [27,28].some(i => (lm[i]?.visibility ?? 0) > .45);

          if (hasLowerBody || hasAnkles) {
            bodyDetectedFrames.current = Math.min(bodyDetectedFrames.current + 1, 60);
            noDetectionFrames.current = 0;
          }

          const specs = [
            { side: 'left' as const, heel: 29, toe: 31, ankle: 27 },
            { side: 'right' as const, heel: 30, toe: 32, ankle: 28 },
          ];

          for (const s of specs) {
            const h = lm[s.heel], t = lm[s.toe], a = lm[s.ankle];
            if (!h || !t || !a) continue;
            const confidence = Math.min(h.visibility ?? 0, t.visibility ?? 0, a.visibility ?? 0);
            // Landmark XY is normalized independently by width and height. Convert to pixel aspect before measuring.
            const dx = t.x - h.x, dy = (t.y - h.y) * video.videoHeight / Math.max(1, video.videoWidth);
            const d = Math.hypot(dx, dy);
            if (confidence < .45 || d < .012 || d > .55 || h.x < -.05 || h.x > 1.05 || h.y < -.05 || h.y > 1.05 || t.x < -.05 || t.x > 1.05 || t.y < -.05 || t.y > 1.05) continue;
            const world = result.worldLandmarks?.[0];
            const wh = world?.[s.heel], wt = world?.[s.toe];
            const worldLength = wh && wt ? Math.hypot(wt.x-wh.x, wt.y-wh.y, wt.z-wh.z) : 0;
            const depthRatio = wh && wt && worldLength > .025 ? Math.max(-.65, Math.min(.65, -(wt.z-wh.z)/worldLength)) : 0;
            next.push({
              side: s.side,
              x: (h.x + t.x) / 2,
              y: (h.y + t.y) / 2,
              angle: Math.atan2(dy, dx),
              length: d,
              confidence,
              depthRatio,
            });
          }
        }

        if (next.length > 0) {
          feetTrackedFrames.current = Math.min(feetTrackedFrames.current + 1, 60);
          noDetectionFrames.current = 0;
        } else {
          feetTrackedFrames.current = 0;
          noDetectionFrames.current++;
        }

        if (!hasBody) {
          noDetectionFrames.current++;
          bodyDetectedFrames.current = Math.max(bodyDetectedFrames.current - 1, 0);
        }

        // State machine
        if (feetTrackedFrames.current >= 3) {
          setTrackingState('tracking');
        } else if (noDetectionFrames.current > 8) {
          setTrackingState('waiting');
        } else if (bodyDetectedFrames.current >= 2) {
          setTrackingState('detecting');
        } else if (noDetectionFrames.current > 15) {
          setTrackingState('waiting');
        }

        const smoothed = next.map(p => {
          const old = previous.current.find(f => f.side === p.side);
          return old
            ? {
                ...p,
                x: lerp(old.x, p.x, 0.28),
                y: lerp(old.y, p.y, 0.28),
                angle: old.angle + Math.atan2(Math.sin(p.angle - old.angle), Math.cos(p.angle - old.angle)) * 0.25,
                length: lerp(old.length, p.length, 0.24),
                confidence: lerp(old.confidence, p.confidence, 0.3),
                depthRatio: lerp(old.depthRatio, p.depthRatio, .15),
              }
            : p;
        });
        previous.current = smoothed;
        setFeet(smoothed);
      } catch {
        /* A transient model frame can fail; continue on the next video frame. */
      }
      frames++;
      if (performance.now() - lastFps > 1000) {
        setFps(Math.round((frames * 1000) / (performance.now() - lastFps)));
        frames = 0;
        lastFps = performance.now();
      }
    };
    track();
    return () => cancelAnimationFrame(raf);
  }, [active, video, modelReady]);

  return { feet, modelReady, modelLoading, error, fps, trackingState };
}
