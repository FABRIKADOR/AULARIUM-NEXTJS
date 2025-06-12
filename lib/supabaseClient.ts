import { createClient } from "@supabase/supabase-js"

// Crear una única instancia del cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Configuración para evitar timeouts y mejorar la estabilidad
const supabaseOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "aularium-auth-storage",
  },
  global: {
    fetch: (...args) => {
      // Añadir un timeout a todas las peticiones fetch
      const [resource, config] = args
      return fetch(resource, {
        ...config,
        signal: config?.signal || AbortSignal.timeout(15000), // 15 segundos de timeout
      })
    },
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions)

// Exportar una función para obtener la sesión con manejo de errores
export async function getSessionSafely() {
  try {
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout getting session")), 5000)),
    ])

    if (error) throw error
    return data.session
  } catch (error) {
    console.error("Error getting session safely:", error)
    return null
  }
}
