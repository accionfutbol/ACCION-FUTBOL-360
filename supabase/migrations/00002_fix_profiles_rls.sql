-- Fix: "infinite recursion detected in policy for relation profiles"
-- La política admin_all_profiles consulta profiles para verificar si es admin,
-- lo cual genera recursión. Solución: usar auth.jwt() o eliminar la política.

-- Eliminar la política problemática
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;

-- Reemplazar profiles_own con una política más permisiva:
-- cada usuario puede leer Y actualizar su propio perfil
DROP POLICY IF EXISTS "profiles_own" ON profiles;

CREATE POLICY "profiles_own_select" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin puede hacer todo en profiles usando auth.jwt()
-- Nota: esto usa el campo 'role' del JWT de Supabase (que es 'authenticated' por defecto)
-- Por ahora, admin solo necesita ver su propio perfil (ya cubierto por profiles_own_select)
-- Si se necesita admin que vea todos los perfiles, se puede agregar después con una función SECURITY DEFINER

-- También corregir las otras políticas admin que consultan profiles
-- para que usen una función SECURITY DEFINER en vez de subconsulta directa

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Recrear las políticas admin de otras tablas usando la función
DROP POLICY IF EXISTS "admin_all_jugadores" ON jugadores;
CREATE POLICY "admin_all_jugadores" ON jugadores
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "admin_all_asistencia" ON asistencia;
CREATE POLICY "admin_all_asistencia" ON asistencia
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "admin_all_sesiones" ON sesiones_entrenamiento;
CREATE POLICY "admin_all_sesiones" ON sesiones_entrenamiento
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "admin_all_apoderados" ON apoderados;
CREATE POLICY "admin_all_apoderados" ON apoderados
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "admin_all_entrenadores" ON entrenadores;
CREATE POLICY "admin_all_entrenadores" ON entrenadores
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "admin_all_justificaciones" ON justificaciones;
CREATE POLICY "admin_all_justificaciones" ON justificaciones
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "admin_all_lesiones" ON lesiones;
CREATE POLICY "admin_all_lesiones" ON lesiones
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "admin_all_observaciones" ON observaciones;
CREATE POLICY "admin_all_observaciones" ON observaciones
  FOR ALL USING (is_admin());

-- Ahora admin puede leer TODOS los perfiles (usando la función que bypasa RLS)
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (is_admin());
