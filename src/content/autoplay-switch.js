function setSwitchState(on) {
  const oldSwitch = document.querySelector('input#autoplay-checkbox');
  if (oldSwitch && on !== oldSwitch.checked) {
    oldSwitch.checked = on;
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
