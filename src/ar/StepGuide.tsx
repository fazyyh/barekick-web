import type { TrackingState } from '../hooks/useFootTracking';

export default function StepGuide({ state, visible }: { state: TrackingState; visible: boolean }) {
  if (!visible) return null;
  return <div className="feet-guide" aria-live="polite">
    <h1>{state === 'loading' ? 'Getting things ready' : state === 'detecting' ? 'Keep your feet in view' : <>Put your feet in<br/>the picture</>}</h1>
    <svg viewBox="0 0 240 240" role="img" aria-label="Point the camera down so both feet are visible" className="feet-circle">
      <defs><clipPath id="feet-circle-clip"><circle cx="120" cy="120" r="109"/></clipPath></defs>
      <circle cx="120" cy="120" r="113" fill="none" stroke="currentColor" strokeWidth="5"/>
      <g clipPath="url(#feet-circle-clip)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {[0, 88].map(dx => <g key={dx} transform={`translate(${dx} 0)`}>
          <path d="M60 222 L62 170 Q49 156 50 140 L52 86 Q54 47 77 45 Q101 44 104 83 L107 141 Q106 159 94 172 L99 224"/>
          <path d="M60 143 L61 90 Q62 56 78 54 Q94 55 95 88 L98 141 Q98 157 80 161 Q62 158 60 143 Z"/>
          <path d="M61 89 Q78 99 95 89 M61 117 L95 117 M63 128 Q79 139 94 128 M65 143 Q79 151 92 143 M63 172 Q79 159 95 173"/>
          <path d="M64 100 L92 111 L65 111 L92 101 M64 118 L91 128 L65 128 L91 118 M66 136 L90 144 L66 144 L90 136"/>
          <path d="M61 182 Q79 170 96 183 M58 218 Q80 200 100 218"/>
        </g>)}
      </g>
    </svg>
    <p>{state === 'loading' ? 'Loading the foot tracker on your device…' : 'Point down. Keep feet and lower legs visible.'}</p>
  </div>;
}
