import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/utils'

export function Container({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-4">{children}</div>
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-zinc-200 bg-white/80 shadow-sm backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60'
  const styles =
    variant === 'primary'
      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
      : variant === 'danger'
        ? 'bg-red-600 text-white hover:bg-red-500'
        : 'bg-transparent text-zinc-900 hover:bg-zinc-100'

  return <button className={cx(base, styles, className)} {...props} />
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-4',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        'w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-4',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-sm font-medium text-zinc-900">{children}</div>
}

export function Muted({ children }: { children: ReactNode }) {
  return <div className="text-sm text-zinc-500">{children}</div>
}

