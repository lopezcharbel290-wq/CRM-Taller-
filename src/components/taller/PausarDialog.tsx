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
import { Textarea } from "@/components/ui/textarea";
import { useMotivosPausa } from "@/lib/taller/api";

export function PausarDialog({
  abierto,
  onCerrar,
  onConfirmar,
  folio,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (motivoId: string, notas: string) => void;
  folio?: string;
}) {
  const { data: motivos = [] } = useMotivosPausa();
  const [motivoId, setMotivoId] = useState("");
  const [notas, setNotas] = useState("");

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pausar orden {folio}</DialogTitle>
          <DialogDescription>
            Toda pausa exige un motivo. Sin motivo no se puede detener el temporizador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo de la pausa</Label>
            <Select value={motivoId} onValueChange={setMotivoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.descripcion}
                    {m.cuenta_como_tiempo_muerto ? " (tiempo muerto)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!motivoId}
            onClick={() => {
              onConfirmar(motivoId, notas);
              setMotivoId("");
              setNotas("");
            }}
          >
            Pausar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
