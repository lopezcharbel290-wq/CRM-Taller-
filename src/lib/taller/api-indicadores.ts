import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resumenTiempo } from "./tiempo";
import { ETIQUETA_TIPO_ORDEN } from "./tipos";
import type { OrdenCompleta, SesionTiempo } from "./tipos";

export type SesionConMotivo = SesionTiempo & {
  motivo: { descripcion: string; cuenta_como_tiempo_muerto: boolean } | null;
};

export const llavesIndicadores = {
  sesiones: ["indicadores", "sesiones"] as const,
};

function lanzar<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/** Sesiones de tiempo con el motivo de pausa, para el desglose de tiempo muerto. */
export function useSesionesConMotivo() {
  return useQuery({
    queryKey: llavesIndicadores.sesiones,
    queryFn: async (): Promise<SesionConMotivo[]> =>
      lanzar(
        await supabase
          .from("sesiones_tiempo")
          .select("*, motivo:motivos_pausa(descripcion, cuenta_como_tiempo_muerto)")
          .order("fecha_inicio"),
      ) as unknown as SesionConMotivo[],
  });
}

const HORA_MS = 3600000;

export function enRango(fecha: string | null, desde: string, hasta: string): boolean {
  if (!fecha) return false;
  const t = new Date(fecha).getTime();
  const d = desde ? new Date(`${desde}T00:00:00`).getTime() : -Infinity;
  const h = hasta ? new Date(`${hasta}T23:59:59`).getTime() : Infinity;
  return t >= d && t <= h;
}

/** Horas de ciclo: de la creación al cierre de la orden. */
export function horasCiclo(o: OrdenCompleta): number {
  const fin = o.fecha_validacion ?? o.fecha_terminacion;
  if (!fin) return 0;
  return (new Date(fin).getTime() - new Date(o.fecha_creacion).getTime()) / HORA_MS;
}

export function horasEfectivas(o: OrdenCompleta): number {
  return resumenTiempo(o.sesiones).msTrabajo / HORA_MS;
}

