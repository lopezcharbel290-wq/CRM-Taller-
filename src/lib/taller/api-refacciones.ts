import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { llaves } from "./api";
import type { SolicitudRefaccion } from "./tipos";

function lanzar<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export type RefaccionCompleta = SolicitudRefaccion & {
  orden: {
    id: string;
    folio: string;
    estado: string;
    unidad: { numero_economico: string } | null;
    mecanico: { nombre_completo: string } | null;
  } | null;
};

const SELECT_REFACCION =
  "*, orden:ordenes_reparacion(id, folio, estado, unidad:unidades(numero_economico), mecanico:usuarios(nombre_completo))";

/** Todas las solicitudes de refacción del taller. */
export function useRefacciones() {
  return useQuery({
    queryKey: llaves.refacciones,
    refetchInterval: 60000,
    queryFn: async () =>
      lanzar(
        await supabase
          .from("solicitudes_refaccion")
          .select(SELECT_REFACCION)
          .order("fecha_solicitud", { ascending: false }),
      ) as unknown as RefaccionCompleta[],
  });
}

/** Compras avanza el estado de la solicitud y deja comentarios. */
export function useActualizarRefaccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      estado,
      comentarios,
    }: {
      id: string;
      estado: SolicitudRefaccion["estado"];
      comentarios?: string | null;
    }) => {
      const cambios = {
        estado,
        ...(comentarios !== undefined ? { comentarios_compras: comentarios } : {}),
        ...(estado === "recibida" ? { fecha_recepcion: new Date().toISOString() } : {}),
      };
      lanzar(
        await supabase
          .from("solicitudes_refaccion")
          .update(cambios)
          .eq("id", id)
          .select("id"),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llaves.refacciones });
      qc.invalidateQueries({ queryKey: ["refacciones"] });
    },
  });
}
