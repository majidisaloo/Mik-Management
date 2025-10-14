function initialiseGroupTree() {
  const tree = document.querySelector('[data-group-tree]');
  if (!tree) return;

  tree.querySelectorAll('[data-group-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const container = button.closest('li');
      if (!container) return;
      const children = container.querySelector(':scope > .group-node__children');
      if (!children) return;

      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      children.style.display = expanded ? 'none' : '';
      const icon = expanded ? '▸' : '▾';
      button.innerHTML = `<span aria-hidden="true">${icon}</span><span class="sr-only">Toggle children</span>`;
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initialiseGroupTree();
});