function promedio(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function mesEtiqueta(fecha: string): string {
  const d = new Date(fecha);
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** MTTR por mes (horas promedio de reparación de las órdenes cerradas). */
export function mttrPorMes(cerradas: OrdenCompleta[]) {
  const grupos = new Map<string, { etiqueta: string; horas: number[]; orden: number }>();
  for (const o of cerradas) {
    const fin = o.fecha_validacion ?? o.fecha_terminacion;
    if (!fin) continue;
    const d = new Date(fin);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const g = grupos.get(clave) ?? {
      etiqueta: mesEtiqueta(fin),
      horas: [],
      orden: d.getFullYear() * 12 + d.getMonth(),
    };
    g.horas.push(horasCiclo(o));
    grupos.set(clave, g);
  }
  return [...grupos.values()]
    .sort((a, b) => a.orden - b.orden)
    .map((g) => ({ mes: g.etiqueta, mttr: Number(promedio(g.horas).toFixed(1)), ordenes: g.horas.length }));
}

/** MTTR por tipo de falla (tipo de orden). */
export function mttrPorTipo(cerradas: OrdenCompleta[]) {
  const grupos = new Map<string, number[]>();
  for (const o of cerradas) {
    const lista = grupos.get(o.tipo) ?? [];
    lista.push(horasCiclo(o));
    grupos.set(o.tipo, lista);
  }
  return [...grupos.entries()].map(([tipo, horas]) => ({
    tipo: ETIQUETA_TIPO_ORDEN[tipo] ?? tipo,
    mttr: Number(promedio(horas).toFixed(1)),
    ordenes: horas.length,
  }));
}

/** Porcentaje de órdenes cerradas dentro del tiempo estimado. */
export function cumplimientoEstimado(cerradas: OrdenCompleta[]) {
  let dentro = 0;
  let fuera = 0;
  for (const o of cerradas) {
    const estimado = o.tiempo_estimado_minutos ?? 0;
    const efectivo = resumenTiempo(o.sesiones).msTrabajo / 60000;
    if (!estimado) continue;
    if (efectivo <= estimado) dentro += 1;
    else fuera += 1;
  }
  const total = dentro + fuera;
  return { dentro, fuera, total, porcentaje: total ? Math.round((dentro / total) * 100) : 0 };
}

/** Horas muertas agrupadas por motivo de pausa + total de horas efectivas. */
export function tiempoPorMotivo(
  sesiones: SesionConMotivo[],
  ordenesValidas: Set<string>,
) {
  let horasEfectivasTotal = 0;
  const motivos = new Map<string, number>();
  for (const s of sesiones) {
    if (!ordenesValidas.has(s.orden_id)) continue;
    const fin = s.fecha_fin ? new Date(s.fecha_fin).getTime() : Date.now();
    const horas = Math.max(0, fin - new Date(s.fecha_inicio).getTime()) / HORA_MS;
    if (s.tipo === "trabajo") {
      horasEfectivasTotal += horas;
    } else {
      const clave = s.motivo?.descripcion ?? "Sin motivo registrado";
      motivos.set(clave, (motivos.get(clave) ?? 0) + horas);
    }
  }
  const porMotivo = [...motivos.entries()]
    .map(([motivo, horas]) => ({ motivo, horas: Number(horas.toFixed(1)) }))
    .sort((a, b) => b.horas - a.horas);
  const horasMuertasTotal = porMotivo.reduce((a, b) => a + b.horas, 0);
  return {
    porMotivo,
    horasEfectivasTotal: Number(horasEfectivasTotal.toFixed(1)),
    horasMuertasTotal: Number(horasMuertasTotal.toFixed(1)),
  };
}

/** Órdenes por mecánico, con desglose por tipo de trabajo y promedio de horas. */
export function porMecanico(ordenes: OrdenCompleta[]) {
  const grupos = new Map<
    string,
    { mecanico: string; correctivo: number; preventivo: number; diagnostico: number; horas: number[] }
  >();
  for (const o of ordenes) {
    const nombre = o.mecanico?.nombre_completo ?? "Sin asignar";
    const g =
      grupos.get(nombre) ??
      { mecanico: nombre, correctivo: 0, preventivo: 0, diagnostico: 0, horas: [] as number[] };
    if (o.tipo === "correctivo") g.correctivo += 1;
    else if (o.tipo === "preventivo") g.preventivo += 1;
    else g.diagnostico += 1;
    const h = horasEfectivas(o);
    if (h > 0) g.horas.push(h);
    grupos.set(nombre, g);
  }
  return [...grupos.values()]
    .map((g) => ({
      mecanico: g.mecanico,
      correctivo: g.correctivo,
      preventivo: g.preventivo,
      diagnostico: g.diagnostico,
      total: g.correctivo + g.preventivo + g.diagnostico,
      promedioHoras: Number(promedio(g.horas).toFixed(1)),
    }))
    .sort((a, b) => b.total - a.total);
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Top 10 fallas más reportadas. */
export function topFallas(ordenes: OrdenCompleta[], limite = 10) {
  const grupos = new Map<string, { falla: string; total: number }>();
  for (const o of ordenes) {
    const clave = normalizar(o.falla_reportada ?? "");
    if (!clave) continue;
    const g = grupos.get(clave) ?? { falla: o.falla_reportada, total: 0 };
    g.total += 1;
    grupos.set(clave, g);
  }
  return [...grupos.values()].sort((a, b) => b.total - a.total).slice(0, limite);
}

/** Top unidades problemáticas por número de órdenes y horas de taller. */
export function topUnidades(ordenes: OrdenCompleta[], limite = 10) {
  const grupos = new Map<string, { unidad: string; total: number; horas: number }>();
  for (const o of ordenes) {
    const clave = o.unidad?.numero_economico ?? "—";
    const g = grupos.get(clave) ?? { unidad: clave, total: 0, horas: 0 };
    g.total += 1;
    g.horas += horasEfectivas(o);
    grupos.set(clave, g);
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, horas: Number(g.horas.toFixed(1)) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

/** Descarga un CSV con separador de coma y BOM para Excel en español. */
export function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const contenido = filas
    .map((fila) =>
      fila
        .map((celda) => {
          const texto = String(celda ?? "");
          return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
        })
        .join(","),
    )
    .join("\r\n");
  const blob = new Blob([`\uFEFF${contenido}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
