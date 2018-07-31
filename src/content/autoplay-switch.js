function setSwitchState(on) {
  const oldSwitch = document.querySelector('input#autoplay-checkbox');
  if (oldSwitch && on !== oldSwitch.checked) {
    oldSwitch.checked = on;
  }

  const mobileSwitch = document.querySelector('button[aria-label="Autoplay"]');
  if (mobileSwitch) {
    let pressed = mobileSwitch.getAttribute('aria-pressed');
    if (['true', 'false'].includes(pressed)) {
      pressed = JSON.parse(pressed);

      if (mobileSwitch && on !== pressed) {
        mobileSwitch.click();
      }
    }
  }

  const newSwitches = document.querySelectorAll(
    'paper-toggle-button#toggle, paper-toggle-button#improved-toggle'
  );
  for (const node of newSwitches) {
    if (on !== node.hasAttribute('checked')) {
      node.click();
    }
  }
}
