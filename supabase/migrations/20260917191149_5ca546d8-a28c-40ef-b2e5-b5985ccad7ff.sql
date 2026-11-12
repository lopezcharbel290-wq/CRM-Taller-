
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mi_usuario_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mi_usuario_id() TO authenticated;

REVOKE ALL ON FUNCTION public.tg_orden_creada() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_orden_cambios() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_sesion_bitacora() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_orden_diagnostico() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pausa_requiere_motivo() FROM PUBLIC, anon, authenticated;
