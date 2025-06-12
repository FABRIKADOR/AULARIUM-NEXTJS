"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

// Modificar el componente Toast para ajustar su posición

const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "success" | "warning" | "info" }
>(({ className, variant = "default", ...props }, ref) => {
  const variantStyles = {
    default:
      "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100",
    destructive: "bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-800",
    success:
      "bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-l-emerald-500 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800",
    warning:
      "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800",
    info: "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all transform scale-100 opacity-100 animate-in fade-in-50 slide-in-from-top-5 duration-300",
        variantStyles[variant as keyof typeof variantStyles],
        className,
      )}
      {...props}
    >
      <div className="flex-1 text-right">{props.children}</div>
    </div>
  )
})
Toast.displayName = "Toast"

const ToastAction = React.forwardRef<React.ElementRef<"a">, { altText?: string } & React.ComponentPropsWithoutRef<"a">>(
  ({ className, altText, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          "inline-flex h-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      />
    )
  },
)
ToastAction.displayName = "ToastAction"

const ToastClose = React.forwardRef<React.ElementRef<"button">, React.ComponentPropsWithoutRef<"button">>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "absolute right-2 top-2 rounded-md p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
          className,
        )}
        {...props}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    )
  },
)
ToastClose.displayName = "ToastClose"

const ToastDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn("mb-1 text-sm opacity-90", className)} {...props} />
  },
)
ToastDescription.displayName = "ToastDescription"

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children)
}
ToastProvider.displayName = "ToastProvider"

const ToastTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return <h3 ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
  },
)
ToastTitle.displayName = "ToastTitle"

// Modificar el ToastViewport para mover los toasts más hacia la derecha
// y asegurar que estén por encima de otros elementos

// Buscar el componente ToastViewport y modificar su className
const ToastViewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed top-1/4 right-1/2 transform translate-x-1/2 flex flex-col gap-2 z-[200] max-w-[420px] w-auto pointer-events-none",
          className,
        )}
        {...props}
      />
    )
  },
)
ToastViewport.displayName = "ToastViewport"

export { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport }

export type ToastActionElement = React.ReactElement<typeof ToastAction>
export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
