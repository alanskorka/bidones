(function () {
  const { api, showNotice, clearNotice, loadGroups, bindGroupSelect, markActiveNav, setCurrentGroupId } =
    window.bidones;

  const groupSelect = document.getElementById("groupSelect");
  const newGroupInput = document.getElementById("newGroupInput");
  const groupsList = document.getElementById("groupsList");

  let groups = [];

  function renderGroupsList() {
    groupsList.innerHTML = "";
    for (const g of groups) {
      const li = document.createElement("li");
      li.textContent = g.name;

      const actions = document.createElement("span");
      actions.className = "item-actions";

      const useBtn = document.createElement("button");
      useBtn.type = "button";
      useBtn.className = "ghost";
      useBtn.textContent = "Usar";
      useBtn.addEventListener("click", () => {
        setCurrentGroupId(g.id);
        groupSelect.value = String(g.id);
        showNotice(`Grupo activo: ${g.name}`);
      });

      actions.appendChild(useBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "danger";
      delBtn.textContent = "Borrar";
      delBtn.addEventListener("click", async () => {
        try {
          await api(`/api/groups/${g.id}`, null, "DELETE");
          await refreshGroups();
          showNotice("Grupo borrado.");
        } catch (err) {
          showNotice(err.error || "No se pudo borrar grupo.", "error");
        }
      });

      actions.appendChild(delBtn);
      li.appendChild(actions);
      groupsList.appendChild(li);
    }
  }

  async function refreshGroups() {
    groups = await loadGroups();
    bindGroupSelect(groupSelect, groups);
    renderGroupsList();
  }

  document.getElementById("btnCreateGroup").addEventListener("click", async () => {
    clearNotice();
    const name = newGroupInput.value.trim();
    if (!name) {
      showNotice("Escribe un nombre para el grupo.", "error");
      return;
    }

    try {
      const data = await api("/api/groups", { name });
      await refreshGroups();
      setCurrentGroupId(data.group.id);
      groupSelect.value = String(data.group.id);
      newGroupInput.value = "";
      showNotice("Grupo creado.");
    } catch (err) {
      showNotice(err.error || "No se pudo crear grupo.", "error");
    }
  });

  async function boot() {
    markActiveNav();
    try {
      await refreshGroups();
    } catch (err) {
      showNotice(err.error || "No se pudieron cargar los grupos.", "error");
    }
  }

  boot();
})();
