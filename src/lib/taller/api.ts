import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { minutos, resumenTiempo } from "./tiempo";
import type {
  MotivoPausa,
  Operador,
  Orden,
  OrdenCompleta,
  SesionTiempo,
  Unidad,
  Usuario,
} from "./tipos";

const SELECT_ORDEN =
  "*, unidad:unidades(id, numero_economico, tipo, marca, modelo, estado), mecanico:usuarios(id, nombre_completo, especialidad), operador:operadores(id, nombre_completo)";

export const llaves = {
  ordenes: ["ordenes"] as const,
  orden: (id: string) => ["orden", id] as const,
  sesiones: ["sesiones"] as const,
  unidades: ["unidades"] as const,
  operadores: ["operadores"] as const,
  mecanicos: ["mecanicos"] as const,
  motivos: ["motivos_pausa"] as const,
  refacciones: ["refacciones"] as const,
  bitacora: (id: string) => ["bitacora", id] as const,
};

function lanzar<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/** Órdenes con sus sesiones de tiempo (fuente de verdad del cronómetro). */
export function useOrdenes() {
  return useQuery({
    queryKey: llaves.ordenes,
    refetchInterval: 30000,
    queryFn: async (): Promise<OrdenCompleta[]> => {
      const ordenes = lanzar(
        await supabase
          .from("ordenes_reparacion")
          .select(SELECT_ORDEN)
          .order("fecha_creacion", { ascending: false }),
      ) as unknown as OrdenCompleta[];

      const sesiones = lanzar(
        await supabase.from("sesiones_tiempo").select("*").order("fecha_inicio"),
      ) as SesionTiempo[];

      const porOrden = new Map<string, SesionTiempo[]>();
      for (const s of sesiones) {
        const lista = porOrden.get(s.orden_id) ?? [];
        lista.push(s);
        porOrden.set(s.orden_id, lista);
      }

      return ordenes.map((o) => ({ ...o, sesiones: porOrden.get(o.id) ?? [] }));
    },
  });
}

export function useOrden(id: string) {
  return useQuery({
    queryKey: llaves.orden(id),
    queryFn: async (): Promise<OrdenCompleta> => {
      const orden = lanzar(
        await supabase.from("ordenes_reparacion").select(SELECT_ORDEN).eq("id", id).single(),
      ) as unknown as OrdenCompleta;
      const sesiones = lanzar(
        await supabase
          .from("sesiones_tiempo")
          .select("*")
          .eq("orden_id", id)
          .order("fecha_inicio"),
      ) as SesionTiempo[];
      return { ...orden, sesiones };
    },
  });
}

export function useUnidades() {
  return useQuery({
    queryKey: llaves.unidades,
    queryFn: async () =>
      lanzar(
        await supabase.from("unidades").select("*").order("numero_economico"),
      ) as Unidad[],
  });
}

export function useOperadores() {
  return useQuery({
    queryKey: llaves.operadores,
    queryFn: async () =>
      lanzar(
        await supabase.from("operadores").select("*").eq("activo", true).order("nombre_completo"),
      ) as Operador[],
  });
}

export function useMecanicos() {
  return useQuery({
    queryKey: llaves.mecanicos,
    queryFn: async () =>
      lanzar(
        await supabase
          .from("usuarios")
          .select("*")
          .eq("rol", "mecanico")
          .eq("activo", true)
          .order("nombre_completo"),
      ) as Usuario[],
  });
}

export function useMotivosPausa() {
  return useQuery({
    queryKey: llaves.motivos,
    queryFn: async () =>
      lanzar(await supabase.from("motivos_pausa").select("*").order("descripcion")) as MotivoPausa[],
  });
}

export function useBitacoraOrden(id: string) {
  return useQuery({
    queryKey: llaves.bitacora(id),
    queryFn: async () =>
      lanzar(
        await supabase
          .from("bitacora")
          .select("*")
          .eq("entidad_id", id)
          .order("fecha", { ascending: false }),
      ),
  });
}

