import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Pause, Play, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shell } from "@/components/taller/Shell";
import { BarraAvance, Cronometro, useAhora } from "@/components/taller/Cronometro";
import { EstadoBadge, PrioridadBadge } from "@/components/taller/EstadoBadge";
import { PausarDialog } from "@/components/taller/PausarDialog";
import { AsignarMecanicoDialog } from "@/components/taller/AsignarMecanicoDialog";
import {
  useAccionesTemporizador,
  useBitacoraOrden,
  useGuardarDiagnostico,
  useMotivosPausa,
  useOrden,
} from "@/lib/taller/api";
import { useSesionTaller } from "@/hooks/useSesionTaller";
import { resumenTiempo } from "@/lib/taller/tiempo";
import { formatDuracion, formatFechaHora, formatMoneda } from "@/lib/taller/formato";
import { ETIQUETA_TIPO_ORDEN } from "@/lib/taller/tipos";

export const Route = createFileRoute("/_authenticated/ordenes/$ordenId")({
  head: () => ({
    meta: [
      { title: "Detalle de orden · Taller Control" },
      {
        name: "description",
        content:
          "Detalle de la orden: línea de tiempo, diagnóstico, tiempo efectivo contra tiempo muerto y validación de cierre.",
      },
      { property: "og:title", content: "Detalle de orden · Taller Control" },
      {
        property: "og:description",
        content: "Todo el historial de la reparación en una sola vista.",
      },
    ],
  }),
  component: DetalleOrden,
});

