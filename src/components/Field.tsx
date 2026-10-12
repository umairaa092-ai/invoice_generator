import {
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
} from "react";
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const child = children as ReactElement<{
    id?: string;
    "aria-describedby"?: string;
  }>;
  const id =
    isValidElement(child) && child.props.id ? child.props.id : generatedId;
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {isValidElement(child)
        ? cloneElement(child, {
            id,
            ...(hint ? { "aria-describedby": `${id}-hint` } : {}),
          })
        : children}
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}