async function sesionesDe(ordenId: string): Promise<SesionTiempo[]> {
  return lanzar(
    await supabase.from("sesiones_tiempo").select("*").eq("orden_id", ordenId).order("fecha_inicio"),
  ) as SesionTiempo[];
}

async function cerrarSesionAbierta(ordenId: string) {
  const sesiones = await sesionesDe(ordenId);
  const abierta = sesiones.find((s) => !s.fecha_fin);
  if (abierta) {
    lanzar(
      await supabase
        .from("sesiones_tiempo")
        .update({ fecha_fin: new Date().toISOString() })
        .eq("id", abierta.id)
        .select("id"),
    );
  }
}

async function guardarTotales(ordenId: string, extra: Partial<Orden> = {}) {
  const sesiones = await sesionesDe(ordenId);
  const { msTrabajo, msPausa } = resumenTiempo(sesiones);
  lanzar(
    await supabase
      .from("ordenes_reparacion")
      .update({
        tiempo_efectivo_minutos: minutos(msTrabajo),
        tiempo_muerto_minutos: minutos(msPausa),
        ...extra,
      })
      .eq("id", ordenId)
      .select("id"),
  );
}

/**
 * Regla: un mecánico solo puede tener una orden en reparación a la vez.
 * Las demás pasan a pausada con motivo "Emergencia en otra unidad".
 */
async function pausarOtrasDelMecanico(mecanicoId: string | null, exceptoOrdenId: string, jefeId: string | null) {
  if (!mecanicoId) return;
  const otras = lanzar(
    await supabase
      .from("ordenes_reparacion")
      .select("id")
      .eq("mecanico_asignado_id", mecanicoId)
      .eq("estado", "en_reparacion")
      .neq("id", exceptoOrdenId),
  ) as { id: string }[];

  if (otras.length === 0) return;
  const motivos = lanzar(
    await supabase
      .from("motivos_pausa")
      .select("*")
      .eq("descripcion", "Emergencia en otra unidad")
      .limit(1),
  ) as MotivoPausa[];
  const motivoId = motivos[0]?.id ?? null;

  for (const o of otras) {
    await cerrarSesionAbierta(o.id);
    if (motivoId) {
      lanzar(
        await supabase
          .from("sesiones_tiempo")
          .insert({
            orden_id: o.id,
            tipo: "pausa",
            motivo_pausa_id: motivoId,
            iniciada_por_usuario_id: jefeId,
            notas: "Pausa automática: el mecánico fue asignado a otra unidad",
          })
          .select("id"),
      );
    }
    await guardarTotales(o.id, { estado: "pausada" });
  }
}

type ContextoJefe = { usuarioId: string | null };

