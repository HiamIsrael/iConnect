import { initials, gradientFor } from '../lib';

export default function Avatar({ name = '', size = 40 }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.34), background: gradientFor(name), boxShadow: `0 0 0 1px rgba(255,255,255,0.08)` }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
