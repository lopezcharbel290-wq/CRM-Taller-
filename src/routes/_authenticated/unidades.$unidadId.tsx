import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Shell } from "@/components/taller/Shell";
import { EstadoBadge, PrioridadBadge } from "@/components/taller/EstadoBadge";
import { useOrdenes, useUnidades } from "@/lib/taller/api";
import {
  avisoMantenimiento,
  detectarRetrabajos,
  diasFueraDeServicio,
  useMantenimientosUnidad,
  usePiezasDeOrdenes,
} from "@/lib/taller/api-unidades";
import { formatDuracion, formatFecha, formatMoneda } from "@/lib/taller/formato";
import {
  ETIQUETA_UNIDAD_ESTADO,
  ETIQUETA_UNIDAD_TIPO,
  ETIQUETA_TIPO_ORDEN,
  ESTADOS_ACTIVOS,
} from "@/lib/taller/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/unidades/$unidadId")({
  head: () => ({
    meta: [
      { title: "Expediente de la Unidad · Taller Control" },
      {
        name: "description",
        content:
          "Historial de reparaciones, costo acumulado, días fuera de servicio y mantenimiento preventivo de la unidad.",
      },
      { property: "og:title", content: "Expediente de la Unidad · Taller Control" },
      {
        property: "og:description",
        content: "Todo el historial del taller para una unidad de la flota.",
      },
    ],
  }),
  component: ExpedienteUnidad,
});

