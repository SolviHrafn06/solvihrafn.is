'use strict';
const colors = {
  orange: { value: '#ee754c', name: '01 — Appelsínugulur' },
  blue: { value: '#658ac0', name: '02 — Blár' },
  green: { value: '#87a16a', name: '03 — Grænn' }
};
document.querySelectorAll('.swatch').forEach(button => {
  button.addEventListener('click', () => {
    const color = colors[button.dataset.color];
    document.documentElement.style.setProperty('--accent', color.value);
    document.getElementById('color-name').textContent = color.name;
    document.querySelectorAll('.swatch').forEach(item => {
      const active = item === button;
      item.classList.toggle('selected', active);
      item.setAttribute('aria-pressed', String(active));
    });
  });
});
document.getElementById('year').textContent = new Date().getFullYear();
