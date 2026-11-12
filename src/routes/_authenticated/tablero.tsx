import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Truck,
  UserCog,
  Users,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Shell } from "@/components/taller/Shell";
import { BarraAvance, Cronometro, useAhora } from "@/components/taller/Cronometro";
import { EstadoBadge, PrioridadBadge } from "@/components/taller/EstadoBadge";
import { NuevaOrdenDialog } from "@/components/taller/NuevaOrdenDialog";
import { PausarDialog } from "@/components/taller/PausarDialog";
import { AsignarMecanicoDialog } from "@/components/taller/AsignarMecanicoDialog";
import { useAccionesTemporizador, useMecanicos, useOrdenes } from "@/lib/taller/api";
import { useSesionTaller } from "@/hooks/useSesionTaller";
import { resumenTiempo } from "@/lib/taller/tiempo";
import { formatDuracion } from "@/lib/taller/formato";
import { ETIQUETA_ESPECIALIDAD, ORDEN_PRIORIDAD } from "@/lib/taller/tipos";
import type { OrdenCompleta } from "@/lib/taller/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tablero")({
  head: () => ({
    meta: [
      { title: "Tablero del Día · Taller Control" },
      {
        name: "description",
        content:
          "Vista en vivo del taller: unidades en reparación, cronómetro por orden, mecánicos trabajando y órdenes pendientes de asignar.",
      },
      { property: "og:title", content: "Tablero del Día · Taller Control" },
      {
        property: "og:description",
        content: "Qué está pasando ahora en el taller, de un solo vistazo.",
      },
    ],
  }),
  component: Tablero,
});

