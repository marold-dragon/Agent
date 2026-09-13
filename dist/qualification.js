(() => {
  'use strict';
  const form = document.querySelector('#qualification');
  const rejected = document.querySelector('#rejected');
  const qualified = document.querySelector('#qualified');
  const pending = document.querySelector('#pending');
  const checkout = document.querySelector('#checkout');
  const unavailable = document.querySelector('#unavailable');
  function checkoutUrl() {
    try {
      const url = new URL(window.PILOT_CONFIG?.checkoutUrl);
      const allowed = ['lemonsqueezy.com', 'polar.sh'];
      return url.protocol === 'https:' && !url.username && !url.password && allowed.some(host => url.hostname === host || url.hostname.endsWith('.' + host)) ? url.href : null;
    } catch { return null; }
  }
  function update() {
    const values = [1,2,3,4].map(i => form.querySelector(`input[name="q${i}"]:checked`)?.value);
    const allYes = values.every(v => v === 'Yes');
    const anyNo = values.includes('No');
    rejected.hidden = !anyNo;
    qualified.hidden = !allYes;
    pending.hidden = allYes || anyNo;
    const url = checkoutUrl();
    checkout.hidden = !allYes;
    checkout.disabled = !allYes || !url;
    unavailable.hidden = !allYes || !!url;
  }
  form.addEventListener('change', update);
  form.addEventListener('submit', event => {
    event.preventDefault();
    update();
    if (!checkout.disabled) window.location.assign(checkoutUrl());
  });
  window.addEventListener('pageshow', update);
  update();
})();
