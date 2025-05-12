// ✅ admin.js（画像URLの編集追加版）
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  collectionGroup
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
    console.log("loadScenarios() 開始");
    const snapshot = await getDocs(collection(db, "scenarios"));
    console.log("シナリオデータ取得成功:", snapshot);
    scenarioMap.clear();
    snapshot.forEach(docSnap => {
      scenarioMap.set(docSnap.id, docSnap.data().name);
      console.log("シナリオデータ処理:", docSnap.id, docSnap.data().name);
    });
    console.log("loadScenarios() 完了", scenarioMap);
  } catch (error) {
    console.error("シナリオ読み込みエラー:", error);
    showToast("シナリオの読み込みに失敗しました");
  }
}

async function loadCharacterMatrix() {
  const tbody = document.querySelector("#character-matrix tbody");
  tbody.innerHTML = "";

  try {
    console.log("oadCharacterMatrix() 開始");
    const snapshot = await getDocs(collectionGroup(db, "list"));
    console.log("キャラクターデータ取得成功:", snapshot);
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const playerId = docSnap.ref.path.split("/")[1];
      console.log("キャラクターデータ処理:", playerId, data);
      const row = document.createElement("tr");

      const tdPlayer = document.createElement("td");
      tdPlayer.textContent = playerId;
      console.log("tdPlayer:", playerId);

      const tdChar = document.createElement("td");
      tdChar.textContent = data.name || "No Name";
      console.log("tdChar:", data.name);

      const tdScenario = document.createElement("td");
      const select = document.createElement("select");
      scenarioMap.forEach((name, id) => {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = name;
        if (data.currentScenario === id) opt.selected = true;
        select.appendChild(opt);
      });

      const tdWebhook = document.createElement("td");
      const webhookInput = document.createElement("input");
      webhookInput.type = "url";
      webhookInput.value = data.webhook || "";
      webhookInput.style.width = "100%";

      const tdImage = document.createElement("td");
      const imageInput = document.createElement("input");
      imageInput.type = "text";
      imageInput.value = data.imageUrl || "./seeker_vault/explorer.png";
      imageInput.placeholder = "画像URL";
      imageInput.style.width = "100%";

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
        showToast(`${data.name} を「${scenarioName}」に保存しました`);
      });
      tdSave.appendChild(saveBtn);

      row.appendChild(tdPlayer);
      row.appendChild(tdChar);
      row.appendChild(tdScenario);
      row.appendChild(tdWebhook);
      row.appendChild(tdImage);
      row.appendChild(tdSave);
      tbody.appendChild(row);
      console.log("行が追加されました");
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

