"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, AlertTriangle } from "lucide-react"
import Papa from "papaparse"
import { supabase } from "@/lib/supabase"

interface Professor {
  nombre: string
  email: string
}

export function CSVUpload({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const parseCSV = (file: File): Promise<Papa.ParseResult<Professor>> => {
    return new Promise((resolve, reject) => {
      Papa.parse<Professor>(file, {
        header: true,
        complete: resolve,
        error: reject,
      })
    })
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor, seleccione un archivo CSV.")
      return
    }

    setUploading(true)
    setError(null)

    try {
      const result = await parseCSV(file)

      if (result.errors.length > 0) {
        throw new Error("Error parsing CSV: " + result.errors[0].message)
      }

      const { data, error: insertError } = await supabase.from("profesores").insert(result.data)

      if (insertError) throw insertError

      onUploadComplete()
    } catch (err) {
      console.error("Upload error:", err)
      if (err instanceof Error) {
        if (err.message.includes("could not be read") && retryCount < 3) {
          setRetryCount(retryCount + 1)
          setTimeout(() => handleUpload(), 1000) // Retry after 1 second
        } else {
          setError(err.message)
        }
      } else {
        setError("An unknown error occurred")
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="csv-file">Seleccionar archivo CSV</Label>
        <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
      </div>
      <Button onClick={handleUpload} disabled={!file || uploading}>
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Subiendo..." : "Subir CSV"}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {retryCount > 0 && (
        <Alert>
          <AlertDescription>Reintentando lectura del archivo... (Intento {retryCount}/3)</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default CSVUpload
