(() => {
  'use strict';
  window.BibliothekPagination = { create({onChange, onBoundary, closePopups, isBlocked}) {
    const viewport = document.getElementById('page-viewport');
    const flow = document.getElementById('page-flow');
    const previous = document.getElementById('page-previous');
    const next = document.getElementById('page-next');
    const status = document.getElementById('page-status');
    let page = 0, count = 1, stride = 1, anchor = null, frame = 0, gesture = null, suppressClick = false;
    let words = [], wordPages = [], controls = [];
    const active = () => !document.getElementById('reading-view').hidden;
    const location = word => word ? {paragraph:Number(word.closest('[data-paragraph]').dataset.paragraph), tokenOffset:Number(word.dataset.tokenOffset)} : anchor;
    function pageFor(node) {
      const rect = node?.getClientRects()[0];
      return rect ? Math.max(0, Math.floor((rect.left - viewport.getBoundingClientRect().left + viewport.scrollLeft + 1) / stride)) : 0;
    }
    function show(value, notify = true) {
      page = Math.max(0, Math.min(value, count - 1));
      viewport.scrollLeft = page * stride;
      viewport.scrollTop = 0;
      words.forEach((word, i) => { word.tabIndex = wordPages[i] === page ? 0 : -1; });
      controls.forEach(node => { node.tabIndex = pageFor(node) === page ? 0 : -1; });
      const first = words.find((word, i) => wordPages[i] === page);
      anchor = location(first) || anchor;
      const ru = window.DeutschTranslation?.getLang?.() === 'ru';
      status.textContent = ru ? `Страница ${page + 1} из ${count}` : `Page ${page + 1} of ${count}`;
      previous.disabled = page === 0 && !onBoundary(-1, true);
      next.disabled = page === count - 1 && !onBoundary(1, true);
      if (notify) onChange(anchor, page, count);
    }
    function layout(saved = anchor) {
      if (!active() || !viewport.clientWidth || !viewport.clientHeight) return;
      anchor = {paragraph:Number(saved?.paragraph) || 0, tokenOffset:Number(saved?.tokenOffset) || 0};
      const width = viewport.clientWidth;
      flow.style.setProperty('--page-width', `${width}px`);
      stride = width + 32;
      viewport.scrollLeft = 0;
      count = Math.max(1, Math.ceil((flow.scrollWidth + 32 - 1) / stride));
      words = [...flow.querySelectorAll('.reading-word')];
      wordPages = words.map(pageFor);
      controls = [...flow.querySelectorAll('button')];
      const paragraph = flow.querySelector(`[data-paragraph="${saved?.paragraph || 0}"]`);
      const target = paragraph?.querySelector(`[data-token-offset="${saved?.tokenOffset || 0}"]`) || paragraph;
      const targetPage = saved?.end ? count - 1 : target ? pageFor(target) : 0;
      show(targetPage);
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => layout({...anchor, end:page === count - 1 && !wordPages.includes(page)}));
    }
    function turn(direction) {
      if (!active() || isBlocked()) return;
      closePopups();
      if (page + direction < 0 || page + direction >= count) { onBoundary(direction, false); return; }
      if (flow.contains(document.activeElement)) document.activeElement.blur();
      show(page + direction);
    }
    previous.addEventListener('click', () => turn(-1));
    next.addEventListener('click', () => turn(1));
    document.addEventListener('keydown', event => {
      if (!active() || isBlocked() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.closest('input,textarea,select,[contenteditable="true"],dialog,.word-popover,.dictionary-sheet')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); turn(event.key === 'ArrowLeft' ? -1 : 1); }
    });
    viewport.addEventListener('pointerdown', event => {
      gesture = event.isPrimary && event.pointerType !== 'mouse' && !isBlocked() && !String(window.getSelection()) ? {x:event.clientX,y:event.clientY,time:Date.now()} : null;
    });
    viewport.addEventListener('pointercancel', () => { gesture = null; });
    viewport.addEventListener('pointerup', event => {
      if (!gesture) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y, duration = Date.now() - gesture.time;
      gesture = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5 || duration > 900 || String(window.getSelection())) return;
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 400);
      turn(dx < 0 ? 1 : -1);
    });
    viewport.addEventListener('click', event => {
      if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
    }, true);
    // A focused word can be offscreen after an external jump; reveal its page.
    flow.addEventListener('focusin', event => {
      if (!active()) return;
      const targetPage = pageFor(event.target);
      if (targetPage !== page) show(targetPage);
    });
    new ResizeObserver(schedule).observe(viewport);
    new MutationObserver(schedule).observe(document.getElementById('chapter-end'), {childList:true,subtree:true});
    document.fonts?.ready.then(schedule);
    return {
      layout,
      reveal(node) { closePopups(); show(pageFor(node)); },
      get location() { return anchor; },
      get page() { return page; },
      get count() { return count; }
    };
  }};
})();
