
const themeToggleButton = document.querySelector('.theme-toggle') as HTMLButtonElement | null;
const sunIcon = themeToggleButton ? themeToggleButton.querySelector('.sun-icon') as SVGElement | null : null;
const moonIcon = themeToggleButton ? themeToggleButton.querySelector('.moon-icon') as SVGElement | null : null;
const body = document.body;
const themeOverlay = document.getElementById('theme-transition-overlay');

let isTransitioning = false;
let transitionFailsafeTimeoutId: number | null = null;

const THEME_SETTINGS = ['light', 'dark'] as const;
type ThemeSetting = typeof THEME_SETTINGS[number];
let currentThemeSetting: ThemeSetting; 

const updateToggleButtonState = (setting: ThemeSetting) => {
    if (!sunIcon || !moonIcon || !themeToggleButton) return;

    sunIcon.classList.toggle('active', setting === 'light');
    sunIcon.classList.toggle('inactive', setting !== 'light');
    moonIcon.classList.toggle('active', setting === 'dark');
    moonIcon.classList.toggle('inactive', setting !== 'dark');

    let ariaLabel = '';
    if (setting === 'light') {
        ariaLabel = 'Tema atual: Claro. Mudar para tema escuro.';
    } else { 
        ariaLabel = 'Tema atual: Escuro. Mudar para tema claro.';
    }
    themeToggleButton.setAttribute('aria-label', ariaLabel);
};

const setVisualThemeOnBody = (actualTheme: 'light' | 'dark') => {
    body.classList.toggle('dark-mode', actualTheme === 'dark');
};

const resetTransitionOverlay = () => {
    if (themeOverlay) {
        themeOverlay.style.pointerEvents = 'none';
        themeOverlay.style.transition = 'none';
        themeOverlay.style.opacity = '0';
    }
    isTransitioning = false;
    if (transitionFailsafeTimeoutId) {
        clearTimeout(transitionFailsafeTimeoutId);
        transitionFailsafeTimeoutId = null;
    }
    body.classList.remove('theme-transition-active');
};

const applyTheme = (newSetting: ThemeSetting, isInitialLoad = false) => {
    if (!themeOverlay || !sunIcon || !moonIcon) {
        currentThemeSetting = newSetting; 
        localStorage.setItem('themeSetting', newSetting);
        setVisualThemeOnBody(newSetting);
        if(themeToggleButton) updateToggleButtonState(newSetting); 
        return;
    }

    currentThemeSetting = newSetting; 
    localStorage.setItem('themeSetting', newSetting);
    
    updateToggleButtonState(newSetting);

    const actualThemeToApply: 'light' | 'dark' = newSetting;
    const currentActualBodyTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';

    if (isInitialLoad) {
        setVisualThemeOnBody(actualThemeToApply);
        return;
    }
    
    if (isTransitioning || actualThemeToApply === currentActualBodyTheme) {
      return;
    }

    isTransitioning = true;

    const phase1Duration = 500;
    const phase2Duration = 700;
    const phase3Duration = 500;
    const failsafeDuration = phase1Duration + phase2Duration + phase3Duration + 500;

    const rootStyle = getComputedStyle(document.documentElement);
    const currentBgColor = currentActualBodyTheme === 'dark'
        ? rootStyle.getPropertyValue('--dark-bg-color').trim()
        : rootStyle.getPropertyValue('--bg-color').trim();
    const targetBgColor = actualThemeToApply === 'dark'
        ? rootStyle.getPropertyValue('--dark-bg-color').trim()
        : rootStyle.getPropertyValue('--bg-color').trim();

    themeOverlay.style.backgroundColor = currentBgColor;
    themeOverlay.style.opacity = '0';
    themeOverlay.style.transition = `opacity ${phase1Duration}ms ease-in-out`;
    themeOverlay.style.pointerEvents = 'auto';

    requestAnimationFrame(() => {
        themeOverlay.style.opacity = '1';
    });

    if (transitionFailsafeTimeoutId) clearTimeout(transitionFailsafeTimeoutId);
    transitionFailsafeTimeoutId = window.setTimeout(() => {
        if (isTransitioning) {
            console.warn('Theme transition (multi-phase) failsafe triggered.');
            resetTransitionOverlay();
            const finalActualTheme = currentThemeSetting; 
            if ((body.classList.contains('dark-mode') ? 'dark' : 'light') !== finalActualTheme) {
                setVisualThemeOnBody(finalActualTheme);
            }
            updateToggleButtonState(currentThemeSetting); 
        }
    }, failsafeDuration);

    const handlePhase1End = (event: TransitionEvent) => {
        if (event.target !== themeOverlay || event.propertyName !== 'opacity' || parseFloat(themeOverlay.style.opacity) < 1) return;
        themeOverlay.removeEventListener('transitionend', handlePhase1End);

        body.classList.add('theme-transition-active');
        void body.offsetHeight; 

        setVisualThemeOnBody(actualThemeToApply); 

        void body.offsetHeight; 
        body.classList.remove('theme-transition-active');

        themeOverlay.style.transition = `background-color ${phase2Duration}ms ease-in-out`;
        requestAnimationFrame(() => {
            themeOverlay.style.backgroundColor = targetBgColor;
        });
        themeOverlay.addEventListener('transitionend', handlePhase2End, { once: true });
    };

    const handlePhase2End = (event: TransitionEvent) => {
        if (event.target !== themeOverlay || event.propertyName !== 'background-color') return;
        themeOverlay.removeEventListener('transitionend', handlePhase2End);

        themeOverlay.style.transition = `opacity ${phase3Duration}ms ease-in-out`;
        requestAnimationFrame(() => {
            themeOverlay.style.opacity = '0';
        });
        themeOverlay.addEventListener('transitionend', handlePhase3End, { once: true });
    };

    const handlePhase3End = (event: TransitionEvent) => {
        if (event.target !== themeOverlay || event.propertyName !== 'opacity' || parseFloat(themeOverlay.style.opacity) > 0) return;
        resetTransitionOverlay();
    };

    themeOverlay.addEventListener('transitionend', handlePhase1End, { once: true });
};