function DetalleOrden() {
  const { ordenId } = Route.useParams();
  const ahora = useAhora();
  const { perfil, esJefe } = useSesionTaller();
  const { data: orden, isLoading } = useOrden(ordenId);
  const { data: bitacora = [] } = useBitacoraOrden(ordenId);
  const { data: motivos = [] } = useMotivosPausa();
  const acciones = useAccionesTemporizador({ usuarioId: perfil?.id ?? null });
  const guardarDiagnostico = useGuardarDiagnostico();

  const [diagnostico, setDiagnostico] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [pausando, setPausando] = useState(false);
  const [reasignando, setReasignando] = useState(false);

  useEffect(() => {
    if (orden) {
      setDiagnostico(orden.diagnostico_mecanico ?? "");
      setObservaciones(orden.observaciones_jefe ?? "");
    }
  }, [orden?.id, orden?.diagnostico_mecanico, orden?.observaciones_jefe, orden]);

  if (isLoading || !orden) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Cargando orden…</p>
      </Shell>
    );
  }

  const { msTrabajo, msPausa, corriendo } = resumenTiempo(orden.sesiones, ahora);

  const ejecutar = async (promesa: Promise<unknown>, mensaje: string) => {
    try {
      await promesa;
      toast.success(mensaje);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
    }
  };

  const nombreMotivo = (id: string | null) =>
    motivos.find((m) => m.id === id)?.descripcion ?? "Sin motivo";

  return (
    <Shell>
      <Link
        to="/ordenes"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a órdenes
      </Link>

      <div className="panel mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {orden.folio} · {ETIQUETA_TIPO_ORDEN[orden.tipo] ?? orden.tipo}
            </p>
            <h1 className="font-display text-4xl font-bold uppercase leading-none">
              {orden.unidad?.numero_economico}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {orden.unidad?.marca} {orden.unidad?.modelo} · Mecánico:{" "}
              {orden.mecanico?.nombre_completo ?? "sin asignar"} · Reporta:{" "}
              {orden.operador?.nombre_completo ?? "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <EstadoBadge estado={orden.estado} />
              <PrioridadBadge prioridad={orden.prioridad} />
            </div>
            <Cronometro
              msTrabajo={msTrabajo}
              estimadoMinutos={orden.tiempo_estimado_minutos}
              corriendo={corriendo}
            />
          </div>
        </div>

        <div className="mt-4">
          <BarraAvance msTrabajo={msTrabajo} estimadoMinutos={orden.tiempo_estimado_minutos} />
        </div>

        {esJefe && orden.estado !== "validada" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {corriendo ? (
              <Button variant="outline" onClick={() => setPausando(true)}>
                <Pause className="h-4 w-4" /> Pausar
              </Button>
            ) : (
              <Button
                onClick={() => ejecutar(acciones.reanudar.mutateAsync(orden), "Temporizador en marcha")}
                disabled={!orden.mecanico_asignado_id}
              >
                <Play className="h-4 w-4" /> {orden.fecha_inicio ? "Reanudar" : "Iniciar"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => ejecutar(acciones.terminar.mutateAsync(orden), "Orden terminada")}
            >
              <CheckCircle2 className="h-4 w-4" /> Terminar
            </Button>
            <Button variant="outline" onClick={() => setReasignando(true)}>
              <UserCog className="h-4 w-4" /> Reasignar
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="font-display text-2xl font-bold uppercase">Falla reportada</h2>
            <p className="mt-2 text-sm">{orden.falla_reportada}</p>

            <div className="mt-5 space-y-2">
              <Label>Diagnóstico del mecánico</Label>
              <Textarea
                rows={4}
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                placeholder="Sin diagnóstico capturado"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={guardarDiagnostico.isPending}
                onClick={() =>
                  ejecutar(
                    guardarDiagnostico.mutateAsync({ ordenId: orden.id, diagnostico }),
                    "Diagnóstico guardado",
                  )
                }
              >
                Guardar diagnóstico
              </Button>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-2xl font-bold uppercase">Desglose de tiempo</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tiempo efectivo
                </dt>
                <dd className="cronometro text-2xl font-bold text-ok">{formatDuracion(msTrabajo)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tiempo muerto
                </dt>
                <dd className="cronometro text-2xl font-bold text-alerta">
                  {formatDuracion(msPausa)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Kilometraje de ingreso
                </dt>
                <dd className="font-semibold">
                  {orden.kilometraje_ingreso?.toLocaleString("es-MX") ?? "—"} km
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Costo en refacciones
                </dt>
                <dd className="font-semibold">{formatMoneda(orden.costo_refacciones)}</dd>
              </div>
            </dl>
          </section>

          {esJefe && (
            <section className="panel p-5">
              <h2 className="font-display text-2xl font-bold uppercase">Validar cierre</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Al validar, la unidad regresa automáticamente a estado disponible. No se puede
                validar sin diagnóstico capturado.
              </p>
              <div className="mt-3 space-y-2">
                <Label>Observaciones del Jefe de Taller</Label>
                <Textarea
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
                <Button
                  disabled={orden.estado === "validada"}
                  onClick={() =>
                    ejecutar(
                      acciones.validar.mutateAsync({ orden, observaciones }),
                      "Orden validada y unidad liberada",
                    )
                  }
                >
                  <ShieldCheck className="h-4 w-4" />
                  {orden.estado === "validada" ? "Orden ya validada" : "Validar y cerrar orden"}
                </Button>
              </div>
            </section>
          )}
        </div>

        <section className="panel p-5">
          <h2 className="font-display text-2xl font-bold uppercase">Línea de tiempo</h2>
          <ol className="mt-4 space-y-4 border-l border-border pl-4">
            <li className="relative">
              <Punto tono="bg-primary" />
              <p className="text-sm font-semibold">Orden creada</p>
              <p className="text-xs text-muted-foreground">{formatFechaHora(orden.fecha_creacion)}</p>
            </li>
            {orden.sesiones.map((s) => (
              <li key={s.id} className="relative">
                <Punto tono={s.tipo === "trabajo" ? "bg-ok" : "bg-pausa"} />
                <p className="text-sm font-semibold">
                  {s.tipo === "trabajo" ? "Trabajo" : `Pausa · ${nombreMotivo(s.motivo_pausa_id)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFechaHora(s.fecha_inicio)} →{" "}
                  {s.fecha_fin ? formatFechaHora(s.fecha_fin) : "en curso"}
                </p>
                {s.notas && <p className="mt-1 text-xs">{s.notas}</p>}
              </li>
            ))}
            {orden.fecha_terminacion && (
              <li className="relative">
                <Punto tono="bg-ok" />
                <p className="text-sm font-semibold">Trabajo terminado</p>
                <p className="text-xs text-muted-foreground">
                  {formatFechaHora(orden.fecha_terminacion)}
                </p>
              </li>
            )}
            {orden.fecha_validacion && (
              <li className="relative">
                <Punto tono="bg-primary" />
                <p className="text-sm font-semibold">Validada por el Jefe de Taller</p>
                <p className="text-xs text-muted-foreground">
                  {formatFechaHora(orden.fecha_validacion)}
                </p>
              </li>
            )}
          </ol>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bitácora
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {bitacora.length === 0 && <li>Sin movimientos registrados.</li>}
            {bitacora.map((b) => (
              <li key={b.id}>
                {formatFechaHora(b.fecha)} · {b.accion.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <PausarDialog
        abierto={pausando}
        folio={orden.folio}
        onCerrar={() => setPausando(false)}
        onConfirmar={(motivoId, notas) => {
          setPausando(false);
          void ejecutar(acciones.pausar.mutateAsync({ orden, motivoId, notas }), "Orden pausada");
        }}
      />
      <AsignarMecanicoDialog
        abierto={reasignando}
        folio={orden.folio}
        onCerrar={() => setReasignando(false)}
        onConfirmar={(mecanicoId) => {
          setReasignando(false);
          void ejecutar(acciones.reasignar.mutateAsync({ orden, mecanicoId }), "Mecánico reasignado");
        }}
      />
    </Shell>
  );
}

function Punto({ tono }: { tono: string }) {
  return (
    <span
      className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${tono}`}
      aria-hidden
    />
  );
}
