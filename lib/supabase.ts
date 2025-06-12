import { createClient } from "@supabase/supabase-js"

// Crear una única instancia del cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Crear una única instancia global del cliente
let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return supabaseInstance
}

// Exportar la instancia única
export const supabase = getSupabaseClient()

// Función para obtener la sesión de manera segura con timeout
export async function getSessionSafely(timeoutMs = 3000) {
  try {
    // Crear una promesa que se resuelve después del timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Timeout al obtener la sesión"))
      }, timeoutMs)
    })

    // Intentar obtener la sesión
    const sessionPromise = supabase.auth.getSession()

    // Usar Promise.race para limitar el tiempo de espera
    const result = (await Promise.race([sessionPromise, timeoutPromise])) as any
    return result?.data?.session || null
  } catch (error) {
    console.log("Error en getSessionSafely:", error)
    return null
  }
}

// Función para reintentar una función asíncrona
export async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    if (retries === 0) {
      throw error
    }
    console.log(`Retrying in fetchWithRetry, ${retries} retries remaining`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return fetchWithRetry(fn, retries - 1)
  }
}

// Función para verificar si Supabase está configurado correctamente
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}
