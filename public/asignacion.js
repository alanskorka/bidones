(function () {
  const { api, showNotice, clearNotice, loadGroups, bindGroupSelect, markActiveNav } = window.bidones;

  const groupSelect = document.getElementById("groupSelect");
  const dateInput = document.getElementById("dateInput");
  const listInput = document.getElementById("listInput");
  const resultName = document.getElementById("resultName");
  const resultMessage = document.getElementById("resultMessage");

  function todayIso() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  document.getElementById("btnPick").addEventListener("click", async () => {
    clearNotice();
    resultName.textContent = "";
    resultMessage.value = "";

    try {
      const groupId = Number(groupSelect.value);
      const data = await api("/api/pick", {
        groupId,
        date: dateInput.value,
        listText: listInput.value
      });

      resultName.textContent = data.selectedName;
      resultMessage.value = data.message;
    } catch (err) {
      if (Array.isArray(err.unresolvedNames)) {
        showNotice(`Nombres sin mapear: ${err.unresolvedNames.join(", ")}`, "error");
        return;
      }
      showNotice(err.error || "No se pudo resolver la asignacion.", "error");
    }
  });

  document.getElementById("btnCopy").addEventListener("click", async () => {
    if (!resultMessage.value) return;

    try {
      await navigator.clipboard.writeText(resultMessage.value);
      showNotice("Mensaje copiado.");
    } catch {
      showNotice("No se pudo copiar el mensaje.", "error");
    }
  });

  async function boot() {
    markActiveNav();
    dateInput.value = todayIso();

    try {
      const groups = await loadGroups();
      bindGroupSelect(groupSelect, groups);
    } catch (err) {
      showNotice(err.error || "No se pudieron cargar los grupos.", "error");
    }
  }

  boot();
})();