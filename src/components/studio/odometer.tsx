export function Odometer({
  value,
  pad = 3,
  className = '',
}: {
  value: number
  pad?: number
  className?: string
}) {
  return (
    <span
      className={`font-mono tabular-nums tracking-wider transition-all duration-[120ms] ease-editorial ${className}`}
      key={value}
    >
      {String(value).padStart(pad, '0')}
    </span>
  )
}
