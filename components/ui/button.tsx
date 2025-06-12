"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  showConfirmation?: {
    message: string
    description?: string
  }
  adminOnly?: boolean // Nueva prop para indicar si el botón es solo para administradores
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, showConfirmation, adminOnly = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const [isAdmin, setIsAdmin] = React.useState(false)

    // Verificar si el usuario es administrador
    React.useEffect(() => {
      const checkAdminStatus = async () => {
        try {
          // Importar supabase de manera dinámica
          const { supabase } = await import("@/lib/supabase")
          const { data: sessionData } = await supabase.auth.getSession()

          if (sessionData?.session?.user) {
            const { data } = await supabase
              .from("usuarios")
              .select("rol")
              .eq("id", sessionData.session.user.id)
              .single()

            setIsAdmin(data?.rol === "admin" || data?.rol === "administrador")
          }
        } catch (error) {
          console.error("Error checking admin status:", error)
          setIsAdmin(false)
        }
      }

      checkAdminStatus()
    }, [])

    // Mejorar el manejo de eventos de clic
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Si el botón es solo para administradores y el usuario no es administrador, no hacer nada
      if (adminOnly && !isAdmin) {
        event.preventDefault()
        return
      }

      // Asegurarse de que el evento de clic se propague correctamente
      if (onClick) {
        console.log("Button clicked:", props.children)
        onClick(event)
      }

      // Mostrar mensaje de confirmación si se proporciona
      if (showConfirmation) {
        // Importar toast de manera dinámica para evitar problemas de SSR
        import("@/components/ui/use-toast")
          .then(({ toast }) => {
            toast({
              title: showConfirmation.message,
              description: showConfirmation.description || "Recibirás una notificación cuando se procese tu solicitud.",
              variant: "default",
            })
          })
          .catch((err) => {
            console.error("Error showing confirmation toast:", err)
          })
      }
    }

    // Si el botón es solo para administradores y el usuario no es administrador, no renderizar nada
    if (adminOnly && !isAdmin) {
      return null
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        data-variant={variant}
        onClick={(e) => {
          // Prevenir comportamiento por defecto solo si es necesario
          if (adminOnly && !isAdmin) {
            e.preventDefault()
            return
          }

          // Llamar directamente a la función onClick proporcionada
          if (onClick) {
            onClick(e)
          }

          // Mostrar confirmación si es necesario
          if (showConfirmation) {
            import("@/components/ui/use-toast").then(({ toast }) => {
              toast({
                title: showConfirmation.message,
                description:
                  showConfirmation.description || "Recibirás una notificación cuando se procese tu solicitud.",
                variant: "default",
              })
            })
          }
        }}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
