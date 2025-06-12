"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, userRole, loading } = useAuth()

  useEffect(() => {
    // If user is not loading and is not an admin, redirect to home
    if (!loading && !isAdmin && userRole !== "administrador") {
      router.push("/?section=dashboard")
    }
  }, [isAdmin, loading, router, userRole])

  // Show nothing while checking permissions
  if (loading || !isAdmin) {
    return <div className="p-8 text-center">Verificando permisos...</div>
  }

  // Redirect to the main page with admin section parameter
  router.push("/?section=admin")

  return null
}
