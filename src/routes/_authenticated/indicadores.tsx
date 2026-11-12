import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shell } from "@/components/taller/Shell";
import { useOrdenes, useUnidades } from "@/lib/taller/api";
import {
  cumplimientoEstimado,
  descargarCSV,
  enRango,
  horasCiclo,
  horasEfectivas,
  mttrPorMes,
  mttrPorTipo,
  porMecanico,
  tiempoPorMotivo,
  topFallas,
  topUnidades,
  useSesionesConMotivo,
} from "@/lib/taller/api-indicadores";
import { formatFecha } from "@/lib/taller/formato";
import { ETIQUETA_TIPO_ORDEN, ETIQUETA_UNIDAD_ESTADO } from "@/lib/taller/tipos";

export const Route = createFileRoute("/_authenticated/indicadores")({
  head: () => ({
    meta: [
      { title: "Indicadores del taller · Taller Control" },
      {
        name: "description",
        content:
          "MTTR por mes y tipo de falla, cumplimiento del tiempo estimado, horas efectivas contra tiempo muerto, carga por mecánico y disponibilidad de la flota.",
      },
      { property: "og:title", content: "Indicadores del taller · Taller Control" },
      {
        property: "og:description",
        content: "Tablero de indicadores del taller con filtro por fechas y exportación a CSV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Indicadores,
});

function isoDia(d: Date) {
  return d.toISOString().slice(0, 10);
}

function Indicadores() {
  const hoy = new Date();
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
  const [desde, setDesde] = useState(isoDia(inicioAnio));
  const [hasta, setHasta] = useState(isoDia(hoy));

  const { data: ordenes = [], isLoading } = useOrdenes();
  const { data: unidades = [] } = useUnidades();
  const { data: sesiones = [] } = useSesionesConMotivo();

  const filtradas = useMemo(
    () => ordenes.filter((o) => enRango(o.fecha_creacion, desde, hasta)),
    [ordenes, desde, hasta],
  );
  const cerradas = useMemo(
    () => filtradas.filter((o) => o.fecha_validacion || o.fecha_terminacion),
    [filtradas],
  );

  const serieMes = useMemo(() => mttrPorMes(cerradas), [cerradas]);
  const serieTipo = useMemo(() => mttrPorTipo(cerradas), [cerradas]);
  const cumplimiento = useMemo(() => cumplimientoEstimado(cerradas), [cerradas]);
  const idsFiltrados = useMemo(() => new Set(filtradas.map((o) => o.id)), [filtradas]);
  const tiempos = useMemo(() => tiempoPorMotivo(sesiones, idsFiltrados), [sesiones, idsFiltrados]);
  const mecanicos = useMemo(() => porMecanico(filtradas), [filtradas]);
  const fallas = useMemo(() => topFallas(filtradas), [filtradas]);
  const unidadesTop = useMemo(() => topUnidades(filtradas), [filtradas]);

  const disponibilidad = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const u of unidades) conteo.set(u.estado, (conteo.get(u.estado) ?? 0) + 1);
    const total = unidades.length || 1;
    const disponibles = conteo.get("disponible") ?? 0;
    return {
      porcentaje: Math.round((disponibles / total) * 100),
      datos: [...conteo.entries()].map(([estado, valor]) => ({
        estado: ETIQUETA_UNIDAD_ESTADO[estado as keyof typeof ETIQUETA_UNIDAD_ESTADO] ?? estado,
        valor,
        clave: estado,
      })),
    };
  }, [unidades]);

  const mttrGeneral = useMemo(() => {
    if (cerradas.length === 0) return 0;
    return Number(
      (cerradas.reduce((a, o) => a + horasCiclo(o), 0) / cerradas.length).toFixed(1),
    );
  }, [cerradas]);

  const exportar = () => {
    const filas: (string | number)[][] = [
      ["Indicadores del taller", `${formatFecha(desde)} al ${formatFecha(hasta)}`],
      [],
      ["Folio", "Unidad", "Tipo", "Estado", "Mecánico", "Falla reportada", "Creada", "Cerrada", "Estimado (min)", "Efectivo (h)", "Ciclo (h)"],
      ...filtradas.map((o) => [
        o.folio,
        o.unidad?.numero_economico ?? "—",
        ETIQUETA_TIPO_ORDEN[o.tipo] ?? o.tipo,
        o.estado,
        o.mecanico?.nombre_completo ?? "Sin asignar",
        o.falla_reportada ?? "",
        formatFecha(o.fecha_creacion),
        formatFecha(o.fecha_validacion ?? o.fecha_terminacion),
        o.tiempo_estimado_minutos ?? 0,
        horasEfectivas(o).toFixed(1),
        horasCiclo(o).toFixed(1),
      ]),
      [],
      ["MTTR por mes (horas)"],
      ["Mes", "MTTR", "Órdenes cerradas"],
      ...serieMes.map((s) => [s.mes, s.mttr, s.ordenes]),
      [],
      ["Horas muertas por motivo de pausa"],
      ["Motivo", "Horas"],
      ...tiempos.porMotivo.map((m) => [m.motivo, m.horas]),
      [],
      ["Órdenes por mecánico"],
      ["Mecánico", "Correctivo", "Preventivo", "Diagnóstico", "Total", "Promedio horas"],
      ...mecanicos.map((m) => [
        m.mecanico,
        m.correctivo,
        m.preventivo,
        m.diagnostico,
        m.total,
        m.promedioHoras,
      ]),
    ];
    descargarCSV(`indicadores-taller-${desde}-a-${hasta}.csv`, filas);
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Indicadores</h1>
            <p className="text-sm text-muted-foreground">
              Del {formatFecha(desde)} al {formatFecha(hasta)} · {filtradas.length} órdenes
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Desde
              </label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Hasta
              </label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={exportar} variant="outline">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metrica titulo="MTTR general" valor={`${mttrGeneral} h`} nota="Promedio de reparación" />
          <Metrica
            titulo="Dentro del estimado"
            valor={`${cumplimiento.porcentaje}%`}
            nota={`${cumplimiento.dentro} de ${cumplimiento.total} órdenes`}
            tono={cumplimiento.porcentaje >= 70 ? "ok" : cumplimiento.porcentaje >= 50 ? "alerta" : "critico"}
          />
          <Metrica
            titulo="Horas efectivas"
            valor={`${tiempos.horasEfectivasTotal} h`}
            nota="Mano de obra registrada"
            tono="ok"
          />
          <Metrica
            titulo="Horas muertas"
            valor={`${tiempos.horasMuertasTotal} h`}
            nota="Tiempo en pausa"
            tono="critico"
          />
          <Metrica
            titulo="Disponibilidad de flota"
            valor={`${disponibilidad.porcentaje}%`}
            nota={`${unidades.length} unidades`}
            tono={disponibilidad.porcentaje >= 80 ? "ok" : "alerta"}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando indicadores…</p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel titulo="MTTR por mes (horas)">
            {serieMes.length === 0 ? (
              <Vacio />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={serieMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(v) => [`${v} h`, "MTTR"]} />
                  <Line
                    type="monotone"
                    dataKey="mttr"
                    stroke="var(--chart-1)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel titulo="MTTR por tipo de falla (horas)">
            {serieTipo.length === 0 ? (
              <Vacio />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={serieTipo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tipo" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(v) => [`${v} h`, "MTTR"]} />
                  <Bar dataKey="mttr" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel titulo="Horas muertas por motivo de pausa">
            {tiempos.porMotivo.length === 0 ? (
              <Vacio />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tiempos.porMotivo} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis
                    type="category"
                    dataKey="motivo"
                    width={150}
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(v) => [`${v} h`, "Tiempo muerto"]} />
                  <Bar dataKey="horas" fill="var(--critico)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel titulo="Disponibilidad de la flota">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={disponibilidad.datos}
                  dataKey="valor"
                  nameKey="estado"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {disponibilidad.datos.map((d) => (
                    <Cell key={d.clave} fill={COLOR_ESTADO_UNIDAD[d.clave] ?? "var(--chart-5)"} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(v, n) => [`${v} unidades`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel titulo="Órdenes por mecánico y tipo de trabajo">
            {mecanicos.length === 0 ? (
              <Vacio />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={mecanicos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="mecanico"
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={ESTILO_TOOLTIP} />
                    <Legend />
                    <Bar dataKey="correctivo" name="Correctivo" stackId="a" fill="var(--chart-1)" />
                    <Bar dataKey="preventivo" name="Preventivo" stackId="a" fill="var(--chart-2)" />
                    <Bar dataKey="diagnostico" name="Diagnóstico" stackId="a" fill="var(--chart-3)" />
                  </BarChart>
                </ResponsiveContainer>
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Mecánico</th>
                      <th className="py-2">Órdenes</th>
                      <th className="py-2">Promedio por orden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mecanicos.map((m) => (
                      <tr key={m.mecanico} className="border-b border-border/60">
                        <td className="py-2 font-semibold">{m.mecanico}</td>
                        <td className="py-2">
                          {m.total}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({m.correctivo} correctivo · {m.preventivo} preventivo · {m.diagnostico}{" "}
                            diagnóstico)
                          </span>
                        </td>
                        <td className="py-2 font-mono">{m.promedioHoras} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Panel>

          <Panel titulo="Cumplimiento del tiempo estimado">
            <div className="flex h-full flex-col justify-center gap-4">
              <div className="flex items-end gap-3">
                <TrendingUp className="h-8 w-8 text-ok" />
                <span className="font-display text-5xl font-bold">{cumplimiento.porcentaje}%</span>
                <span className="pb-2 text-sm text-muted-foreground">dentro del estimado</span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-md bg-critico-soft">
                <div
                  className="h-full bg-ok"
                  style={{ width: `${cumplimiento.porcentaje}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {cumplimiento.dentro} órdenes cerradas a tiempo y {cumplimiento.fuera} que
                excedieron el tiempo estimado.
              </p>
            </div>
          </Panel>

          <Panel titulo="Top 10 fallas más reportadas">
            {fallas.length === 0 ? (
              <Vacio />
            ) : (
              <ol className="space-y-2 text-sm">
                {fallas.map((f, i) => (
                  <li key={f.falla} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-secondary text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{f.falla}</span>
                    <span className="font-mono font-semibold">{f.total}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel titulo="Unidades más problemáticas">
            {unidadesTop.length === 0 ? (
              <Vacio />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2">Unidad</th>
                    <th className="py-2">Órdenes</th>
                    <th className="py-2">Horas de taller</th>
                  </tr>
                </thead>
                <tbody>
                  {unidadesTop.map((u) => (
                    <tr key={u.unidad} className="border-b border-border/60">
                      <td className="py-2 font-mono font-semibold">{u.unidad}</td>
                      <td className="py-2">{u.total}</td>
                      <td className="py-2 font-mono">{u.horas} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      </div>
    </Shell>
  );
}

const ESTILO_TOOLTIP = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--foreground)",
};

const COLOR_ESTADO_UNIDAD: Record<string, string> = {
  disponible: "var(--ok)",
  en_taller: "var(--alerta)",
  fuera_servicio: "var(--critico)",
};

function Metrica({
  titulo,
  valor,
  nota,
  tono = "neutro",
}: {
  titulo: string;
  valor: string;
  nota: string;
  tono?: "neutro" | "ok" | "alerta" | "critico";
}) {
  const color =
    tono === "ok"
      ? "text-ok"
      : tono === "alerta"
        ? "text-alerta"
        : tono === "critico"
          ? "text-critico"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className={`font-display text-3xl font-bold ${color}`}>{valor}</p>
      <p className="text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}

function Panel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-panel">
      <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide">{titulo}</h2>
      {children}
    </section>
  );
}

function Vacio() {
  return (
    <p className="py-12 text-center text-sm text-muted-foreground">
      Sin información en el rango de fechas seleccionado.
    </p>
  );
}
