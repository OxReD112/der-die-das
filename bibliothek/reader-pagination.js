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
    let motionFrame = 0, moving = false, overscroll = 0, clickTimer = 0, boundaryEntry = false;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    function resetMotion() {
      cancelAnimationFrame(motionFrame);
      moving = false; gesture = null; overscroll = 0;
      flow.style.transform = '';
      viewport.classList.remove('is-page-dragging');
    }
    function suppressTap() {
      suppressClick = true;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { suppressClick = false; }, 450);
    }
    function animateTo(target, complete) {
      const start = viewport.scrollLeft, pull = overscroll;
      cancelAnimationFrame(motionFrame);
      moving = true;
      viewport.classList.remove('is-page-dragging');
      const duration = reducedMotion.matches ? 0 : 230;
      const started = performance.now();
      function tick(now) {
        if (!active()) { resetMotion(); return; }
        if (isBlocked()) { resetMotion(); viewport.scrollLeft = page * stride; return; }
        const progress = duration ? Math.min(1, (now - started) / duration) : 1;
        const eased = 1 - Math.pow(1 - progress, 3);
        viewport.scrollLeft = start + (target - start) * eased;
        overscroll = pull * (1 - eased);
        flow.style.transform = overscroll ? `translateX(${overscroll}px)` : '';
        if (progress < 1) motionFrame = requestAnimationFrame(tick);
        else { resetMotion(); complete?.(); }
      }
      motionFrame = requestAnimationFrame(tick);
    }
    function drag(dx) {
      // Limit a gesture to the adjacent page. At book/chapter edges, add resistance.
      const desired = page * stride - Math.max(-stride, Math.min(stride, dx));
      const limit = (count - 1) * stride;
      viewport.scrollLeft = Math.max(0, Math.min(limit, desired));
      const excess = desired - viewport.scrollLeft;
      overscroll = -Math.sign(excess) * Math.min(64, Math.abs(excess) * .24);
      flow.style.transform = overscroll ? `translateX(${overscroll}px)` : '';
    }
    const active = () => !document.getElementById('reading-view').hidden;
    const location = word => word ? {paragraph:Number(word.closest('[data-paragraph]').dataset.paragraph), tokenOffset:Number(word.dataset.tokenOffset)} : anchor;
    function pageFor(node) {
      const rect = node?.getClientRects()[0];
      return rect ? Math.max(0, Math.floor((rect.left - viewport.getBoundingClientRect().left + viewport.scrollLeft + 1) / stride)) : 0;
    }
    function show(value, notify = true) {
      resetMotion();
      page = Math.max(0, Math.min(value, count - 1));
      viewport.scrollLeft = page * stride;
      viewport.scrollTop = 0;
      words.forEach((word, i) => { word.tabIndex = wordPages[i] === page ? 0 : -1; });
      controls.forEach(node => { node.tabIndex = pageFor(node) === page ? 0 : -1; });
      const first = words.find((word, i) => wordPages[i] === page);
      anchor = location(first) || anchor;
      status.textContent = `${page + 1} / ${count}`;
      previous.disabled = page === 0 && !onBoundary(-1, true);
      next.disabled = page === count - 1 && !onBoundary(1, true);
      if (notify) onChange(anchor, page, count);
    }
    function layout(saved = anchor) {
      if (!active() || !viewport.clientWidth || !viewport.clientHeight) return;
      resetMotion();
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
      if (boundaryEntry) {
        boundaryEntry = false;
        if (!reducedMotion.matches) flow.animate([{opacity:.45},{opacity:1}], {duration:180,easing:'ease-out'});
      }
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => layout({...anchor, end:page === count - 1 && !wordPages.includes(page)}));
    }
    function turn(direction) {
      if (!active() || isBlocked() || moving) return;
      gesture = null;
      closePopups();
      if (flow.contains(document.activeElement)) document.activeElement.blur();
      const destination = page + direction;
      if (destination < 0 || destination >= count) {
        animateTo(page * stride, () => {
          if (onBoundary(direction, true)) { boundaryEntry = true; onBoundary(direction, false); }
        });
        return;
      }
      animateTo(destination * stride, () => show(destination));
    }
    previous.addEventListener('click', () => turn(-1));
    next.addEventListener('click', () => turn(1));
    document.addEventListener('keydown', event => {
      if (!active() || isBlocked() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.closest('input,textarea,select,[contenteditable="true"],dialog,.word-popover,.dictionary-sheet')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); turn(event.key === 'ArrowLeft' ? -1 : 1); }
    });
    viewport.addEventListener('pointerdown', event => {
      if (!event.isPrimary) {
        if (gesture?.dragging) animateTo(page * stride);
        gesture = null; return;
      }
      gesture = event.pointerType !== 'mouse' && active() && !moving && !isBlocked() && !String(window.getSelection())
        ? {id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),lastX:event.clientX,lastTime:performance.now(),velocity:0,dragging:false} : null;
    });
    viewport.addEventListener('pointermove', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y, now = performance.now();
      if (!gesture.dragging) {
        if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { gesture = null; return; }
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
        if (now - gesture.time > 500 || String(window.getSelection())) { gesture = null; return; }
        gesture.dragging = true;
        closePopups();
        if (flow.contains(document.activeElement)) document.activeElement.blur();
        viewport.classList.add('is-page-dragging');
        try { viewport.setPointerCapture(event.pointerId); } catch (_) { /* Synthetic events have no native pointer. */ }
      }
      const elapsed = now - gesture.lastTime;
      if (elapsed > 0) gesture.velocity = (event.clientX - gesture.lastX) / elapsed;
      gesture.lastX = event.clientX; gesture.lastTime = now;
      suppressTap();
      drag(dx);
    });
    function cancelGesture() {
      if (!gesture) return;
      const dragged = gesture.dragging;
      gesture = null;
      if (dragged) { suppressTap(); animateTo(page * stride); }
    }
    viewport.addEventListener('pointercancel', cancelGesture);
    viewport.addEventListener('lostpointercapture', event => {
      // Implicit capture transfers from the touched word to the viewport when dragging starts.
      if (event.target === viewport && event.pointerId === gesture?.id) cancelGesture();
    });
    viewport.addEventListener('pointerup', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const swipe = gesture, dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
      gesture = null;
      const horizontal = Math.abs(dx) >= 10 && Math.abs(dx) > Math.abs(dy) * 1.25;
      if ((!swipe.dragging && !horizontal) || String(window.getSelection())) {
        if (swipe.dragging) { suppressTap(); animateTo(page * stride); }
        return;
      }
      suppressTap();
      const freshVelocity = performance.now() - swipe.lastTime < 100 ? swipe.velocity : 0;
      const enoughDistance = Math.abs(dx) >= Math.max(45, Math.min(100, viewport.clientWidth * .22));
      const flick = Math.abs(dx) >= 25 && Math.abs(freshVelocity) > .45 && Math.sign(freshVelocity) === Math.sign(dx);
      if (horizontal && (enoughDistance || flick)) turn(dx < 0 ? 1 : -1);
      else animateTo(page * stride);
    });
    viewport.addEventListener('click', event => {
      if (suppressClick || moving) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
    }, true);
    // A focused word can be offscreen after an external jump; reveal its page.
    flow.addEventListener('focusin', event => {
      if (!active() || gesture?.dragging || moving) return;
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
