(() => {
  const wrapShineIcon = (source, wrapperClass, copyClass) => {
    if (source.parentElement?.classList.contains(wrapperClass)) return;

    const wrapper = document.createElement('span');
    wrapper.className = wrapperClass;
    source.before(wrapper);
    wrapper.append(source);

    const shine = source.cloneNode(true);
    shine.classList.add(copyClass);
    shine.setAttribute('aria-hidden', 'true');
    wrapper.append(shine);
  };

  const enhanceNavIcons = () => {
    document.querySelectorAll('.app-nav-menu > div > svg').forEach(source => {
      wrapShineIcon(source, 'nav-shine-icon', 'nav-shine-copy');
    });

    document.querySelectorAll('.d-brand > svg, .brand-home > svg').forEach(source => {
      wrapShineIcon(source, 'brand-shine-icon', 'brand-shine-copy');
    });
  };

  const start = () => {
    enhanceNavIcons();
    new MutationObserver(enhanceNavIcons).observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();