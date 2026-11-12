import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { llaves } from "./api";
import type { Evidencia, PiezaUtilizada, SolicitudRefaccion } from "./tipos";

function lanzar<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export const llavesMecanico = {
  piezas: (ordenId: string) => ["piezas", ordenId] as const,
  evidencias: (ordenId: string) => ["evidencias", ordenId] as const,
  refacciones: (ordenId: string) => ["refacciones", ordenId] as const,
};

/** Piezas ya instaladas en la orden. */
export function usePiezas(ordenId: string) {
  return useQuery({
    queryKey: llavesMecanico.piezas(ordenId),
    queryFn: async () =>
      lanzar(
        await supabase
          .from("piezas_utilizadas")
          .select("*")
          .eq("orden_id", ordenId)
          .order("created_at"),
      ) as PiezaUtilizada[],
  });
}

export function useAgregarPieza(ordenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: {
      nombre_pieza: string;
      numero_parte: string | null;
      cantidad: number;
      costo_unitario: number;
      registrada_por_id: string | null;
    }) => {
      lanzar(
        await supabase
          .from("piezas_utilizadas")
          .insert({ orden_id: ordenId, ...datos })
          .select("id"),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesMecanico.piezas(ordenId) });
      qc.invalidateQueries({ queryKey: llaves.orden(ordenId) });
    },
  });
}

/** Solicitudes de refacción de la orden. */
export function useRefaccionesOrden(ordenId: string) {
  return useQuery({
    queryKey: llavesMecanico.refacciones(ordenId),
    queryFn: async () =>
      lanzar(
        await supabase
          .from("solicitudes_refaccion")
          .select("*")
          .eq("orden_id", ordenId)
          .order("fecha_solicitud", { ascending: false }),
      ) as SolicitudRefaccion[],
  });
}

/** Sube una imagen al almacén privado y devuelve su ruta. */
export async function subirImagen(archivo: File, carpeta: string): Promise<string> {
  const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const ruta = `${carpeta}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("evidencias").upload(ruta, archivo, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return ruta;
}

/** URL temporal para mostrar una imagen guardada en el almacén privado. */
export function useUrlImagen(ruta: string | null) {
  return useQuery({
    queryKey: ["url-imagen", ruta],
    enabled: !!ruta,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("evidencias")
        .createSignedUrl(ruta as string, 60 * 60);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
  });
}

export function useSolicitarRefaccion(ordenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: {
      descripcion: string;
      numero_parte: string | null;
      cantidad: number;
      urgencia: SolicitudRefaccion["urgencia"];
      foto?: File | null;
      solicitada_por_id: string | null;
    }) => {
      const { foto, ...resto } = datos;
      if (!resto.numero_parte && !foto) {
        throw new Error("Captura el número de parte o toma una foto de muestra");
      }
      const foto_muestra_url = foto ? await subirImagen(foto, `refacciones/${ordenId}`) : null;
      lanzar(
        await supabase
          .from("solicitudes_refaccion")
          .insert({ orden_id: ordenId, foto_muestra_url, ...resto })
          .select("id"),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesMecanico.refacciones(ordenId) });
      qc.invalidateQueries({ queryKey: llaves.refacciones });
    },
  });
}

/** El mecánico confirma que la refacción recibida es la correcta. */
export function useValidarRecepcion(ordenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, usuarioId }: { id: string; usuarioId: string | null }) => {
      lanzar(
        await supabase
          .from("solicitudes_refaccion")
          .update({
            estado: "validada",
            validada_por_mecanico_id: usuarioId,
            fecha_recepcion: new Date().toISOString(),
          })
          .eq("id", id)
          .select("id"),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesMecanico.refacciones(ordenId) });
      qc.invalidateQueries({ queryKey: llaves.refacciones });
    },
  });
}

export function useEvidencias(ordenId: string) {
  return useQuery({
    queryKey: llavesMecanico.evidencias(ordenId),
    queryFn: async () =>
      lanzar(
        await supabase
          .from("evidencias")
          .select("*")
          .eq("orden_id", ordenId)
          .order("fecha", { ascending: false }),
      ) as Evidencia[],
  });
}

export function useSubirEvidencia(ordenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      archivo,
      momento,
      usuarioId,
    }: {
      archivo: File;
      momento: Evidencia["momento"];
      usuarioId: string | null;
    }) => {
      const ruta = await subirImagen(archivo, `ordenes/${ordenId}`);
      lanzar(
        await supabase
          .from("evidencias")
          .insert({ orden_id: ordenId, url_imagen: ruta, momento, subida_por_id: usuarioId })
          .select("id"),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: llavesMecanico.evidencias(ordenId) }),
  });
}

/**
 * El mecánico avisa que terminó. No toca el temporizador: detenerlo y validar
 * el cierre sigue siendo responsabilidad exclusiva del Jefe de Taller.
 */
export function useMarcarTerminado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordenId: string) => {
      lanzar(
        await supabase
          .from("ordenes_reparacion")
          .update({ estado: "terminada", fecha_terminacion: new Date().toISOString() })
          .eq("id", ordenId)
          .select("id"),
      );
    },
    onSuccess: (_d, ordenId) => {
      qc.invalidateQueries({ queryKey: llaves.ordenes });
      qc.invalidateQueries({ queryKey: llaves.orden(ordenId) });
    },
  });
}