window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('loaded');
            document.body.classList.add('preloader-done');
        }, 250);
    }
    initComponents(); 
});

function initComponents() {
    const storedSetting = localStorage.getItem('themeSetting') as ThemeSetting | null;
    
    if (storedSetting === 'dark') {
        currentThemeSetting = 'dark';
    } else { 
        currentThemeSetting = 'light';
        if (storedSetting !== 'light') { 
            localStorage.setItem('themeSetting', 'light');
        }
    }
    applyTheme(currentThemeSetting, true); 

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const newTheme = currentThemeSetting === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
        });
    }

    const revealElements = document.querySelectorAll('.reveal');
    const cardRevealDelayIncrement = 100;

    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    let currentDelay = 0;
                    if (entry.target.classList.contains('service-item')) {
                        const parent = entry.target.parentElement;
                        if (parent && parent.children) {
                          const itemIndex = Array.from(parent.children).indexOf(entry.target);
                          currentDelay = itemIndex * cardRevealDelayIncrement;
                        }
                    }
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, currentDelay);
                }
            });
        }, { threshold: 0.1 });
        revealElements.forEach(el => revealObserver.observe(el));
    }

     document.querySelectorAll('a[href^="#"]').forEach(anchor => {
         anchor.addEventListener('click', function (this: HTMLAnchorElement, e: Event) {
             const href = this.getAttribute('href');
             if (href === "#" || !href || !href.startsWith("#")) return;
             try {
                 const targetElement = document.querySelector(href) as HTMLElement | null;
                 if (targetElement) {
                     e.preventDefault();
                     const header = document.querySelector('header') as HTMLElement | null;
                     const headerStickyOffset = 15;
                     let totalHeaderHeight = 0;
                     if (header) {
                        const headerStyles = getComputedStyle(header);
                        if (headerStyles.position === 'sticky' || headerStyles.position === 'fixed') {
                            totalHeaderHeight = header.offsetHeight + headerStickyOffset;
                        } else {
                            totalHeaderHeight = header.offsetHeight;
                        }
                     }
                     const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                     const offsetPosition = elementPosition - totalHeaderHeight;
                     window.scrollTo({
                         top: offsetPosition,
                         behavior: 'smooth'
                     });
                 }
             } catch (error) {
             }
         });
     });
}
