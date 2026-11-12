const DIAS_MS = 1000 * 60 * 60 * 24;

export function formatFecha(valor?: string | Date | null): string {
  if (!valor) return "—";
  const d = typeof valor === "string" ? new Date(valor) : valor;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatHora(valor?: string | Date | null): string {
  if (!valor) return "—";
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatFechaHora(valor?: string | Date | null): string {
  if (!valor) return "—";
  return `${formatFecha(valor)} ${formatHora(valor)}`;
}

/** Duración legible tipo "2 h 35 min". */
export function formatDuracion(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/** Cronómetro HH:MM:SS (soporta signo negativo para tiempo excedido). */
export function formatCronometro(ms: number): string {
  const negativo = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const texto = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return negativo ? `-${texto}` : texto;
}

export function formatMoneda(valor?: number | string | null): string {
  const n = typeof valor === "string" ? Number(valor) : (valor ?? 0);
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
}

export function diasDesde(valor?: string | null): number {
  if (!valor) return 0;
  return Math.floor((Date.now() - new Date(valor).getTime()) / DIAS_MS);
}