function Tablero() {
  const ahora = useAhora();
  const { perfil, esJefe } = useSesionTaller();
  const { data: ordenes = [], isLoading } = useOrdenes();
  const { data: mecanicos = [] } = useMecanicos();
  const acciones = useAccionesTemporizador({ usuarioId: perfil?.id ?? null });

  const activas = useMemo(
    () =>
      ordenes.filter((o) =>
        ["en_reparacion", "pausada", "pruebas", "diagnostico", "esperando_refaccion"].includes(
          o.estado,
        ),
      ),
    [ordenes],
  );

  const enProceso = activas.filter((o) => o.estado === "en_reparacion");
  const pendientes = useMemo(
    () =>
      ordenes
        .filter((o) => o.estado === "creada" || !o.mecanico_asignado_id)
        .filter((o) => !["validada", "terminada"].includes(o.estado))
        .sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]),
    [ordenes],
  );

  const vencidas = activas.filter((o) => {
    const { msTrabajo } = resumenTiempo(o.sesiones, ahora);
    return msTrabajo > o.tiempo_estimado_minutos * 60000;
  });

  const ocupados = new Map<string, OrdenCompleta>();
  for (const o of enProceso) {
    if (o.mecanico_asignado_id) ocupados.set(o.mecanico_asignado_id, o);
  }
  const libres = mecanicos.filter((m) => !ocupados.has(m.id));

  const unidadesEnTaller = new Set(activas.map((o) => o.unidad_id)).size;
  const refaccionesPendientes = activas.filter((o) => o.estado === "esperando_refaccion").length;

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase leading-none">Tablero del Día</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {esJefe
              ? "Control de tiempos, mecánicos y órdenes en tiempo real."
              : "Vista de solo lectura: el temporizador lo controla el Jefe de Taller."}
          </p>
        </div>
        {esJefe && <NuevaOrdenDialog />}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metrica titulo="Unidades en taller" valor={unidadesEnTaller} icono={<Truck />} />
        <Metrica titulo="Órdenes en proceso" valor={enProceso.length} icono={<Clock />} tono="ok" />
        <Metrica
          titulo="Órdenes vencidas"
          valor={vencidas.length}
          icono={<AlertTriangle />}
          tono={vencidas.length > 0 ? "critico" : "neutral"}
        />
        <Metrica titulo="Mecánicos libres" valor={libres.length} icono={<Users />} />
        <Metrica
          titulo="Refacciones pendientes"
          valor={refaccionesPendientes}
          icono={<Package />}
          tono="refaccion"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <h2 className="mb-3 font-display text-2xl font-bold uppercase">Reparaciones activas</h2>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando órdenes…</p>}
          {!isLoading && activas.length === 0 && (
            <div className="panel p-6 text-sm text-muted-foreground">
              No hay reparaciones activas en este momento.
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {activas.map((orden) => (
              <TarjetaActiva
                key={orden.id}
                orden={orden}
                ahora={ahora}
                esJefe={esJefe}
                acciones={acciones}
              />
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-display text-2xl font-bold uppercase">Mecánicos</h2>
            <div className="panel divide-y divide-border">
              <div className="p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ok">
                  Trabajando ({ocupados.size})
                </p>
                {ocupados.size === 0 && <p className="text-sm text-muted-foreground">Nadie ocupado.</p>}
                <ul className="space-y-2">
                  {[...ocupados.entries()].map(([mecanicoId, orden]) => {
                    const mecanico = mecanicos.find((m) => m.id === mecanicoId);
                    const { msTrabajo } = resumenTiempo(orden.sesiones, ahora);
                    return (
                      <li key={mecanicoId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold">{mecanico?.nombre_completo ?? "Mecánico"}</span>
                        <span className="text-muted-foreground">
                          {orden.unidad?.numero_economico} · {formatDuracion(msTrabajo)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Disponibles ({libres.length})
                </p>
                <ul className="space-y-2">
                  {libres.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">{m.nombre_completo}</span>
                      <span className="text-xs text-muted-foreground">
                        {ETIQUETA_ESPECIALIDAD[m.especialidad] ?? m.especialidad}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-2xl font-bold uppercase">Pendientes de asignar</h2>
            <div className="panel divide-y divide-border">
              {pendientes.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Todo está asignado.</p>
              )}
              {pendientes.map((orden) => (
                <FilaPendiente key={orden.id} orden={orden} esJefe={esJefe} acciones={acciones} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

type Acciones = ReturnType<typeof useAccionesTemporizador>;

const TONOS = {
  neutral: "text-foreground",
  ok: "text-ok",
  critico: "text-critico",
  refaccion: "text-refaccion",
} as const;

function Metrica({
  titulo,
  valor,
  icono,
  tono = "neutral",
}: {
  titulo: string;
  valor: number;
  icono: React.ReactNode;
  tono?: keyof typeof TONOS;
}) {
  return (
    <div className="panel flex items-center gap-4 p-4">
      <span className={cn("[&_svg]:h-7 [&_svg]:w-7", TONOS[tono])}>{icono}</span>
      <div>
        <p className={cn("cronometro text-3xl font-bold leading-none", TONOS[tono])}>{valor}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </p>
      </div>
    </div>
  );
}

function TarjetaActiva({
  orden,
  ahora,
  esJefe,
  acciones,
}: {
  orden: OrdenCompleta;
  ahora: number;
  esJefe: boolean;
  acciones: Acciones;
}) {
  const [pausando, setPausando] = useState(false);
  const [reasignando, setReasignando] = useState(false);
  const { msTrabajo, msPausa, corriendo } = resumenTiempo(orden.sesiones, ahora);

  const ejecutar = async (promesa: Promise<unknown>, mensaje: string) => {
    try {
      await promesa;
      toast.success(mensaje);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
    }
  };

  return (
    <article className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-3xl font-bold leading-none">
            {orden.unidad?.numero_economico ?? "—"}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {orden.folio} · {orden.mecanico?.nombre_completo ?? "Sin mecánico"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <EstadoBadge estado={orden.estado} />
          <PrioridadBadge prioridad={orden.prioridad} />
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm">{orden.falla_reportada}</p>

      <div className="mt-3">
        <Cronometro
          msTrabajo={msTrabajo}
          estimadoMinutos={orden.tiempo_estimado_minutos}
          corriendo={corriendo}
        />
        <div className="mt-2">
          <BarraAvance msTrabajo={msTrabajo} estimadoMinutos={orden.tiempo_estimado_minutos} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Tiempo muerto acumulado: {formatDuracion(msPausa)}
        </p>
      </div>

      {esJefe && (
        <div className="mt-4 flex flex-wrap gap-2">
          {corriendo ? (
            <Button size="sm" variant="outline" onClick={() => setPausando(true)}>
              <Pause className="h-4 w-4" /> Pausar
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                ejecutar(acciones.reanudar.mutateAsync(orden), "Temporizador en marcha")
              }
              disabled={!orden.mecanico_asignado_id}
            >
              <Play className="h-4 w-4" /> {orden.fecha_inicio ? "Reanudar" : "Iniciar"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => ejecutar(acciones.terminar.mutateAsync(orden), "Orden marcada terminada")}
          >
            <CheckCircle2 className="h-4 w-4" /> Terminar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setReasignando(true)}>
            <UserCog className="h-4 w-4" /> Reasignar
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/ordenes/$ordenId" params={{ ordenId: orden.id }}>
              Detalle <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      <PausarDialog
        abierto={pausando}
        folio={orden.folio}
        onCerrar={() => setPausando(false)}
        onConfirmar={(motivoId, notas) => {
          setPausando(false);
          void ejecutar(
            acciones.pausar.mutateAsync({ orden, motivoId, notas }),
            "Orden pausada con motivo registrado",
          );
        }}
      />
      <AsignarMecanicoDialog
        abierto={reasignando}
        folio={orden.folio}
        onCerrar={() => setReasignando(false)}
        onConfirmar={(mecanicoId) => {
          setReasignando(false);
          void ejecutar(
            acciones.reasignar.mutateAsync({ orden, mecanicoId }),
            "Mecánico reasignado",
          );
        }}
      />
    </article>
  );
}

function FilaPendiente({
  orden,
  esJefe,
  acciones,
}: {
  orden: OrdenCompleta;
  esJefe: boolean;
  acciones: Acciones;
}) {
  const [asignando, setAsignando] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold">
          {orden.unidad?.numero_economico}
          <PrioridadBadge prioridad={orden.prioridad} />
        </p>
        <p className="truncate text-xs text-muted-foreground">{orden.falla_reportada}</p>
      </div>
      {esJefe && (
        <Button size="sm" variant="outline" onClick={() => setAsignando(true)}>
          Asignar orden
        </Button>
      )}
      <AsignarMecanicoDialog
        abierto={asignando}
        folio={orden.folio}
        onCerrar={() => setAsignando(false)}
        onConfirmar={async (mecanicoId) => {
          setAsignando(false);
          try {
            await acciones.reasignar.mutateAsync({ orden, mecanicoId });
            toast.success("Orden asignada");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo asignar");
          }
        }}
      />
    </div>
  );
}
