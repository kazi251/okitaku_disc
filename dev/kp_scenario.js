import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collectionGroup,
  query,
  where,
  getDocs,
  collection,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URLパラメータから scenarioId を取得
const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get("scenarioId");
const accessKpId = urlParams.get("kpId");

const nameElem = document.getElementById("scenario-name");
const charListElem = document.getElementById("character-list");

const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const textarea = document.getElementById("kp-say-content");

let currentDocRef = null;
let characterMap = {}; 
let threadListCache = []; 

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

// キャラクターの読み込み
async function fetchCharacters(scenarioId) {
  const charactersRef = collectionGroup(db, "list");
  const q = query(charactersRef, where("scenarioId", "==", scenarioId));
  const querySnapshot = await getDocs(q);

  const characters = [];

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    characters.push({
      ...data,
      ref: docSnap.ref,
    });
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
      memo,
      imageUrl
    } = char;

    const sanBracket = sanMax - Math.floor(sanMax / 5);
    const displayImage = imageUrl || "./seeker_vault/default.png";

    const card = document.createElement("div");
    card.className = "character-card";

    card.innerHTML = `
      <div class="card-image">
        <img src="${displayImage}" alt="${name}">
      </div>
      <div class="card-info">
        <div class="card-stats">
          <div><strong>HP:</strong> ${hp}/${hpMax}</div>
          <div><strong>MP:</strong> ${mp}/${mpMax}</div>
          <div><strong>SAN:</strong> ${san}/${sanMax} (${sanBracket})</div>
          ${other1Name ? `<div><strong>${other1Name}:</strong> ${other}</div>` : ""}
          ${other2Name ? `<div><strong>${other2Name}:</strong> ${other2}</div>` : ""}
          ${memo ? `<div>${memo}</div>` : ""}
        </div>
        <div class="card-footer">
          <div class="card-name">${name}</div>
          <button class="edit-button">編集</button>
        </div>
      </div>
    `;

    // 編集ボタン処理（必要に応じてコールバック追加）
    card.querySelector(".edit-button").addEventListener("click", () => {
      currentDocRef = char.ref;
      document.getElementById("edit-hp").value = char.hp ?? "";
      document.getElementById("edit-hpMax").value = char.hpMax ?? "";
      document.getElementById("edit-mp").value = char.mp ?? "";
      document.getElementById("edit-mpMax").value = char.mpMax ?? "";
      document.getElementById("edit-san").value = char.san ?? "";
      document.getElementById("edit-sanMax").value = char.sanMax ?? "";
      document.getElementById("edit-other").value = char.other ?? "";
      document.getElementById("edit-other2").value = char.other2 ?? "";
      document.getElementById("edit-memo").value = char.memo ?? "";

      // ラベル名
      document.getElementById("edit-other1-name").value = char.other1Name || "";
      document.getElementById("edit-other2-name").value = char.other2Name || "";

      // モーダル表示
      editModal.classList.remove("hidden");
      });

    container.appendChild(card);
  });
}

// モーダルのパラメータが空だった時の処理
function parseInputValue(id) {
  const val = document.getElementById(id).value;
  return val === "" ? null : Number(val);
}

function setupEventListeners() {

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentDocRef) return;

    const updatedData = {
      hp: parseInputValue("edit-hp"),
      hpMax: parseInputValue("edit-hpMax"),
      mp: parseInputValue("edit-mp"),
      mpMax: parseInputValue("edit-mpMax"),
      san: parseInputValue("edit-san"),
      sanMax: parseInputValue("edit-sanMax"),
      other: parseInputValue("edit-other"),
      other2: parseInputValue("edit-other2"),
      other1Name: document.getElementById("edit-other1-name").value.trim(),
      other2Name: document.getElementById("edit-other2-name").value.trim(),
      memo: document.getElementById("edit-memo").value.trim(),
      accessKpId: accessKpId
    };

    try {
      await setDoc(currentDocRef, updatedData, { merge: true });
      showToast("保存しました");
      editModal.classList.add("hidden");
      await initKpScenarioPage(); // 再読み込み
    } catch (err) {
      showToast("保存に失敗しました");
      console.error(err);
    }
  });

  document.getElementById("cancel-button").addEventListener("click", () => {
    editModal.classList.add("hidden");
  });

}

