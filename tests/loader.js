// ============================================================================
//  tests/loader.js
//  Hook de resolución: redirige cualquier import https://...firebase... al
//  stub local. Se registra con --import ./tests/setup.js
// ============================================================================
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('https://') && specifier.includes('firebase')) {
    return {
      url: new URL('./firebase-stub.js', import.meta.url).href,
      shortCircuit: true,
    };
  }
  return next(specifier, context);
}
