"use client"

import { DialogFooter } from "@/components/ui/dialog"
import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Check, AlertTriangle, Info, Calendar } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

interface PdfHorarioUploaderProps {
  selectedPeriod: string
  onProcessComplete: () => void
}

interface DuplicateItem {
  type: "profesor" | "materia"
  name: string
  existingId: number
  action: "replace" | "skip" | "keep_both"
}

interface Periodo {
  id: number
  nombre: string
}

export default function PdfHorarioUploader({ selectedPeriod, onProcessComplete }: PdfHorarioUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([])
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false)
  const [processingResults, setProcessingResults] = useState<any>(null)
  const [showResultsPreview, setShowResultsPreview] = useState(false)
  const [periodoNombre, setPeriodoNombre] = useState<string>("")

  useEffect(() => {
    if (selectedPeriod) {
      fetchPeriodoNombre(selectedPeriod)
    }
  }, [selectedPeriod])

  const fetchPeriodoNombre = async (periodoId: string) => {
    try {
      const { data, error } = await supabase.from("periodos").select("nombre").eq("id", periodoId).single()

      if (error) throw error
      if (data) setPeriodoNombre(data.nombre)
    } catch (error) {
      console.error("Error fetching periodo:", error)
      setPeriodoNombre("")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type !== "application/pdf") {
        setError("Por favor, seleccione un archivo PDF")
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleDuplicateAction = (index: number, action: "replace" | "skip" | "keep_both") => {
    setDuplicates((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], action }
      return updated
    })
  }

  const handleConfirmDuplicates = async () => {
    setShowDuplicatesDialog(false)
    setIsProcessing(true)
    setProcessingStatus("Procesando datos con las decisiones tomadas...")
    setProgress(60)

    try {
      // Enviar las decisiones sobre duplicados al servidor
      const response = await fetch("/api/procesar-horario-pdf/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodoId: selectedPeriod,
          duplicates,
          processingResults,
        }),
      })

      // Manejar respuestas no-JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        throw new Error(`Respuesta no válida del servidor: ${text.substring(0, 100)}...`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar los duplicados")
      }

      // Simular finalización del procesamiento
      let currentProgress = 60
      const processingInterval = setInterval(() => {
        currentProgress += 10
        if (currentProgress >= 100) {
          clearInterval(processingInterval)
          setIsProcessing(false)
          setProcessingStatus("¡Procesamiento completado!")
          toast({
            title: "Éxito",
            description: `El horario ha sido procesado y cargado correctamente para el periodo ${periodoNombre}. Se agregaron ${data.stats.materias} materias y ${data.stats.grupos} grupos.`,
          })
          onProcessComplete()
        } else {
          setProgress(currentProgress)
          updateProcessingStatus(currentProgress)
        }
      }, 200)
    } catch (error) {
      console.error("Error processing duplicates:", error)
      setError(error instanceof Error ? error.message : "Error al procesar los duplicados")
      setIsProcessing(false)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor, seleccione un archivo PDF")
      return
    }

    if (!selectedPeriod) {
      setError("Por favor, seleccione un periodo académico")
      return
    }

    setIsUploading(true)
    setProgress(0)
    setProcessingStatus("Subiendo archivo...")
    setDuplicates([])
    setProcessingResults(null)
    setError(null) // Limpiar errores anteriores

    try {
      // Simular progreso de carga
      const uploadInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 40) {
            clearInterval(uploadInterval)
            return 40
          }
          return prev + 5
        })
      }, 200)

      // Subir el archivo al servidor
      const formData = new FormData()
      formData.append("file", file)
      formData.append("periodoId", selectedPeriod)

      const response = await fetch("/api/procesar-horario-pdf", {
        method: "POST",
        body: formData,
      })

      clearInterval(uploadInterval)
      setProgress(50)

      // Manejar respuestas no-JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        throw new Error(`Respuesta no válida del servidor: ${text.substring(0, 100)}...`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar el archivo")
      }

      // Guardar los resultados para mostrarlos en la vista previa
      setProcessingResults(data.results)

      // Si hay duplicados, mostrar el diálogo para que el usuario decida
      if (data.duplicates && data.duplicates.length > 0) {
        setDuplicates(data.duplicates)
        setIsUploading(false)
        setShowDuplicatesDialog(true)
        return
      }

      // Si no hay duplicados, continuar con el procesamiento
      setIsUploading(false)
      setIsProcessing(true)
      setProcessingStatus("Procesando datos del horario...")

      // Simular procesamiento de datos
      let currentProgress = 50
      const processingInterval = setInterval(() => {
        currentProgress += 10
        if (currentProgress >= 100) {
          clearInterval(processingInterval)
          setIsProcessing(false)
          setProcessingStatus("¡Procesamiento completado!")
          toast({
            title: "Éxito",
            description: `El horario ha sido procesado y cargado correctamente para el periodo ${periodoNombre}. Se agregaron ${data.stats?.materias || 0} materias y ${data.stats?.grupos || 0} grupos.`,
          })
          onProcessComplete()
        } else {
          setProgress(currentProgress)
          updateProcessingStatus(currentProgress)
        }
      }, 200)
    } catch (error) {
      console.error("Error uploading PDF:", error)
      setError(error instanceof Error ? error.message : "Error al procesar el archivo")
      setIsUploading(false)
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const updateProcessingStatus = (progress: number) => {
    if (progress < 20) {
      setProcessingStatus("Extrayendo texto del PDF...")
    } else if (progress < 40) {
      setProcessingStatus("Identificando materias y profesores...")
    } else if (progress < 60) {
      setProcessingStatus("Procesando horarios...")
    } else if (progress < 80) {
      setProcessingStatus("Creando grupos y asignaciones...")
    } else {
      setProcessingStatus("Finalizando procesamiento...")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Cargar Horario desde PDF - Periodo {periodoNombre}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert variant="outline" className="bg-blue-50 border-blue-200">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-600">
              Los datos se cargarán en el periodo: <strong>{periodoNombre}</strong>
            </AlertDescription>
          </Alert>

          {isUploading || isProcessing ? (
            <div className="space-y-4">
              <Progress value={progress} className="h-2 w-full" />
              <p className="text-sm text-center">{processingStatus}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-4">
                <div className="grid w-full gap-1.5">
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={isUploading || isProcessing}
                  />
                  <p className="text-sm text-muted-foreground">Seleccione un archivo PDF con el horario generado</p>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={!file || isUploading || isProcessing}
                  className="whitespace-nowrap"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Procesar PDF
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {processingResults && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowResultsPreview(!showResultsPreview)}
                    className="w-full"
                  >
                    <Info className="mr-2 h-4 w-4" />
                    {showResultsPreview ? "Ocultar" : "Mostrar"} resultados del procesamiento
                  </Button>

                  {showResultsPreview && (
                    <div className="mt-4 space-y-4 p-4 border rounded-md">
                      <div>
                        <h4 className="font-medium mb-2">
                          Materias encontradas ({processingResults.materias?.length || 0}):
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {processingResults.materias?.map((materia: any, index: number) => (
                            <Badge key={index} variant="outline">
                              {materia.nombre}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">
                          Profesores encontrados ({processingResults.profesores?.length || 0}):
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {processingResults.profesores?.map((profesor: any, index: number) => (
                            <Badge key={index} variant="outline">
                              {profesor.nombre}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">
                          Grupos encontrados ({processingResults.grupos?.length || 0}):
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {processingResults.grupos?.map((grupo: any, index: number) => (
                            <Badge key={index} variant="outline">
                              {grupo.numero} - {grupo.turno}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-md bg-muted p-4">
                <h4 className="mb-2 text-sm font-medium">Instrucciones:</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Seleccione un archivo PDF con el horario generado</li>
                  <li>El sistema extraerá automáticamente las materias, profesores, grupos y horarios</li>
                  <li>
                    Los datos se cargarán en el periodo académico <strong>{periodoNombre}</strong>
                  </li>
                  <li>Si se detectan duplicados, podrá decidir qué hacer con ellos</li>
                  <li>Verifique los datos después de la carga para asegurarse de que todo esté correcto</li>
                </ul>
              </div>
            </>
          )}

          {!isUploading && !isProcessing && processingStatus === "¡Procesamiento completado!" && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                El horario ha sido procesado y cargado correctamente para el periodo {periodoNombre}.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>

      {/* Diálogo para manejar duplicados */}
      <Dialog open={showDuplicatesDialog} onOpenChange={setShowDuplicatesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5 text-blue-500" />
              Se encontraron elementos duplicados
            </DialogTitle>
            <DialogDescription>
              Por favor, indique qué acción tomar para cada elemento duplicado en el periodo{" "}
              <strong>{periodoNombre}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {duplicates.map((item, index) => (
              <div key={index} className="p-4 border rounded-md">
                <div className="font-medium mb-2">
                  {item.type === "profesor" ? "Profesor" : "Materia"}: <span className="text-primary">{item.name}</span>
                </div>
                <RadioGroup
                  defaultValue={item.action}
                  onValueChange={(value) => handleDuplicateAction(index, value as "replace" | "skip" | "keep_both")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id={`replace-${index}`} />
                    <Label htmlFor={`replace-${index}`}>Reemplazar el existente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id={`skip-${index}`} />
                    <Label htmlFor={`skip-${index}`}>Omitir (mantener el existente)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep_both" id={`keep-${index}`} />
                    <Label htmlFor={`keep-${index}`}>Mantener ambos (crear nuevo)</Label>
                  </div>
                </RadioGroup>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicatesDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmDuplicates}>Continuar con el procesamiento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
