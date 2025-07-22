// ✅ Firebase 初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import { showToast } from "./utils.js";

// --- 初期化 ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const provider = new GoogleAuthProvider();

// --- 認証 ---
function handleAuthState(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await callback();
      } catch (e) {
        console.error("コールバック実行エラー:", e);
        showToast("ページの初期化に失敗しました。");
      }
    } else {
      // 未ログインの場合はログインを促す
    }
  });
}

// --- データ読み込み & テーブル描画 ---

async function loadPlayerTable() {
  const tbody = document.querySelector("#player-table tbody");
  tbody.innerHTML = "";
  const snapshot = await getDocs(collection(db, "players"));

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const playerId = docSnap.id;
    const row = createRow(playerId, data.name, data.discordUserId, "players");
    tbody.appendChild(row);
  });
}

async function loadKpTable() {
  const tbody = document.querySelector("#kp-table tbody");
  tbody.innerHTML = "";
  const snapshot = await getDocs(collection(db, "kpUsers"));

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const kpId = docSnap.id;
    const row = createRow(kpId, data.name, data.discordUserId, "kpUsers");
    tbody.appendChild(row);
  });
}

function createRow(id, name, discordUserId, collectionName) {
  const row = document.createElement("tr");

  // Name
  const tdName = document.createElement("td");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = name || "";
  tdName.appendChild(nameInput);
  row.appendChild(tdName);

  // ID
  const tdId = document.createElement("td");
  tdId.textContent = id;
  tdId.classList.add("id-cell");
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "📋";
  copyBtn.classList.add("copy-btn");
  copyBtn.title = "IDをコピー";
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(id);
    showToast("IDをコピーしました");
  };
  tdId.appendChild(copyBtn);
  row.appendChild(tdId);

  // Discord User ID
  const tdDiscordId = document.createElement("td");
  const discordIdInput = document.createElement("input");
  discordIdInput.type = "text";
  discordIdInput.value = discordUserId || "";
  tdDiscordId.appendChild(discordIdInput);
  row.appendChild(tdDiscordId);

  // Actions
  const tdSave = document.createElement("td");
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "保存";
  saveBtn.addEventListener("click", async () => {
    const newName = nameInput.value.trim();
    const newDiscordId = discordIdInput.value.trim();
    if (!newName) {
      showToast("名前は必須です。");
      return;
    }
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        name: newName,
        discordUserId: newDiscordId,
      });
      showToast(`${newName} の情報を更新しました`);
    } catch (error) {
      console.error("更新エラー:", error);
      showToast("更新に失敗しました。");
    }
  });
  tdSave.appendChild(saveBtn);
  row.appendChild(tdSave);

  return row;
}


// --- イベントリスナー設定 ---

function setupEventListeners() {
  // Googleログイン
  document.getElementById("googleLoginBtn").addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Googleログインエラー:", error);
      showToast("Googleログインに失敗しました。");
    }
  });

  // プレイヤー作成
  document.getElementById("createPlayerBtn").addEventListener("click", async () => {
    const nameInput = document.getElementById("newPlayerName");
    const discordIdInput = document.getElementById("newPlayerDiscordId");
    const name = nameInput.value.trim();
    const discordUserId = discordIdInput.value.trim();

    if (!name) {
      showToast("プレイヤー名を入力してください");
      return;
    }

    const playerId = crypto.randomUUID();
    try {
      await setDoc(doc(db, "players", playerId), {
        name: name,
        discordUserId: discordUserId,
        createdAt: new Date().toISOString(),
      });
      showToast(`プレイヤー「${name}」を作成しました`);
      nameInput.value = "";
      discordIdInput.value = "";
      await loadPlayerTable(); // テーブルを再読み込み
    } catch (error) {
      console.error("プレイヤー作成失敗:", error);
      showToast("プレイヤー作成に失敗しました");
    }
  });

  // KP作成
  document.getElementById("createKpBtn").addEventListener("click", async () => {
    const nameInput = document.getElementById("newKpName");
    const discordIdInput = document.getElementById("newKpDiscordId");
    const name = nameInput.value.trim();
    const discordUserId = discordIdInput.value.trim();

    if (!name) {
      showToast("KP名を入力してください");
      return;
    }

    const kpId = crypto.randomUUID();
    try {
      await setDoc(doc(db, "kpUsers", kpId), {
        name: name,
        discordUserId: discordUserId,
        createdAt: new Date().toISOString(),
      });
      showToast(`KP「${name}」を作成しました`);
      nameInput.value = "";
      discordIdInput.value = "";
      await loadKpTable(); // テーブルを再読み込み
    } catch (error) {
      console.error("KP作成失敗:", error);
      showToast("KP作成に失敗しました");
    }
  });
}

// --- 初期化処理 ---

async function initAdminPage() {
  console.log("🚀 管理者ページを初期化します...");
  await Promise.all([loadPlayerTable(), loadKpTable()]);
  setupEventListeners();
  console.log("✅ 初期化完了");
}

// --- DOM読み込み完了後 ---
window.addEventListener("DOMContentLoaded", () => {
  handleAuthState(initAdminPage);
});