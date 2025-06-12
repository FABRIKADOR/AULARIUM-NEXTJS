"use client"

import { useEffect } from "react"

export function ColorInitializer() {
  useEffect(() => {
    // Aplicar el color naranja por defecto en todas las páginas
    const applyDefaultColor = () => {
      const savedColorScheme = localStorage.getItem("colorScheme")
      if (!savedColorScheme) {
        const root = document.documentElement

        // Definir los colores para el esquema naranja
        const orangeScheme = {
          primary: "37 98% 53%",
          primaryForeground: "0 0% 100%",
          secondary: "221 51% 16%",
          secondaryForeground: "0 0% 100%",
          accent: "37 98% 53%",
          accentForeground: "221 51% 16%",
          ring: "37 98% 53%",
          border: "0 0% 90%",
          muted: "0 0% 90%",
          mutedForeground: "221 51% 16%",
        }

        // Aplicar el esquema de colores
        Object.entries(orangeScheme).forEach(([property, value]) => {
          root.style.setProperty(`--${property}`, value)
        })

        // Guardar el esquema de colores en localStorage para persistencia
        localStorage.setItem("colorScheme", "default")
      } else {
        // Si ya hay un esquema guardado, aplicarlo
        applyColorScheme(savedColorScheme)
      }
    }

    // Función para aplicar un esquema de colores específico
    const applyColorScheme = (scheme) => {
      const root = document.documentElement

      // Definir los colores para cada esquema
      const colorSchemes = {
        default: {
          primary: "37 98% 53%",
          primaryForeground: "0 0% 100%",
          secondary: "221 51% 16%",
          secondaryForeground: "0 0% 100%",
          accent: "37 98% 53%",
          accentForeground: "221 51% 16%",
          ring: "37 98% 53%",
          border: "0 0% 90%",
          muted: "0 0% 90%",
          mutedForeground: "221 51% 16%",
        },
        blue: {
          primary: "221.2 83.2% 53.3%",
          primaryForeground: "210 40% 98%",
          secondary: "221 51% 16%",
          secondaryForeground: "0 0% 100%",
          accent: "221.2 83.2% 53.3%",
          accentForeground: "210 40% 98%",
          ring: "221.2 83.2% 53.3%",
          border: "214.3 31.8% 91.4%",
          muted: "214.3 31.8% 91.4%",
          mutedForeground: "215.4 16.3% 46.9%",
        },
        green: {
          primary: "142.1 76.2% 36.3%",
          primaryForeground: "355.7 100% 97.3%",
          secondary: "221 51% 16%",
          secondaryForeground: "0 0% 100%",
          accent: "142.1 76.2% 36.3%",
          accentForeground: "355.7 100% 97.3%",
          ring: "142.1 76.2% 36.3%",
          border: "120 16.7% 90%",
          muted: "120 16.7% 90%",
          mutedForeground: "120 5.9% 40%",
        },
        purple: {
          primary: "262.1 83.3% 57.8%",
          primaryForeground: "210 40% 98%",
          secondary: "221 51% 16%",
          secondaryForeground: "0 0% 100%",
          accent: "262.1 83.3% 57.8%",
          accentForeground: "210 40% 98%",
          ring: "262.1 83.3% 57.8%",
          border: "260 30% 90%",
          muted: "260 30% 90%",
          mutedForeground: "260 10% 40%",
        },
        pink: {
          primary: "338.5 86.3% 56.9%",
          primaryForeground: "210 40% 98%",
          secondary: "221 51% 16%",
          secondaryForeground: "0 0% 100%",
          accent: "338.5 86.3% 56.9%",
          accentForeground: "210 40% 98%",
          ring: "338.5 86.3% 56.9%",
          border: "340 30% 90%",
          muted: "340 30% 90%",
          mutedForeground: "340 10% 40%",
        },
      }

      // Obtener el esquema de colores seleccionado
      const selectedScheme = colorSchemes[scheme] || colorSchemes.default

      // Aplicar el nuevo esquema de colores
      Object.entries(selectedScheme).forEach(([property, value]) => {
        root.style.setProperty(`--${property}`, value)
      })
    }

    // Ejecutar la función inmediatamente
    applyDefaultColor()

    // Aplicar el modo compacto si está guardado
    const userSettings = localStorage.getItem("userSettings")
    if (userSettings) {
      try {
        const settings = JSON.parse(userSettings)
        if (settings.compactMode) {
          document.body.classList.add("compact-mode")
        }

        // Aplicar tamaño de fuente
        if (settings.fontSize) {
          switch (settings.fontSize) {
            case "small":
              document.documentElement.style.fontSize = "14px"
              break
            case "large":
              document.documentElement.style.fontSize = "18px"
              break
            default:
              document.documentElement.style.fontSize = "16px"
          }
        }
      } catch (e) {
        console.error("Error loading settings:", e)
      }
    }
  }, [])

  return null
}
