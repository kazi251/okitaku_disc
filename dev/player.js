import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc , deleteField, updateDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FIREBASE_ROLL_WEBHOOK_URL = "https://us-central1-kazi251-trpg-workers-64def.cloudfunctions.net/rollWebhook";
const FIREBASE_SAY_WEBHOOK_URL = "https://us-central1-kazi251-trpg-workers-64def.cloudfunctions.net/sayWebhook"; 

const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get("playerId");

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(playerId)) {
  alert("無効なPlayerIDです。URLを確認してください。");
  throw new Error("Invalid PlayerID");
}

let currentCharacterId = null;
let currentCharacterName = "探索者 太郎"
let currentCharacterData = {};

// --- DOM要素のキャッシュ ---
const elements = {
    characterSelect: document.getElementById("character-select"),
    explorerImage: document.getElementById("explorer-image"),
    characterName: document.getElementById("character-name"),
    faceSelect: document.getElementById("face-select"),
    // ... 他にも頻繁にアクセスする要素があれば追加
};

function updateDisplay() {
    const sanMax = document.getElementById("san-max-input").value;
    document.getElementById("san-indef").textContent = Math.floor(sanMax * 0.8);

    const other1Name = document.getElementById("other1-name").value;
    const other2Name = document.getElementById("other2-name").value;

    document.getElementById("other1-label").textContent = other1Name || "その他";
    document.getElementById("other2-label").textContent = other2Name || "その他";
}

function updateChatPalette() {
    const chatPaletteInput = document.getElementById("chat-palette-input");
    if (!chatPaletteInput) return;
    window.chatPalette = chatPaletteInput.value.split('\n').filter(line => line.trim() !== '');
}

document.getElementById("chat-palette-input").addEventListener("input", updateChatPalette);

document.getElementById("dice-command").addEventListener("input", showSuggestions);

function showSuggestions() {
    const input = document.getElementById("dice-command").value.toLowerCase();
    const suggestions = document.getElementById("suggestions");
    suggestions.innerHTML = "";
    if (!input || !window.chatPalette) {
        suggestions.style.display = "none";
        return;
    }
    const matches = window.chatPalette.filter(line => line.toLowerCase().includes(input));
    if (matches.length === 0) {
        suggestions.style.display = "none";
        return;
    }
    matches.forEach(match => {
        const div = document.createElement("div");
        div.textContent = match;
        div.onclick = () => {
            document.getElementById("dice-command").value = match;
            suggestions.style.display = "none";
        };
        suggestions.appendChild(div);
    });
    suggestions.style.display = "block";
}

async function getSelectedWebhookUrl() {
  const select = document.getElementById("say-webhook-select");
  const threadId = select?.value;
  const scenarioId = currentCharacterData?.scenarioId;

  if (!threadId || !scenarioId) return null;

  try {
    const threadRef = doc(db, "scenarios", scenarioId, "threads", threadId);
    const threadSnap = await getDoc(threadRef);
    if (threadSnap.exists()) {
      return threadSnap.data().webhookUrl || null;
    }
  } catch (e) {
    console.error("Webhook取得失敗:", e);
  }

  return null;
}

async function sendSay() {
    const content = document.getElementById("say-content").value.trim();
    if (!content) return;
    const avatarUrl = elements.explorerImage.src; // 現在表示されている画像URLを使用
    const webhook = await getSelectedWebhookUrl();
    
    if (!webhook) {
      showToast("Webhookが設定されていません");
      return;
    }

    try {
        const response = await fetch(FIREBASE_SAY_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: currentCharacterName, message: content, avatar_url: avatarUrl , webhook: webhook })
        });
        if (response.ok) {
            document.getElementById("say-content").value = "";
            showToast("セリフを送信しました！");
        } else {
            const errorText = await response.text();
            throw new Error(`送信失敗: ${response.status} ${errorText}`);
        }
    } catch (error) {
        console.error(`セリフ送信エラー: ${error.message}`);
    }
}

function replaceVariables(text) {
  if (!currentCharacterData) return text;

  const variables = {
    SAN: currentCharacterData.san,
  };

  return text.replace(/\{([^}]+)\}/g, (_, key) => {
    return variables[key] !== undefined ? variables[key] : `{${key}}`;
  });
}

async function rollDice() {
  const command = replaceVariables(
    document.getElementById("dice-command").value.trim()
  );
  if (!command) return;

  const userName = currentCharacterName;
  const avatarUrl = elements.explorerImage.src;
  const webhook = await getSelectedWebhookUrl();
  if (!webhook) {
    showToast("Webhookが設定されていません");
    return;
  }

  const workerUrl = new URL(FIREBASE_ROLL_WEBHOOK_URL);
  workerUrl.searchParams.append("command", command);
  workerUrl.searchParams.append("name", userName);
  workerUrl.searchParams.append("avatar_url", avatarUrl);
  workerUrl.searchParams.append("webhook", webhook);

  try {
    const response = await fetch(workerUrl.toString());
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
      document.getElementById("dice-command").value = "";
    } else {
      displayText += "\nエラー: " + result.reason;
    }
    document.getElementById("result").innerHTML = displayText.replace(/\n/g, "<br>");
  } catch (error) {
    document.getElementById("result").innerText = "⚠️ 通信エラーが発生しました";
    console.error("Fetch error:", error);
  }
}

