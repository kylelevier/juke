(function(){
  const stack = [];
  const focusable = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function dialogFor(root){
    return root && (root.matches('[role="dialog"]') ? root : root.querySelector('[role="dialog"]'));
  }

  function visible(el){
    if(!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  }

  function focusFirst(root, preferred){
    const target = preferred || root.querySelector('[autofocus]') || Array.from(root.querySelectorAll(focusable)).find(visible) || dialogFor(root) || root;
    if(target && typeof target.focus === 'function') target.focus({preventScroll:true});
  }

  function open(root, opts){
    if(!root) return;
    const existing = stack.find(entry => entry.root === root);
    if(existing) return;
    const dialog = dialogFor(root);
    if(dialog && !dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex','-1');
    stack.push({
      root,
      close: opts && opts.close,
      previous: document.activeElement
    });
    setTimeout(() => focusFirst(root, opts && opts.focus), 0);
  }

  function close(root){
    const idx = stack.findIndex(entry => entry.root === root);
    if(idx < 0) return;
    const entry = stack.splice(idx, 1)[0];
    if(entry.previous && document.contains(entry.previous) && typeof entry.previous.focus === 'function'){
      setTimeout(() => entry.previous.focus({preventScroll:true}), 0);
    }
  }

  function top(){
    return stack[stack.length - 1];
  }

  document.addEventListener('keydown', function(event){
    const entry = top();
    if(!entry) return;
    if(event.key === 'Escape'){
      event.preventDefault();
      if(typeof entry.close === 'function') entry.close();
      return;
    }
    if(event.key !== 'Tab') return;
    const dialog = dialogFor(entry.root) || entry.root;
    const nodes = Array.from(dialog.querySelectorAll(focusable)).filter(visible);
    if(!nodes.length){
      event.preventDefault();
      dialog.focus({preventScroll:true});
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if(event.shiftKey && document.activeElement === first){
      event.preventDefault();
      last.focus();
    } else if(!event.shiftKey && document.activeElement === last){
      event.preventDefault();
      first.focus();
    }
  });

  window.JukeDialog = {open, close};
})();
