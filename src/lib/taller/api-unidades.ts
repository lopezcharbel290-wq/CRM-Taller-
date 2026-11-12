import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Mantenimiento, Orden, PiezaUtilizada } from "./tipos";

function lanzar<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export const llavesUnidades = {
  mantenimientos: ["mantenimientos"] as const,
  mantenimientosUnidad: (unidadId: string) => ["mantenimientos", unidadId] as const,
  piezasUnidad: (unidadId: string) => ["piezas-unidad", unidadId] as const,
};

/** Todos los mantenimientos programados de la flota. */
export function useMantenimientos() {
  return useQuery({
    queryKey: llavesUnidades.mantenimientos,
    queryFn: async () =>
      lanzar(await supabase.from("mantenimientos_programados").select("*")) as Mantenimiento[],
  });
}

export function useMantenimientosUnidad(unidadId: string) {
  return useQuery({
    queryKey: llavesUnidades.mantenimientosUnidad(unidadId),
    queryFn: async () =>
      lanzar(
        await supabase
          .from("mantenimientos_programados")
          .select("*")
          .eq("unidad_id", unidadId)
          .order("tipo_servicio"),
      ) as Mantenimiento[],
  });
}

/** Piezas instaladas en todas las órdenes de una unidad (para el costo acumulado). */
export function usePiezasDeOrdenes(unidadId: string, ordenIds: string[]) {
  return useQuery({
    queryKey: [...llavesUnidades.piezasUnidad(unidadId), ordenIds.length],
    enabled: ordenIds.length > 0,
    queryFn: async () =>
      lanzar(
        await supabase.from("piezas_utilizadas").select("*").in("orden_id", ordenIds),
      ) as PiezaUtilizada[],
  });
}

const DIAS_MS = 1000 * 60 * 60 * 24;

/** Días que la unidad estuvo detenida por cada orden (hasta su validación o hasta hoy). */
export function diasFueraDeServicio(ordenes: Orden[]): number {
  let ms = 0;
  for (const o of ordenes) {
    const inicio = new Date(o.fecha_creacion).getTime();
    const fin = o.fecha_validacion ? new Date(o.fecha_validacion).getTime() : Date.now();
    ms += Math.max(0, fin - inicio);
  }
  return Math.round(ms / DIAS_MS);
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export type Retrabajo = { falla: string; dias: number; folios: string[] };

/** Retrabajo: la misma falla reportada dos veces en menos de 30 días. */
export function detectarRetrabajos(ordenes: Orden[]): Retrabajo[] {
  const grupos = new Map<string, Orden[]>();
  for (const o of ordenes) {
    const llave = normalizar(o.falla_reportada);
    grupos.set(llave, [...(grupos.get(llave) ?? []), o]);
  }

  const resultado: Retrabajo[] = [];
  for (const lista of grupos.values()) {
    const ordenadas = [...lista].sort(
      (a, b) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime(),
    );
    for (let i = 1; i < ordenadas.length; i++) {
      const anterior = ordenadas[i - 1]!;
      const actual = ordenadas[i]!;
      const dias = Math.round(
        (new Date(actual.fecha_creacion).getTime() - new Date(anterior.fecha_creacion).getTime()) /
          DIAS_MS,
      );
      if (dias < 30) {
        resultado.push({
          falla: actual.falla_reportada,
          dias,
          folios: [anterior.folio, actual.folio],
        });
      }
    }
  }
  return resultado;
}

export type AvisoMantenimiento = {
  vencido: boolean;
  porVencer: boolean;
  kmRestantes: number | null;
  diasRestantes: number | null;
};

/** Alerta cuando falta menos del 10% del intervalo (por kilometraje o por días). */
export function avisoMantenimiento(m: Mantenimiento, kmActual: number): AvisoMantenimiento {
  const kmRestantes = m.proximo_servicio_km != null ? m.proximo_servicio_km - kmActual : null;
  const diasRestantes =
    m.proximo_servicio_fecha != null
      ? Math.round((new Date(m.proximo_servicio_fecha).getTime() - Date.now()) / DIAS_MS)
      : null;

  const umbralKm = m.intervalo_km ? m.intervalo_km * 0.1 : null;
  const umbralDias = m.intervalo_dias ? m.intervalo_dias * 0.1 : null;

  const vencido = (kmRestantes != null && kmRestantes <= 0) || (diasRestantes != null && diasRestantes <= 0);
  const porVencer =
    !vencido &&
    ((kmRestantes != null && umbralKm != null && kmRestantes <= umbralKm) ||
      (diasRestantes != null && umbralDias != null && diasRestantes <= umbralDias));

  return { vencido, porVencer, kmRestantes, diasRestantes };
}
