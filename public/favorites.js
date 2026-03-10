function getFavorites() {
  return JSON.parse(localStorage.getItem('favs') || '[]');
}

function saveFavorites(favs) {
  localStorage.setItem('favs', JSON.stringify(favs));
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('favBtn');
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const name = btn.dataset.name;

  let favs = getFavorites();
  const exists = favs.find(p => p.id === id);

  if (exists) {
    btn.classList.add('active');
    btn.textContent = '❤️ Dans les favoris';
  }

  btn.addEventListener('click', () => {
    favs = getFavorites();
    const found = favs.find(p => p.id === id);

    if (found) {
      favs = favs.filter(p => p.id !== id);
      btn.classList.remove('active');
      btn.textContent = '❤️ Ajouter aux favoris';
    } else {
      favs.push({ id, name });
      btn.classList.add('active');
      btn.textContent = '❤️ Dans les favoris';
    }

    saveFavorites(favs);
  });
});
