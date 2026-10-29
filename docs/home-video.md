# Video principal de ROMIX

El banner principal muestra video de borde a borde, con título y enlace al catálogo abajo a la izquierda y un control circular de reproducción/pausa. Usa object-fit: cover: llena el escenario sin bandas negras, con recorte adaptable. La altura y la composición se ajustan para celulares y orientación horizontal.

Fuentes conservadas en frontend/public/videos:
- ROMIX_Training_Panoramico_escritorio.mp4: 2000x694, 10 segundos.
- Athletes_training_in_industrial_gym_romix_celulares.mp4: 1280x720, 10 segundos. Aunque está etiquetado para celulares, su formato es horizontal.
- Athletes_training_in_industrial_gym_romix.mp4: original anterior, usado como respaldo del proceso de generación.

La web sirve las entregas sin audio romix-principal.mp4 (1600x556, 1.606.184 bytes) y romix-principal-mobile.mp4 (768x432, 630.174 bytes). Elige la entrega móvil hasta 960 px y cambia de archivo si se cruza ese umbral; no carga ambas al iniciar. Las portadas WebP respectivas pesan 34.830 y 24.900 bytes. Sirven durante la carga, sin JavaScript o ante un error del video.

Orden: video, nuevos lanzamientos y carrusel promocional. El resto de las secciones permanece. El carrusel no tiene prioridad de descarga.

La reproducción automática empieza sin sonido y en bucle después de cargar la página. Se pausa fuera de pantalla o en una pestaña oculta y respeta la pausa manual. Con reducción de movimiento o ahorro de datos no descarga automáticamente; el usuario puede iniciarlo. Si el navegador bloquea autoplay, conserva la portada y permite reproducir manualmente.

Para reemplazar los videos, actualizar las fuentes correspondientes y ejecutar npm run optimize:home-video con FFmpeg H.264 instalado en PATH o FFMPEG_PATH definido. El proceso genera las dos entregas y sus portadas sin alterar los originales. FFmpeg no es necesario para desplegar porque las entregas se versionan; no se agregó al proyecto como dependencia. Si cambia la composición del nuevo video, revisar el recorte especialmente en celular.

Validación local: npm run test:home-video cubre escritorio/móvil, cambio de entrega al redimensionar, reproducción, pausa manual, salida de pantalla, reducción de movimiento, ahorro de datos, error de carga, accesibilidad y desbordamiento. Pasaron también las regresiones de comercio a 1440 y 390 px. Se revisó la composición en anchos 320, 360, 390, 430, 600, 768, 960, 1024, 1440 y 1920 px y en horizontal 844x390: título y controles dentro del banner y sin desbordamiento. Se usó Playwright porque el plugin Browser no estaba disponible. No se certificó Safari real ni el rendimiento del despliegue.
