import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ETIQUETA_ESPECIALIDAD, ETIQUETA_ROL } from "@/lib/taller/tipos";
import type { Rol } from "@/lib/taller/tipos";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso · Taller Control" },
      {
        name: "description",
        content:
          "Ingresa a Taller Control para gestionar órdenes de reparación, mecánicos y tiempos del taller de la flota.",
      },
      { property: "og:title", content: "Acceso · Taller Control" },
      {
        property: "og:description",
        content: "Control de órdenes, tiempos y refacciones del taller de la flota.",
      },
    ],
  }),
  component: PantallaAuth,
});

const ROLES: Rol[] = ["jefe_taller", "mecanico", "compras", "direccion"];
const ESPECIALIDADES = ["motor", "suspension", "electrico", "frenos", "llantas", "general"];

function PantallaAuth() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);

  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("jefe_taller");
  const [especialidad, setEspecialidad] = useState("general");

  const redirigirPorRol = async (userId: string) => {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("user_id", userId)
      .maybeSingle();

    if (usuario?.rol === "mecanico") {
      navigate({ to: "/mis-ordenes", replace: true });
    } else if (usuario?.rol === "compras") {
      navigate({ to: "/refacciones", replace: true });
    } else {
      navigate({ to: "/tablero", replace: true });
    }
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void redirigirPorRol(data.session.user.id);
      }
    });
  }, [navigate]);

  const entrar = async () => {
    setCargando(true);
    const { data: loginData, error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
    setCargando(false);
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos"
          : error.message,
      );
      return;
    }

   if (loginData?.user){
    await redirigirPorRol(loginData.user.id);
   }
  };


  const registrar = async () => {
    if (!nombre.trim()) {
      toast.error("Escribe tu nombre completo");
      return;
    }
    setCargando(true);
    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password: clave,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nombre_completo: nombre.trim(), rol, especialidad },
      },

  

    });

    if (error) {
      setCargando(false);
      toast.error(error.message);
      return;
    }

    if (data.session) {
      await supabase.from("usuarios").insert({
        user_id: data.session.user.id,
        nombre_completo: nombre.trim(),
        rol,
        especialidad: especialidad as never,
      });
      await supabase.from("user_roles").insert({ user_id: data.session.user.id, role: rol });
    }
    setCargando(false);


    if (data.session) {
      toast.success("Cuenta creada");
      await redirigirPorRol(data.session.user.id);
    } else {
      toast.success("Cuenta creada. Confirma tu correo para poder entrar.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wrench className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold uppercase leading-none">
              Taller Control
            </h1>
            <p className="text-sm text-muted-foreground">Gestión de taller para flota de transporte</p>
          </div>
        </div>

        <div className="panel p-6">
          <Tabs defaultValue="entrar">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="entrar" className="flex-1">
                Iniciar sesión
              </TabsTrigger>
              <TabsTrigger value="registro" className="flex-1">
                Crear cuenta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="entrar" className="space-y-4">
              <Campos correo={correo} setCorreo={setCorreo} clave={clave} setClave={setClave} />
              <Button className="w-full" size="lg" onClick={entrar} disabled={cargando}>
                {cargando ? "Entrando…" : "Entrar"}
              </Button>
            </TabsContent>

            <TabsContent value="registro" className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <Campos correo={correo} setCorreo={setCorreo} clave={clave} setClave={setClave} />
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ETIQUETA_ROL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {rol === "mecanico" && (
                <div className="space-y-2">
                  <Label>Especialidad</Label>
                  <Select value={especialidad} onValueChange={setEspecialidad}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESPECIALIDADES.map((e) => (
                        <SelectItem key={e} value={e}>
                          {ETIQUETA_ESPECIALIDAD[e]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button className="w-full" size="lg" onClick={registrar} disabled={cargando}>
                {cargando ? "Creando…" : "Crear cuenta"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Campos({
  correo,
  setCorreo,
  clave,
  setClave,
}: {
  correo: string;
  setCorreo: (v: string) => void;
  clave: string;
  setClave: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Correo</Label>
        <Input
          type="email"
          autoComplete="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Contraseña</Label>
        <Input
          type="password"
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
      </div>
    </>
  );
}