function ExpedienteUnidad() {
  const { unidadId } = Route.useParams();
  const { data: unidades = [], isLoading } = useUnidades();
  const { data: ordenes = [] } = useOrdenes();
  const { data: mantenimientos = [] } = useMantenimientosUnidad(unidadId);

  const unidad = unidades.find((u) => u.id === unidadId) ?? null;

  const historial = useMemo(
    () =>
      ordenes
        .filter((o) => o.unidad?.id === unidadId)
        .sort(
          (a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime(),
        ),
    [ordenes, unidadId],
  );

  const ordenIds = useMemo(() => historial.map((o) => o.id), [historial]);
  const { data: piezas = [] } = usePiezasDeOrdenes(unidadId, ordenIds);

  const costoPiezas = piezas.reduce((t, p) => t + Number(p.cantidad) * Number(p.costo_unitario), 0);
  const costoRefacciones = historial.reduce((t, o) => t + Number(o.costo_refacciones ?? 0), 0);
  const dias = diasFueraDeServicio(historial);
  const retrabajos = detectarRetrabajos(historial);
  const minutosTotales = historial.reduce((t, o) => t + (o.tiempo_efectivo_minutos ?? 0), 0);

  if (isLoading) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Cargando expediente…</p>
      </Shell>
    );
  }

  if (!unidad) {
    return (
      <Shell>
        <p className="panel p-6 text-sm text-muted-foreground">No se encontró esa unidad.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Link
        to="/unidades"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a la flota
      </Link>

      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold uppercase leading-none">
            {unidad.numero_economico}
          </h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {ETIQUETA_UNIDAD_TIPO[unidad.tipo]} · {unidad.marca ?? "—"} {unidad.modelo ?? ""}{" "}
            {unidad.anio ? `(${unidad.anio})` : ""} · Placas {unidad.placas ?? "—"} · Serie{" "}
            {unidad.numero_serie ?? "—"}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-secondary px-3 py-1 text-sm font-semibold uppercase tracking-wide">
          {ETIQUETA_UNIDAD_ESTADO[unidad.estado]}
        </span>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metrica titulo="Kilometraje actual" valor={`${unidad.kilometraje_actual.toLocaleString("es-MX")} km`} />
        <Metrica titulo="Órdenes históricas" valor={String(historial.length)} />
        <Metrica titulo="Costo acumulado" valor={formatMoneda(costoPiezas + costoRefacciones)} />
        <Metrica titulo="Días fuera de servicio" valor={String(dias)} />
        <Metrica titulo="Mano de obra efectiva" valor={formatDuracion(minutosTotales * 60000)} />
      </div>

      {retrabajos.length > 0 && (
        <section className="panel mt-6 border-l-4 border-l-critico p-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase text-critico">
            <RotateCcw className="h-5 w-5" /> Alerta de retrabajo
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {retrabajos.map((r, i) => (
              <li key={`${r.folios.join("-")}-${i}`}>
                <span className="font-semibold">{r.falla}</span> se repitió a los {r.dias} días (
                {r.folios.join(" → ")}).
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel mt-6 p-4">
        <h2 className="font-display text-xl font-bold uppercase">Mantenimiento preventivo</h2>
        {mantenimientos.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Esta unidad no tiene servicios programados.
          </p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {mantenimientos.map((m) => {
            const aviso = avisoMantenimiento(m, unidad.kilometraje_actual);
            return (
              <div
                key={m.id}
                className={cn(
                  "rounded-md border border-border p-3",
                  aviso.vencido && "border-l-4 border-l-critico bg-critico-soft/40",
                  aviso.porVencer && "border-l-4 border-l-alerta bg-alerta-soft/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{m.tipo_servicio}</p>
                  {(aviso.vencido || aviso.porVencer) && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-bold uppercase",
                        aviso.vencido ? "text-critico" : "text-alerta-foreground",
                      )}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {aviso.vencido ? "Vencido" : "Por vencer"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Último servicio: {formatFecha(m.ultimo_servicio_fecha)}
                  {m.ultimo_servicio_km != null
                    ? ` · ${m.ultimo_servicio_km.toLocaleString("es-MX")} km`
                    : ""}
                </p>
                <p className="text-sm">
                  Próximo:{" "}
                  {m.proximo_servicio_km != null
                    ? `${m.proximo_servicio_km.toLocaleString("es-MX")} km`
                    : "—"}
                  {m.proximo_servicio_fecha ? ` · ${formatFecha(m.proximo_servicio_fecha)}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {aviso.kmRestantes != null &&
                    (aviso.kmRestantes > 0
                      ? `Faltan ${aviso.kmRestantes.toLocaleString("es-MX")} km`
                      : `Excedido por ${Math.abs(aviso.kmRestantes).toLocaleString("es-MX")} km`)}
                  {aviso.diasRestantes != null &&
                    (aviso.diasRestantes > 0
                      ? ` · faltan ${aviso.diasRestantes} días`
                      : ` · vencido hace ${Math.abs(aviso.diasRestantes)} días`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel mt-6 overflow-x-auto">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h2 className="font-display text-xl font-bold uppercase">Historial de órdenes</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/ordenes">Ver todas las órdenes</Link>
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Folio</th>
              <th className="px-4 py-3 text-left">Falla</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Mecánico</th>
              <th className="px-4 py-3 text-left">Prioridad</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Efectivo</th>
              <th className="px-4 py-3 text-left">Creada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {historial.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  Esta unidad no tiene órdenes registradas.
                </td>
              </tr>
            )}
            {historial.map((o) => (
              <tr
                key={o.id}
                className={cn(
                  "transition-colors hover:bg-secondary/40",
                  ESTADOS_ACTIVOS.includes(o.estado) && "bg-alerta-soft/30",
                )}
              >
                <td className="px-4 py-3">
                  <Link
                    to="/ordenes/$ordenId"
                    params={{ ordenId: o.id }}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {o.folio}
                  </Link>
                </td>
                <td className="max-w-[260px] truncate px-4 py-3">{o.falla_reportada}</td>
                <td className="px-4 py-3">{ETIQUETA_TIPO_ORDEN[o.tipo] ?? o.tipo}</td>
                <td className="px-4 py-3">{o.mecanico?.nombre_completo ?? "Sin asignar"}</td>
                <td className="px-4 py-3">
                  <PrioridadBadge prioridad={o.prioridad} />
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={o.estado} />
                </td>
                <td className="cronometro px-4 py-3 text-right">
                  {formatDuracion((o.tiempo_efectivo_minutos ?? 0) * 60000)}
                </td>
                <td className="px-4 py-3">{formatFecha(o.fecha_creacion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}

function Metrica({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="cronometro mt-1 text-2xl font-bold">{valor}</p>
    </div>
  );
}