async function renderKPCAndEnemies(scenarioId) {
  
  const scenarioRef = doc(db, "scenarios", scenarioId);

  const [kpcSnap, enemiesSnap] = await Promise.all([
    getDocs(collection(scenarioRef, "kpc")),
    getDocs(collection(scenarioRef, "enemies"))
  ]);

  const container = document.getElementById("kpc-enemy-container"); 
  container.innerHTML = "";

  const accordion = document.createElement("details");
  accordion.open = true;

  const summary = document.createElement("summary");
  summary.textContent = "KPC・エネミー一覧";
  accordion.appendChild(summary);

  const inner = document.createElement("div");
  inner.className = "kpc-enemy-inner";

  // ドキュメントデータに .ref を追加して再利用可能に
  const kpcList = kpcSnap.docs.map(doc => ({ ...doc.data(), ref: doc.ref }));
  const enemyList = enemiesSnap.docs.map(doc => ({ ...doc.data(), ref: doc.ref }));

    // KPCセクション
  const kpcSection = document.createElement("div");
  kpcSection.className = "kpc-section";
  renderCharacterCards(kpcList, kpcSection);

  // エネミーセクション
  const enemySection = document.createElement("div");
  enemySection.className = "enemy-section";
  renderCharacterCards(enemyList, enemySection);

  inner.appendChild(kpcSection);

  // KPCとエネミーの間にスペーサー
  const spacer = document.createElement("div");
  spacer.style.paddingBottom = "1rem";
  inner.appendChild(spacer);

  inner.appendChild(enemySection);

  // アコーディオン構造に追加
  accordion.appendChild(inner);

  // 親コンテナに追加
  container.appendChild(accordion);

}

// 発言・ダイスUIエリア
async function initKpCharacterDropdown(scenarioId) {
  const select = document.getElementById("kp-character-dropdown");
  select.innerHTML = '<option value="">選択してください</option>';

  characterMap = {}; // 初期化

  const types = ["mobs", "kpc", "enemies"];

  for (const type of types) {
    const snap = await getDocs(collection(db, "scenarios", scenarioId, type));
    snap.forEach(doc => {
      const data = doc.data();
      const charId = doc.id;

      const option = document.createElement("option");
      option.value = charId;
      option.textContent = `[${type}] ${data.name}`;
      select.appendChild(option);

      // 🔑 characterMap に保存
      characterMap[charId] = {
        name: data.name,
        imageUrl: data.imageUrl || "",
        webhook: data.webhook || "", // もし必要なら
      };
    });
  }
}

async function initThreadDropdown(scenarioId) {
  const threadSelect = document.getElementById("kp-thread-dropdown");
  threadSelect.innerHTML = '<option value="">スレッドを選択</option>';

  const snap = await getDocs(collection(db, "scenarios", scenarioId, "threads"));

  threadListCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); // キャッシュに保存

  threadListCache.forEach(thread => {
    const option = document.createElement("option");
    option.value = thread.id; // threadId だけ保持
    option.textContent = thread.name || `スレッドID: ${thread.id}`;
    threadSelect.appendChild(option);
  });
}

// Webhook URLを取得する関数
function getSelectedWebhookUrl() {
  const threadId = document.getElementById("kp-thread-dropdown").value;
  if (!threadId) return null;

  const thread = threadListCache.find(t => t.id === threadId);
  return thread?.webhookUrl || null;
}

