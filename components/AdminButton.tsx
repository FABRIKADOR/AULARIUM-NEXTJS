"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

interface AdminButtonProps {
  currentSection: string
  onNavigate: (section: string) => void
  isCollapsed: boolean
  setIsMobileOpen: (open: boolean) => void
}

export function AdminButton({ currentSection, onNavigate, isCollapsed, setIsMobileOpen }: AdminButtonProps) {
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const { user, isAdmin, userRole } = useAuth()

  useEffect(() => {
    console.log("Checking admin status:", { isAdmin, userRole })

    // Show admin button for users with admin or administrador role
    if (isAdmin || (userRole && (userRole.toLowerCase() === "administrador" || userRole.toLowerCase() === "admin"))) {
      console.log("Admin button should be visible")
      setIsVisible(true)
    } else {
      console.log("Admin button should be hidden")
      setIsVisible(false)
    }
  }, [isAdmin, userRole])

  if (!isVisible) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={currentSection === "admin" ? "default" : "ghost"}
            className={cn(
              "w-full justify-start gap-2 transition-all",
              currentSection === "admin"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              isCollapsed && "justify-center p-2",
            )}
            onClick={() => {
              onNavigate("admin")
              setIsMobileOpen(false)
            }}
          >
            <ClipboardList className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "")} />
            {!isCollapsed && <span>Administración</span>}
          </Button>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side="right">
            <p>Administración</p>
            <p className="text-xs text-muted-foreground">Panel de administración del sistema</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
