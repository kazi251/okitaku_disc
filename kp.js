// kp.js - Firestore fetch版（Cloudflare Worker経由）

const urlParams = new URLSearchParams(window.location.search);
const kpId = urlParams.get("kpId");

const API_BASE = "https://firestore-api.kai-chan-tsuru.workers.dev/firestore";

async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/scenarios?kpId=${kpId}`);
  const data = await res.json();
  return data.scenarios || [];
}

async function createScenario(title) {
  const res = await fetch(`${API_BASE}/scenarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kpId, title })
  });
  return res.json();
}

async function fetchPlayers(scenarioId) {
  const res = await fetch(`${API_BASE}/players?scenarioId=${scenarioId}`);
  const data = await res.json();
  return data.players || [];
}

async function updatePlayerWebhook(scenarioId, playerId, webhookUrl) {
  await fetch(`${API_BASE}/players/${playerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId, webhookUrl })
  });
}

// DOM 操作とイベントバインド
const scenarioSelect = document.getElementById("scenarioSelect");
const createScenarioBtn = document.getElementById("createScenarioBtn");
const newScenarioTitleInput = document.getElementById("newScenarioTitle");
const playerListDiv = document.getElementById("playerList");

createScenarioBtn.addEventListener("click", async () => {
  const title = newScenarioTitleInput.value.trim();
  if (!title) return;
  const result = await createScenario(title);
  await loadScenarios();
  newScenarioTitleInput.value = "";
});

scenarioSelect.addEventListener("change", async () => {
  const scenarioId = scenarioSelect.value;
  if (scenarioId) {
    const players = await fetchPlayers(scenarioId);
    renderPlayers(players, scenarioId);
  } else {
    playerListDiv.innerHTML = "";
  }
});

function renderPlayers(players, scenarioId) {
  playerListDiv.innerHTML = "";
  players.forEach((player) => {
    const div = document.createElement("div");
    div.className = "player-item";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = player.name || "(no name)";

    const input = document.createElement("input");
    input.type = "text";
    input.value = player.webhookUrl || "";
    input.placeholder = "Webhook URL";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "保存";
    saveBtn.addEventListener("click", async () => {
      await updatePlayerWebhook(scenarioId, player.id, input.value.trim());
      alert("保存しました");
    });

    div.appendChild(nameSpan);
    div.appendChild(input);
    div.appendChild(saveBtn);

    playerListDiv.appendChild(div);
  });
}

async function loadScenarios() {
  const scenarios = await fetchScenarios();
  scenarioSelect.innerHTML = "<option value=''>シナリオを選択</option>";
  scenarios.forEach((scn) => {
    const opt = document.createElement("option");
    opt.value = scn.id;
    opt.textContent = scn.title;
    scenarioSelect.appendChild(opt);
  });
}

document.addEventListener("DOMContentLoaded", loadScenarios);
