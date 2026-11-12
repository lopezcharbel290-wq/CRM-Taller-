import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shell } from "@/components/taller/Shell";
import { useSesionTaller } from "@/hooks/useSesionTaller";
import { useMecanicos, useOrdenes, useUnidades } from "@/lib/taller/api";
import { useMantenimientos } from "@/lib/taller/api-unidades";
import {
  DIAS_SEMANA,
  ETIQUETA_META_ESTADO,
  ETIQUETA_META_TIPO,
  NOMBRE_MES,
  claveDia,
  cuadriculaMes,
  metaVencida,
  useActualizarMeta,
  useCrearMeta,
  useEliminarMeta,
  useMetas,
} from "@/lib/taller/api-metas";
import type { EstadoMeta, EventoCalendario, MetaCompleta, TipoMeta } from "@/lib/taller/api-metas";
import { formatFecha } from "@/lib/taller/formato";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas y calendario · Taller Control" },
      {
        name: "description",
        content:
          "Metas del taller por responsable con seguimiento de avance y calendario mensual con servicios preventivos, órdenes creadas y entregas.",
      },
      { property: "og:title", content: "Metas y calendario · Taller Control" },
      {
        property: "og:description",
        content: "Metas del mes y calendario de servicios preventivos, órdenes y entregas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MetasCalendario,
});

const SIN_RESPONSABLE = "sin_responsable";

