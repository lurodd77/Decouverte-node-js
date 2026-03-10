document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('favoritesContainer');
  const emptyMsg = document.getElementById('emptyMsg');
  const count = document.getElementById('favoritesCount');

  let favs = JSON.parse(localStorage.getItem('favs') || '[]');
  updateCount();

  if (favs.length === 0) {
    emptyMsg.classList.remove('d-none');
    return;
  }

  favs.forEach((pokemon) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-xl-4';

    col.innerHTML = `
      <article class="favorite-card h-100">
        <div class="favorite-card__media">
          <img
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png"
            alt="${pokemon.name}"
            width="120"
            height="120"
            loading="lazy"
          >
          <span class="favorite-card__id">#${pokemon.id}</span>
        </div>
        <div class="favorite-card__body">
          <h2 class="h4 text-capitalize mb-2">${pokemon.name}</h2>
          <p class="text-muted mb-4">Retrouve rapidement sa fiche detaillee ou retire-le de ta collection personnelle.</p>
          <div class="d-flex flex-column flex-sm-row gap-2">
            <a href="/objets/${pokemon.id}" class="btn btn-primary flex-fill">Voir la fiche</a>
            <button class="btn btn-outline-danger flex-fill" type="button">Retirer</button>
          </div>
        </div>
      </article>
    `;

    col.querySelector('button').addEventListener('click', () => {
      removeFavorite(pokemon.id);
      col.remove();
      favs = JSON.parse(localStorage.getItem('favs') || '[]');
      updateCount();

      if (favs.length === 0) {
        emptyMsg.classList.remove('d-none');
      }
    });

    container.appendChild(col);
  });

  function updateCount() {
    const currentFavs = JSON.parse(localStorage.getItem('favs') || '[]');
    count.textContent = currentFavs.length;
  }
});

function removeFavorite(id) {
  let favs = JSON.parse(localStorage.getItem('favs') || '[]');
  favs = favs.filter((p) => p.id !== id);
  localStorage.setItem('favs', JSON.stringify(favs));
}
