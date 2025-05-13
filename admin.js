import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  getDocs,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { showToast } from "./utils.js";

// Firebase初期化
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

// シナリオ一覧取得
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

// キャラ一覧表示
async function loadCharacterMatrix() {
  const tbody = document.querySelector("#character-matrix tbody");
  tbody.innerHTML = "";

  try {
    const snapshot = await getDocs(collectionGroup(db, "list"));
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const playerId = docSnap.ref.path.split("/")[1];
      const row = document.createElement("tr");

      // プレイヤーID
      const tdPlayer = document.createElement("td");
      tdPlayer.textContent = playerId;
      row.appendChild(tdPlayer);

      // キャラ名
      const tdChar = document.createElement("td");
      tdChar.textContent = data.name || "No Name";
      row.appendChild(tdChar);

      // シナリオ選択
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

      // Webhook入力
      const tdWebhook = document.createElement("td");
      const webhookInput = document.createElement("input");
      webhookInput.type = "url";
      webhookInput.value = data.webhook || "";
      webhookInput.style.width = "100%";
      tdWebhook.appendChild(webhookInput);
      row.appendChild(tdWebhook);

      // 画像URL入力
      const tdImage = document.createElement("td");
      const imageInput = document.createElement("input");
      imageInput.type = "text";
      imageInput.value = data.imageUrl || "./seeker_vault/explorer.png";
      imageInput.placeholder = "画像URL";
      imageInput.style.width = "100%";
      tdImage.appendChild(imageInput);
      row.appendChild(tdImage);

      // 保存ボタン
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
    console.error("キャラ読み込みエラー:", error);
    showToast("キャラクター情報の読み込みに失敗しました");
  }
}

// 初期化処理
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

  // キャラクター作成ボタン
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
      await loadCharacterMatrix();
    } catch (error) {
      console.error("キャラ作成エラー:", error);
      showToast("作成に失敗しました");
    }
  });

  // シナリオ作成ボタン
  document.getElementById("create-scenario").addEventListener("click", async () => {
    const input = document.getElementById("new-scenario-name");
    const name = input.value.trim();
    if (!name) return showToast("シナリオ名を入力してください");

    try {
      const ref = doc(collection(db, "scenarios"));
      await setDoc(ref, { name, createdAt: new Date().toISOString() });
      input.value = "";
      await loadScenarios();
      await loadCharacterMatrix();
      showToast(`シナリオ「${name}」を追加しました`);
    } catch (error) {
      console.error("シナリオ作成エラー:", error);
      showToast("シナリオ作成に失敗しました");
    }
  });

  // KP登録ボタン
  document.getElementById("registerKP").addEventListener("click", async () => {
    const nameInput = document.getElementById("kpName");
    const resultDiv = document.getElementById("kpResult");
    const name = nameInput.value.trim();

    if (!name) {
      showToast("KP名を入力してください");
      return;
    }

    try {
      const kpId = crypto.randomUUID();
      const ref = doc(db, "users", kpId);
      await setDoc(ref, {
        name: name,
        createdAt: new Date().toISOString()
      });

      resultDiv.innerHTML = `
        <p><strong>KP「${name}」を登録しました！</strong></p>
        <p>KP専用URL: <code>kp.html?kpId=${kpId}</code></p>
        <button onclick="navigator.clipboard.writeText('kp.html?kpId=${kpId}')">コピー</button>
      `;

      nameInput.value = "";
      showToast("KPを登録しました");
    } catch (error) {
      console.error("KP登録エラー:", error);
      showToast("KP登録に失敗しました");
    }
  });
});
