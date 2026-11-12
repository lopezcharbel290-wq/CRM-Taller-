import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useCrearOrden, useMecanicos, useOperadores, useUnidades } from "@/lib/taller/api";
import { ETIQUETA_ESPECIALIDAD } from "@/lib/taller/tipos";
import type { Orden } from "@/lib/taller/tipos";

const SIN_ASIGNAR = "sin_asignar";

export function NuevaOrdenDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const { data: unidades = [] } = useUnidades();
  const { data: operadores = [] } = useOperadores();
  const { data: mecanicos = [] } = useMecanicos();
  const crear = useCrearOrden();

  const [unidadId, setUnidadId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [operadorId, setOperadorId] = useState(SIN_ASIGNAR);
  const [mecanicoId, setMecanicoId] = useState(SIN_ASIGNAR);
  const [tipo, setTipo] = useState<Orden["tipo"]>("correctivo");
  const [prioridad, setPrioridad] = useState<Orden["prioridad"]>("media");
  const [falla, setFalla] = useState("");
  const [km, setKm] = useState("");
  const [estimado, setEstimado] = useState("120");

  const unidadesFiltradas = unidades.filter((u) =>
    u.numero_economico.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const limpiar = () => {
    setUnidadId("");
    setBusqueda("");
    setOperadorId(SIN_ASIGNAR);
    setMecanicoId(SIN_ASIGNAR);
    setTipo("correctivo");
    setPrioridad("media");
    setFalla("");
    setKm("");
    setEstimado("120");
  };

  const guardar = async () => {
    if (!unidadId || !falla.trim()) {
      toast.error("Selecciona la unidad y describe la falla reportada");
      return;
    }
    try {
      const creada = await crear.mutateAsync({
        unidad_id: unidadId,
        operador_reporta_id: operadorId === SIN_ASIGNAR ? null : operadorId,
        mecanico_asignado_id: mecanicoId === SIN_ASIGNAR ? null : mecanicoId,
        tipo,
        prioridad,
        falla_reportada: falla.trim(),
        kilometraje_ingreso: km ? Number(km) : null,
        tiempo_estimado_minutos: Number(estimado) || 60,
      });
      toast.success(`Orden ${creada.folio} creada. La unidad pasó a "en taller".`);
      limpiar();
      setAbierto(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear la orden");
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg">
            <Plus /> Nueva Orden
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva orden de reparación</DialogTitle>
          <DialogDescription>
            Al crear la orden, la unidad cambia automáticamente a estado "en taller".
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Unidad (busca por número económico)</Label>
            <Input
              placeholder="Ej. TR-1042"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Select value={unidadId} onValueChange={setUnidadId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la unidad" />
              </SelectTrigger>
              <SelectContent>
                {unidadesFiltradas.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.numero_economico} · {u.marca} {u.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Operador que reporta</Label>
            <Select value={operadorId} onValueChange={setOperadorId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_ASIGNAR}>Sin especificar</SelectItem>
                {operadores.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nombre_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mecánico (opcional)</Label>
            <Select value={mecanicoId} onValueChange={setMecanicoId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_ASIGNAR}>Asignar después</SelectItem>
                {mecanicos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombre_completo} · {ETIQUETA_ESPECIALIDAD[m.especialidad] ?? m.especialidad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Orden["tipo"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="correctivo">Correctivo</SelectItem>
                <SelectItem value="preventivo">Preventivo</SelectItem>
                <SelectItem value="diagnostico">Diagnóstico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prioridad</Label>
            <Select value={prioridad} onValueChange={(v) => setPrioridad(v as Orden["prioridad"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Falla reportada</Label>
            <Textarea rows={3} value={falla} onChange={(e) => setFalla(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Kilometraje de ingreso</Label>
            <Input inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Tiempo estimado (minutos)</Label>
            <Input
              inputMode="numeric"
              value={estimado}
              onChange={(e) => setEstimado(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={crear.isPending}>
            {crear.isPending ? "Guardando…" : "Crear orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
