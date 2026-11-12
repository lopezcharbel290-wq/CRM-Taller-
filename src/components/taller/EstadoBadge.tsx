import { cn } from "@/lib/utils";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD } from "@/lib/taller/tipos";
import type { EstadoOrden, PrioridadOrden } from "@/lib/taller/tipos";

const CLASE_ESTADO: Record<EstadoOrden, string> = {
  creada: "bg-secondary text-secondary-foreground",
  diagnostico: "bg-refaccion-soft text-refaccion",
  esperando_refaccion: "bg-refaccion text-refaccion-foreground",
  en_reparacion: "bg-ok text-ok-foreground",
  pausada: "bg-pausa text-pausa-foreground",
  pruebas: "bg-alerta text-alerta-foreground",
  terminada: "bg-ok-soft text-ok",
  validada: "bg-primary text-primary-foreground",
};

const CLASE_PRIORIDAD: Record<PrioridadOrden, string> = {
  baja: "bg-secondary text-secondary-foreground",
  media: "bg-refaccion-soft text-refaccion",
  alta: "bg-alerta text-alerta-foreground",
  critica: "bg-critico text-critico-foreground",
};

const base =
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide";

export function EstadoBadge({ estado, className }: { estado: EstadoOrden; className?: string }) {
  return <span className={cn(base, CLASE_ESTADO[estado], className)}>{ETIQUETA_ESTADO[estado]}</span>;
}

export function PrioridadBadge({
  prioridad,
  className,
}: {
  prioridad: PrioridadOrden;
  className?: string;
}) {
  return (
    <span className={cn(base, CLASE_PRIORIDAD[prioridad], className)}>
      {ETIQUETA_PRIORIDAD[prioridad]}
    </span>
  );
}
