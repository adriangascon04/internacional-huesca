// Contrato único de roles. Firebase conserva algunos usuarios históricos con
// valores como "Main"; todo el cliente los normaliza aquí antes de decidir
// permisos o mostrar la interfaz.
export const normalizarRol = (rol) => {
  const valor = String(rol || '')
    .trim()
    .toLowerCase();
  return valor === 'main' ? 'admin' : valor;
};
