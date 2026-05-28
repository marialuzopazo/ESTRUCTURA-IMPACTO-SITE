/**
 * ================================================================
 * ESTRUCTURA DE IMPACTO — main.js
 * 
 * Funcionalidades:
 * 1.  Parallax del iceberg al hacer scroll
 * 2.  Transición de color de fondo (negro → azul profundo)
 * 3.  Indicador de profundidad (barra + metros)
 * 4.  Animaciones de reveal al entrar al viewport (Intersection Observer)
 * 5.  Generador de burbujas animadas
 * 6.  Navegación: scroll activo + menú mobile
 * 7.  Validación y envío del formulario de contacto
 * ================================================================
 */

/* ----------------------------------------------------------------
   UTILIDADES
   ---------------------------------------------------------------- */

/**
 * Función de interpolación lineal.
 * Mapea un valor 'v' del rango [inMin, inMax] al rango [outMin, outMax].
 * Muy útil para calcular colores y posiciones basados en el scroll.
 * 
 * @param {number} v      - Valor de entrada
 * @param {number} inMin  - Mínimo del rango de entrada
 * @param {number} inMax  - Máximo del rango de entrada
 * @param {number} outMin - Mínimo del rango de salida
 * @param {number} outMax - Máximo del rango de salida
 * @returns {number}
 */
