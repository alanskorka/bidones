window.bidones = (() => {
  const noticeEl = document.getElementById("notice");

  function showNotice(message, type = "ok") {
    if (!noticeEl) return;
    noticeEl.className = `notice ${type}`;
    noticeEl.textContent = message;
  }

  function clearNotice() {
    if (!noticeEl) return;
    noticeEl.className = "notice";
    noticeEl.textContent = "";
  }

  async function api(path, body, method = "POST") {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body ?? {})
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw json;
    }

    return json;
  }

  async function loadGroups() {
    let data = await api("/api/groups", null, "GET");
    if (data.groups.length === 0) {
      await api("/api/groups", { name: "Hebraica" });
      data = await api("/api/groups", null, "GET");
    }
    return data.groups;
  }

  function getCurrentGroupId() {
    const raw = localStorage.getItem("bidones_group_id");
    return raw ? Number(raw) : null;
  }

  function setCurrentGroupId(groupId) {
    localStorage.setItem("bidones_group_id", String(groupId));
  }

  function bindGroupSelect(selectEl, groups) {
    const current = getCurrentGroupId();
    selectEl.innerHTML = "";

    for (const group of groups) {
      const opt = document.createElement("option");
      opt.value = String(group.id);
      opt.textContent = group.name;
      selectEl.appendChild(opt);
    }

    if (groups.length === 0) {
      return null;
    }

    const exists = groups.some((g) => g.id === current);
    const selected = exists ? current : groups[0].id;
    selectEl.value = String(selected);
    setCurrentGroupId(selected);

    selectEl.addEventListener("change", () => {
      setCurrentGroupId(Number(selectEl.value));
      window.location.reload();
    });

    return selected;
  }

  function markActiveNav() {
    const path = window.location.pathname;
    for (const a of document.querySelectorAll(".nav a")) {
      if (a.getAttribute("href") === path) {
        a.classList.add("active");
      }
    }
  }

  return {
    api,
    showNotice,
    clearNotice,
    loadGroups,
    bindGroupSelect,
    getCurrentGroupId,
    setCurrentGroupId,
    markActiveNav
  };
})();