interface Props {
  value: string
  onChange: (s: string) => void
  className?: string
  ariaLabel?: string
}

export function DateInput({ value, onChange, className = '', ariaLabel }: Props) {
  return (
    <input
      type="date"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`field font-mono text-xs ${className}`}
    />
  )
}
