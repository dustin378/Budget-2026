import { useEffect, useState } from 'react'
import { fmtMoneyPlain, parseMoney } from '../../lib/money'

interface Props {
  value: number
  onChange: (n: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  ariaLabel?: string
}

export function NumberInput({ value, onChange, placeholder = '—', className = '', disabled, ariaLabel }: Props) {
  const [text, setText] = useState(value === 0 ? '' : fmtMoneyPlain(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(value === 0 ? '' : fmtMoneyPlain(value))
  }, [value, focused])

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      placeholder={placeholder}
      disabled={disabled}
      value={text}
      onFocus={() => {
        setFocused(true)
        setText(value === 0 ? '' : String(value))
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false)
        const parsed = parseMoney(text)
        onChange(parsed)
        setText(parsed === 0 ? '' : fmtMoneyPlain(parsed))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className={`field-num w-full ${className}`}
    />
  )
}
