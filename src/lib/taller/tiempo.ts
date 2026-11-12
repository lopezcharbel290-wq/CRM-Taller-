import type { SesionTiempo } from "./tipos";

export type ResumenTiempo = {
  msTrabajo: number;
  msPausa: number;
  sesionAbierta: SesionTiempo | null;
  corriendo: boolean;
};

/**
 * El tiempo SIEMPRE se calcula sumando las sesiones guardadas en la base de
 * datos. Nunca se guarda un contador vivo: al recargar la página el resultado
 * es idéntico.
 */
export function resumenTiempo(sesiones: SesionTiempo[], ahora = Date.now()): ResumenTiempo {
  let msTrabajo = 0;
  let msPausa = 0;
  let sesionAbierta: SesionTiempo | null = null;

  for (const s of sesiones) {
    const inicio = new Date(s.fecha_inicio).getTime();
    const fin = s.fecha_fin ? new Date(s.fecha_fin).getTime() : ahora;
    const delta = Math.max(0, fin - inicio);
    if (s.tipo === "trabajo") msTrabajo += delta;
    else msPausa += delta;
    if (!s.fecha_fin) sesionAbierta = s;
  }

  return {
    msTrabajo,
    msPausa,
    sesionAbierta,
    corriendo: sesionAbierta?.tipo === "trabajo",
  };
}

export function minutos(ms: number): number {
  return Math.round(ms / 60000);
}

export type NivelAvance = "ok" | "alerta" | "critico";

export function nivelAvance(msTrabajo: number, estimadoMinutos: number): NivelAvance {
  const pct = porcentajeAvance(msTrabajo, estimadoMinutos);
  if (pct > 100) return "critico";
  if (pct >= 70) return "alerta";
  return "ok";
}

export function porcentajeAvance(msTrabajo: number, estimadoMinutos: number): number {
  if (!estimadoMinutos) return 0;
  return (msTrabajo / (estimadoMinutos * 60000)) * 100;
}

/** Tiempo restante en ms; negativo cuando ya excedió el estimado. */
export function restanteMs(msTrabajo: number, estimadoMinutos: number): number {
  return estimadoMinutos * 60000 - msTrabajo;
}
