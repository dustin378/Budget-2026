interface Props {
  value: string
  onChange: (s: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
}

export function TextInput({ value, onChange, placeholder, className = '', ariaLabel }: Props) {
  return (
    <input
      type="text"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`field w-full ${className}`}
    />
  )
}