function lerp(v, inMin, inMax, outMin, outMax) {
  const t = Math.max(0, Math.min(1, (v - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

/**
 * Interpolación de colores RGB basada en un progreso (0 → 1).
 * 
 * @param {number[]} c1 - Color inicial [r, g, b]
 * @param {number[]} c2 - Color final   [r, g, b]
 * @param {number}   t  - Progreso 0-1
 * @returns {string} Color en formato rgba()
 */
function lerpColor(c1, c2, t) {
  const r = Math.round(lerp(t, 0, 1, c1[0], c2[0]));
  const g = Math.round(lerp(t, 0, 1, c1[1], c2[1]));
  const b = Math.round(lerp(t, 0, 1, c1[2], c2[2]));
  return `rgb(${r}, ${g}, ${b})`;
}

// Colores de fondo: negro → azul profundo del océano
const BG_TOP    = [5,  8,  16];   // #050810 — noche sobre el agua
const BG_BOTTOM = [7, 22,  48];   // #071630 — fondo del iceberg


/* ----------------------------------------------------------------
   1. PARALLAX DEL ICEBERG
   El iceberg se mueve más lento que el contenido para crear
   sensación de profundidad. Se usa requestAnimationFrame para
   asegurar un rendimiento suave (60fps).
   ---------------------------------------------------------------- */

const icebergImg  = document.getElementById('icebergImg');
const bgGradient  = document.getElementById('bgGradient');

// Valor del scroll suavizado (para evitar saltos bruscos)
let currentScroll = 0;
let targetScroll  = 0;

// Factor de parallax: cuánto se mueve el iceberg por px de scroll.
// 0.35 = se mueve al 35% de la velocidad del scroll.
const PARALLAX_FACTOR = 0.35;

/**
 * Loop de animación principal.
 * Se llama en cada frame del browser (vía requestAnimationFrame).
 */
function animationLoop() {

  // Suavizado del scroll con lerp (ease-out)
  // Hace que el movimiento del iceberg sea fluido, no brusco.
  currentScroll += (targetScroll - currentScroll) * 0.08;

  // Altura total scrolleable de la página
  const scrollMax = document.documentElement.scrollHeight - window.innerHeight;

  // Progreso del scroll: 0 (arriba) → 1 (abajo)
  const scrollProgress = scrollMax > 0 ? currentScroll / scrollMax : 0;

  // ── Mover el iceberg con parallax ──
  if (icebergImg) {
    const parallaxY = currentScroll * PARALLAX_FACTOR;
    // Solo usa transform (GPU-acelerado, sin triggear layout)
    icebergImg.style.transform = `translateY(${parallaxY}px)`;

    // La opacidad sube ligeramente al ir hacia el fondo
    // para que el iceberg sea más visible en las secciones profundas
    icebergImg.style.opacity = lerp(scrollProgress, 0, 0.6, 0.35, 0.55);
  }

  // ── Transición de color del fondo ──
  if (bgGradient) {
    const color = lerpColor(BG_TOP, BG_BOTTOM, scrollProgress);
    bgGradient.style.backgroundColor = color;
  }

  // ── Actualizar indicador de profundidad ──
  updateDepthIndicator(scrollProgress);

  // Pedir el siguiente frame
  requestAnimationFrame(animationLoop);
}

// Capturar el scroll en el evento (más eficiente que leer en el loop)
window.addEventListener('scroll', () => {
  targetScroll = window.scrollY;
}, { passive: true });   // passive: true → mejora performance en mobile

// Iniciar el loop
requestAnimationFrame(animationLoop);


/* ----------------------------------------------------------------
   2. INDICADOR DE PROFUNDIDAD
   Una barra lateral + texto en metros que muestra cuán "profundo"
   estás en la página. Puramente decorativo / experiencial.
   ---------------------------------------------------------------- */

const depthFill  = document.getElementById('depthFill');
const depthLabel = document.getElementById('depthLabel');

// La profundidad máxima del iceberg en metros (decorativo)
const MAX_DEPTH = 150;

/**
 * Actualiza la barra y el label de profundidad.
 * @param {number} progress - Progreso del scroll 0-1
 */
function updateDepthIndicator(progress) {
  if (!depthFill || !depthLabel) return;

  // La barra se llena de abajo hacia arriba
  depthFill.style.height = `${progress * 100}%`;

  // Los metros aumentan con el scroll
  const meters = Math.round(progress * MAX_DEPTH);
  depthLabel.textContent = `${meters}m`;
}


/* ----------------------------------------------------------------
   3. REVEAL AL SCROLL (Intersection Observer)
   Los elementos con clase .reveal se animan cuando entran
   al viewport. Mucho más eficiente que un evento scroll.
   ---------------------------------------------------------------- */

/**
 * IntersectionObserver observa los elementos .reveal y les agrega
 * la clase .visible cuando son visibles en pantalla.
 * 
 * threshold: 0.12 = el elemento debe estar 12% visible para activarse.
 * rootMargin: '-40px' = activa un poco antes de llegar al borde.
 */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Una vez que se mostró, dejar de observarlo (eficiencia)
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  }
);

// Observar todos los elementos .reveal
document.querySelectorAll('.reveal').forEach(el => {
  revealObserver.observe(el);
});


/* ----------------------------------------------------------------
   4. GENERADOR DE BURBUJAS
   Crea elementos <div class="bubble"> de forma dinámica
   en la sección de profundidad. Efecto visual de estar bajo el agua.
   ---------------------------------------------------------------- */

const bubblesContainer = document.getElementById('bubblesContainer');

// Configuración de las burbujas
const BUBBLE_CONFIG = {
  count:       18,     // Cantidad de burbujas
  minSize:     6,      // Tamaño mínimo en px
  maxSize:     22,     // Tamaño máximo en px
  minDuration: 8,      // Duración mínima de animación en segundos
  maxDuration: 18,     // Duración máxima
  minDelay:    0,      // Retraso mínimo en segundos
  maxDelay:    12,     // Retraso máximo
};

/**
 * Genera un número aleatorio entre min y max.
 */
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Crea y agrega burbujas al contenedor.
 */
function createBubbles() {
  if (!bubblesContainer) return;

  for (let i = 0; i < BUBBLE_CONFIG.count; i++) {
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');

    const size     = randomBetween(BUBBLE_CONFIG.minSize, BUBBLE_CONFIG.maxSize);
    const left     = randomBetween(5, 95);   // Posición horizontal (%)
    const duration = randomBetween(BUBBLE_CONFIG.minDuration, BUBBLE_CONFIG.maxDuration);
    const delay    = randomBetween(BUBBLE_CONFIG.minDelay, BUBBLE_CONFIG.maxDelay);

    // Aplicar estilos inline únicos para cada burbuja
    Object.assign(bubble.style, {
      width:           `${size}px`,
      height:          `${size}px`,
      left:            `${left}%`,
      bottom:          '-10%',   // Empieza fuera del viewport (abajo)
      animationDuration: `${duration}s`,
      animationDelay:  `${delay}s`,
      // Opacidad variable para darle variedad visual
      opacity:         randomBetween(0.1, 0.5),
    });

    bubblesContainer.appendChild(bubble);
  }
}

// Crear las burbujas al cargar la página
createBubbles();


/* ----------------------------------------------------------------
   5. NAVEGACIÓN
   5a. Cambio de estilo al scrollear
   5b. Highlight del link activo según la sección visible
   5c. Menú mobile
   5d. Cerrar mobile al hacer click en un link
   ---------------------------------------------------------------- */

const mainNav     = document.getElementById('mainNav');
const navHamburger = document.getElementById('navHamburger');
const navMobile   = document.getElementById('navMobile');

// 5a. Estilo de la nav al scrollear
const NAV_SCROLL_THRESHOLD = 80; // px desde el top

window.addEventListener('scroll', () => {
  if (!mainNav) return;

  if (window.scrollY > NAV_SCROLL_THRESHOLD) {
    mainNav.style.background = 'rgba(5, 8, 16, 0.95)';
    mainNav.style.borderBottomColor = 'rgba(168, 218, 239, 0.1)';
  } else {
    mainNav.style.background = 'rgba(5, 8, 16, 0.75)';
    mainNav.style.borderBottomColor = 'rgba(240, 244, 248, 0.10)';
  }
}, { passive: true });

// 5b. Highlight del link activo con IntersectionObserver
const sections    = document.querySelectorAll('section[id], div[id]');
const navLinks    = document.querySelectorAll('.nav__link');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          // Quitar activo de todos
          link.style.color = '';
          // Agregar activo al correspondiente
          if (link.getAttribute('href') === `#${id}`) {
            link.style.color = 'var(--color-white)';
          }
        });
      }
    });
  },
  { threshold: 0.4 }
);

