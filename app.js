const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

// EJS
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'ejs');

// Static
app.use('/public', express.static(path.join(__dirname, 'public')));

// --------------------
// Petit cache mémoire (rapide et suffisant)
// --------------------
let pokemonListCache = null;
let pokemonListCacheAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getPokemonList(limit = 151) {
  const now = Date.now();
  if (
    pokemonListCache &&
    pokemonListCache.length >= limit &&
    (now - pokemonListCacheAt) < CACHE_TTL_MS
  ) {
    return pokemonListCache.slice(0, limit);
  }
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
  const data = await response.json();

  // On enrichit avec id + image (plus pratique)
  const list = data.results.map((p, index) => ({
    id: index + 1,
    name: p.name,
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${index + 1}.png`
  }));

  pokemonListCache = list;
  pokemonListCacheAt = now;
  return list.slice(0, limit);
}

// Middleware : route courante (pour surligner le menu)
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// --------------------
// ROUTES
// --------------------
app.get('/', async (req, res) => {
  try {
    const pokemons = await getPokemonList(151);
    const featuredRows = [
      pokemons.slice(0, 6),
      pokemons.slice(6, 12),
      pokemons.slice(12, 18)
    ];
    const today = new Date().toISOString().slice(0, 10);
    const daySeed = today.split('-').join('');
    const pokemonOfDay = pokemons[Number(daySeed) % pokemons.length];

    res.render('index', { featuredRows, pokemonOfDay });
  } catch (error) {
    res.render('index', { featuredRows: [], pokemonOfDay: null });
  }
});

// API - recherche Pokémon (JSON)
app.get('/api/pokemons', async (req, res) => {
  try {
    const search = (req.query.search || '').toLowerCase().trim();
    const sort = req.query.sort || 'id-asc';

    let pokemons = await getPokemonList(151);

    if (search) {
      pokemons = pokemons.filter(p => p.name.includes(search));
    }

    switch (sort) {
      case 'name-asc':
        pokemons.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        pokemons.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'id-desc':
        pokemons.sort((a, b) => b.id - a.id);
        break;
      default:
        pokemons.sort((a, b) => a.id - b.id);
    }

    res.json(pokemons);
  } catch (err) {
    res.status(500).json({ error: 'Erreur API' });
  }
});

// LISTE + RECHERCHE + TRI + PAGINATION
app.get('/objets', async (req, res) => {
  try {
    const search = (req.query.search || '').toLowerCase().trim();
    const sort = req.query.sort || 'id-asc';
    const view = req.query.view === 'list' ? 'list' : 'gallery';

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const perPage = 20;

    let pokemons = await getPokemonList(151);

    // Recherche
    if (search) {
      pokemons = pokemons.filter(p => p.name.includes(search));
    }

    // Tri
    switch (sort) {
      case 'name-asc':
        pokemons = pokemons.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        pokemons = pokemons.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'id-desc':
        pokemons = pokemons.sort((a, b) => b.id - a.id);
        break;
      default:
        pokemons = pokemons.sort((a, b) => a.id - b.id);
    }

    // Pagination
    const total = pokemons.length;
    const totalPages = Math.max(Math.ceil(total / perPage), 1);
    const safePage = Math.min(page, totalPages);

    const start = (safePage - 1) * perPage;
    const paged = pokemons.slice(start, start + perPage);

    res.render('objects', {
      pokemons: paged,
      search,
      sort,
      page: safePage,
      perPage,
      total,
      totalPages,
      view
    });
  } catch (err) {
    res.status(500).render('error', { message: "Erreur lors du chargement des Pokémon 😢" });
  }
});

// DÉTAIL
// DÉTAIL
app.get('/objets/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const allTypeNames = [
      'normal', 'fire', 'water', 'electric', 'grass', 'ice',
      'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
      'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
    ];

    const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!pokemonRes.ok) {
      return res.status(404).render('error', { message: 'Pokemon introuvable' });
    }
    const pokemon = await pokemonRes.json();

    const speciesRes = await fetch(pokemon.species.url);
    const species = await speciesRes.json();

    const typeDetails = await Promise.all(
      pokemon.types.map(async (entry) => {
        const typeRes = await fetch(entry.type.url);
        return typeRes.json();
      })
    );

    const typeMultipliers = Object.fromEntries(
      allTypeNames.map((typeName) => [typeName, 1])
    );

    typeDetails.forEach((typeData) => {
      typeData.damage_relations.double_damage_from.forEach((entry) => {
        typeMultipliers[entry.name] *= 2;
      });
      typeData.damage_relations.half_damage_from.forEach((entry) => {
        typeMultipliers[entry.name] *= 0.5;
      });
      typeData.damage_relations.no_damage_from.forEach((entry) => {
        typeMultipliers[entry.name] *= 0;
      });
    });

    const weaknesses = Object.entries(typeMultipliers)
      .filter(([, multiplier]) => multiplier > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([name, multiplier]) => ({ name, multiplier }));

    const resistances = Object.entries(typeMultipliers)
      .filter(([, multiplier]) => multiplier > 0 && multiplier < 1)
      .sort((a, b) => a[1] - b[1])
      .map(([name, multiplier]) => ({ name, multiplier }));

    const flavorFR = species.flavor_text_entries.find(
      (entry) => entry.language.name === 'fr'
    );

    const evolutionRes = await fetch(species.evolution_chain.url);
    const evolutionData = await evolutionRes.json();

    function extractEvolutionChain(chain) {
      const evolutions = [];
      function traverse(node) {
        evolutions.push(node.species.name);
        node.evolves_to.forEach(traverse);
      }
      traverse(chain);
      return evolutions;
    }
    const evolutionNames = extractEvolutionChain(evolutionData.chain);

    const evolutions = await Promise.all(
      evolutionNames.map(async (name) => {
        const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!r.ok) return { id: null, name, image: null };
        const p = await r.json();
        return {
          id: p.id,
          name: p.name,
          image: p.sprites.front_default
        };
      })
    );

    const moves = pokemon.moves.map((m) => m.move.name);
    const items = pokemon.held_items.map((i) => i.item.name);

    res.render('object-details', {
      pokemon,
      description: flavorFR ? flavorFR.flavor_text : 'Aucune description disponible.',
      evolutions,
      weaknesses,
      resistances,
      moves,
      items
    });
  } catch (error) {
    res.status(500).render('error', {
      message: 'Erreur lors du chargement du Pokemon '
    });
  }
});

app.get('/capacites/:name', async (req, res) => {
  try {
    const name = req.params.name;

    const abilityRes = await fetch(`https://pokeapi.co/api/v2/ability/${name}`);
    if (!abilityRes.ok) {
      return res.status(404).render('error', { message: "Capacité introuvable " });
    }

    const ability = await abilityRes.json();

    // Description FR
    const effectFR = ability.effect_entries.find(e => e.language.name === 'fr');
    const shortFR = ability.flavor_text_entries.find(e => e.language.name === 'fr');

    res.render('ability-details', {
      ability,
      effect: effectFR?.effect || "Aucune description disponible.",
      short: shortFR?.flavor_text || ""
    });

  } catch (error) {
    res.status(500).render('error', { message: "Erreur capacité " });
  }
});

app.get('/favoris', (req, res) => {
  res.render('favorites');
});

// CONTACT
app.get('/contact', (req, res) => {
  res.render('contact');
});

// 404
app.use((req, res) => {
  res.status(404).render('error', { message: "Page introuvable (404) 👀" });
});




if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Serveur lance sur http://localhost:${PORT}`);
  });
}

module.exports = app;
