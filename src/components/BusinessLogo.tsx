import { useMemo, useState } from "react";
import { businessInitials, isSafeBusinessLogo } from "../lib/branding";

export function BusinessLogo({
  logo,
  name,
  className = "",
  initials = true,
}: {
  logo?: string;
  name: string;
  className?: string;
  initials?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const safeSource = useMemo(
    () => (logo && isSafeBusinessLogo(logo) ? logo : undefined),
    [logo],
  );
  const businessName = name.trim() || "Your Business";
  if (!safeSource || failedSource === safeSource) {
    return initials ? (
      <span
        className={`business-logo business-logo-initials ${className}`.trim()}
        role="img"
        aria-label={`${businessName} initials`}
      >
        {businessInitials(name)}
      </span>
    ) : null;
  }
  return (
    <span className={`business-logo ${className}`.trim()}>
      <img
        src={safeSource}
        alt={`${businessName} logo`}
        style={{ objectFit: "contain" }}
        onError={() => setFailedSource(safeSource)}
      />
    </span>
  );
}
