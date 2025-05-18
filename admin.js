// ✅ Firebase 初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

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

const auth = getAuth();
const provider = new GoogleAuthProvider();

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("ログイン済み:", user.displayName);
    initAdminPage(); // ログイン済みなら初期化
  } else {
    // ログインしていない場合はログインを促す
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log("ログイン成功:", result.user.displayName);
        initAdminPage(); // 成功後に初期化
      })
      .catch((error) => {
        console.error("ログインエラー:", error);
        alert("ログインに失敗しました。");
      });
  }
});


// ✅ 各種ロード関数
async function loadScenarios() {
  const snapshot = await getDocs(collection(db, "scenarios"));
  scenarioMap.clear();
  snapshot.forEach(docSnap => {
    scenarioMap.set(docSnap.id, docSnap.data().name);
  });
}

async function loadKpTable() {
  const tbody = document.querySelector("#kp-matrix tbody");
  tbody.innerHTML = "";

  const snapshot = await getDocs(collection(db, "kpUsers"));
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const kpId = docSnap.id;

    const row = document.createElement("tr");

    // KP名
    const tdName = document.createElement("td");
    tdName.textContent = data.name || "No Name";
    row.appendChild(tdName);

    // KP専用URL
    const tdUrl = document.createElement("td");
    const url = `kp.html?kpId=${kpId}`;
    const code = document.createElement("code");
    code.textContent = url;
    tdUrl.appendChild(code);
    row.appendChild(tdUrl);

    // 担当シナリオ名
    const tdScenario = document.createElement("td");
    const scenarioId = data.scenarios;
    tdScenario.textContent = scenarioMap.get(scenarioId) || "（未設定）";
    row.appendChild(tdScenario);

    tbody.appendChild(row);
  });
}

async function fetchPlayerName(playerId) {
  const playerDocRef = doc(db, "players", playerId);
  const playerDocSnap = await getDoc(playerDocRef);
  return playerDocSnap.exists() ? playerDocSnap.data().name || "(名前未設定)" : "(名前未設定)";
}


async function loadCharacterMatrix() {
  const tbody = document.querySelector("#character-matrix tbody");
  tbody.innerHTML = "";

  const snapshot = await getDocs(collectionGroup(db, "list"));
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const pathParts = docSnap.ref.path.split("/");
    // players/{playerId}/list/{characterId} の形式なら要素数は4
    if (pathParts.length >= 2 && pathParts[0] === "characters" && pathParts[2] === "list") {
      const playerId = pathParts[1];
      const row = document.createElement("tr");

    // プレイヤーID
    const tdPlayer = document.createElement("td");
    tdPlayer.textContent = playerId;
    row.appendChild(tdPlayer);

    // プレイヤー名
    let playerName = "(未設定)";
    if (playerId) {
      playerName = await fetchPlayerName(playerId);
    }
    const tdName = document.createElement("td");
    tdName.textContent = playerName;
    row.appendChild(tdName);

    // キャラクター名
    const tdChar = document.createElement("td");
    tdChar.textContent = data.name || "No Name";
    row.appendChild(tdChar);

    // シナリオ選択
    const tdScenario = document.createElement("td");
    const select = document.createElement("select");

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "（未設定）";
    select.appendChild(defaultOption);

    scenarioMap.forEach((name, id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = name;
      if (data.currentScenario === id) opt.selected = true;
      select.appendChild(opt);
    });

    if (!data.currentScenario) {
      select.value = "";
    }

    tdScenario.appendChild(select);
    row.appendChild(tdScenario);

    // Webhook
    const tdWebhook = document.createElement("td");
    const webhookInput = document.createElement("input");
    webhookInput.type = "url";
    webhookInput.value = data.webhook || "";
    webhookInput.style.width = "100%";
    tdWebhook.appendChild(webhookInput);
    row.appendChild(tdWebhook);

    // 画像URL
    const tdImage = document.createElement("td");
    const imageInput = document.createElement("input");
    imageInput.type = "text";
    imageInput.value = data.imageUrl || "./seeker_vault/default.png";
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
        currentScenario: select.value || null, 
        webhook: webhookInput.value,
        imageUrl: imageInput.value
      }, { merge: true });
      showToast(`${data.name} を更新しました`);
    });
    tdSave.appendChild(saveBtn);

    row.appendChild(tdSave);

      tbody.appendChild(row);
    } else {
      // 意図しないパスのドキュメントはスキップ
      const row = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7; // テーブルの列数に合わせて調整
      td.textContent = "（不正なデータ形式）";
      row.appendChild(td);
      tbody.appendChild(row);
    }
  }
}

