// ✅ admin.js（画像URLの編集追加版）
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  collectionGroup,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { showToast } from "./utils.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvrggu4aMoRwAG2rccnWQwhDGsS60Tl8Q",
  authDomain: "okitakudisc.firebaseapp.com",
  projectId: "okitakudisc",
  storageBucket: "okitakudisc.appspot.com",
  messagingSenderId: "724453796377",
  appId: "1:724453796377:web:bec78279dfc6dba0fc9888",
  measurementId: "G-LNHQBFYXFL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const scenarioMap = new Map();

async function loadScenarios() {
  try {
    const snapshot = await getDocs(collection(db, "scenarios"));
    scenarioMap.clear();
    snapshot.forEach(docSnap => {
      scenarioMap.set(docSnap.id, docSnap.data().name);
    });
  } catch (error) {
    console.error("シナリオ読み込みエラー:", error);
    showToast("シナリオの読み込みに失敗しました");
  }
}

document.getElementById("create-character").addEventListener("click", async () => {
  const playerId = document.getElementById("new-player-id").value.trim();
  const name = document.getElementById("new-character-name").value.trim();
  const imageUrl = document.getElementById("new-character-image").value.trim() || "./seeker_vault/default.png";
  const webhook = document.getElementById("new-character-webhook").value.trim();

  if (!playerId || !name) {
    showToast("プレイヤーIDとキャラクター名は必須です");
    return;
  }

  try {
    const ref = collection(db, "characters", playerId, "list");
    await addDoc(ref, {
      name,
      imageUrl,
      webhook,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    showToast(`キャラクター「${name}」を ${playerId} に作成しました`);
    await loadCharacterMatrix(); // 再読み込み
  } catch (error) {
    console.error("キャラ作成失敗:", error);
    showToast("作成に失敗しました");
  }
});

async function loadCharacterMatrix() {
  const tbody = document.querySelector("#character-matrix tbody");
  tbody.innerHTML = "";

  try {
    const snapshot = await getDocs(collectionGroup(db, "list"));
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const playerId = docSnap.ref.path.split("/")[1];
      const row = document.createElement("tr");

      const tdPlayer = document.createElement("td");
      tdPlayer.textContent = playerId;
      row.appendChild(tdPlayer);

      const tdChar = document.createElement("td");
      tdChar.textContent = data.name || "No Name";
      row.appendChild(tdChar);

      const tdScenario = document.createElement("td");
      const select = document.createElement("select");
      scenarioMap.forEach((name, id) => {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = name;
        if (data.currentScenario === id) opt.selected = true;
        select.appendChild(opt);
      });
      tdScenario.appendChild(select);
      row.appendChild(tdScenario);

      const tdWebhook = document.createElement("td");
      const webhookInput = document.createElement("input");
      webhookInput.type = "url";
      webhookInput.value = data.webhook || "";
      webhookInput.style.width = "100%";
      tdWebhook.appendChild(webhookInput);
      row.appendChild(tdWebhook);

      const tdImage = document.createElement("td");
      const imageInput = document.createElement("input");
      imageInput.type = "text";
      imageInput.value = data.imageUrl || "./seeker_vault/explorer.png";
      imageInput.placeholder = "画像URL";
      imageInput.style.width = "100%";
      tdImage.appendChild(imageInput);
      row.appendChild(tdImage);

      const tdSave = document.createElement("td");
      const saveBtn = document.createElement("button");
      saveBtn.textContent = "保存";
      saveBtn.addEventListener("click", async () => {
        await setDoc(docSnap.ref, {
          ...data,
          currentScenario: select.value,
          webhook: webhookInput.value,
          imageUrl: imageInput.value
        }, { merge: true });

        const scenarioName = scenarioMap.get(select.value) || select.value;
        showToast(`${data.name} を更新しました`);
      });
      tdSave.appendChild(saveBtn);
      row.appendChild(tdSave);

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("キャラクターマトリックス読み込みエラー:", error);
    showToast("キャラクター情報の読み込みに失敗しました");
  }
}

// シナリオ作成
const createBtn = document.getElementById("create-scenario");
createBtn.addEventListener("click", async () => {
  const input = document.getElementById("new-scenario-name");
  const name = input.value.trim();
  if (!name) return showToast("シナリオ名を入力してください");

  const ref = doc(collection(db, "scenarios"));
  await setDoc(ref, { name, createdAt: new Date().toISOString() });
  input.value = "";
  await loadScenarios();
  await loadCharacterMatrix();
  showToast(`シナリオ「${name}」を追加しました`);
});

window.addEventListener("DOMContentLoaded", () => {
  (async () => {
    try {
      await loadScenarios();
      await loadCharacterMatrix();
    } catch (error) {
      console.error("初期化エラー:", error);
      showToast("初期化中にエラーが発生しました");
    }
  })();
});