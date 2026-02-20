(function () {
  const { api, showNotice, clearNotice, loadGroups, bindGroupSelect, markActiveNav } = window.bidones;

  const groupSelect = document.getElementById("groupSelect");
  const playersEl = document.getElementById("players");
  const aliasPlayerSelect = document.getElementById("aliasPlayerSelect");
  const newPlayerInput = document.getElementById("newPlayerInput");
  const newAliasInput = document.getElementById("newAliasInput");

  let players = [];

  function currentGroupId() {
    return Number(groupSelect.value);
  }

  function renderPlayers() {
    playersEl.innerHTML = "";
    aliasPlayerSelect.innerHTML = "";

    for (const p of players) {
      const li = document.createElement("li");
      li.textContent = `${p.canonicalName} (${p.active ? "activo" : "inactivo"}) | aliases: ${p.aliases.map((a) => a.aliasNormalized).join(", ")}`;

      const actions = document.createElement("span");
      actions.className = "item-actions";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "ghost";
      toggle.textContent = p.active ? "Desactivar" : "Activar";
      toggle.addEventListener("click", async () => {
        try {
          await api(`/api/players/${p.id}`, { active: !p.active }, "PATCH");
          await loadPlayers();
          showNotice("Jugador actualizado.");
        } catch (err) {
          showNotice(err.error || "No se pudo actualizar.", "error");
        }
      });

      actions.appendChild(toggle);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "Borrar";
      del.addEventListener("click", async () => {
        try {
          await api(`/api/players/${p.id}`, null, "DELETE");
          await loadPlayers();
          showNotice("Jugador borrado.");
        } catch (err) {
          showNotice(err.error || "No se pudo borrar jugador.", "error");
        }
      });

      actions.appendChild(del);
      li.appendChild(actions);
      playersEl.appendChild(li);

      const opt = document.createElement("option");
      opt.value = p.canonicalName;
      opt.textContent = p.canonicalName;
      aliasPlayerSelect.appendChild(opt);
    }
  }

  async function loadPlayers() {
    const data = await api(`/api/players?groupId=${currentGroupId()}`, null, "GET");
    players = data.players;
    renderPlayers();
  }

  document.getElementById("btnAddPlayer").addEventListener("click", async () => {
    clearNotice();
    const canonicalName = newPlayerInput.value.trim();
    if (!canonicalName) {
      showNotice("Escribe un nombre.", "error");
      return;
    }

    try {
      await api("/api/players", { groupId: currentGroupId(), canonicalName });
      newPlayerInput.value = "";
      await loadPlayers();
      showNotice("Jugador agregado.");
    } catch (err) {
      showNotice(err.error || "No se pudo agregar jugador.", "error");
    }
  });

  document.getElementById("btnAddAlias").addEventListener("click", async () => {
    clearNotice();
    const canonicalName = aliasPlayerSelect.value;
    const alias = newAliasInput.value.trim();

    if (!canonicalName || !alias) {
      showNotice("Selecciona jugador y alias.", "error");
      return;
    }

    try {
      await api("/api/aliases", {
        groupId: currentGroupId(),
        canonicalName,
        alias
      });
      newAliasInput.value = "";
      await loadPlayers();
      showNotice("Alias agregado.");
    } catch (err) {
      showNotice(err.error || "No se pudo agregar alias.", "error");
    }
  });

  async function boot() {
    markActiveNav();
    try {
      const groups = await loadGroups();
      bindGroupSelect(groupSelect, groups);
      await loadPlayers();
    } catch (err) {
      showNotice(err.error || "No se pudo iniciar la pantalla.", "error");
    }
  }

  boot();
})();
