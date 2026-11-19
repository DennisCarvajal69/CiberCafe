$(document).ready(function () {

  /* ============================================
     EJECUCIÓN ÚNICA (evita registrar todo dos veces)
     ============================================ */
  if (window.__arcadeInit) return;
  window.__arcadeInit = true;

  /* Carrusel de fondo para escritorio */
  const fotosFondo = ['img/fondo1.jpg', 'img/fondo2.jpg', 'img/fondo3.jpg'];
  const fondo = document.querySelector('.fondo-pc');
  if (fondo) {
    Promise.all(fotosFondo.map(function (ruta) {
      return new Promise(function (resolver) {
        const imagen = new Image();
        imagen.onload = function () { resolver(ruta); };
        imagen.onerror = function () {
          console.warn('No se pudo cargar la imagen de fondo:', ruta);
          resolver(null);
        };
        imagen.src = ruta;
      });
    })).then(function (resultados) {
      const fotos = resultados.filter(function (ruta) { return ruta !== null; });
      if (!fotos.length) return;

      const capas = [document.createElement('div'), document.createElement('div')];
      capas.forEach(function (capa) {
        capa.className = 'fondo-slide';
        fondo.appendChild(capa);
      });

      let indice = 0;
      let capaActiva = 0;
      capas[capaActiva].style.backgroundImage = 'url("' + fotos[indice] + '")';
      capas[capaActiva].classList.add('visible');

      if (fotos.length < 2) return;
      window.setInterval(function () {
        const siguiente = 1 - capaActiva;
        indice = (indice + 1) % fotos.length;
        capas[siguiente].style.backgroundImage = 'url("' + fotos[indice] + '")';
        capas[siguiente].classList.add('visible');
        capas[capaActiva].classList.remove('visible');
        capaActiva = siguiente;
      }, 6000);
    });
  }

  /* ============================================
     CONSTANTES Y ESTADO
     ============================================ */
  const KEY          = 'levelup_pwa_v2';
  const PLAZO        = 300;   // 5 min para confirmar la reserva
  const FLASH        = 180;   // los primeros 3 min del plazo: −15 % (para probar, pon 20)
  const DESC_FLASH   = 0.15;
  const TIEMPO_MODAL = 30;    // 30 s de la ventana de confirmación
  const VISTAS       = ['inicio', 'catalogo', 'ps5', 'pc', 'arcade', 'snacks', 'reserva', 'pedidos', 'info'];
  const CATEGORIAS   = ['catalogo', 'ps5', 'pc', 'arcade', 'snacks'];
  const ETIQUETA     = { ps5: 'PS5', pc: 'PC', arcade: 'Arcade', snacks: 'Snack' };
  const ESTADOS      = { pendiente: '⏳ Guardado localmente · Pendiente', verificada: '✅ Verificada', cancelada: '🚫 Cancelada' };
  const CAMPOS       = ['nombre', 'ci', 'tel', 'fecha', 'hora', 'email', 'terms'];
  const PASOS        = { 1: ['nombre', 'ci', 'tel'], 2: ['fecha', 'hora'], 3: ['email', 'terms'] };
  const ALTO_FILA    = 84;    // alto de cada tarjeta del catálogo
  const ANCHO_MIN    = 270;   // ancho mínimo de una tarjeta
  const GAP          = 8;

  const TEMAS = {
    catalogo: { clase: 'tema-todos',  icono: '📚', titulo: 'Catálogo completo', sub: 'Máquinas y snacks' },
    ps5:      { clase: 'tema-ps5',    icono: '🎮', titulo: 'PlayStation 5',     sub: 'Solo estaciones PS5' },
    pc:       { clase: 'tema-pc',     icono: '💻', titulo: 'PC Gamer',          sub: 'Solo estaciones PC' },
    arcade:   { clase: 'tema-arcade', icono: '👾', titulo: 'Arcade Retro',      sub: 'Solo máquinas Arcade' },
    snacks:   { clase: 'tema-snacks', icono: '🍔', titulo: 'Snacks y bebidas',  sub: 'Pide algo para tu partida' }
  };

  /* ============================================
     ARRAYS DE DATOS: máquinas (precio por hora) y snacks (precio por unidad)
     ============================================ */
  const ESTACIONES = [
    { id: 'ps5-fifa',   nombre: 'PS5 · Sala FIFA',            tipo: 'ps5',    icono: '⚽',  img: 'ps5-fifa.jpg',        precio: 18, stock: 3, popular: true, det: ['2 controles DualSense', 'TV 55" 4K 120Hz', 'FIFA 24, UFC 5'] },
    { id: 'ps5-aven',   nombre: 'PS5 · Sala Aventura',        tipo: 'ps5',    icono: '🕷️', img: 'ps5-aventura.jpg',    precio: 18, stock: 3, det: ['Control DualSense', 'TV 50" 4K', 'Spider-Man 2, God of War'] },
    { id: 'ps5-race',   nombre: 'PS5 · Sala Carreras',        tipo: 'ps5',    icono: '🏎️', img: 'ps5-carreras.jpg',    precio: 20, stock: 2, det: ['Volante con pedales', 'TV 55" 4K', 'Gran Turismo 7, F1 24'] },
    { id: 'ps5-coop',   nombre: 'PS5 · Sala Cooperativo',     tipo: 'ps5',    icono: '🤝',  img: 'ps5-coop.jpg',        precio: 18, stock: 3, det: ['4 controles DualSense', 'Sofá para grupos', 'It Takes Two, Overcooked'] },
    { id: 'ps5-fight',  nombre: 'PS5 · Sala Peleas',          tipo: 'ps5',    icono: '🥋',  img: 'ps5-peleas.jpg',      precio: 18, stock: 2, det: ['Arcade stick opcional', 'TV 50" 4K', 'Tekken 8, Mortal Kombat 1'] },
    { id: 'ps5-vip',    nombre: 'PS5 · Sala VIP',             tipo: 'ps5',    icono: '👑',  img: 'ps5-vip.jpg',         precio: 30, stock: 1, det: ['Sala privada con A/C', 'TV 65" OLED', 'Sofá + mesa de snacks'] },
    { id: 'ps5-terror', nombre: 'PS5 · Sala Terror',          tipo: 'ps5',    icono: '👻',  img: 'ps5-terror.jpg',      precio: 18, stock: 2, det: ['Ambiente oscuro', 'TV 50" 4K', 'Resident Evil 4, Alan Wake 2'] },
    { id: 'ps5-fam',    nombre: 'PS5 · Sala Familiar',        tipo: 'ps5',    icono: '👨‍👩‍👧', img: 'ps5-familiar.jpg',    precio: 15, stock: 2, det: ['2 controles', 'TV 50"', 'Crash Team Racing, Sackboy'] },

    { id: 'pc-pro',     nombre: 'PC Gamer · Pro',             tipo: 'pc',     icono: '🎯',  img: 'pc-pro.jpg',          precio: 12, stock: 6, popular: true, det: ['Ryzen 7 + RTX 4060', 'Monitor 144Hz', 'Teclado mecánico'] },
    { id: 'pc-std',     nombre: 'PC Gamer · Estándar',        tipo: 'pc',     icono: '🔫',  img: 'pc-estandar.jpg',     precio: 8,  stock: 8, det: ['Ryzen 5 + GTX 1660', 'Monitor 75Hz', 'Audífonos gamer'] },
    { id: 'pc-stream',  nombre: 'PC Gamer · Streaming',       tipo: 'pc',     icono: '🎥',  img: 'pc-streaming.jpg',    precio: 18, stock: 2, det: ['Ryzen 9 + RTX 4070', 'Micrófono y cámara', 'OBS instalado'] },
    { id: 'pc-moba',    nombre: 'PC Gamer · MOBA / LoL',      tipo: 'pc',     icono: '⚔️', img: 'pc-moba.jpg',         precio: 9,  stock: 5, det: ['Ryzen 5 + RTX 3050', 'Monitor 144Hz', 'League of Legends, Dota 2'] },
    { id: 'pc-fps',     nombre: 'PC Gamer · FPS Competitivo', tipo: 'pc',     icono: '🎯',  img: 'pc-fps.jpg',          precio: 13, stock: 4, det: ['Monitor 240Hz', 'Mouse ultraligero', 'Valorant, CS2, Apex'] },
    { id: 'pc-team',    nombre: 'PC Gamer · Zona Equipos',    tipo: 'pc',     icono: '👥',  img: 'pc-equipos.jpg',      precio: 10, stock: 5, det: ['Mesa para 5 jugadores', 'Voz por equipo', 'Ideal para torneos'] },
    { id: 'pc-br',      nombre: 'PC Gamer · Battle Royale',   tipo: 'pc',     icono: '🪂',  img: 'pc-br.jpg',           precio: 10, stock: 4, det: ['Ryzen 5 + RTX 3060', 'Monitor 165Hz', 'Fortnite, Warzone, Apex'] },
    { id: 'pc-sim',     nombre: 'PC Gamer · Simulación',      tipo: 'pc',     icono: '🚚',  img: 'pc-sim.jpg',          precio: 12, stock: 2, det: ['Volante con pedales', 'Monitor curvo', 'Euro Truck Simulator 2, Assetto Corsa'] },
    { id: 'pc-indie',   nombre: 'PC Gamer · Indie y Retro',   tipo: 'pc',     icono: '🕹️', img: 'pc-indie.jpg',        precio: 7,  stock: 4, det: ['Ryzen 3 + GTX 1650', 'Control incluido', 'Stardew Valley, Hollow Knight, Terraria'] },

    { id: 'arc-sf',     nombre: 'Arcade · Street Fighter',    tipo: 'arcade', icono: '🥊',  img: 'arcade-sf.jpg',       precio: 5,  stock: 2, popular: true, det: ['500+ juegos clásicos', '2 jugadores', 'Joysticks originales'] },
    { id: 'arc-pac',    nombre: 'Arcade · Pac-Man',           tipo: 'arcade', icono: '🟡',  img: 'arcade-pacman.jpg',   precio: 5,  stock: 2, det: ['Máquina vintage', '1–2 jugadores', 'Ranking de puntajes'] },
    { id: 'arc-moto',   nombre: 'Arcade · Motos y Carreras',  tipo: 'arcade', icono: '🏍️', img: 'arcade-motos.jpg',    precio: 6,  stock: 2, det: ['Asiento simulador', 'Pantalla 42"', 'Daytona USA'] },
    { id: 'arc-dance',  nombre: 'Arcade · Baile',             tipo: 'arcade', icono: '💃',  img: 'arcade-baile.jpg',    precio: 6,  stock: 1, det: ['Plataforma de baile', '2 jugadores', 'Dance Dance Revolution'] },
    { id: 'arc-air',    nombre: 'Arcade · Air Hockey',        tipo: 'arcade', icono: '🏒',  img: 'arcade-airhockey.jpg', precio: 4, stock: 2, det: ['Mesa profesional', '1 vs 1', 'Marcador digital'] },
    { id: 'arc-bask',   nombre: 'Arcade · Basketball',        tipo: 'arcade', icono: '🏀',  img: 'arcade-basket.jpg',   precio: 4,  stock: 2, det: ['Aros con marcador', 'Competencia de tiros', 'Ranking diario'] },
    { id: 'arc-claw',   nombre: 'Arcade · Peluches',          tipo: 'arcade', icono: '🧸',  img: 'arcade-peluches.jpg', precio: 3,  stock: 2, det: ['Máquina de garra', 'Premios variados', 'Para todas las edades'] },
    { id: 'arc-shoot',  nombre: 'Arcade · Pistolas',          tipo: 'arcade', icono: '🔫',  img: 'arcade-pistolas.jpg', precio: 6,  stock: 1, det: ['2 pistolas de luz', 'Modo cooperativo', 'House of the Dead'] },
    { id: 'arc-pin',    nombre: 'Arcade · Pinball',           tipo: 'arcade', icono: '🎰',  img: 'arcade-pinball.jpg',  precio: 5,  stock: 2, det: ['Mesa clásica', '1–4 jugadores', 'Ranking de puntajes'] },
    { id: 'arc-meteg',  nombre: 'Arcade · Metegol',           tipo: 'arcade', icono: '⚽',  img: 'arcade-metegol.jpg',  precio: 4,  stock: 2, det: ['Mesa profesional', '2 vs 2', 'Marcador manual'] },
    { id: 'arc-ritmo',  nombre: 'Arcade · Ritmo',             tipo: 'arcade', icono: '🥁',  img: 'arcade-ritmo.jpg',    precio: 6,  stock: 1, det: ['Guitarra y batería', '2 jugadores', 'Canciones clásicas'] }
  ];

  const SNACKS = [
    { id: 'sn-c1',      nombre: 'Combo Gamer 1',  tipo: 'snacks', icono: '🍟', img: 'snack-combo1.jpg',  precio: 14, stock: 15, det: ['Bebida 500 ml', 'Papas fritas'] },
    { id: 'sn-c2',      nombre: 'Combo Gamer 2',  tipo: 'snacks', icono: '🍔', img: 'snack-combo2.jpg',  precio: 22, stock: 15, popular: true, det: ['Hamburguesa', 'Bebida 500 ml'] },
    { id: 'sn-c3',      nombre: 'Combo Gamer 3',  tipo: 'snacks', icono: '🍕', img: 'snack-combo3.jpg',  precio: 32, stock: 15, det: ['Pizza personal', '2 bebidas 500 ml'] },
    { id: 'sn-burger',  nombre: 'Hamburguesa',    tipo: 'snacks', icono: '🍔', img: 'snack-burger.jpg',  precio: 15, stock: 20, det: ['Carne, queso y lechuga', 'Papas aparte'] },
    { id: 'sn-salchi',  nombre: 'Salchipapa',     tipo: 'snacks', icono: '🌭', img: 'snack-salchi.jpg',  precio: 14, stock: 20, det: ['Salchicha y papas', 'Con salsas'] },
    { id: 'sn-pizza',   nombre: 'Pizza personal', tipo: 'snacks', icono: '🍕', img: 'snack-pizza.jpg',   precio: 18, stock: 20, det: ['Queso y jamón', '6 porciones'] },
    { id: 'sn-papas',   nombre: 'Papas fritas',   tipo: 'snacks', icono: '🍟', img: 'snack-papas.jpg',   precio: 8,  stock: 20, det: ['Porción grande', 'Con salsas'] },
    { id: 'sn-nachos',  nombre: 'Nachos',         tipo: 'snacks', icono: '🧀', img: 'snack-nachos.jpg',  precio: 10, stock: 20, det: ['Con queso cheddar', 'Para compartir'] },
    { id: 'sn-gaseosa', nombre: 'Gaseosa',        tipo: 'snacks', icono: '🥤', img: 'snack-gaseosa.jpg', precio: 6,  stock: 20, det: ['500 ml', 'Varios sabores'] },
    { id: 'sn-agua',    nombre: 'Agua mineral',   tipo: 'snacks', icono: '💧', img: 'snack-agua.jpg',    precio: 4,  stock: 20, det: ['500 ml', 'Con o sin gas'] },
    { id: 'sn-energy',  nombre: 'Energizante',    tipo: 'snacks', icono: '⚡', img: 'snack-energy.jpg',  precio: 12, stock: 20, det: ['Lata 250 ml', 'Bien frío'] },
    { id: 'sn-cafe',    nombre: 'Café o té',      tipo: 'snacks', icono: '☕', img: 'snack-cafe.jpg',    precio: 6,  stock: 20, det: ['Caliente', 'Con azúcar aparte'] },
    { id: 'sn-brownie', nombre: 'Brownie',        tipo: 'snacks', icono: '🍫', img: 'snack-brownie.jpg', precio: 8,  stock: 20, det: ['Chocolate', 'Porción individual'] },
    { id: 'sn-helado',  nombre: 'Helado',         tipo: 'snacks', icono: '🍦', img: 'snack-helado.jpg',  precio: 7,  stock: 20, det: ['Vainilla o chocolate', 'Copa individual'] }
  ];

  let catalogo      = [];     // máquinas + snacks (copias de los arrays)
  let errorCarga    = false;
  let pedido        = {};     // { idItem: cantidad } (máquinas y snacks)
  let horas         = 1;
  let reservas      = [];
  let colaSync      = [];     // ARRAY: cola de sincronización (reservas pendientes de envío)
  let enviando      = false;
  let reservaACancelar = null;
  let deadline      = null;   // momento en que vence el plazo de 5 min
  let modalDeadline = null;
  let flashFijo     = null;   // null = calcular al momento; true/false = fijo mientras se confirma
  let flashPrev     = false;
  let timerId       = null;
  let resizeId      = null;
  let vistaActual   = 'inicio';
  let catActual     = 'catalogo';
  let pagina        = 0;
  let paso          = 1;
  let estacionAbierta = null;

  /* ============================================
     UTILIDADES
     ============================================ */
  function porId(id) { return catalogo.find(function (e) { return e.id === id; }); }
  function esSnack(e) { return e.tipo === 'snacks'; }
  function unidades(deSnacks) {
    return Object.keys(pedido).reduce(function (a, id) {
      const e = porId(id);
      return (e && esSnack(e) === deSnacks) ? a + pedido[id] : a;
    }, 0);
  }
  function totalMaquinas() { return unidades(false); }
  function totalSnacks()   { return unidades(true); }
  function totalItems()    { return totalMaquinas() + totalSnacks(); }
  function precioTxt(e) { return e.precio + (esSnack(e) ? ' BOB' : ' BOB/h'); }
  function enReservaTxt(e) {
    return 'En tu reserva: ' + (pedido[e.id] || 0) + (esSnack(e) ? ' unidad(es)' : ' máquina(s)');
  }
  function fmt(n) { return Number(n.toFixed(2)); }
  function mmss(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  // Escapa texto antes de meterlo en una plantilla HTML (anti-XSS)
  function esc(s) { return $('<div>').text(String(s)).html().replace(/"/g, '&quot;'); }

  /* ============================================
     1. HIDRATACIÓN reutilizable (el HTML llega estático)
     ============================================ */
  function hidratar(id, retraso, activar) {
    setTimeout(function () {
      const $box = $('#' + id);
      if ($box.attr('data-hidratado') === 'true') return;
      activar($box);
      $box.attr('data-hidratado', 'true').removeClass('estatico').addClass('hidratado');
    }, retraso);
  }

  /* ============================================
     3. ESTADO DE RED (Offline-First) + COLA DE SINCRONIZACIÓN (array)
     ============================================ */
  function actualizarEstadoRed() {
    const $r = $('#estadoRed');
    if (navigator.onLine) {
      $r.removeClass('off').addClass('on').find('.ic').text('🟢');
      $r.find('.txt').text('En línea');
      procesarCola();
    } else {
      $r.removeClass('on').addClass('off').find('.ic').text('🟠');
      $r.find('.txt').text('Offline · datos locales');
    }
  }

  // Servidor simulado (0,6 s). Con un servidor real, aquí iría el fetch POST.
  function enviarAlServidor(item) {
    return new Promise(function (ok) { setTimeout(ok, 600); });
  }

  // Vacía la cola de a una reserva (primero en entrar, primero en salir)
  function procesarCola() {
    if (enviando || !navigator.onLine || !colaSync.length) return;
    enviando = true;
    (function siguiente() {
      if (!colaSync.length || !navigator.onLine) { enviando = false; return; }
      const item = colaSync[0];
      enviarAlServidor(item).then(function () {
        // sale de la cola (por código: si se canceló mientras se enviaba, no se toca otra)
        colaSync = colaSync.filter(function (x) { return x.codigo !== item.codigo; });
        marcarVerificada(item.codigo);
        guardar();
        siguiente();
      }).catch(function () { enviando = false; });   // si falla, se queda en la cola para reintentar
    })();
  }

  // Pendiente → verificada (una reserva cancelada no cambia)
  function marcarVerificada(codigo) {
    const r = reservas.find(function (x) { return x.codigo === codigo; });
    if (!r || r.estado !== 'pendiente') return;
    r.estado = 'verificada';
    renderReservas();
    toast('✅ Reserva ' + codigo + ' verificada', 'exito');
  }

  function registrarRed() {
    $(window).off('online.red offline.red').on('online.red offline.red', actualizarEstadoRed);

    // El Service Worker avisa cuando vuelve la red (Background Sync)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function (e) {
        if (e.data && e.data.tipo === 'red-disponible') procesarCola();
      });
    }
  }

  /* ============================================
     4. CATÁLOGO: array + lazy loading + PAGINADO (sin scroll)
     ============================================ */
  function cargarCatalogo() {
    // Se copian los arrays para no modificar los originales
    catalogo = ESTACIONES.concat(SNACKS).map(function (e) { return Object.assign({}, e); });
    errorCarga = false;
    const maquinas = catalogo.filter(function (e) { return !esSnack(e); });
    $('#stat-total').text(maquinas.reduce(function (a, e) { return a + e.stock; }, 0));
    $('#stat-min').text(Math.min.apply(null, maquinas.map(function (e) { return e.precio; })));
    renderPopulares();
    return Promise.resolve();   // el bloque final usa .then()
  }

  function filtradas() {
    return catActual === 'catalogo' ? catalogo : catalogo.filter(function (e) { return e.tipo === catActual; });
  }

  // Cuántas tarjetas caben según el tamaño real de la zona del catálogo
  function calcTamano() {
    const w = window.innerWidth;
    const wC = $('#catalogoArcade').width();
    const cols = wC > 40
      ? Math.max(1, Math.min(4, Math.floor((wC + GAP) / (ANCHO_MIN + GAP))))
      : (w >= 992 ? 3 : (w >= 640 ? 2 : 1));
    const h = $('#catalogoArcade').height();
    if (h < 40) return { cols: cols, porPagina: cols * 4 };
    const filas = Math.max(1, Math.floor((h + GAP) / (ALTO_FILA + GAP)));
    return { cols: cols, porPagina: cols * filas };
  }

  function renderCatalogo() {
    const $g = $('#catalogoArcade');
    if (errorCarga) {
      $g.html('<p class="error-carga">⚠️ No se pudo cargar el catálogo.</p>');
      $('#pgInfo').text('—'); $('#pgPrev, #pgNext').prop('disabled', true);
      return;
    }
    const lista = filtradas();
    const t = calcTamano();
    const paginas = Math.max(1, Math.ceil(lista.length / t.porPagina));
    pagina = Math.min(pagina, paginas - 1);
    const slice = lista.slice(pagina * t.porPagina, (pagina + 1) * t.porPagina);

    $g.css('grid-template-columns', 'repeat(' + t.cols + ', minmax(0, 1fr))');

    let html = '';
    slice.forEach(function (e) {
      html += '' +
        '<article class="tarjeta-pista" data-id="' + esc(e.id) + '" data-type="' + esc(e.tipo) + '">' +
          '<div class="media miniatura abrir-det img-' + esc(e.tipo) + '">' +
            '<span class="emoji">' + esc(e.icono) + '</span>' +
            '<img src="img/' + esc(e.img) + '" alt="' + esc(e.nombre) + '" loading="lazy" width="64" height="64" onerror="this.remove()">' +
            '<span class="stock ' + (e.stock <= 2 ? 'bajo' : '') + '">' + e.stock + '</span>' +
          '</div>' +
          '<div class="info-pista abrir-det">' +
            '<h4 class="titulo-truncado">' + esc(e.nombre) + '</h4>' +
            '<p class="precio">' + esc(precioTxt(e)) + '</p>' +
            '<small class="mas-det">Toca para ver detalles</small>' +
          '</div>' +
          '<div class="contador">' +
            '<button class="btn-menos" aria-label="Quitar">−</button>' +
            '<span class="qty-est">0</span>' +
            '<button class="btn-mas" aria-label="Agregar">+</button>' +
          '</div>' +
        '</article>';
    });
    $g.html(html);
    syncTarjetas();

    $('#pgInfo').text('Página ' + (pagina + 1) + ' / ' + paginas);
    $('#pgPrev').prop('disabled', pagina === 0);
    $('#pgNext').prop('disabled', pagina >= paginas - 1);
  }

  function syncTarjetas() {
    $('.tarjeta-pista').each(function () {
      const q = pedido[$(this).data('id')] || 0;
      $(this).find('.qty-est').text(q);
      $(this).toggleClass('seleccion', q > 0);
    });
  }

  // Ventana flotante con el detalle (todo con .text())
  function abrirDetalle(id) {
    const e = porId(id);
    if (!e) return;
    estacionAbierta = id;
    $('#detTitulo').text(e.nombre);
    $('#detInsignia').text(ETIQUETA[e.tipo]);
    $('#detStock').text(e.stock + ' disponibles');
    $('#detPrecio').text(esSnack(e) ? e.precio + ' BOB por unidad' : e.precio + ' BOB / hora por máquina');
    const $ul = $('#detLista').empty();
    e.det.forEach(function (d) { $ul.append($('<li>').text(d)); });
    $('#detEnGrupo').text(enReservaTxt(e));
    $('#detAgregar').text(esSnack(e) ? '+ Agregar al pedido' : '+ Agregar al grupo');
    abrirModal('m-detalle');
  }

  // Hidratación del catálogo: delegación con .off().on()
  function activarCatalogo() {
    $('#catalogoArcade').off('.cat');

    $('#catalogoArcade').on('click.cat', '.abrir-det', function () {
      abrirDetalle($(this).closest('.tarjeta-pista').data('id'));
    });
    $('#catalogoArcade').on('click.cat', '.btn-mas', function () {
      agregarUno($(this).closest('.tarjeta-pista').data('id'));
    });
    $('#catalogoArcade').on('click.cat', '.btn-menos', function () {
      const id = $(this).closest('.tarjeta-pista').data('id');
      setQty(id, (pedido[id] || 0) - 1);
    });

    $('#pgPrev').off('click').on('click', function () { pagina--; renderCatalogo(); $('#catalogoArcade').hide().fadeIn(250); });
    $('#pgNext').off('click').on('click', function () { pagina++; renderCatalogo(); $('#catalogoArcade').hide().fadeIn(250); });

    $('#detAgregar').off('click').on('click', function () {
      if (estacionAbierta) {
        agregarUno(estacionAbierta);
        $('#detEnGrupo').text(enReservaTxt(porId(estacionAbierta)));
      }
    });

    if (CATEGORIAS.indexOf(vistaActual) > -1) renderCatalogo();
  }

  // Devuelve true si se agregó (false si no hay más stock)
  function agregarUno(id) {
    const e = porId(id), actual = pedido[id] || 0;
    if (actual >= e.stock) { toast('⚠️ Solo hay ' + e.stock + ' de "' + e.nombre + '"', 'error'); return false; }
    setQty(id, actual + 1);
    return true;
  }

  function setQty(id, q) {
    const e = porId(id);
    q = Math.max(0, Math.min(e.stock, q));
    if (q > 0) { pedido[id] = q; } else { delete pedido[id]; }

    if (totalItems() > 0) {
      if (!deadline) deadline = Date.now() + PLAZO * 1000;   // arranca el plazo (y el descuento Flash)
    } else {
      deadline = null;
      flashPrev = false;
      pintarPlazo(null);
    }

    syncTarjetas();
    renderResumen();
    programarTick();
  }

  /* ============================================
     4b. PANEL LATERAL DE INICIO (pantallas grandes): abierto ahora + populares
     ============================================ */
  function estadoAbierto() {
    const h = new Date().getHours();
    const abierto = h >= 18 || h < 2;   // 18:00 a 02:00
    $('#estadoAbierto').removeClass('si no').addClass(abierto ? 'si' : 'no')
      .text(abierto ? '🟢 Abierto ahora · cierra a las 02:00' : '🔴 Cerrado · abre a las 18:00');
  }

  function renderPopulares() {
    const $ul = $('#listaPopulares').empty();
    catalogo.filter(function (e) { return e.popular; }).slice(0, 4).forEach(function (e) {
      const $li = $('<li>').addClass('pop-fila').attr('data-id', e.id);
      $li.append(
        $('<span>').addClass('pop-ico').text(e.icono),
        $('<div>').addClass('pop-info').append(
          $('<span>').addClass('titulo-truncado').text(e.nombre),
          $('<small>').text(precioTxt(e))
        ),
        $('<button>').addClass('btn-tactil pop-add').attr('aria-label', 'Agregar ' + e.nombre).text('+')
      );
      $ul.append($li);
    });
  }

  // Hidratación del panel: delegación con .off().on()
  function activarLado() {
    $('#listaPopulares').off('click.pop');
    $('#listaPopulares').on('click.pop', '.pop-add', function () {
      const id = $(this).closest('.pop-fila').data('id');
      if (agregarUno(id)) toast('➕ ' + porId(id).nombre + ' agregado', 'exito');
    });
    $('#listaPopulares').on('click.pop', '.pop-info', function () {
      abrirDetalle($(this).closest('.pop-fila').data('id'));
    });
  }

  /* ============================================
     5. NAVEGACIÓN POR VISTAS (sin anclas, sin scroll)
     ============================================ */
  function route(nombre) {
    if (VISTAS.indexOf(nombre) === -1) nombre = 'inicio';
    vistaActual = nombre;
    const esCat = CATEGORIAS.indexOf(nombre) > -1;
    const vista = esCat ? 'catalogo' : nombre;

    cerrarModal();
    $('[data-pagina]').removeClass('activo').filter('[data-pagina="' + vista + '"]').addClass('activo');
    $('.vista').stop(true, true).hide();
    $('#v-' + vista).fadeIn(300).scrollTop(0);

    if (esCat) {
      catActual = nombre;
      pagina = 0;
      const t = TEMAS[nombre];
      // Cambio dinámico de temática e ícono (addClass / removeClass / .html)
      $('#bannerTema').removeClass('tema-todos tema-ps5 tema-pc tema-arcade tema-snacks').addClass(t.clase);
      $('#bannerIcono').html(t.icono);
      $('#bannerTitulo').text(t.titulo);
      $('#bannerSub').text(t.sub);
      $('.tab').removeClass('activo').filter('[data-tab="' + nombre + '"]').addClass('activo');
      renderCatalogo();
      $('#catalogoArcade').hide().fadeIn(350);
    }
    if (vista === 'inicio') estadoAbierto();
    actualizarBadge();
  }

  function registrarNavegacion() {
    $(window).off('hashchange.nav').on('hashchange.nav', function () {
      route(location.hash.replace('#', ''));
    });
    $('#navMenu a').off('click.nav').on('click.nav', function () { $('#navMenu').slideUp(250); });

    // Al girar o redimensionar, se recalcula cuántas tarjetas caben
    $(window).off('resize.cat orientationchange.cat').on('resize.cat orientationchange.cat', function () {
      clearTimeout(resizeId);
      resizeId = setTimeout(function () {
        if (CATEGORIAS.indexOf(vistaActual) > -1 && catalogo.length) renderCatalogo();
      }, 200);
    });
  }

  /* ============================================
     6. CÁLCULO: horas, snacks y TARIFA FLASH automática
     ============================================ */
  // Flash activo = aún estamos en los primeros FLASH segundos del plazo
  function flashActivo() {
    return !!deadline && Date.now() < deadline - (PLAZO - FLASH) * 1000;
  }
  // Mientras se confirma (30 s) el descuento queda fijo
  function flashVigente() {
    return flashFijo !== null ? flashFijo : flashActivo();
  }

  function calcular() {
    const flash = flashVigente();
    const items = [], snacks = [];
    let bruto = 0, totalSn = 0;

    Object.keys(pedido).forEach(function (id) {
      const e = porId(id);
      if (!e) return;
      if (esSnack(e)) {
        const sub = e.precio * pedido[id];
        snacks.push({ e: e, q: pedido[id], sub: sub });
        totalSn += sub;
      } else {
        const sub = e.precio * pedido[id] * horas;     // las máquinas se cobran por hora
        items.push({ e: e, q: pedido[id], sub: sub });
        bruto += sub;
      }
    });
    const desc = flash ? bruto * DESC_FLASH : 0;         // el descuento Flash es solo para máquinas
    return { horas: horas, flash: flash, items: items, snacks: snacks, bruto: bruto, desc: desc, totalSnacks: totalSn, total: bruto - desc + totalSn };
  }

  /* ============================================
     7. RESUMEN EDITABLE (− cantidad +) para máquinas, snacks y horas
     ============================================ */
  // Una fila con su contador − +; los textos van con .text() (anti-XSS)
  function filaEditable(id, titulo, subtitulo, qty, precio, sinMas) {
    const $li = $('<li>').addClass('fila-edit').attr('data-id', id);
    const $txt = $('<div>').addClass('fe-txt')
      .append($('<span>').addClass('fe-nombre titulo-truncado').text(titulo),
              $('<small>').text(subtitulo));
    const $ctr = $('<div>').addClass('contador').append(
      $('<button>').addClass('r-menos').attr('aria-label', 'Quitar uno').text('−'),
      $('<span>').addClass('qty').text(qty),
      $('<button>').addClass('r-mas').attr('aria-label', 'Agregar uno').prop('disabled', sinMas).text('+')
    );
    const $pr = $('<b>').addClass('fe-precio').text(precio);
    return $li.append($txt, $ctr, $pr);
  }

  function renderResumen() {
    const c = calcular();

    // Horas
    $('#horasVal').text(horas + (horas === 1 ? ' hora' : ' horas'));
    $('#h-menos').prop('disabled', horas <= 1);
    $('#h-mas').prop('disabled', horas >= 12);

    // Máquinas elegidas
    const $m = $('#listaMaquinas').empty();
    if (!c.items.length) {
      $m.append($('<li class="vacio">').text('Aún no eliges máquinas. Ve al Catálogo: si confirmas en los primeros ' + (FLASH / 60) + ' min tienes −15 %.'));
    }
    c.items.forEach(function (it) {
      $m.append(filaEditable(it.e.id, it.e.nombre, it.e.precio + ' BOB/h c/u',
        it.q, fmt(it.sub) + ' BOB', it.q >= it.e.stock));
    });

    // Snacks elegidos
    const $s = $('#listaSnacks').empty();
    if (!c.snacks.length) {
      $s.append($('<li class="vacio">').text('Sin snacks. Agrégalos desde el Catálogo (pestaña Snacks).'));
    }
    c.snacks.forEach(function (it) {
      $s.append(filaEditable(it.e.id, it.e.nombre, it.e.precio + ' BOB c/u',
        it.q, fmt(it.sub) + ' BOB', it.q >= it.e.stock));
    });

    // Descuento y total
    $('#descLinea').toggleClass('oculto', !(c.desc > 0));
    $('#descVal').text('−' + fmt(c.desc) + ' BOB');
    $('#total-price').text(fmt(c.total) + ' BOB').stop(true, true)
      .animate({ fontSize: '1.5rem' }, 120).animate({ fontSize: '1.2rem' }, 120);

    // Mini resumen del panel lateral (pantallas grandes)
    $('#miniMaq').text(totalMaquinas());
    $('#miniSnk').text(totalSnacks());
    $('#miniTotal').text(fmt(c.total) + ' BOB');

    estadoDatos();
    actualizarBadge();
    guardar();
  }

  // + o − sobre una fila del Resumen
  function cambiar($fila, delta) {
    const id = $fila.data('id');
    setQty(id, (pedido[id] || 0) + delta);
  }

  function estadoDatos() {
    const completos = datosCompletos();
    $('#tileDatos').text(completos ? '✅ Completos' : 'Pendiente').toggleClass('ok', completos);
  }

  function actualizarBadge() {
    const n = totalItems();
    $('#navBadge').text(n).toggleClass('oculto', n === 0);
  }

  /* ============================================
     8. VALIDACIÓN EN TIEMPO REAL
     ============================================ */
  const LETRAS = 'A-Za-zÁÉÍÓÚÜáéíóúüÑñ';
  const reglas = {
    nombre: function (v) { return new RegExp('^[' + LETRAS + ']{2,}(\\s+[' + LETRAS + ']{2,})+$').test(v.trim()) ? '' : 'Ingresa nombre y apellido (solo letras).'; },
    ci:     function (v) { return /^\d{6,9}$/.test(v) ? '' : 'La CI debe tener entre 6 y 9 dígitos.'; },
    tel:    function (v) { return /^[67]\d{7}$/.test(v) ? '' : 'Celular de 8 dígitos que empiece con 6 o 7.'; },
    email:  function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Ingresa un correo válido.'; },
    fecha:  function (v) { return !v ? 'Elige una fecha.' : (v < $('#fecha').attr('min') ? 'La fecha no puede ser pasada.' : ''); },
    hora:   function (v) { return v ? '' : 'Elige un horario.'; },
    terms:  function (v) { return v ? '' : 'Debes aceptar las condiciones.'; }
  };

  function valorCampo(id) {
    const $el = $('#' + id);
    return $el.is(':checkbox') ? $el.is(':checked') : $el.val();
  }
  function datosCompletos() {
    return CAMPOS.every(function (id) { return reglas[id](valorCampo(id)) === ''; });
  }
  function validarCampo(id) {
    const msg = reglas[id](valorCampo(id));
    const $box = $('#' + id).closest('.campo');
    $box.toggleClass('invalido', !!msg).toggleClass('valido', !msg);
    $box.find('.err').text(msg);   // .text(): nunca HTML crudo
    return !msg;
  }

  /* ============================================
     9. FORMULARIO POR PASOS (ventana flotante) + HIDRATACIÓN DE LA RESERVA
     ============================================ */
  function mostrarPaso(n) {
    paso = n;
    $('.paso').hide();
    $('#paso' + n).show();
    $('#pasoInfo').text('Paso ' + n + ' de 3');
    $('#pasoAtras').toggleClass('oculto', n === 1);
    $('#pasoSig').text(n === 3 ? 'Guardar datos' : 'Siguiente ›');
  }

  function abrirCliente(n) {
    mostrarPaso(n || 1);
    abrirModal('m-cliente');
  }

  function pasoDeCampo(id) {
    for (let p = 1; p <= 3; p++) { if (PASOS[p].indexOf(id) > -1) return p; }
    return 1;
  }

  function activarReserva() {
    // Horas (− +)
    $('#h-menos').off('click').on('click', function () { horas = Math.max(1, horas - 1); renderResumen(); });
    $('#h-mas').off('click').on('click', function () { horas = Math.min(12, horas + 1); renderResumen(); });

    // Máquinas y snacks del Resumen: delegación (la lista se redibuja en cada cambio)
    $('#hid-reserva').off('click.res');
    $('#hid-reserva').on('click.res', '.r-mas', function () { cambiar($(this).closest('.fila-edit'), +1); });
    $('#hid-reserva').on('click.res', '.r-menos', function () { cambiar($(this).closest('.fila-edit'), -1); });

    // Formulario
    $('#ci, #tel').off('input.solo').on('input.solo', function () { this.value = this.value.replace(/\D/g, ''); });
    $('#formReserva').off('.form')
      .on('input.form change.form focusout.form', 'input, select', function () {
        validarCampo(this.id);
        estadoDatos();
        guardar();
      });

    $('#tileDatosBtn').off('click').on('click', function () { abrirCliente(1); });
    $('#pasoAtras').off('click').on('click', function () { if (paso > 1) mostrarPaso(paso - 1); });
    $('#pasoSig').off('click').on('click', function () {
      let ok = true;
      PASOS[paso].forEach(function (id) { if (!validarCampo(id)) ok = false; });
      if (!ok) return;
      if (paso < 3) { mostrarPaso(paso + 1); return; }
      cerrarModal();
      toast('✅ Datos guardados', 'exito');
    });

    // Confirmar → valida todo y abre la ventana de confirmación
    $('#btn-confirm').off('click').on('click', function () {
      if (totalMaquinas() === 0) {
        toast('⚠️ Primero elige al menos una máquina', 'error');
        location.hash = 'catalogo';
        return;
      }
      let primero = null;
      CAMPOS.forEach(function (id) { if (!validarCampo(id) && !primero) primero = id; });
      if (primero) {
        toast('⚠️ Completa los datos de quien reserva', 'error');
        abrirCliente(pasoDeCampo(primero));
        return;
      }
      abrirConfirmacion();
    });
  }

  /* ============================================
     10. VENTANAS FLOTANTES (modales)
     ============================================ */
  function abrirModal(id) {
    $('#navMenu').slideUp(150);
    $('.pantalla').not('#' + id).stop(true, true).hide();
    $('#' + id).stop(true, true).fadeIn(200);
  }

  function cerrarModal() {
    modalDeadline = null;
    $('.pantalla:visible').stop(true, true).fadeOut(200);
    if (flashFijo !== null) { flashFijo = null; renderResumen(); }   // vuelve el cálculo en vivo
  }

  function registrarModales() {
    $(document).off('click.modal', '[data-modal]');
    $(document).on('click.modal', '[data-modal]', function () { abrirModal($(this).data('modal')); });

    $(document).off('click.cerrar', '[data-cerrar]');
    $(document).on('click.cerrar', '[data-cerrar]', cerrarModal);

    $(document).off('click.fondo', '.pantalla');
    $(document).on('click.fondo', '.pantalla', function (e) { if (e.target === this) cerrarModal(); });

    $(document).off('keyup.esc').on('keyup.esc', function (e) { if (e.key === 'Escape') cerrarModal(); });
  }

  /* ============================================
     11. CONFIRMACIÓN (30 s) + PROCESAR PAGO
     ============================================ */
  function abrirConfirmacion() {
    flashFijo = flashActivo();          // el descuento queda fijo mientras confirmas
    const c = calcular();
    const detalle = c.items.map(function (it) { return it.q + '× ' + it.e.nombre; }).join(', ');
    const snacksTxt = totalSnacks() ? ' + ' + totalSnacks() + ' snack(s)' : '';

    $('#m-client').text($('#nombre').val().trim() + ' (CI ' + $('#ci').val() + ')');
    $('#m-group').text(totalMaquinas() + ' máquina(s) · ' + c.horas + (c.horas === 1 ? ' hora' : ' horas'));
    $('#m-when').text($('#fecha').val().split('-').reverse().join('/') + ' · ' + $('#hora').val());
    $('#m-service').text(detalle + snacksTxt);
    $('#m-amount').text(fmt(c.total) + ' BOB' + (c.flash ? ' (⚡ Flash −15 %)' : ''));

    abrirModal('m-confirm');
    modalDeadline = Date.now() + TIEMPO_MODAL * 1000;   // después de abrir (abrirModal no lo toca)
    $('#timerFill').css('transition', 'none').css('width', '100%');
    setTimeout(function () { $('#timerFill').css('transition', 'width 1s linear'); }, 30);
    pintarModal(TIEMPO_MODAL);
    programarTick();
  }

  function pintarModal(s) {
    $('#m-timer').text(mmss(s)).toggleClass('peligro', s <= 10);
    $('#timerFill').css('width', (s / TIEMPO_MODAL * 100) + '%');
  }

  function registrarPago() {
    $('#m-pay').off('click.pago').on('click.pago', function () {
      const c = calcular();
      const online = navigator.onLine;
      const nombre = $('#nombre').val().trim();
      const resumen = c.items.map(function (it) { return it.q + '× ' + it.e.nombre; }).join(', ') +
        (totalSnacks() ? ' + ' + totalSnacks() + ' snack(s)' : '') +
        ' · ' + fmt(c.total) + ' BOB' + (c.flash ? ' · ⚡ Flash −15 %' : '');
      const cuando = $('#fecha').val().split('-').reverse().join('/') + ' · ' + $('#hora').val();

      // UI optimista: se confirma al instante y nace "pendiente"
      const reserva = {
        codigo: 'LU-' + Date.now().toString(36).toUpperCase().slice(-5),
        nombre: nombre, resumen: resumen, cuando: cuando, estado: 'pendiente'
      };
      reservas.unshift(reserva);
      if (reservas.length > 20) reservas.pop();
      colaSync.push({ codigo: reserva.codigo, nombre: nombre, resumen: resumen });   // entra a la cola

      cerrarModal();
      reiniciarPedido(true);
      renderReservas();
      toast(online ? '📨 ¡Gracias, ' + nombre.split(' ')[0] + '! Enviando tu reserva…'
                   : '💾 Guardada localmente · Pendiente de envío', online ? 'exito' : 'error');
      location.hash = 'pedidos';

      if (online) {
        procesarCola();
      } else if ('serviceWorker' in navigator && 'SyncManager' in window) {
        // Sin red: se le pide al Service Worker que avise cuando vuelva
        navigator.serviceWorker.ready
          .then(function (reg) { return reg.sync.register('sync-reservas'); })
          .catch(function () {});
      }
    });
  }

  function reiniciarPedido(limpiarForm) {
    pedido = {};
    horas = 1;
    deadline = null;
    flashPrev = false;
    syncTarjetas();

    if (limpiarForm) {
      CAMPOS.forEach(function (id) {
        const $el = $('#' + id);
        if ($el.is(':checkbox')) { $el.prop('checked', false); } else { $el.val(''); }
        $el.closest('.campo').removeClass('valido invalido').find('.err').text('');
      });
    }
    renderResumen();
    pintarPlazo(null);
  }

  /* ============================================
     12. TEMPORIZADORES (setTimeout re-programado, sin setInterval)
     ============================================ */
  function programarTick() {
    clearTimeout(timerId);
    if (deadline || modalDeadline) timerId = setTimeout(tick, 1000);
  }

  function tick() {
    if (deadline) {
      const r = Math.ceil((deadline - Date.now()) / 1000);
      if (r <= 0) {
        cerrarModal();
        reiniciarPedido(false);
        toast('⏰ Se agotó tu plazo de 5 minutos. Vuelve a elegir', 'error');
      } else {
        pintarPlazo(r);
        controlFlash();
      }
    }
    if (modalDeadline) {
      const m = Math.ceil((modalDeadline - Date.now()) / 1000);
      if (m <= 0) {
        cerrarModal();
        toast('⏰ Se agotó el tiempo para confirmar', 'error');
      } else {
        pintarModal(m);
      }
    }
    programarTick();
  }

  function pintarPlazo(r) {
    const activo = r !== null;
    $('#plazoChip, #holdBox').toggleClass('oculto', !activo);
    if (!activo) return;
    $('#plazoChipTxt, #holdTimer').text(mmss(r));
    $('#plazoChip, #holdTimer, #holdFill').toggleClass('peligro', r <= 60);
    $('#holdFill').css('width', (r / PLAZO * 100) + '%');
  }

  // Cuenta regresiva del descuento Flash y aviso cuando termina
  function controlFlash() {
    const activo = flashActivo();
    const restante = deadline ? Math.ceil((deadline - (PLAZO - FLASH) * 1000 - Date.now()) / 1000) : 0;

    $('#flashRow, #miniFlash').toggleClass('oculto', !activo);
    if (activo) {
      $('#flashTimer, #miniFlashT').text(mmss(restante));
      $('#flashTimer').toggleClass('peligro', restante <= 30);
    }

    if (flashPrev && !activo && flashFijo === null && deadline) {
      renderResumen();   // el total vuelve a tarifa normal
      toast('⚡ Terminó el descuento Flash: ahora tarifa normal', 'error');
    }
    flashPrev = activo;
  }

  /* ============================================
     13. HISTORIAL: MIS RESERVAS (anti-XSS) + CANCELAR
     ============================================ */
  function renderReservas() {
    const $ul = $('#listaReservas').empty();
    if (!reservas.length) {
      $ul.append($('<li class="item-reserva vacio">').text('Aún no hay reservas.'));
    }
    reservas.forEach(function (r) {
      const $li = $('<li>').addClass('item-reserva ' + r.estado);
      const $txt = $('<div>').addClass('res-txt').append(
        $('<strong>').addClass('titulo-truncado').text(r.codigo + ' · ' + r.nombre),
        $('<small>').addClass('res-det').text(r.resumen)
      );
      if (r.cuando) $txt.append($('<small>').addClass('res-cuando').text('📅 ' + r.cuando));

      const $acc = $('<div>').addClass('res-acc').append(
        $('<span>').addClass('estado ' + r.estado).text(ESTADOS[r.estado] || r.estado)
      );
      if (r.estado !== 'cancelada') {
        $acc.append($('<button>').addClass('btn-ghost btn-cancelar').attr('data-codigo', r.codigo).text('Cancelar'));
      }
      $li.append($txt, $acc);
      $ul.append($li);
    });
    guardar();
  }

  function cancelarReserva(codigo) {
    const r = reservas.find(function (x) { return x.codigo === codigo; });
    if (!r || r.estado === 'cancelada') return;
    r.estado = 'cancelada';
    // si estaba pendiente de envío, sale de la cola de sincronización
    colaSync = colaSync.filter(function (x) { return x.codigo !== codigo; });
    renderReservas();
    toast('🚫 Reserva ' + codigo + ' cancelada', 'error');
  }

  // Delegación con .off().on(): los botones se redibujan en cada cambio
  function registrarHistorial() {
    $('#listaReservas').off('click.cancelar', '.btn-cancelar');
    $('#listaReservas').on('click.cancelar', '.btn-cancelar', function () {
      reservaACancelar = String($(this).attr('data-codigo'));
      const r = reservas.find(function (x) { return x.codigo === reservaACancelar; });
      $('#cancelTexto').text('¿Cancelar la reserva ' + reservaACancelar + (r ? ' de ' + r.nombre : '') + '?');
      abrirModal('m-cancelar');
    });

    $('#btnSiCancelar').off('click').on('click', function () {
      if (reservaACancelar) cancelarReserva(reservaACancelar);
      reservaACancelar = null;
      cerrarModal();
    });
  }

  /* ============================================
     14. EXTRAS: hide/show, fadeToggle, tema, teclado
     ============================================ */
  function registrarExtras() {
    $('#hint-close').off('click').on('click', function () {
      $('#hint-grupo').hide(); $('#hint-open').show();
      if (CATEGORIAS.indexOf(vistaActual) > -1) renderCatalogo();
    });
    $('#hint-open').off('click').on('click', function () {
      $('#hint-grupo').show(); $(this).hide();
      if (CATEGORIAS.indexOf(vistaActual) > -1) renderCatalogo();
    });

    $('#btn-datos').off('click').on('click', function () { $('#m-datos').fadeToggle(300); });

    $('#themeBtn').off('click').on('click', function () {
      $('body').toggleClass('light');
      $(this).text($('body').hasClass('light') ? '☀️' : '🌙');
    });

    // Teclado virtual: se oculta el menú inferior para no tapar el campo activo
    $(document).off('focusin.teclado focusout.teclado');
    $(document).on('focusin.teclado', 'input, select, textarea', function () { $('body').addClass('teclado'); });
    $(document).on('focusout.teclado', 'input, select, textarea', function () { $('body').removeClass('teclado'); });
  }

  /* ============================================
     15. TOAST: slideDown → 3 s → fadeOut
     ============================================ */
  function toast(mensaje, tipo) {
    $('<div class="toast ' + (tipo || '') + '"></div>')
      .text(mensaje)
      .appendTo('#toast-box')
      .slideDown(300).delay(3000).fadeOut(400, function () { $(this).remove(); });
  }

  /* ============================================
     16. PERSISTENCIA (localStorage: guarda los arrays, Offline-First)
     ============================================ */
  function guardar() {
    try {
      const form = {};
      CAMPOS.forEach(function (id) { form[id] = valorCampo(id); });
      localStorage.setItem(KEY, JSON.stringify({
        pedido: pedido, deadline: deadline, hrs: horas,
        form: form, reservas: reservas, colaSync: colaSync
      }));
    } catch (e) { /* sin almacenamiento */ }
  }

  function restaurar() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s) return;

    reservas = Array.isArray(s.reservas) ? s.reservas : [];
    colaSync = Array.isArray(s.colaSync) ? s.colaSync : [];
    // Reservas pendientes que no quedaron en la cola
    reservas.forEach(function (r) {
      if (r.estado === 'pendiente' && !colaSync.some(function (x) { return x.codigo === r.codigo; })) {
        colaSync.push({ codigo: r.codigo, nombre: r.nombre, resumen: r.resumen });
      }
    });

    if (s.form) {
      CAMPOS.forEach(function (id) {
        const $el = $('#' + id);
        if ($el.is(':checkbox')) { $el.prop('checked', !!s.form[id]); } else { $el.val(s.form[id] || ''); }
      });
    }

    const hayPedido = s.pedido && Object.keys(s.pedido).length > 0;
    if (hayPedido && s.deadline && s.deadline > Date.now()) {
      Object.keys(s.pedido).forEach(function (id) {
        const e = porId(id);
        if (e) pedido[id] = Math.min(e.stock, s.pedido[id]);
      });
      deadline = totalItems() > 0 ? s.deadline : null;
      horas = Math.min(12, Math.max(1, parseInt(s.hrs) || 1));
    } else if (hayPedido) {
      setTimeout(function () { toast('⏰ Tu plazo anterior expiró. Vuelve a elegir', 'error'); }, 700);
    }
  }

  /* ============================================
     INICIO
     ============================================ */
  (function fechaMinima() {
    const h = new Date();
    $('#fecha').attr('min', h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0') + '-' + String(h.getDate()).padStart(2, '0'));
  })();

  registrarRed();
  registrarNavegacion();
  registrarModales();
  registrarPago();
  registrarHistorial();
  registrarExtras();

  // Hidratación escalonada (solo lo que tiene botones activos)
  hidratar('hid-menu', 500, function () {
    $('#burguerBtn').text('☰').off('click').on('click', function () {
      $('#navMenu').stop(true, true).slideToggle(300);
    });
  });
  hidratar('hid-catalogo', 700, activarCatalogo);
  hidratar('hid-reserva', 900, activarReserva);
  hidratar('hid-lado', 1100, activarLado);

  // Primero el catálogo (arrays), luego el estado local y la vista
  cargarCatalogo().then(function () {
    restaurar();
    renderResumen();
    syncTarjetas();
    renderReservas();
    estadoAbierto();
    procesarCola();    // si había reservas pendientes y ya hay red, se envían
    route(location.hash.replace('#', ''));
    if (deadline) { tick(); }
  });

  actualizarEstadoRed();
});