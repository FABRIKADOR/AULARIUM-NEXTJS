import type { ReactNode } from "react"
import { MainLayout } from "@/components/layout/main-layout"

export default function AdminLayout({ children }: { children: ReactNode }) {
  // No pasamos props de navegación ya que se manejan en el componente principal
  return <MainLayout>{children}</MainLayout>
}
