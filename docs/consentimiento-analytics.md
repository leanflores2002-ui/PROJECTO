# Consentimiento para Analytics

El aviso compartido permite aceptar o rechazar la medición de Google Analytics con acciones igualmente visibles. No es modal ni bloquea la navegación o el carrito. Preferencias de cookies, en el pie, permite cambiar la decisión.

La preferencia se guarda en localStorage bajo romix.analytics-consent.v1; no se guarda información del carrito en esa clave. Una preferencia ausente, inválida o inaccesible no autoriza Analytics. Si el navegador impide guardar la decisión, se informa y la medición sigue desactivada. La decisión persiste en ese navegador hasta cambiarla o borrar el almacenamiento del sitio; no se sincroniza entre dispositivos.

Analytics solo se habilita en romix-ropas.vercel.app y después de aceptar. Hasta entonces no se inserta la etiqueta de Google ni se encolan eventos. Al habilitarse, analytics_storage queda granted y ad_storage, ad_user_data y ad_personalization quedan denied. Se conservan las restricciones de Google Signals y personalización publicitaria. No se reproducen retrospectivamente acciones realizadas antes de aceptar; puede registrarse el producto actualmente abierto cuando su dato está disponible.

Al retirar el consentimiento se bloquean nuevos eventos, se activa ga-disable, se intenta borrar las cookies _ga, _ga_*, _gid y _gat accesibles para el sitio, y se recarga la página para retirar la etiqueta ya cargada. No elimina datos enviados previamente a Google ni puede borrar cookies de otros dominios. El carrito se conserva. Los cambios de preferencia entre pestañas se escuchan mediante storage.

Archivos fuente: partials/footer.html y enlaces CSS/versión de Analytics en las seis plantillas; assets/js/cookie-consent.js, assets/js/romix-analytics.js y assets/css/cookie-consent.css. Las páginas públicas, categorías y fichas se regeneran desde las fuentes con npm run build. No se agregó una política de privacidad ficticia ni un enlace a una página inexistente; esa política completa queda como tarea separada.

Validación: npm run test:consent prueba decisiones, persistencia, revocación, limpieza de cookies, conservación del carrito, teclado, ausencia de carga de Google previa y accesibilidad en 390/1440 px. Google se intercepta: no se envían visitas ni eventos reales. Incluido también en test:browser. Preview/local muestran el aviso pero nunca activan Google. El cambio no se publicó y no altera el panel privado de Analytics.