async function loadPlayerList() {
  const select = document.getElementById("new-player-id");
  if (!select) return;

  select.innerHTML = ""; // 初期化
  const snapshot = await getDocs(collection(db, "players"));
  snapshot.forEach(doc => {
    const data = doc.data();
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = `${data.name}（${doc.id.slice(0, 8)}…）`;
    select.appendChild(option);
  });
}

async function initAdminPage() {
  console.log(firebase.auth().currentUser?.uid);
  try {
    await loadScenarios();
  } catch (e) {
    console.error("loadScenariosで失敗:", e);
  }

  try {
    await loadCharacterMatrix();
  } catch (e) {
    console.error("loadCharacterMatrixで失敗:", e);
  }

  try {
    await loadPlayerList();
  } catch (e) {
    console.error("loadPlayerListで失敗:", e);
  }

  await loadKpTable();
  setupEventListeners();
  loadPlayerList(); 
}

// ✅ イベント登録
function setupEventListeners() {
  const createCharBtn = document.getElementById("create-character");
  const createScenBtn = document.getElementById("create-scenario");
  const registerKPBtn = document.getElementById("registerKP");
  const createPlayerBtn = document.getElementById("createPlayerBtn");

  // プレイヤー作成
  createPlayerBtn?.addEventListener("click", async () => {
    const nameInput = document.getElementById("newPlayerName");
    const resultDiv = document.getElementById("playerResult");
    const name = nameInput.value.trim();

    if (!name) {
      showToast("プレイヤー名を入力してください");
      return;
    }

    const playerId = crypto.randomUUID();

    try {
      const ref = doc(db, "players", playerId);
      await setDoc(ref, {
        name: name,
        createdAt: new Date().toISOString()
      });

      // 表示とコピー
      resultDiv.innerHTML = `
        <p><strong>プレイヤー「${name}」を登録しました！</strong></p>
        <p>ログイン用URL: <code>index.html?playerId=${playerId}</code></p>
        <button onclick="navigator.clipboard.writeText('index.html?playerId=${playerId}')">コピー</button>
      `;
      nameInput.value = "";
      showToast("プレイヤーを登録しました");

      await loadCharacterMatrix();
      await loadPlayerList(); 

      await loadCharacterMatrix(); // 必要であれば
    } catch (error) {
      console.error("プレイヤー作成失敗:", error);
      showToast("プレイヤー作成に失敗しました");
    }
  });

    // KP登録
  registerKPBtn?.addEventListener("click", async () => {
    const nameInput = document.getElementById("kpName");
    const resultDiv = document.getElementById("kpResult");
    const name = nameInput.value.trim();
    if (!name) {
      showToast("KP名を入力してください");
      return;
    }

    try {
      const kpId = crypto.randomUUID();
      const ref = doc(db, "kpUsers", kpId);
      await setDoc(ref, {
        name: name,
        createdAt: new Date().toISOString()
      });

      resultDiv.innerHTML = `
        <p><strong>KP「${name}」を登録しました</strong></p>
        <p>KP専用URL: <code>kp.html?kpId=${kpId}</code></p>
        <button onclick="navigator.clipboard.writeText('kp.html?kpId=${kpId}')">コピー</button>
      `;
      nameInput.value = "";
      showToast("KPを登録しました");

      await loadCharacterMatrix();
    } catch (error) {
      console.error("KP登録エラー:", error);
      showToast("KP登録に失敗しました");
    }
  });

  // シナリオ作成
  createScenBtn?.addEventListener("click", async () => {
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

  // キャラ作成
  createCharBtn?.addEventListener("click", async () => {
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
      console.error("キャラ作成失敗:", error);
      showToast("作成に失敗しました");
    }
  });
}


// ✅ 初期化トリガー
window.addEventListener("DOMContentLoaded", initAdminPage);
