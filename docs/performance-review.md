# Revisión móvil de rendimiento

Fecha: 2026-10-13. Rama: develop. Lighthouse 13.5.0, configuración móvil predeterminada, Chromium headless. Servidor estático local con gzip; no equivale a una medición del Preview de Vercel ni verifica sus API.

Resultado local final: rendimiento 83, accesibilidad 100, FCP 2.7 s, LCP 4.0 s, CLS 0.

Se corrigieron derivados sobredimensionados en todo el catálogo: 262 archivos revisados/regenerados, de 573.564.608 a 5.758.912 bytes. Originales conservados. El build comprueba dimensiones y formato de miniaturas, incluso si la copia incorrecta tiene una fecha más reciente. Se agruparon estilos de inicio preservando el orden, se difirió la hoja de fuentes, se corrigieron contraste, encabezados, nombres accesibles y foco del menú móvil.

Validación: build, storefrontTemplateTests, storefrontStabilityTests, imageUtilsTests, productImageResolverTests, productDerivativeTests y navegación/ancho de inicio, catálogo y ayuda a 360, 390, 768 y 1440 px. npm test se detiene en catalogSyncTests: catálogo actual 169 productos, fixture antiguo 157. No se cambió el fixture para ocultar el fallo.

Pendiente antes de producción: ejecutar Lighthouse contra el Preview del commit publicado, verificar API real y reducir/confirmar LCP (objetivo 2,5 segundos). No se desplegó ni promovió producción.
