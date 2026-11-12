import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Usuario } from "./tipos";

type Tablas = Database["public"]["Tables"];
export type Meta = Tablas["metas"]["Row"];
export type NuevaMeta = Tablas["metas"]["Insert"];
export type EstadoMeta = Database["public"]["Enums"]["meta_estado"];
export type TipoMeta = Database["public"]["Enums"]["meta_tipo"];

export type MetaCompleta = Meta & {
  responsable: Pick<Usuario, "id" | "nombre_completo"> | null;
};

export const ETIQUETA_META_ESTADO: Record<EstadoMeta, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  cumplida: "Cumplida",
  vencida: "Vencida",
};

export const ETIQUETA_META_TIPO: Record<TipoMeta, string> = {
  individual: "Individual",
  area: "De área",
};

export const llavesMetas = { metas: ["metas"] as const };

function lanzar<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export function useMetas() {
  return useQuery({
    queryKey: llavesMetas.metas,
    queryFn: async (): Promise<MetaCompleta[]> =>
      lanzar(
        await supabase
          .from("metas")
          .select("*, responsable:usuarios(id, nombre_completo)")
          .order("fecha_objetivo"),
      ) as unknown as MetaCompleta[],
  });
}

export function useCrearMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: NuevaMeta) => {
      lanzar(await supabase.from("metas").insert(datos).select("id"));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: llavesMetas.metas }),
  });
}

export function useActualizarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Meta> }) => {
      lanzar(await supabase.from("metas").update(cambios).eq("id", id).select("id"));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: llavesMetas.metas }),
  });
}

export function useEliminarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metas").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: llavesMetas.metas }),
  });
}

/** Una meta está vencida cuando pasó su fecha objetivo y no fue cumplida. */
export function metaVencida(meta: Meta): boolean {
  if (meta.estado === "cumplida") return false;
  return new Date(`${meta.fecha_objetivo}T23:59:59`).getTime() < Date.now();
}

// ------------------------- Calendario mensual -------------------------

export type TipoEvento = "meta" | "mantenimiento" | "orden" | "entrega";

export type EventoCalendario = {
  id: string;
  dia: string; // AAAA-MM-DD
  tipo: TipoEvento;
  titulo: string;
  detalle: string;
  urgente?: boolean;
  enlace?: { to: string; params?: Record<string, string> };
};

export function claveDia(valor: string | Date): string {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Días del mes con relleno para completar semanas de lunes a domingo. */
export function cuadriculaMes(anio: number, mes: number): (Date | null)[] {
  const primero = new Date(anio, mes, 1);
  const dias = new Date(anio, mes + 1, 0).getDate();
  const desplazamiento = (primero.getDay() + 6) % 7; // lunes = 0
  const celdas: (Date | null)[] = Array.from({ length: desplazamiento }, () => null);
  for (let d = 1; d <= dias; d += 1) celdas.push(new Date(anio, mes, d));
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

export const NOMBRE_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
