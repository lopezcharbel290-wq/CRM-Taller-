import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMecanicos } from "@/lib/taller/api";
import { ETIQUETA_ESPECIALIDAD } from "@/lib/taller/tipos";

export function AsignarMecanicoDialog({
  abierto,
  onCerrar,
  onConfirmar,
  folio,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (mecanicoId: string) => void;
  folio?: string;
}) {
  const { data: mecanicos = [] } = useMecanicos();
  const [mecanicoId, setMecanicoId] = useState("");

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar mecánico · {folio}</DialogTitle>
          <DialogDescription>
            Si el mecánico ya tiene una orden en reparación, esa orden se pausa automáticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Mecánico</Label>
          <Select value={mecanicoId} onValueChange={setMecanicoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un mecánico" />
            </SelectTrigger>
            <SelectContent>
              {mecanicos.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nombre_completo} · {ETIQUETA_ESPECIALIDAD[m.especialidad] ?? m.especialidad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!mecanicoId}
            onClick={() => {
              onConfirmar(mecanicoId);
              setMecanicoId("");
            }}
          >
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
