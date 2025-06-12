"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings } from "lucide-react"
import type { ConfiguracionHorario } from "@/types/config"

interface ConfiguracionHorarioDialogProps {
  config: ConfiguracionHorario
  onSave: (config: ConfiguracionHorario) => void
}

export function ConfiguracionHorarioDialog({ config, onSave }: ConfiguracionHorarioDialogProps) {
  const [configTemp, setConfigTemp] = useState<ConfiguracionHorario>(config)
  const [open, setOpen] = useState(false)

  const handleSave = () => {
    onSave(configTemp)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Modificar Información
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración del Horario</DialogTitle>
          <DialogDescription>
            Ajusta la información que aparecerá en el encabezado y pie de página del horario.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombreUniversidad">Nombre de la Universidad</Label>
              <Input
                id="nombreUniversidad"
                value={configTemp.nombreUniversidad}
                onChange={(e) => setConfigTemp({ ...configTemp, nombreUniversidad: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombreDireccion">Nombre de la Dirección</Label>
              <Input
                id="nombreDireccion"
                value={configTemp.nombreDireccion}
                onChange={(e) => setConfigTemp({ ...configTemp, nombreDireccion: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccionUniversidad">Dirección de la Universidad</Label>
            <Input
              id="direccionUniversidad"
              value={configTemp.direccionUniversidad}
              onChange={(e) => setConfigTemp({ ...configTemp, direccionUniversidad: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="director">Director de Programa Educativo</Label>
              <Input
                id="director"
                value={configTemp.director}
                onChange={(e) => setConfigTemp({ ...configTemp, director: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretario">Secretario Académico</Label>
              <Input
                id="secretario"
                value={configTemp.secretario}
                onChange={(e) => setConfigTemp({ ...configTemp, secretario: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recursosHumanos">Recursos Humanos</Label>
              <Input
                id="recursosHumanos"
                value={configTemp.recursosHumanos}
                onChange={(e) => setConfigTemp({ ...configTemp, recursosHumanos: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodo">Periodo Actual</Label>
              <Input
                id="periodo"
                value={configTemp.periodo}
                onChange={(e) => setConfigTemp({ ...configTemp, periodo: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaRevision">Fecha de Revisión</Label>
              <Input
                id="fechaRevision"
                value={configTemp.fechaRevision}
                onChange={(e) => setConfigTemp({ ...configTemp, fechaRevision: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroRevision">Número de Revisión</Label>
              <Input
                id="numeroRevision"
                value={configTemp.numeroRevision}
                onChange={(e) => setConfigTemp({ ...configTemp, numeroRevision: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigoDocumento">Código de Documento</Label>
              <Input
                id="codigoDocumento"
                value={configTemp.codigoDocumento}
                onChange={(e) => setConfigTemp({ ...configTemp, codigoDocumento: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL del Logo</Label>
            <Input
              id="logoUrl"
              value={configTemp.logoUrl}
              onChange={(e) => setConfigTemp({ ...configTemp, logoUrl: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar Cambios</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
