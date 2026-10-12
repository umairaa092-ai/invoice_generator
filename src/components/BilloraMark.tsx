export function BilloraMark({ className = "" }: { className?: string }) {
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
      <path
        fill="#282436"
        fillRule="evenodd"
        d="M10 6h5v10.5c1.4-1.6 3-2.3 5.1-2.3 5.1 0 8.9 4 8.9 9.4S25.2 33 20.1 33c-2.3 0-4-.9-5.4-2.7V32H10V6Zm9.5 12.7c-2.9 0-4.6 2.1-4.6 4.9s1.7 4.9 4.6 4.9 4.6-2.1 4.6-4.9-1.7-4.9-4.6-4.9Z"
      />
      <circle cx="32" cy="32" r="2.6" fill="#282436" />
    </svg>
  );
}
