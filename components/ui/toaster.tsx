"use client"

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        // Eliminar la propiedad onOpenChange si existe
        const { onOpenChange, ...restProps } = props as any

        return (
          <Toast key={id} variant={variant as any} {...restProps}>
            <div className="grid gap-1 text-right">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport
        className={cn("fixed top-4 right-4 flex flex-col gap-2 z-[200] max-w-[420px] w-full pointer-events-none")}
      />
    </ToastProvider>
  )
}
