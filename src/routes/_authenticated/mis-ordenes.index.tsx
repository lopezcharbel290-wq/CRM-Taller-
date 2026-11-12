import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ShellMovil } from "@/components/taller/ShellMovil";
import { EstadoBadge, PrioridadBadge } from "@/components/taller/EstadoBadge";
import { useAhora } from "@/components/taller/Cronometro";
import { useOrdenes } from "@/lib/taller/api";
import { useSesionTaller } from "@/hooks/useSesionTaller";
import { resumenTiempo } from "@/lib/taller/tiempo";
import { formatCronometro } from "@/lib/taller/formato";
import { ORDEN_PRIORIDAD } from "@/lib/taller/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mis-ordenes/")({
  head: () => ({
    meta: [
      { title: "Mis órdenes · Taller Control" },
      {
        name: "description",
        content:
          "Vista del mecánico: las unidades que tiene asignadas, el tiempo transcurrido y el avance de cada reparación.",
      },
      { property: "og:title", content: "Mis órdenes · Taller Control" },
      {
        property: "og:description",
        content: "Las reparaciones asignadas al mecánico, con su tiempo transcurrido.",
      },
    ],
  }),
  component: MisOrdenes,
});

function MisOrdenes() {
  const ahora = useAhora();
  const { perfil } = useSesionTaller();
  const { data: ordenes = [], isLoading } = useOrdenes();

  const mias = useMemo(
    () =>
      ordenes
        .filter((o) => o.mecanico_asignado_id === perfil?.id && o.estado !== "validada")
        .sort(
          (a, b) =>
            (a.estado === "en_reparacion" ? 0 : 1) - (b.estado === "en_reparacion" ? 0 : 1) ||
            ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad],
        ),
    [ordenes, perfil?.id],
  );

  return (
    <ShellMovil titulo="Mis órdenes">
      <p className="mb-4 text-sm text-muted-foreground">
        El tiempo es informativo: el temporizador lo controla el Jefe de Taller.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && mias.length === 0 && (
        <div className="panel p-6 text-sm text-muted-foreground">
          No tienes órdenes asignadas en este momento.
        </div>
      )}

      <ul className="space-y-3">
        {mias.map((orden) => {
          const { msTrabajo, corriendo } = resumenTiempo(orden.sesiones, ahora);
          const excedido = msTrabajo > orden.tiempo_estimado_minutos * 60000;
          return (
            <li key={orden.id}>
              <Link
                to="/mis-ordenes/$ordenId"
                params={{ ordenId: orden.id }}
                className="panel flex items-center gap-3 p-4 active:bg-secondary"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-3xl font-bold leading-none">
                    {orden.unidad?.numero_economico ?? "—"}
                  </p>
                  <p className="mt-1 text-sm">{orden.falla_reportada}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <EstadoBadge estado={orden.estado} />
                    <PrioridadBadge prioridad={orden.prioridad} />
                  </div>
                  <p
                    className={cn(
                      "cronometro mt-2 text-2xl font-bold",
                      excedido ? "text-critico" : corriendo ? "text-ok" : "text-pausa",
                    )}
                  >
                    {formatCronometro(msTrabajo)}
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </ShellMovil>
  );
}
