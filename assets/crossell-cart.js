import { Component } from '@theme/component'
import Splide from '@theme/splide'
import { ThemeEvents } from '@theme/events'
import { scheduler, viewTransition, requestIdleCallback } from '@theme/utilities'

class CrossellCart extends Component {
  #splide = null
  #observer = null
  #isInitialized = false

  connectedCallback() {
    super.connectedCallback()

    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !this.#isInitialized) {
          this.#observer.disconnect()
          this.#isInitialized = true
          this.#handleCartUpdate()
        }
      }
    }, { threshold: 0.1, rootMargin: '50px' })

    this.#observer.observe(this)
    document.addEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.#cleanup()
  }

  updatedCallback() {
    super.updatedCallback()
    this.#destroySplide()

    scheduler.schedule(() => {
      try {
        this.#initializeSplide()
      } catch (error) {
        console.error("[CrossellCart] Error inicializando Splide:", error)
      }
    })
  }

  #handleCartUpdate = () => {
    if (this.isConnected) {
      this.updatedCallback()
    }
  }

  #initializeSplide() {
    const { splide, track, list, slides } = this.refs

    if (!splide || !track || !list || !slides?.length) {
      console.warn("[CrossellCart] Estructura de Splide incompleta")
      return
    }
    
    this.#splide = new Splide(splide, {
      perPage: 1,
      gap: "1rem",
      pagination: false,
      arrows: slides.length > 1,
      breakpoints: {
        768: { perPage: 1 }
      }
    })

    this.#splide.mount()
  }

  #destroySplide() {
    if (this.#splide?.state?.is(Splide.STATES.MOUNTED)) {
      this.#splide.destroy()
    }
    this.#splide = null
  }

  #cleanup() {
    this.#destroySplide()
    this.#observer?.disconnect()
    document.removeEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate)
    this.#isInitialized = false
  }
}

customElements.define('crossell-cart', CrossellCart)

// class CrossellCart extends Component {
//   #splide = null;
//   #resizeObserver = null;
//   #mutationObserver = null;
//   #mountTimeout = null;
//   #isObserving = false;
//   #io = null; // 👈 nuevo: IntersectionObserver

//   connectedCallback() {
//     super.connectedCallback();

//     this.#schedule(() => this.#attemptMount());
//     document.addEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate);
//   }

//   disconnectedCallback() {
//     super.disconnectedCallback();
//     this.#destroySplide();
//     this.#disconnectObservers();
//     document.removeEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate);
//   }

//   updatedCallback() {
//     super.updatedCallback();
//     this.#destroySplide();
//     this.#disconnectObservers();
//     this.#schedule(() => this.#attemptMount());
//   }

//   #handleCartUpdate = (event) => {
//     console.log('[CrossellCart] cartUpdate detail:', event?.detail);
//     this.#destroySplide();
//     this.#disconnectObservers();
//     this.#schedule(() => this.#attemptMount());
//   };

//   #schedule(fn) {
//     try {
//       if (typeof window !== 'undefined' && window.scheduler?.schedule) {
//         window.scheduler.schedule(fn);
//       } else {
//         setTimeout(fn, 0);
//       }
//     } catch {
//       setTimeout(fn, 0);
//     }
//   }

//   // ---- Intentar montar Splide ----
//   #attemptMount() {
//     if (this.#splide) {
//       console.log('[CrossellCart] ya montado, skip');
//       return;
//     }

//     if (!Splide) {
//       console.error('[CrossellCart] Splide no disponible (ver importmap / assets).');
//       return;
//     }

//     const root = this.refs?.splide ?? this.querySelector('.splide');
//     console.log('[CrossellCart] intento montar, root:', root);

//     if (!root) {
//       this.#waitForStructure();
//       return;
//     }

//     const list = this.refs?.list ?? root.querySelector('.splide__list');
//     const hasSlides = list && list.children && list.children.length > 0;

//     if (!list || !hasSlides) {
//       this.#waitForStructure();
//       return;
//     }

//     // 👇 NUEVO: si el root está oculto, esperar a que se vuelva visible
//     const isVisible = root.offsetWidth > 0 && root.offsetHeight > 0;
//     if (!isVisible) {
//       console.log('[CrossellCart] Contenedor oculto, esperando visibilidad…');
//       this.#io = new IntersectionObserver((entries, obs) => {
//         if (entries.some(e => e.isIntersecting)) {
//           obs.disconnect();
//           this.#io = null;
//           console.log('[CrossellCart] Ahora visible → montando Splide');
//           this.#doMount(root);
//         }
//       }, { threshold: 0.01 });
//       this.#io.observe(root);
//       return;
//     }

//     // Si ya es visible → montar directo
//     this.#doMount(root);
//   }

//   // ---- Montaje real de Splide ----
//   #doMount(root) {
//     try {
//       this.#splide = new Splide(root, {
//         type: 'loop',
//         perPage: 1,
//         gap: '1rem'
//       });

//       this.#splide.mount();
//       console.log('[CrossellCart] Splide montado ✅');

//       this.#resizeObserver = new ResizeObserver(() => {
//         if (this.#splide) this.#splide.refresh();
//       });
//       this.#resizeObserver.observe(root);
//     } catch (err) {
//       console.error('[CrossellCart] Error al montar Splide:', err);
//       this.#schedule(() => setTimeout(() => this.#attemptMount(), 100));
//     }
//   }

//   // ---- Esperar estructura con MutationObserver ----
//   #waitForStructure() {
//     if (this.#isObserving) return;

//     console.log('[CrossellCart] esperando estructura (.splide__list / slides)...');
//     this.#isObserving = true;

//     const checkNow = () => {
//       const root = this.refs?.splide ?? this.querySelector('.splide');
//       const list = root?.querySelector('.splide__list');
//       const hasSlides = list && list.children && list.children.length > 0;
//       return !!(root && list && hasSlides);
//     };

//     if (checkNow()) {
//       this.#isObserving = false;
//       this.#attemptMount();
//       return;
//     }

//     this.#mutationObserver = new MutationObserver(() => {
//       if (checkNow()) {
//         this.#mutationObserver.disconnect();
//         this.#mutationObserver = null;
//         this.#isObserving = false;
//         console.log('[CrossellCart] Estructura detectada, montando...');
//         this.#attemptMount();
//       }
//     });

//     this.#mutationObserver.observe(this, { childList: true, subtree: true, attributes: true });

//     clearTimeout(this.#mountTimeout);
//     this.#mountTimeout = setTimeout(() => {
//       if (this.#mutationObserver) {
//         this.#mutationObserver.disconnect();
//         this.#mutationObserver = null;
//       }
//       this.#isObserving = false;
//       console.warn('[CrossellCart] Timeout esperando estructura; revisa Liquid/refs.');
//     }, 3000);
//   }

//   #disconnectObservers() {
//     if (this.#mutationObserver) {
//       this.#mutationObserver.disconnect();
//       this.#mutationObserver = null;
//     }
//     if (this.#resizeObserver) {
//       this.#resizeObserver.disconnect();
//       this.#resizeObserver = null;
//     }
//     if (this.#io) {
//       this.#io.disconnect();
//       this.#io = null;
//     }
//     clearTimeout(this.#mountTimeout);
//     this.#isObserving = false;
//   }

//   #destroySplide() {
//     if (this.#splide) {
//       try {
//         this.#splide.destroy();
//       } catch (e) {
//         console.warn('[CrossellCart] error al destruir Splide:', e);
//       } finally {
//         this.#splide = null;
//         console.log('[CrossellCart] Splide destruido');
//       }
//     }
//   }
// }

// customElements.define('crossell-cart', CrossellCart);