sections.forEach(section => sectionObserver.observe(section));

// 5c. Toggle del menú mobile
if (navHamburger && navMobile) {
  navHamburger.addEventListener('click', () => {
    const isOpen = navHamburger.getAttribute('aria-expanded') === 'true';

    navHamburger.setAttribute('aria-expanded', !isOpen);
    navMobile.setAttribute('aria-hidden', isOpen);

    // Bloquear el scroll del body cuando el menú está abierto
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  // 5d. Cerrar menú al hacer click en un link
  document.querySelectorAll('.nav__mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      navHamburger.setAttribute('aria-expanded', 'false');
      navMobile.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  });

  // Cerrar menú al presionar Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navMobile.getAttribute('aria-hidden') === 'false') {
      navHamburger.setAttribute('aria-expanded', 'false');
      navMobile.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });
}


/* ----------------------------------------------------------------
   6. FORMULARIO DE CONTACTO
   Validación y feedback al usuario.
   En producción, conectar con un servicio como Formspree, EmailJS
   o una API propia.
   ---------------------------------------------------------------- */

const contactForm = document.getElementById('contactForm');
const formSubmit  = document.getElementById('formSubmit');
const formFeedback = document.getElementById('formFeedback');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Obtener datos del formulario
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    // Validación básica del lado del cliente
    if (!data.nombre || data.nombre.trim().length < 2) {
      showFeedback('Por favor ingresá tu nombre.', 'error');
      return;
    }

    if (!isValidEmail(data.email)) {
      showFeedback('Por favor ingresá un email válido.', 'error');
      return;
    }

    if (!data.mensaje || data.mensaje.trim().length < 10) {
      showFeedback('Contame un poco más sobre lo que necesitás.', 'error');
      return;
    }

    // Estado de carga
    formSubmit.textContent = 'Enviando...';
    formSubmit.disabled = true;

    try {
      
      
       await emailjs.send('service_f8g059r', 'template_xyz789', data);
       
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Éxito
      showFeedback(
        '¡Mensaje enviado! Te respondo en menos de 72 horas.',
        'success'
      );
      contactForm.reset();

    } catch (error) {
      // Error
      showFeedback(
        'Hubo un problema al enviar. Escribime directamente por Instagram o LinkedIn.',
        'error'
      );
      console.error('Error al enviar el formulario:', error);

    } finally {
      // Restaurar el botón siempre
      formSubmit.textContent = 'Enviar mensaje →';
      formSubmit.disabled = false;
    }
  });
}

/**
 * Muestra un mensaje de feedback en el formulario.
 * @param {string} message - Texto del mensaje
 * @param {'success'|'error'} type - Tipo de feedback
 */
function showFeedback(message, type) {
  if (!formFeedback) return;

  formFeedback.textContent = message;
  formFeedback.className = `form__feedback form__feedback--${type}`;

  // Limpiar el mensaje automáticamente después de 6 segundos
  setTimeout(() => {
    formFeedback.textContent = '';
    formFeedback.className = 'form__feedback';
  }, 6000);
}

/**
 * Valida el formato de un email.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}


/* ----------------------------------------------------------------
   7. POLLITO — efecto de rebote al hover en el hero
   Opcional: hace que el pollito salte cuando pasás el cursor
   por la sección del hero.
   ---------------------------------------------------------------- */

const pollito = document.getElementById('pollito');

if (pollito) {
  pollito.addEventListener('click', () => {
    // Pequeño salto al hacer click en el pollito
    pollito.style.animation = 'none';
    pollito.style.transform = 'translateX(-50%) translateY(-20px) scale(1.1)';

    // Volver a la animación flotante
    setTimeout(() => {
      pollito.style.transform = '';
      pollito.style.animation = 'float 4s ease-in-out infinite';
    }, 300);
  });
}


/* ----------------------------------------------------------------
   8. SMOOTH SCROLL para browsers que no lo soportan nativamente
   (Safari iOS antiguo, etc.)
   ---------------------------------------------------------------- */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const targetId = anchor.getAttribute('href').slice(1);
    const target   = document.getElementById(targetId);

    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


/* ----------------------------------------------------------------
   INICIALIZACIÓN
   Log de bienvenida en consola (útil para devs que inspeccionen)
   ---------------------------------------------------------------- */
console.log(
  '%cUn viaje de mil millas comienza con el primer paso',
  'color: #E94560; font-size: 14px; font-weight: bold;'
);
console.log(
  '%cMa. Luz Opazo — github.com/marialuzopazo',
  'color: #A8DAEF; font-size: 11px;'
);