function MetasCalendario() {
  const { rol, perfil } = useSesionTaller();
  const esJefe = rol === "jefe_taller";

  const { data: metas = [] } = useMetas();
  const { data: mecanicos = [] } = useMecanicos();
  const { data: ordenes = [] } = useOrdenes();
  const { data: unidades = [] } = useUnidades();
  const { data: mantenimientos = [] } = useMantenimientos();

  const actualizar = useActualizarMeta();
  const eliminar = useEliminarMeta();

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());

  const nombreUnidad = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const u of unidades) mapa.set(u.id, u.numero_economico);
    return mapa;
  }, [unidades]);

  const eventos = useMemo(() => {
    const lista: EventoCalendario[] = [];

    for (const m of metas) {
      lista.push({
        id: `meta-${m.id}`,
        dia: m.fecha_objetivo.slice(0, 10),
        tipo: "meta",
        titulo: m.titulo,
        detalle: `Meta ${ETIQUETA_META_TIPO[m.tipo].toLowerCase()} · ${
          m.responsable?.nombre_completo ?? "Todo el taller"
        }`,
        urgente: metaVencida(m),
      });
    }

    for (const s of mantenimientos) {
      if (!s.proximo_servicio_fecha) continue;
      lista.push({
        id: `mant-${s.id}`,
        dia: s.proximo_servicio_fecha.slice(0, 10),
        tipo: "mantenimiento",
        titulo: `${s.tipo_servicio} · ${nombreUnidad.get(s.unidad_id) ?? "Unidad"}`,
        detalle: "Servicio preventivo programado",
        urgente: new Date(`${s.proximo_servicio_fecha}T23:59:59`).getTime() < Date.now(),
      });
    }

    for (const o of ordenes) {
      lista.push({
        id: `orden-${o.id}`,
        dia: claveDia(o.fecha_creacion),
        tipo: "orden",
        titulo: `${o.folio} · ${o.unidad?.numero_economico ?? "Unidad"}`,
        detalle: "Orden ingresada al taller",
        enlace: { to: "/ordenes/$ordenId", params: { ordenId: o.id } },
      });
      const entrega = o.fecha_validacion ?? o.fecha_terminacion;
      if (entrega) {
        lista.push({
          id: `entrega-${o.id}`,
          dia: claveDia(entrega),
          tipo: "entrega",
          titulo: `${o.folio} entregada`,
          detalle: o.unidad?.numero_economico ?? "Unidad",
          enlace: { to: "/ordenes/$ordenId", params: { ordenId: o.id } },
        });
      }
    }

    return lista;
  }, [metas, mantenimientos, ordenes, nombreUnidad]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();
    for (const e of eventos) {
      const lista = mapa.get(e.dia) ?? [];
      lista.push(e);
      mapa.set(e.dia, lista);
    }
    return mapa;
  }, [eventos]);

  const celdas = useMemo(() => cuadriculaMes(anio, mes), [anio, mes]);
  const hoyClave = claveDia(hoy);

  const cambiarMes = (delta: number) => {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
  };

  const resumen = useMemo(() => {
    const cumplidas = metas.filter((m) => m.estado === "cumplida").length;
    const vencidas = metas.filter((m) => metaVencida(m)).length;
    return {
      total: metas.length,
      cumplidas,
      vencidas,
      porcentaje: metas.length ? Math.round((cumplidas / metas.length) * 100) : 0,
    };
  }, [metas]);

  const cambiarEstado = (meta: MetaCompleta, estado: EstadoMeta) => {
    actualizar.mutate(
      { id: meta.id, cambios: { estado } },
      {
        onSuccess: () => toast.success(`Meta marcada como ${ETIQUETA_META_ESTADO[estado].toLowerCase()}`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
              Metas y calendario
            </h1>
            <p className="text-sm text-muted-foreground">
              {resumen.total} metas · {resumen.cumplidas} cumplidas · {resumen.vencidas} vencidas
            </p>
          </div>
          {esJefe ? (
            <NuevaMetaDialog mecanicos={mecanicos} jefeId={perfil?.id ?? null} />
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-lg border border-border bg-card p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide">
                <CalendarDays className="h-5 w-5" /> {NOMBRE_MES[mes]} {anio}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => cambiarMes(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAnio(hoy.getFullYear());
                    setMes(hoy.getMonth());
                  }}
                >
                  Hoy
                </Button>
                <Button variant="outline" size="icon" onClick={() => cambiarMes(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted-foreground">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {celdas.map((fecha, i) => {
                if (!fecha) return <div key={`v-${i}`} className="min-h-24 rounded bg-muted/40" />;
                const clave = claveDia(fecha);
                const delDia = porDia.get(clave) ?? [];
                return (
                  <div
                    key={clave}
                    className={cn(
                      "min-h-24 rounded border border-border p-1 text-left",
                      clave === hoyClave && "border-primary bg-secondary",
                    )}
                  >
                    <p className="mb-1 text-xs font-bold">{fecha.getDate()}</p>
                    <div className="space-y-1">
                      {delDia.slice(0, 3).map((e) => (
                        <EventoChip key={e.id} evento={e} />
                      ))}
                      {delDia.length > 3 ? (
                        <p className="text-[10px] text-muted-foreground">
                          +{delDia.length - 3} más
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <Leyenda clase="bg-accent" texto="Meta" />
              <Leyenda clase="bg-alerta" texto="Servicio preventivo" />
              <Leyenda clase="bg-refaccion" texto="Orden ingresada" />
              <Leyenda clase="bg-ok" texto="Unidad entregada" />
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cumplimiento de metas
              </p>
              <p className="font-display text-4xl font-bold text-ok">{resumen.porcentaje}%</p>
              <div className="mt-2 h-4 overflow-hidden rounded bg-secondary">
                <div className="h-full bg-ok" style={{ width: `${resumen.porcentaje}%` }} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide">
                <Target className="h-5 w-5" /> Metas
              </h2>
              {metas.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Todavía no hay metas registradas.
                </p>
              ) : (
                <ul className="space-y-3">
                  {metas.map((m) => {
                    const vencida = metaVencida(m);
                    return (
                      <li key={m.id} className="rounded-md border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{m.titulo}</p>
                            <p className="text-xs text-muted-foreground">
                              {ETIQUETA_META_TIPO[m.tipo]} ·{" "}
                              {m.responsable?.nombre_completo ?? "Todo el taller"} · Objetivo{" "}
                              {formatFecha(m.fecha_objetivo)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded px-2 py-1 text-xs font-bold uppercase",
                              m.estado === "cumplida"
                                ? "bg-ok text-ok-foreground"
                                : vencida
                                  ? "bg-critico text-critico-foreground"
                                  : m.estado === "en_proceso"
                                    ? "bg-refaccion-soft text-refaccion"
                                    : "bg-secondary text-secondary-foreground",
                            )}
                          >
                            {vencida && m.estado !== "cumplida"
                              ? "Vencida"
                              : ETIQUETA_META_ESTADO[m.estado]}
                          </span>
                        </div>
                        {m.descripcion ? (
                          <p className="mt-2 text-sm text-muted-foreground">{m.descripcion}</p>
                        ) : null}
                        {esJefe ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Select
                              value={m.estado}
                              onValueChange={(v) => cambiarEstado(m, v as EstadoMeta)}
                            >
                              <SelectTrigger className="h-8 w-44">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(ETIQUETA_META_ESTADO) as EstadoMeta[]).map((e) => (
                                  <SelectItem key={e} value={e}>
                                    {ETIQUETA_META_ESTADO[e]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                eliminar.mutate(m.id, {
                                  onSuccess: () => toast.success("Meta eliminada"),
                                  onError: (e) => toast.error(e.message),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" /> Eliminar
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

const CLASE_EVENTO: Record<EventoCalendario["tipo"], string> = {
  meta: "bg-accent text-accent-foreground",
  mantenimiento: "bg-alerta text-alerta-foreground",
  orden: "bg-refaccion text-refaccion-foreground",
  entrega: "bg-ok text-ok-foreground",
};

function EventoChip({ evento }: { evento: EventoCalendario }) {
  const contenido = (
    <span
      title={`${evento.titulo} — ${evento.detalle}`}
      className={cn(
        "block truncate rounded px-1 py-0.5 text-[10px] font-semibold",
        CLASE_EVENTO[evento.tipo],
        evento.urgente && "ring-2 ring-critico",
      )}
    >
      {evento.titulo}
    </span>
  );
  if (evento.enlace) {
    return (
      <Link to={evento.enlace.to} params={evento.enlace.params as never} className="block">
        {contenido}
      </Link>
    );
  }
  return contenido;
}

function Leyenda({ clase, texto }: { clase: string; texto: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded", clase)} />
      {texto}
    </span>
  );
}

function NuevaMetaDialog({
  mecanicos,
  jefeId,
}: {
  mecanicos: { id: string; nombre_completo: string }[];
  jefeId: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<TipoMeta>("area");
  const [responsable, setResponsable] = useState<string>(SIN_RESPONSABLE);
  const [fecha, setFecha] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const crear = useCrearMeta();

  const guardar = () => {
    if (!titulo.trim()) {
      toast.error("Escribe el título de la meta");
      return;
    }
    crear.mutate(
      {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        tipo,
        fecha_objetivo: fecha,
        responsable_id:
          tipo === "individual" && responsable !== SIN_RESPONSABLE ? responsable : jefeId && tipo === "individual" ? jefeId : null,
        estado: "pendiente",
      },
      {
        onSuccess: () => {
          toast.success("Meta registrada");
          setAbierto(false);
          setTitulo("");
          setDescripcion("");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nueva meta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva meta</DialogTitle>
          <DialogDescription>
            Define el objetivo, el responsable y la fecha en que debe cumplirse.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Título</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Reducir el MTTR a 6 horas"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Descripción</label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Cómo se va a lograr y cómo se mide"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Tipo</label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMeta)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">De área</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Fecha objetivo</label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          {tipo === "individual" ? (
            <div>
              <label className="mb-1 block text-sm font-semibold">Responsable</label>
              <Select value={responsable} onValueChange={setResponsable}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un mecánico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_RESPONSABLE}>Sin responsable</SelectItem>
                  {mecanicos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={crear.isPending}>
            Guardar meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
