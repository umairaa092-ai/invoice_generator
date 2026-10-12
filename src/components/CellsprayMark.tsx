export function CellsprayMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      width="34"
      height="34"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="9" fill="#AB93F0" />
      <g fill="#282436">
        <rect x="9" y="9" width="17" height="6" rx="2.5" />
        <rect x="9" y="17" width="6" height="6" rx="2" />
        <rect x="9" y="25" width="17" height="6" rx="2.5" />
        <rect x="29" y="16" width="4" height="4" rx="1.5" />
      </g>
    </svg>
  );
}