export function useAccionesTemporizador({ usuarioId }: ContextoJefe) {
  const qc = useQueryClient();
  const invalidar = (ordenId?: string) => {
    qc.invalidateQueries({ queryKey: llaves.ordenes });
    if (ordenId) {
      qc.invalidateQueries({ queryKey: llaves.orden(ordenId) });
      qc.invalidateQueries({ queryKey: llaves.bitacora(ordenId) });
    }
  };

  const iniciar = useMutation({
    mutationFn: async (orden: Orden) => {
      await pausarOtrasDelMecanico(orden.mecanico_asignado_id, orden.id, usuarioId);
      await cerrarSesionAbierta(orden.id);
      lanzar(
        await supabase
          .from("sesiones_tiempo")
          .insert({ orden_id: orden.id, tipo: "trabajo", iniciada_por_usuario_id: usuarioId })
          .select("id"),
      );
      await guardarTotales(orden.id, {
        estado: "en_reparacion",
        fecha_inicio: orden.fecha_inicio ?? new Date().toISOString(),
      });
    },
    onSuccess: (_d, orden) => invalidar(orden.id),
  });

  const pausar = useMutation({
    mutationFn: async ({ orden, motivoId, notas }: { orden: Orden; motivoId: string; notas?: string }) => {
      if (!motivoId) throw new Error("Toda pausa requiere un motivo");
      await cerrarSesionAbierta(orden.id);
      lanzar(
        await supabase
          .from("sesiones_tiempo")
          .insert({
            orden_id: orden.id,
            tipo: "pausa",
            motivo_pausa_id: motivoId,
            notas: notas ?? null,
            iniciada_por_usuario_id: usuarioId,
          })
          .select("id"),
      );
      await guardarTotales(orden.id, { estado: "pausada" });
    },
    onSuccess: (_d, v) => invalidar(v.orden.id),
  });

  const reanudar = useMutation({
    mutationFn: async (orden: Orden) => {
      await pausarOtrasDelMecanico(orden.mecanico_asignado_id, orden.id, usuarioId);
      await cerrarSesionAbierta(orden.id);
      lanzar(
        await supabase
          .from("sesiones_tiempo")
          .insert({ orden_id: orden.id, tipo: "trabajo", iniciada_por_usuario_id: usuarioId })
          .select("id"),
      );
      await guardarTotales(orden.id, {
        estado: "en_reparacion",
        fecha_inicio: orden.fecha_inicio ?? new Date().toISOString(),
      });
    },
    onSuccess: (_d, orden) => invalidar(orden.id),
  });

  const terminar = useMutation({
    mutationFn: async (orden: Orden) => {
      await cerrarSesionAbierta(orden.id);
      await guardarTotales(orden.id, {
        estado: "terminada",
        fecha_terminacion: new Date().toISOString(),
      });
    },
    onSuccess: (_d, orden) => invalidar(orden.id),
  });

  const validar = useMutation({
    mutationFn: async ({ orden, observaciones }: { orden: Orden; observaciones?: string }) => {
      if (!orden.diagnostico_mecanico?.trim()) {
        throw new Error("No se puede validar una orden sin diagnóstico capturado");
      }
      await cerrarSesionAbierta(orden.id);
      await guardarTotales(orden.id, {
        estado: "validada",
        fecha_validacion: new Date().toISOString(),
        observaciones_jefe: observaciones ?? orden.observaciones_jefe,
      });
    },
    onSuccess: (_d, v) => invalidar(v.orden.id),
  });

  const reasignar = useMutation({
    mutationFn: async ({ orden, mecanicoId }: { orden: Orden; mecanicoId: string }) => {
      lanzar(
        await supabase
          .from("ordenes_reparacion")
          .update({ mecanico_asignado_id: mecanicoId })
          .eq("id", orden.id)
          .select("id"),
      );
    },
    onSuccess: (_d, v) => invalidar(v.orden.id),
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ orden, estado }: { orden: Orden; estado: Orden["estado"] }) => {
      lanzar(
        await supabase
          .from("ordenes_reparacion")
          .update({ estado })
          .eq("id", orden.id)
          .select("id"),
      );
    },
    onSuccess: (_d, v) => invalidar(v.orden.id),
  });

  return { iniciar, pausar, reanudar, terminar, validar, reasignar, cambiarEstado };
}

export type NuevaOrden = {
  unidad_id: string;
  operador_reporta_id: string | null;
  mecanico_asignado_id: string | null;
  tipo: Orden["tipo"];
  prioridad: Orden["prioridad"];
  falla_reportada: string;
  kilometraje_ingreso: number | null;
  tiempo_estimado_minutos: number;
};

export function useCrearOrden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: NuevaOrden) => {
      const creada = lanzar(
        await supabase.from("ordenes_reparacion").insert(datos).select("id, folio").single(),
      ) as { id: string; folio: string };
      return creada;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llaves.ordenes });
      qc.invalidateQueries({ queryKey: llaves.unidades });
    },
  });
}

export function useGuardarDiagnostico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ordenId, diagnostico }: { ordenId: string; diagnostico: string }) => {
      lanzar(
        await supabase
          .from("ordenes_reparacion")
          .update({ diagnostico_mecanico: diagnostico })
          .eq("id", ordenId)
          .select("id"),
      );
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: llaves.ordenes });
      qc.invalidateQueries({ queryKey: llaves.orden(v.ordenId) });
    },
  });
}
