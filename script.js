$(document).ready(function () {

  /* ============================================
     EJECUCIÓN ÚNICA (evita registrar todo dos veces)
     ============================================ */
  if (window.__arcadeInit) return;
  window.__arcadeInit = true;

  /* ============================================
     CONSTANTES Y ESTADO
     ============================================ */
  const KEY          = 'levelup_pwa_v2';
  const PLAZO        = 300;   // 5 min para confirmar
  const TIEMPO_MODAL = 30;    // 30 s del modal de confirmación
  const VISTAS       = ['inicio', 'catalogo', 'ps5', 'pc', 'arcade', 'reserva', 'pedidos', 'info'];
  const CATEGORIAS   = ['catalogo', 'ps5', 'pc', 'arcade'];
  const ETIQUETA     = { ps5: 'PS5', pc: 'PC', arcade: 'Arcade' };
  const CAMPOS       = ['nombre', 'ci', 'tel', 'email', 'personas', 'fecha', 'hora', 'terms'];
  const PASOS        = { 1: ['nombre', 'ci', 'tel'], 2: ['email', 'personas'], 3: ['fecha', 'hora', 'terms'] };
  const ALTO_FILA    = 84;    // alto de cada tarjeta del catálogo
  const GAP          = 8;

  const TEMAS = {
    catalogo: { clase: 'tema-todos',  icono: '📚', titulo: 'Catálogo completo', sub: 'Todas las estaciones' },
    ps5:      { clase: 'tema-ps5',    icono: '🎮', titulo: 'PlayStation 5',     sub: 'Solo estaciones PS5' },
    pc:       { clase: 'tema-pc',     icono: '💻', titulo: 'PC Gamer',          sub: 'Solo estaciones PC' },
    arcade:   { clase: 'tema-arcade', icono: '👾', titulo: 'Arcade Retro',      sub: 'Solo máquinas Arcade' }
  };

  let estaciones    = [];
  let errorCarga    = false;
  let pedido        = {};
  let reservas      = [];
  let cola          = [];
  let deadline      = null;
  let modalDeadline = null;
  let timerId       = null;
  let resizeId      = null;
  let vistaActual   = 'inicio';
  let catActual     = 'catalogo';
  let pagina        = 0;
  let paso          = 1;
  let estacionAbierta = null;
  let promptInstalar  = window.__instalar || null;

  /* ============================================
     UTILIDADES
     ============================================ */
  function porId(id) { return estaciones.find(function (e) { return e.id === id; }); }
  function totalMaquinas() { return Object.keys(pedido).reduce(function (a, k) { return a + pedido[k]; }, 0); }
  function fmt(n) { return Number(n.toFixed(2)); }
  function mmss(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  // Escapa texto antes de meterlo en una plantilla HTML (anti-XSS)
  function esc(s) { return $('<div>').text(String(s)).html().replace(/"/g, '&quot;'); }
  function linea(a, b, cls) {
    return $('<li>').addClass(cls || '').append($('<span>').text(a), $('<b>').text(b));
  }

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
     2. INSTALACIÓN DE LA PWA (botón ⬇️)
     ============================================ */
  function registrarInstalacion() {
    const esStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (esStandalone) { $('#btnInstalar').addClass('oculto'); return; }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      promptInstalar = e;
    });
    window.addEventListener('appinstalled', function () {
      promptInstalar = null;
      $('#btnInstalar').addClass('oculto');
      toast('✅ ¡App instalada!', 'exito');
    });

    $('#btnInstalar').off('click').on('click', function () {
      if (!promptInstalar) { abrirModal('m-instalar'); return; }
      promptInstalar.prompt();
      promptInstalar.userChoice.then(function (r) {
        if (r.outcome === 'accepted') toast('⬇️ Instalando…', 'exito');
        promptInstalar = null;
      });
    });
  }

  /* ============================================
     3. ESTADO DE RED (Offline-First) + sincronización
     ============================================ */
  function actualizarEstadoRed() {
    const $r = $('#estadoRed');
    if (navigator.onLine) {
      $r.removeClass('off').addClass('on').find('.ic').text('🟢');
      $r.find('.txt').text('En línea');
      sincronizar();
    } else {
      $r.removeClass('on').addClass('off').find('.ic').text('🟠');
      $r.find('.txt').text('Offline · datos locales');
    }
  }

  function sincronizar() {
    if (!reservas.some(function (r) { return r.estado === 'pendiente'; })) return;
    setTimeout(function () {
      if (!navigator.onLine) return;
      reservas.forEach(function (r) { if (r.estado === 'pendiente') r.estado = 'verificada'; });
      guardar();
      renderReservas();
      toast('✅ Reservas pendientes sincronizadas', 'exito');
    }, 1200);
  }

  function registrarRed() {
    $(window).off('online.red offline.red').on('online.red offline.red', actualizarEstadoRed);
  }

  /* ============================================
     4. CATÁLOGO: fetch + lazy loading + PAGINADO (sin scroll)
     ============================================ */
  function cargarCatalogo() {
    return fetch('data/estaciones.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Error al cargar el catálogo (' + res.status + ')');
        return res.json();
      })
      .then(function (data) {
        estaciones = data;
        errorCarga = false;
        $('#stat-total').text(estaciones.reduce(function (a, e) { return a + e.stock; }, 0));
        $('#stat-min').text(Math.min.apply(null, estaciones.map(function (e) { return e.precio; })));
      })
      .catch(function (err) {
        console.error('Fallo en catálogo:', err);
        errorCarga = true;
      });
  }

  function filtradas() {
    return catActual === 'catalogo' ? estaciones : estaciones.filter(function (e) { return e.tipo === catActual; });
  }

  // Cuántas tarjetas caben según el tamaño real de la pantalla
  function calcTamano() {
    const w = window.innerWidth;
    const cols = w >= 992 ? 3 : (w >= 640 ? 2 : 1);
    const h = $('#catalogoArcade').height();
    if (h < 40) return { cols: cols, porPagina: cols * 4 };
    const filas = Math.max(1, Math.floor((h + GAP) / (ALTO_FILA + GAP)));
    return { cols: cols, porPagina: cols * filas };
  }

  function renderCatalogo() {
    const $g = $('#catalogoArcade');
    if (errorCarga) {
      $g.html('<p class="error-carga">⚠️ No se pudo cargar el catálogo. Revisa tu conexión.</p>');
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
            '<p class="precio">' + e.precio + ' BOB/h</p>' +
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

  // Ventana flotante con el detalle de una estación (todo con .text())
  function abrirDetalle(id) {
    const e = porId(id);
    if (!e) return;
    estacionAbierta = id;
    $('#detTitulo').text(e.nombre);
    $('#detInsignia').text(ETIQUETA[e.tipo]);
    $('#detStock').text(e.stock + ' disponibles');
    $('#detPrecio').text(e.precio + ' BOB / hora por máquina');
    const $ul = $('#detLista').empty();
    e.det.forEach(function (d) { $ul.append($('<li>').text(d)); });
    $('#detEnGrupo').text('En tu grupo: ' + (pedido[id] || 0) + ' máquina(s)');
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
        $('#detEnGrupo').text('En tu grupo: ' + (pedido[estacionAbierta] || 0) + ' máquina(s)');
      }
    });

    if (CATEGORIAS.indexOf(vistaActual) > -1) renderCatalogo();
  }

  function agregarUno(id) {
    const e = porId(id), actual = pedido[id] || 0;
    if (actual >= e.stock) { toast('⚠️ Solo hay ' + e.stock + ' de "' + e.nombre + '"', 'error'); return; }
    setQty(id, actual + 1);
  }

  function setQty(id, q) {
    const e = porId(id);
    q = Math.max(0, Math.min(e.stock, q));
    if (q > 0) { pedido[id] = q; } else { delete pedido[id]; }

    if (totalMaquinas() > 0) { if (!deadline) deadline = Date.now() + PLAZO * 1000; }
    else { deadline = null; }

    syncTarjetas();
    renderResumen();
    programarTick();
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
      $('#bannerTema').removeClass('tema-todos tema-ps5 tema-pc tema-arcade').addClass(t.clase);
      $('#bannerIcono').html(t.icono);
      $('#bannerTitulo').text(t.titulo);
      $('#bannerSub').text(t.sub);
      $('.tab').removeClass('activo').filter('[data-tab="' + nombre + '"]').addClass('activo');
      renderCatalogo();
      $('#catalogoArcade').hide().fadeIn(350);
    }
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
        if (CATEGORIAS.indexOf(vistaActual) > -1 && estaciones.length) renderCatalogo();
      }, 200);
    });
  }

  /* ============================================
     6. CALCULADOR + COMBOS
     ============================================ */
  function calcular() {
    const horas  = Math.min(12, Math.max(1, parseInt($('#hrs').val()) || 1));
    const factor = Number($('#rate').val());
    const items = [];
    let bruto = 0;

    Object.keys(pedido).forEach(function (id) {
      const e = porId(id);
      if (!e) return;
      const sub = e.precio * pedido[id] * horas;
      items.push({ e: e, q: pedido[id], sub: sub });
      bruto += sub;
    });
    const desc = bruto * (1 - factor);

    const combos = [];
    let totalCombos = 0;
    $('.combo').each(function () {
      const q = Number($(this).find('.qty').text());
      if (q > 0) {
        const sub = q * Number($(this).data('price'));
        combos.push({ nombre: String($(this).data('name')), q: q, sub: sub });
        totalCombos += sub;
      }
    });
    return { horas: horas, factor: factor, items: items, bruto: bruto, desc: desc, combos: combos, totalCombos: totalCombos, total: bruto - desc + totalCombos };
  }

  /* ============================================
     7. RESUMEN COMPACTO + DETALLE (ventana) + ESTADOS
     ============================================ */
  function renderResumen() {
    const c = calcular();
    const nM = totalMaquinas();
    const nC = c.combos.reduce(function (a, k) { return a + k.q; }, 0);

    // Resumen compacto (vista de reserva)
    const $s = $('#resumenLineas').empty();
    $s.append(linea('🎮 Máquinas', nM ? nM + ' · ' + fmt(c.bruto) + ' BOB' : '—'));
    $s.append(linea('⏱️ Horas', c.horas + ' h'));
    $s.append(linea('🍔 Combos', nC ? nC + ' · ' + fmt(c.totalCombos) + ' BOB' : '—'));
    if (c.desc > 0) $s.append(linea('⚡ Tarifa Flash −15%', '−' + fmt(c.desc) + ' BOB', 'desc'));

    // Detalle completo (ventana flotante)
    const $ul = $('#order-list').empty();
    if (!c.items.length && !c.combos.length) { $ul.append($('<li class="vacio">').text('Aún no seleccionas nada')); }
    c.items.forEach(function (it) {
      $ul.append(linea('🎮 ' + it.q + '× ' + it.e.nombre + ' × ' + c.horas + ' h', fmt(it.sub) + ' BOB'));
    });
    if (c.desc > 0) $ul.append(linea('⚡ Tarifa Flash −15%', '−' + fmt(c.desc) + ' BOB', 'desc'));
    c.combos.forEach(function (k) { $ul.append(linea('🍔 ' + k.nombre + ' × ' + k.q, fmt(k.sub) + ' BOB')); });

    $('#total-price').text(fmt(c.total) + ' BOB').stop(true, true)
      .animate({ fontSize: '1.5rem' }, 120).animate({ fontSize: '1.2rem' }, 120);
    $('#total-modal').text(fmt(c.total) + ' BOB');

    // Estados de los botones de la reserva
    $('#tileCalc').text(c.horas + ' h · ' + (c.factor < 1 ? 'Flash' : 'Normal'));
    $('#tileCombos').text(nC ? nC + ' combo(s)' : 'Ninguno');
    $('#tilePedido').text((c.items.length + c.combos.length) + ' ítems');
    const completos = datosCompletos();
    $('#tileDatos').text(completos ? '✅ Completos' : 'Pendiente').toggleClass('ok', completos);

    if ($('#personas').val()) validarCampo('personas');
    actualizarBadge();
    guardar();
  }

  function actualizarBadge() {
    const n = totalMaquinas();
    $('#navBadge').text(n).toggleClass('oculto', n === 0);
  }

  /* ============================================
     8. VALIDACIÓN EN TIEMPO REAL
     ============================================ */
  const LETRAS = 'A-Za-zÁÉÍÓÚÜáéíóúüÑñ';
  const reglas = {
    nombre:   function (v) { return new RegExp('^[' + LETRAS + ']{2,}(\\s+[' + LETRAS + ']{2,})+$').test(v.trim()) ? '' : 'Ingresa nombre y apellido (solo letras).'; },
    ci:       function (v) { return /^\d{6,9}$/.test(v) ? '' : 'La CI debe tener entre 6 y 9 dígitos.'; },
    tel:      function (v) { return /^[67]\d{7}$/.test(v) ? '' : 'Celular de 8 dígitos que empiece con 6 o 7.'; },
    email:    function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Ingresa un correo válido.'; },
    personas: function (v) {
      const n = parseInt(v);
      if (!n || n < 1 || n > 40) return 'Entre 1 y 40 personas.';
      if (totalMaquinas() > n) return 'Tienes ' + totalMaquinas() + ' máquinas para ' + n + ' persona(s).';
      return '';
    },
    fecha:    function (v) { return !v ? 'Elige una fecha.' : (v < $('#fecha').attr('min') ? 'La fecha no puede ser pasada.' : ''); },
    hora:     function (v) { return v ? '' : 'Elige un horario.'; },
    terms:    function (v) { return v ? '' : 'Debes aceptar las condiciones.'; }
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
     9. FORMULARIO POR PASOS (ventana flotante)
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
    // Calculador
    $('#hrs').off('input.calc').on('input.calc', renderResumen);
    $('#hrs').off('change.calc').on('change.calc', function () {
      $(this).val(Math.min(12, Math.max(1, parseInt($(this).val()) || 1)));
      renderResumen();
    });
    $('#rate').off('change.calc').on('change.calc', renderResumen);

    // Combos (delegación sobre la ventana)
    $('#m-combos').off('click.combo');
    $('#m-combos').on('click.combo', '.c-mas', function () {
      const $q = $(this).siblings('.qty');
      $q.text(Number($q.text()) + 1);
      renderResumen();
    });
    $('#m-combos').on('click.combo', '.c-menos', function () {
      const $q = $(this).siblings('.qty');
      if (Number($q.text()) > 0) $q.text(Number($q.text()) - 1);
      renderResumen();
    });

    // Formulario
    $('#ci, #tel').off('input.solo').on('input.solo', function () { this.value = this.value.replace(/\D/g, ''); });
    $('#formReserva').off('.form')
      .on('input.form change.form focusout.form', 'input, select', function () {
        validarCampo(this.id);
        renderResumen();
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
    const c = calcular();
    const detalle = c.items.map(function (it) { return it.q + '× ' + it.e.nombre; }).join(', ');
    const combosTxt = c.combos.length ? ' + ' + c.combos.length + ' combo(s)' : '';

    $('#m-client').text($('#nombre').val().trim() + ' (CI ' + $('#ci').val() + ')');
    $('#m-group').text($('#personas').val() + ' persona(s) · ' + totalMaquinas() + ' máquina(s)');
    $('#m-when').text($('#fecha').val().split('-').reverse().join('/') + ' · ' + $('#hora').val());
    $('#m-service').text(detalle + combosTxt);
    $('#m-amount').text(fmt(c.total) + ' BOB (' + c.horas + (c.horas === 1 ? ' Hora' : ' Horas') + ')');

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
      const resumen = c.items.map(function (it) { return it.q + '× ' + it.e.nombre; }).join(', ') + ' · ' + fmt(c.total) + ' BOB';

      // UI optimista: se confirma al instante; sin red queda "pendiente"
      reservas.unshift({
        codigo: 'LU-' + Date.now().toString(36).toUpperCase().slice(-5),
        nombre: nombre, resumen: resumen, estado: online ? 'verificada' : 'pendiente'
      });
      if (reservas.length > 20) reservas.pop();

      cerrarModal();
      reiniciarPedido(true);
      renderReservas();
      toast(online ? '✅ ¡Reserva confirmada, ' + nombre.split(' ')[0] + '!' : '💾 Guardada localmente · Pendiente de envío', online ? 'exito' : 'error');
      location.hash = 'pedidos';
    });
  }

  function reiniciarPedido(limpiarForm) {
    pedido = {};
    deadline = null;
    $('#hrs').val(1);
    $('#rate').val('1');
    $('.qty').text(0);
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
        toast('⏰ Tarifa Flash Expirada: se agotó tu plazo', 'error');
      } else {
        pintarPlazo(r);
      }
    }
    if (modalDeadline) {
      const m = Math.ceil((modalDeadline - Date.now()) / 1000);
      if (m <= 0) {
        cerrarModal();
        toast('⏰ Tarifa Flash Expirada', 'error');
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

  /* ============================================
     13. MIS RESERVAS (anti-XSS: nodos con .text())
     ============================================ */
  function renderReservas() {
    const $ul = $('#listaReservas').empty();
    if (!reservas.length) {
      $ul.append($('<li class="item-reserva vacio">').text('Aún no hay reservas confirmadas.'));
    }
    reservas.forEach(function (r) {
      const $li = $('<li>').addClass('item-reserva');
      const $txt = $('<div>').addClass('titulo-truncado')
        .append($('<strong>').text(r.nombre + ' — '), $('<span>').text(r.resumen));
      const $estado = $('<span>').addClass('estado ' + r.estado)
        .text(r.estado === 'pendiente' ? '⏳ Guardado localmente · Pendiente' : '✅ Verificada');
      $li.append($txt, $estado);
      $ul.append($li);
    });
    $('#tileReservas').text(reservas.length + ' reserva(s)');
    guardar();
  }

  /* ============================================
     14. COLA "PEDIR JUEGO" (delegación con .off().on())
     ============================================ */
  function renderCola() {
    const $box = $('#listaCola').empty();
    cola.forEach(function (tema) {
      const $fila = $('<div>').addClass('fila-cancion');
      const $titulo = $('<span>').addClass('titulo-truncado').text(tema);       // .text(), nunca .html()
      const $quitar = $('<button>').addClass('btn-tactil btn-quitar').attr('aria-label', 'Quitar').text('✕');
      $fila.append($titulo, $quitar);
      $box.append($fila);
    });
    $('#tileCola').text(cola.length + ' en cola');
  }

  function activarPedidos() {
    function pedir() {
      const tema = $('#inputJuego').val().trim();
      if (!tema) return;
      cola.push(tema);
      renderCola();
      guardar();
      $('#inputJuego').val('');
    }
    $('#btnPedir').off('click').on('click', pedir);
    $('#inputJuego').off('keyup.pedir').on('keyup.pedir', function (e) { if (e.key === 'Enter') pedir(); });

    $('#listaCola').off('click', '.btn-quitar').on('click', '.btn-quitar', function () {
      const idx = $(this).closest('.fila-cancion').index();
      cola.splice(idx, 1);
      renderCola();
      guardar();
    });
  }

  /* ============================================
     15. EXTRAS: hide/show, fadeToggle, tema, teclado
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
     16. TOAST: slideDown → 3 s → fadeOut
     ============================================ */
  function toast(mensaje, tipo) {
    $('<div class="toast ' + (tipo || '') + '"></div>')
      .text(mensaje)
      .appendTo('#toast-box')
      .slideDown(300).delay(3000).fadeOut(400, function () { $(this).remove(); });
  }

  /* ============================================
     17. PERSISTENCIA (localStorage: datos locales, Offline-First)
     ============================================ */
  function guardar() {
    try {
      const combos = {};
      $('.combo').each(function () { combos[$(this).data('name')] = Number($(this).find('.qty').text()); });
      const form = {};
      CAMPOS.forEach(function (id) { form[id] = valorCampo(id); });
      localStorage.setItem(KEY, JSON.stringify({
        pedido: pedido, deadline: deadline, hrs: $('#hrs').val(), rate: $('#rate').val(),
        combos: combos, form: form, reservas: reservas, cola: cola
      }));
    } catch (e) { /* sin almacenamiento */ }
  }

  function restaurar() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s) return;

    reservas = Array.isArray(s.reservas) ? s.reservas : [];
    cola     = Array.isArray(s.cola) ? s.cola : [];

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
      deadline = s.deadline;
      $('#hrs').val(s.hrs || 1);
      $('#rate').val(s.rate || '1');
      $('.combo').each(function () { $(this).find('.qty').text((s.combos || {})[$(this).data('name')] || 0); });
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

  registrarInstalacion();
  registrarRed();
  registrarNavegacion();
  registrarModales();
  registrarPago();
  registrarExtras();

  // Hidratación escalonada
  hidratar('hid-menu', 500, function () {
    $('#burguerBtn').text('☰').off('click').on('click', function () {
      $('#navMenu').stop(true, true).slideToggle(300);
    });
  });
  hidratar('hid-catalogo', 700, activarCatalogo);
  hidratar('hid-reserva', 900, activarReserva);
  hidratar('hid-pedidos', 1100, activarPedidos);

  // Primero los datos (fetch), luego el estado local y la vista
  cargarCatalogo().then(function () {
    restaurar();
    renderResumen();
    syncTarjetas();
    renderReservas();
    renderCola();
    route(location.hash.replace('#', ''));
    if (deadline) { tick(); }
  });

  actualizarEstadoRed();
});