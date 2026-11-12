import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCronometro } from "@/lib/taller/formato";
import { nivelAvance, porcentajeAvance, restanteMs } from "@/lib/taller/tiempo";

/** Reloj compartido: se actualiza cada segundo para todos los cronómetros. */
export function useAhora(activo = true) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activo) return;
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activo]);
  return ahora;
}

const TEXTO_NIVEL = {
  ok: "text-ok",
  alerta: "text-alerta",
  critico: "text-critico",
} as const;

const BARRA_NIVEL = {
  ok: "bg-ok",
  alerta: "bg-alerta",
  critico: "bg-critico",
} as const;

export function Cronometro({
  msTrabajo,
  estimadoMinutos,
  corriendo,
  className,
}: {
  msTrabajo: number;
  estimadoMinutos: number;
  corriendo: boolean;
  className?: string;
}) {
  const nivel = nivelAvance(msTrabajo, estimadoMinutos);
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("cronometro text-3xl font-bold", TEXTO_NIVEL[nivel])}>
        {formatCronometro(msTrabajo)}
      </span>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          corriendo ? "animate-pulse bg-ok" : "bg-pausa",
        )}
        aria-hidden
      />
    </div>
  );
}

export function BarraAvance({
  msTrabajo,
  estimadoMinutos,
}: {
  msTrabajo: number;
  estimadoMinutos: number;
}) {
  const pct = porcentajeAvance(msTrabajo, estimadoMinutos);
  const nivel = nivelAvance(msTrabajo, estimadoMinutos);
  const restante = restanteMs(msTrabajo, estimadoMinutos);

  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", BARRA_NIVEL[nivel])}
          style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          Estimado {Math.floor(estimadoMinutos / 60)} h {String(estimadoMinutos % 60).padStart(2, "0")} min
        </span>
        <span className={cn("font-semibold", TEXTO_NIVEL[nivel])}>
          {restante >= 0 ? "Restante " : "Excedido "}
          {formatCronometro(Math.abs(restante))}
          {` · ${Math.round(pct)}%`}
        </span>
      </div>
    </div>
  );
}