async function loadCharacterList() {
  const snapshot = await getDocs(collection(db, "characters", playerId, "list"));
  elements.characterSelect.innerHTML = "";
  snapshot.forEach(docSnap => {
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = docSnap.data().name;
    elements.characterSelect.appendChild(opt);
  });
  if (elements.characterSelect.options.length > 0) {
    currentCharacterId = elements.characterSelect.options[0].value;
    await loadCharacterData(currentCharacterId);
  }
}

async function loadCharacterData(charId) {
  if (!charId) return;
  const ref = doc(db, "characters", playerId, "list", charId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    currentCharacterId = charId;
    currentCharacterData = data;
    currentCharacterName = data.name || "探索者 太郎";
    elements.characterName.textContent = currentCharacterName;

    // ... (フォームへのデータ反映は省略) ...

    // 表情差分の読み込みとUI生成
    updateFaceUI(data.faceImages, data.imageUrl);

    showToast("キャラクターを読み込みました！");
  } catch (error) {
    console.error("キャラクター読み込み失敗:", error);
    showToast("読み込みに失敗しました");
  }
}

// 表情UIの更新
function updateFaceUI(faceImages, defaultImageUrl) {
    const faceSelect = elements.faceSelect;
    const faceListContainer = document.getElementById("face-list");
    faceSelect.innerHTML = "";
    faceListContainer.innerHTML = "";

    const faces = { '通常': defaultImageUrl, ...(faceImages || {}) };

    for (const [name, url] of Object.entries(faces)) {
        // ドロップダウンの生成
        const option = document.createElement("option");
        option.value = url;
        option.textContent = name;
        faceSelect.appendChild(option);

        // 管理リストの生成
        const listItem = document.createElement("div");
        listItem.className = "face-list-item";
        listItem.innerHTML = `
            <span>${name}</span>
            ${name !== '通常' ? '<button class="delete-face-button" data-face-name="' + name + '">削除</button>' : ''}
        `;
        faceListContainer.appendChild(listItem);
    }

    // 画像をデフォルト（通常）に設定
    elements.explorerImage.src = defaultImageUrl || './seeker_vault/default.png';
}

// 表情の切り替え
function switchFace(event) {
    const selectedUrl = event.target.value;
    if (selectedUrl) {
        elements.explorerImage.src = selectedUrl;
    }
}

// 新しい表情の追加
async function addFace() {
    const nameInput = document.getElementById("new-face-name");
    const fileInput = document.getElementById("new-face-image-upload");
    const faceName = nameInput.value.trim();
    const file = fileInput.files[0];

    if (!faceName || !file) {
        showToast("表情名とファイルを選択してください。");
        return;
    }

    showToast('画像アップロード中...');
    try {
        const imageUrl = await uploadFile(file); // uploadFileは後で定義
        const charRef = doc(db, "characters", playerId, "list", currentCharacterId);
        await updateDoc(charRef, {
            [`faceImages.${faceName}`]: imageUrl
        });

        showToast(`表情「${faceName}」を追加しました。`);
        nameInput.value = "";
        fileInput.value = "";
        loadCharacterData(currentCharacterId); // 再読み込み
    } catch (error) {
        console.error("表情の追加に失敗:", error);
        showToast("表情の追加に失敗しました。");
    }
}

// 表情の削除
async function deleteFace(event) {
    if (!event.target.classList.contains('delete-face-button')) return;

    const faceName = event.target.dataset.faceName;
    if (!confirm(`表情「${faceName}」を削除しますか？`)) return;

    try {
        const charRef = doc(db, "characters", playerId, "list", currentCharacterId);
        await updateDoc(charRef, {
            [`faceImages.${faceName}`]: deleteField()
        });
        showToast(`表情「${faceName}」を削除しました。`);
        loadCharacterData(currentCharacterId); // 再読み込み
    } catch (error) {
        console.error("表情の削除に失敗:", error);
        showToast("表情の削除に失敗しました。");
    }
}

// ファイルアップロード汎用関数
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('image', file);
    const workerUrl = 'https://imageworker.kai-chan-tsuru.workers.dev/';

    const response = await fetch(workerUrl, {
        method: 'POST',
        body: formData,
    });

    if (response.ok) {
        const result = await response.json();
        return result.imageUrl;
    } else {
        throw new Error('アップロード失敗: ' + response.statusText);
    }
}

// ... (saveCharacterData, savePaletteOnly, etc. は省略) ...

window.addEventListener("DOMContentLoaded", () => {
  // ... (既存のイベントリスナーは省略) ...

  // 新しいイベントリスナー
  elements.faceSelect.addEventListener("change", switchFace);
  document.getElementById("add-face-button").addEventListener("click", addFace);
  document.getElementById("face-list").addEventListener("click", deleteFace);

  document.getElementById("new-face-image-select-button").addEventListener("click", () => {
    document.getElementById("new-face-image-upload").click();
  });

  loadCharacterList();
});
