// Firebase 初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collectionGroup,
  query,
  where,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URLパラメータから scenarioId を取得
const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get("scenarioId");

const nameElem = document.getElementById("scenario-name");
const charListElem = document.getElementById("character-list");

async function loadScenario() {
  if (!scenarioId) {
    nameElem.textContent = "シナリオIDが指定されていません。";
    return;
  }

  // シナリオ情報を取得
  const scenarioDoc = await getDoc(doc(db, "scenarios", scenarioId));
  if (!scenarioDoc.exists()) {
    nameElem.textContent = "シナリオが見つかりません。";
    return;
  }

  const scenarioData = scenarioDoc.data();
  nameElem.textContent = `シナリオ：${scenarioData.name}`;

}

async function fetchCharacters(scenarioId) {
  const charactersRef = collectionGroup(db, "list");
  const q = query(charactersRef, where("scenarioId", "==", scenarioId));
  const querySnapshot = await getDocs(q);

  const characters = [];

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    characters.push(data);
  }

  return characters;
}

function renderCharacterCards(characters, container) {
  container.innerHTML = "";

  characters.forEach((char) => {
    const {
      name,
      hp, hpMax,
      mp, mpMax,
      san, sanMax,
      other, other1Name,
      other2, other2Name,
      imageUrl,
      id, // listドキュメントのid
      scenarioId
    } = char;

    const sanBracket = sanMax - Math.floor(sanMax / 5);
    const displayImage = imageUrl || "./seeker_vault/default.png";

    const card = document.createElement("div");
    card.className = "character-card";

    const inputField = (key, val) => {
      const input = document.createElement("input");
      input.type = "number";
      input.value = val ?? 0;
      input.dataset.key = key;
      input.className = "status-input";
      return input;
    };

    const hpInput = inputField("hp", hp);
    const hpMaxInput = inputField("hpMax", hpMax);
    const mpInput = inputField("mp", mp);
    const mpMaxInput = inputField("mpMax", mpMax);
    const sanInput = inputField("san", san);
    const sanMaxInput = inputField("sanMax", sanMax);

    const saveButton = document.createElement("button");
    saveButton.textContent = "保存";
    saveButton.className = "save-button";
    saveButton.disabled = true;

    const inputs = [hpInput, hpMaxInput, mpInput, mpMaxInput, sanInput, sanMaxInput];
    const original = { hp, hpMax, mp, mpMax, san, sanMax };

    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        const changed = inputs.some(i => Number(i.value) !== original[i.dataset.key]);
        saveButton.disabled = !changed;
      });
    });

    saveButton.addEventListener("click", async () => {
      const newData = {};
      inputs.forEach((input) => {
        newData[input.dataset.key] = Number(input.value);
      });

      try {
        const listDocPath = `scenarios/${scenarioId}/list/${char.id}`;
        const docRefFull = doc(db, listDocPath);
        await updateDoc(docRefFull, newData);
        showToast("保存しました");
        Object.assign(original, newData);
        saveButton.disabled = true;
      } catch (e) {
        console.error("保存エラー", e);
        alert("保存に失敗しました");
      }
    });

    card.innerHTML = `
      <div class="card-image">
        <img src="${displayImage}" alt="${name}">
      </div>
      <div class="card-info">
        <div class="card-stats"></div>
        <div class="card-footer">
          <div class="card-name">${name}</div>
        </div>
      </div>
    `;

    const stats = card.querySelector(".card-stats");
    const addStatRow = (label, input1, input2) => {
      const row = document.createElement("div");
      row.innerHTML = `<strong>${label}:</strong> `;
      row.appendChild(input1);
      row.appendChild(document.createTextNode("/"));
      row.appendChild(input2);
      stats.appendChild(row);
    };

    addStatRow("HP", hpInput, hpMaxInput);
    addStatRow("MP", mpInput, mpMaxInput);
    addStatRow("SAN", sanInput, sanMaxInput);
    stats.appendChild(saveButton);

    container.appendChild(card);
  });
}

// function setupEventListeners() {
//   document.getElementById("create-scenario").addEventListener("click", handleCreateScenario);
// }

async function initKpScenarioPage() {
  
  await loadScenario();

  // キャラクター一覧取得と描画
  const characters = await fetchCharacters(scenarioId);
  renderCharacterCards(characters, charListElem);
}

window.addEventListener("DOMContentLoaded", () => {
  initKpScenarioPage();
});
