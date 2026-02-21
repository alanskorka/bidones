(function () {
  const { api, showNotice, clearNotice, loadGroups, bindGroupSelect, markActiveNav } = window.bidones;

  const groupSelect = document.getElementById("groupSelect");
  const historyEl = document.getElementById("history");

  function currentGroupId() {
    return Number(groupSelect.value);
  }

  async function loadHistory() {
    const data = await api(`/api/history?groupId=${currentGroupId()}`, null, "GET");
    historyEl.innerHTML = "";

    for (const item of data.items) {
      const li = document.createElement("li");
      li.textContent = `${item.date} | ${item.canonicalName}`;

      const actions = document.createElement("span");
      actions.className = "item-actions";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "Borrar";
      del.addEventListener("click", async () => {
        try {
          const response = await fetch(
            `/api/history?groupId=${currentGroupId()}&date=${encodeURIComponent(item.date)}`,
            { method: "DELETE" }
          );
          const json = await response.json();
          if (!response.ok || !json.ok) {
            throw json;
          }
          await loadHistory();
          showNotice("Registro borrado.");
        } catch (err) {
          showNotice(err.error || "No se pudo borrar el registro.", "error");
        }
      });

      actions.appendChild(del);
      li.appendChild(actions);
      historyEl.appendChild(li);
    }
  }

  async function boot() {
    markActiveNav();
    try {
      const groups = await loadGroups();
      bindGroupSelect(groupSelect, groups);
      await loadHistory();
    } catch (err) {
      showNotice(err.error || "No se pudo iniciar la pantalla.", "error");
    }
  }

  boot();
})();
