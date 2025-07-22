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
  updateDoc,
  deleteDoc,
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
const playerNames = new Map();

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
  playerNames.clear();
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const playerId = docSnap.id;
    playerNames.set(playerId, data.name);
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

async function loadScenarioTable() {
    const tbody = document.querySelector("#scenario-table tbody");
    tbody.innerHTML = "";
    const snapshot = await getDocs(collection(db, "scenarios"));

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const scenarioId = docSnap.id;
        const row = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.textContent = data.name || "（名称未設定）";
        row.appendChild(tdName);

        const tdId = document.createElement("td");
        tdId.textContent = scenarioId;
        tdId.classList.add("id-cell");
        row.appendChild(tdId);

        const tdActions = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "削除";
        deleteBtn.addEventListener("click", async () => {
            if (!confirm(`シナリオ「${data.name}」を本当に削除しますか？`)) return;
            try {
                await deleteDoc(doc(db, "scenarios", scenarioId));
                row.remove();
                showToast("シナリオを削除しました");
            } catch (e) {
                console.error("シナリオ削除エラー:", e);
                showToast("削除に失敗しました");
            }
        });
        tdActions.appendChild(deleteBtn);
        row.appendChild(tdActions);

        tbody.appendChild(row);
    });
}

async function loadCharacterTable() {
    const tbody = document.querySelector("#character-table tbody");
    tbody.innerHTML = "";
    const snapshot = await getDocs(collectionGroup(db, "list"));

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const pathParts = docSnap.ref.path.split("/");
        const playerId = pathParts.length > 1 ? pathParts[1] : null;
        const playerName = playerNames.get(playerId) || "（不明なプレイヤー）";

        const row = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.textContent = data.name || "（名称未設定）";
        row.appendChild(tdName);

        const tdPlayer = document.createElement("td");
        tdPlayer.textContent = playerName;
        row.appendChild(tdPlayer);

        const tdActions = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "削除";
        deleteBtn.addEventListener("click", async () => {
            if (!confirm(`キャラクター「${data.name}」を本当に削除しますか？`)) return;
            try {
                await deleteDoc(docSnap.ref);
                row.remove();
                showToast("キャラクターを削除しました");
            } catch (e) {
                console.error("キャラクター削除エラー:", e);
                showToast("削除に失敗しました");
            }
        });
        tdActions.appendChild(deleteBtn);
        row.appendChild(tdActions);

        tbody.appendChild(row);
    }
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
  const tdActions = document.createElement("td");
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
  tdActions.appendChild(saveBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "削除";
  deleteBtn.style.marginLeft = "8px";
  deleteBtn.addEventListener("click", async () => {
    if (!confirm(`「${name}」を本当に削除しますか？この操作は元に戻せません。`)) {
      return;
    }
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      row.remove();
      showToast(`「${name}」を削除しました`);
    } catch (error) {
      console.error("削除エラー:", error);
      showToast("削除に失敗しました。");
    }
  });
  tdActions.appendChild(deleteBtn);
  row.appendChild(tdActions);

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
  await Promise.all([
    loadPlayerTable(), 
    loadKpTable(),
  ]);
  // プレイヤー名のMapが作成された後にキャラクターを読み込む
  await loadCharacterTable(); 
  await loadScenarioTable();

  setupEventListeners();
  console.log("✅ 初期化完了");
}

// --- DOM読み込み完了後 ---
window.addEventListener("DOMContentLoaded", () => {
  handleAuthState(initAdminPage);
});