// KPによるセリフ送信
async function sendKpSay() {
  const content = document.getElementById("kp-say-content").value.trim();
  if (!content) return;

  const selectedId = document.getElementById("kp-character-dropdown").value;
  const char = characterMap[selectedId];
  if (!char) {
    showToast("キャラが選択されていません");
    return;
  }

  // 画像を絶対パスに変換
  const avatar_url = new URL(char.imageUrl, location.origin).href;

  const webhook = await getSelectedWebhookUrl();
  if (!webhook) {
    showToast("Webhookが設定されていません");
    return;
  }
  
  try {
    const response = await fetch("https://sayworker.kai-chan-tsuru.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: char.name,
        message: content,
        avatar_url: avatar_url,
        webhook: webhook
      })
    });

    if (response.ok) {
      document.getElementById("kp-say-content").value = "";
      showToast("セリフを送信しました！");
    } else {
      const errorText = await response.text();
      throw new Error(`送信失敗: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error(`セリフ送信エラー: ${error.message}`);
    showToast("セリフ送信に失敗しました");
  }
}

// セリフ送信テキストエリアの制御
textarea.addEventListener("input", () => {
  textarea.style.height = "auto"; // 一度高さをリセット
  const lineHeight = 24; // 行の高さ（CSSと合わせる）
  const maxLines = 4;
  const maxHeight = lineHeight * maxLines;

  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
});

// KPによるダイスロール
async function rollKpDice() {
  const input = document.getElementById("kp-dice-command").value.trim();
  if (!input) return;

  const selectedId = document.getElementById("kp-character-dropdown").value;
  const char = characterMap[selectedId];
  if (!char) {
    showToast("キャラが選択されていません");
    return;
  }
  // 画像を絶対パスに変換
  const avatar_url = new URL(char.imageUrl, location.origin).href;

  const webhook = await getSelectedWebhookUrl();
  if (!webhook) {
    showToast("Webhookが設定されていません");
    return;
  }

  const command = input.replace(/\{SAN\}/g, char.san ?? ""); // 必要に応じて変数展開
  const url = new URL("https://rollworker.kai-chan-tsuru.workers.dev/");
  url.searchParams.append("command", command);
  url.searchParams.append("name", char.name);
  url.searchParams.append("avatar_url", avatar_url);
  url.searchParams.append("webhook", webhook);

  try {
    const response = await fetch(url.toString());
    const result = await response.json();

    let displayText = `🎲 ${command}:`;
    if (result.ok) {
      let resultText = result.text ?? "";
      resultText = resultText.replace(/\n{2,}(#\d+)/g, '\n$1');

      const lines = resultText.split("\n").map(line => {
        if (line.includes("致命的失敗")) return line + " 💀";
        else if (line.includes("失敗")) return line + " 🥶";
        else if (line.includes("決定的成功/スペシャル")) return line + " 🎉🎊✨";
        else if (line.includes("スペシャル") || line.includes("成功")) return line + " 😊";
        else return line;
      });

      displayText += "\n" + lines.join("\n");
      showToast("ダイスを振りました！");
      document.getElementById("kp-dice-command").value = "";
    } else {
      displayText += "\nエラー: " + result.reason;
    }

    document.getElementById("kp-dice-result").innerHTML = displayText.replace(/\n/g, "<br>");
  } catch (err) {
    document.getElementById("kp-dice-result").innerText = "⚠️ 通信エラーが発生しました";
    console.error("ダイス通信エラー:", err);
  }
}

async function initKpScenarioPage() {

  document.getElementById("kp-send-button")?.addEventListener("click", sendKpSay);
  document.getElementById("kp-roll-button")?.addEventListener("click", rollKpDice);
  
  await loadScenario();

  // キャラクター一覧取得と描画
  const characters = await fetchCharacters(scenarioId);
  renderCharacterCards(characters, charListElem);

  // KPC・エネミーの描画
  await renderKPCAndEnemies(scenarioId);

  // 発言・ダイス
  await initKpCharacterDropdown(scenarioId);
  await initThreadDropdown(scenarioId)
  
  setupEventListeners();
}

window.addEventListener("DOMContentLoaded", () => {
  initKpScenarioPage();
});
