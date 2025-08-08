import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc , deleteField } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FIREBASE_ROLL_WEBHOOK_URL = "https://us-central1-kazi251-trpg-workers-64def.cloudfunctions.net/rollWebhook";
const FIREBASE_SAY_WEBHOOK_URL = "https://us-central1-kazi251-trpg-workers-64def.cloudfunctions.net/sayWebhook"; 
// const FIREBASE_ROLL_WEBHOOK_URL = "https://rollworker.kai-chan-tsuru.workers.dev/";
// const FIREBASE_SAY_WEBHOOK_URL = "https://sayworker.kai-chan-tsuru.workers.dev/";

const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get("playerId");

// UUID v4 形式をチェック
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(playerId)) {
  alert("無効なPlayerIDです。URLを確認してください。");
  throw new Error("Invalid PlayerID");
}

let currentCharacterId = null;
let currentCharacterName = "探索者 太郎"
let currentCharacterData = {};

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

// Webhook URLを取得する関数
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
    const avatarUrl = document.getElementById("explorer-image").src; // 現在表示されている画像URLを使用
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

// SAN値チェック用変数処理
function replaceVariables(text) {
  if (!currentCharacterData) return text;

  const variables = {
    SAN: currentCharacterData.san,
    // ここに必要があれば今後変数化したい値を入れる
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
  const avatarUrl = document.getElementById("explorer-image").src;
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

      // 結果を1行ずつ処理して絵文字を付ける
      const lines = resultText.split("\n").map(line => {
        if (line.includes("致命的失敗")) return line + " 💀";
        else if (line.includes("失敗")) return line + " 🥶";
        else if (line.includes("決定的成功/スペシャル")) return line + " 🎉🎊✨";
        else if (line.includes("スペシャル") || line.includes("成功")) return line + " 😊";
        else return line;
      });

      const decoratedText = lines.join("\n");

      showToast("ダイスを振りました！");
      displayText += "\n" + decoratedText;
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
  const characterSelect = document.getElementById("character-select");
  characterSelect.innerHTML = "";
  snapshot.forEach(docSnap => {
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = docSnap.data().name;
    characterSelect.appendChild(opt);
  });
  if (characterSelect.options.length > 0) {
    currentCharacterId = characterSelect.options[0].value;
    await loadCharacterData(currentCharacterId);
  }
}

async function loadCharacterData(charId) {
  if (!charId) {
    console.warn("charIdが未指定です");
    return;
  }

  const ref = doc(db, "characters", playerId, "list", charId);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.warn("指定されたキャラクターが存在しません:", charId);
      return;
    }

    const data = snap.data();
    currentCharacterId = charId;
    currentCharacterData = data; // webhook なども含む

    currentCharacterName = data.name || "探索者 太郎";
    const nameDisplay = document.getElementById("character-name");
    if (nameDisplay) {
      nameDisplay.textContent = currentCharacterName;
    }

    // 進行中のシナリオ名を取得
    const scenarioNameEl = document.getElementById("current-scenario-name");
    const scenarioId = data.scenarioId;

    if (scenarioNameEl) {
      if (scenarioId) {
        try {
          const scenarioSnap = await getDoc(doc(db, "scenarios", scenarioId));
          if (scenarioSnap.exists()) {
            scenarioNameEl.textContent = scenarioSnap.data().name || "(名称未設定)";
          } else {
            scenarioNameEl.textContent = "(シナリオ未登録)";
          }
        } catch (e) {
          console.warn("シナリオ名の取得に失敗:", e);
          scenarioNameEl.textContent = "(取得失敗)";
        }
      } else {
        scenarioNameEl.textContent = "(未割当)";
      }
    }

    // 各フォームにデータを反映
    document.getElementById("hp-input").value = data.hp || "";
    document.getElementById("hp-max-input").value = data.hpMax || "";
    document.getElementById("mp-input").value = data.mp || "";
    document.getElementById("mp-max-input").value = data.mpMax || "";
    document.getElementById("san-input").value = data.san || "";
    document.getElementById("san-max-input").value = data.sanMax || "";
    document.getElementById("other-input").value = data.other || "";
    document.getElementById("other2-input").value = data.other2 || "";
    document.getElementById("other1-name").value = data.other1Name || "";
    document.getElementById("other2-name").value = data.other2Name || "";
    document.getElementById("memo-input").value = data.memo || "";
    document.getElementById("chat-palette-input").value = data.palette || "";

    // 画像の設定（エラー時に fallback 画像を設定）
    const imageElement = document.getElementById("explorer-image");
    const imageUrl = data.imageUrl;
    imageElement.src = imageUrl && imageUrl.trim() !== ""
      ? imageUrl
      : "./seeker_vault/default.png";
    imageElement.onerror = () => {
      imageElement.src = "./seeker_vault/default.png";
    };

    // 表示側の反映
    document.getElementById("hp").textContent = data.hp || "";
    document.getElementById("hp-max").textContent = data.hpMax || "";
    document.getElementById("mp").textContent = data.mp || "";
    document.getElementById("mp-max").textContent = data.mpMax || "";
    document.getElementById("san").textContent = data.san || "";
    document.getElementById("san-max").textContent = data.sanMax || "";
    document.getElementById("san-indef").textContent = Math.floor((data.sanMax || 0) * 0.8);
    document.getElementById("other").textContent = data.other || "-";
    document.getElementById("other2").textContent = data.other2 || "-";
    document.getElementById("other1-label").textContent = data.other1Name || "その他";
    document.getElementById("other2-label").textContent = data.other2Name || "その他";
    document.getElementById("memo").textContent = data.memo || "-";

    // シナリオID入力欄にも反映
    const scenarioInput = document.getElementById("scenario-id-input");
    if (scenarioInput) {
      scenarioInput.value = data.scenarioId || "";
    }

    // Embedカラー入力欄にも反映
    const embedColorInput = document.getElementById("embed-color-input");
    if (embedColorInput) {
      embedColorInput.value = data.embedColor || "";
    }

    // Bot表示チェックボックスに反映
    const showInBotCheckbox = document.getElementById("show-in-bot-checkbox");
    if (showInBotCheckbox) {
      showInBotCheckbox.checked = data.showInBot === true; // boolean値として扱う
    }
    
    updateDisplay();
    updateChatPalette();

    // sayWebhookのセレクトを初期化
    const saySelect = document.getElementById("say-webhook-select");
    
    if (saySelect) {
      saySelect.innerHTML = "";

      const scenarioId = data.scenarioId;
      const sayWebhooks = data.sayWebhooks || [];
      const threadOptions = [];

      for (const threadId of sayWebhooks) {
        try {
          const threadRef = doc(db, "scenarios", scenarioId, "threads", threadId);
          const threadSnap = await getDoc(threadRef);

          if (threadSnap.exists()) {
            const threadData = threadSnap.data();
            const option = document.createElement("option");
            option.value = threadId;
            option.textContent = threadData.name || `スレッド ${threadId}`;
            saySelect.appendChild(option);
          } else {
            console.warn(`スレッドが見つかりません: ${threadId}`);
          }
        } catch (e) {
          console.warn(`スレッド情報取得失敗: ${threadId}`, e);
        }
      }

      // 名前で昇順にソート（日本語対応）
      threadOptions.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

      // ソート後に <option> を追加
      threadOptions.forEach(thread => {
        const option = document.createElement("option");
        option.value = thread.id;
        option.textContent = thread.name;
        saySelect.appendChild(option);
      });

      if (sayWebhooks.length > 0) {
        saySelect.value = sayWebhooks[0]; 
      }
    }

    // 表情UIを更新
    updateFaceUI(data.faceImages, data.imageUrl);

    showToast("キャラクターを読み込みました！");
  } catch (error) {
    console.error("キャラクター読み込み失敗:", error);
    showToast("読み込みに失敗しました");
  }
}

let isLegacySave = false;

async function saveCharacterData() {
  if (!currentCharacterId) return;

  try {
    const ref = doc(db, "characters", playerId, "list", currentCharacterId);

    const imageSrc = document.getElementById("explorer-image").src;
    const isDefaultImage = imageSrc.includes("default.png");
    const imageUrl = isDefaultImage ? undefined : imageSrc;

    const characterData = {
      name: document.getElementById("character-select").selectedOptions[0].text,
      hp: document.getElementById("hp-input").value,
      hpMax: document.getElementById("hp-max-input").value,
      mp: document.getElementById("mp-input").value,
      mpMax: document.getElementById("mp-max-input").value,
      san: document.getElementById("san-input").value,
      sanMax: document.getElementById("san-max-input").value,
      other: document.getElementById("other-input").value,
      other2: document.getElementById("other2-input").value,
      other1Name: document.getElementById("other1-name").value,
      other2Name: document.getElementById("other2-name").value,
      memo: document.getElementById("memo-input").value,
      embedColor: document.getElementById("embed-color-input").value.toUpperCase(), // 大文字に変換して保存
      showInBot: document.getElementById("show-in-bot-checkbox")?.checked || false, // Bot表示設定
      playerId: playerId, 
      updatedAt: new Date().toISOString()
    };

    if (currentCharacterData?.webhook) {
      characterData.webhook = currentCharacterData.webhook;
    }

    if (currentCharacterData?.scenarioId) {
      characterData.scenarioId = currentCharacterData.scenarioId;
    }

    if (imageUrl) {
      characterData.imageUrl = imageUrl;
    }
    await setDoc(ref, characterData, { merge: true });

    showToast("キャラクターを保存しました！");
    loadCharacterStatusOnly(characterData); // 保存直後に再反映！

    // Discord通知（パラメータ保存ボタンからの呼び出し時のみ）
    if (isLegacySave) {
      const hp = document.getElementById("hp-input").value;
      const hpMax = document.getElementById("hp-max-input").value;
      const mp = document.getElementById("mp-input").value;
      const mpMax = document.getElementById("mp-max-input").value;
      const san = document.getElementById("san-input").value;
      const sanMax = document.getElementById("san-max-input").value;
      const other1Name = document.getElementById("other1-name").value;
      const other2Name = document.getElementById("other2-name").value;
      const other = document.getElementById("other-input").value;
      const other2 = document.getElementById("other2-input").value;
      const memo = document.getElementById("memo-input").value;

      const message =
        `\`\`\`\n` +
        `HP: ${hp}/${hpMax} ` +
        `MP: ${mp}/${mpMax} ` +
        `SAN: ${san}/${sanMax}（不定:${Math.floor(sanMax * 0.8)}）\n` +
        `${other1Name || "その他1"}: ${other || "-"} ` +
        `${other2Name || "その他2"}: ${other2 || "-"}\n` +
        (memo ? `メモ: ${memo}` : "") + 
        `\`\`\``;

      const avatarUrl = imageSrc;
      const statusThreadId = currentCharacterData?.statusWebhook || null;
      let webhook = null;

      // statusWebhookが存在すれば対応するURLを取得
      if (statusThreadId && currentCharacterData?.scenarioId) {
        try {
          const threadRef = doc(db, "scenarios", currentCharacterData.scenarioId, "threads", statusThreadId);
          const threadSnap = await getDoc(threadRef);
          if (threadSnap.exists()) {
            webhook = threadSnap.data().webhookUrl || null;
          }
        } catch (error) {
          console.error("statusWebhookのURL取得失敗:", error);
        }
      }

      try {
        await fetch(FIREBASE_SAY_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: currentCharacterName,
            message,
            avatar_url: avatarUrl,
            webhook
          })
        });
      } catch (error) {
        console.error("Discord通知失敗:", error);
      }

      isLegacySave = false;
    }

  } catch (error) {
    console.error("キャラクター保存失敗:", error);
    showToast("保存に失敗しました");
  }

}

function savePaletteOnly() {
  if (!currentCharacterId) return;
  const ref = doc(db, "characters", playerId, "list", currentCharacterId);
  setDoc(ref, {
    palette: document.getElementById("chat-palette-input").value,
    playerId: playerId,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  showToast("チャットパレットを保存しました！");
  loadCharacterPaletteOnly({ palette: document.getElementById("chat-palette-input").value }); // 再反映
}

function saveNameOnly() {
  if (!currentCharacterId) {
    showToast("キャラクターが選択されていません");
    return;
  }

  const newName = document.getElementById("name-input").value.trim();
  if (!newName) {
    showToast("名前を入力してください");
    return;
  }

  const ref = doc(db, "characters", playerId, "list", currentCharacterId);
  setDoc(ref, {
    name: newName,
    playerId: playerId,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  showToast("名前を保存しました ✅");
}

async function saveEmbedColor() {
  if (!currentCharacterId) {
    showToast("キャラクターが選択されていません");
    return;
  }

  const embedColorInput = document.getElementById("embed-color-input");
  const newColor = embedColorInput.value.trim().toUpperCase();

  if (!newColor) {
    // 空の場合はFirestoreからフィールドを削除
    const ref = doc(db, "characters", playerId, "list", currentCharacterId);
    await setDoc(ref, {
      embedColor: deleteField(),
      playerId: playerId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    showToast("Embedカラーを削除しました ✅");
    return;
  }

  // HEXカラーコードの形式を検証 (6桁の英数字)
  if (!/^[0-9A-F]{6}$/.test(newColor)) {
    showToast("無効なHEXカラーコードです。例: FF0000");
    return;
  }

  const ref = doc(db, "characters", playerId, "list", currentCharacterId);
  await setDoc(ref, {
    embedColor: newColor,
    playerId: playerId,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  showToast("Embedカラーを保存しました ✅");
}

async function saveShowInBot() {
  if (!currentCharacterId) {
    showToast("キャラクターが選択されていません");
    return;
  }

  const showInBotCheckbox = document.getElementById("show-in-bot-checkbox");
  const showInBot = showInBotCheckbox?.checked || false;

  try {
    const ref = doc(db, "characters", playerId, "list", currentCharacterId);
    await setDoc(ref, {
      showInBot: showInBot,
      playerId: playerId, // セキュリティルール対策
      updatedAt: new Date().toISOString()
    }, { merge: true });

    showToast("Bot表示設定を保存しました ✅");
  } catch (error) {
    console.error("Bot表示設定の保存失敗:", error);
    showToast("Bot表示設定の保存に失敗しました。");
  }
}

function loadCharacterStatusOnly(data) {
  document.getElementById("hp-input").value = data.hp || "";
  document.getElementById("hp-max-input").value = data.hpMax || "";
  document.getElementById("mp-input").value = data.mp || "";
  document.getElementById("mp-max-input").value = data.mpMax || "";
  document.getElementById("san-input").value = data.san || "";
  document.getElementById("san-max-input").value = data.sanMax || "";
  document.getElementById("other-input").value = data.other || "";
  document.getElementById("other2-input").value = data.other2 || "";
  document.getElementById("other1-name").value = data.other1Name || "";
  document.getElementById("other2-name").value = data.other2Name || "";
  document.getElementById("memo-input").value = data.memo || "";

  document.getElementById("hp").textContent = data.hp || "";
  document.getElementById("hp-max").textContent = data.hpMax || "";
  document.getElementById("mp").textContent = data.mp || "";
  document.getElementById("mp-max").textContent = data.mpMax || "";
  document.getElementById("san").textContent = data.san || "";
  document.getElementById("san-max").textContent = data.sanMax || "";
  document.getElementById("san-indef").textContent = Math.floor((data.sanMax || 0) * 0.8);
  document.getElementById("other").textContent = data.other || "-";
  document.getElementById("other2").textContent = data.other2 || "-";
  document.getElementById("other1-label").textContent = data.other1Name || "その他";
  document.getElementById("other2-label").textContent = data.other2Name || "その他";
  document.getElementById("memo").textContent = data.memo || "-";

  updateDisplay();
}

function loadCharacterPaletteOnly(data) {
  document.getElementById("chat-palette-input").value = data.palette || "";
  updateChatPalette();
}

// 汎用的なファイルアップロード関数
async function uploadFile(file) {
  if (!file) {
    throw new Error("ファイルが選択されていません。");
  }
  showToast('画像アップロード中...');
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

async function uploadImage() {
  const fileInput = document.getElementById('image-upload');
  const file = fileInput?.files?.[0];
  if (!file) {
    showToast('ファイルが選択されていません。');
    return;
  }

  try {
    const imageUrl = await uploadFile(file);
    showToast('アップロード成功！画像を保存中...');

    const ref = doc(db, "characters", playerId, "list", currentCharacterId);
    await setDoc(ref, {
      imageUrl,
      playerId: playerId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const imageElement = document.getElementById("explorer-image");
    imageElement.src = imageUrl + "?t=" + Date.now(); // キャッシュ防止

    showToast("画像が保存されました ✅");
  } catch (error) {
    console.error(error);
    showToast('エラーが発生しました: ' + error.message);
  }
}

// シナリオIDの登録
async function updateScenarioId() {
  const scenarioId = document.getElementById("scenario-id-input").value.trim();
  if (!scenarioId || !currentCharacterId) {
    showToast("シナリオIDまたはキャラクターが未選択です");
    return;
  }

  try {
    const scenarioRef = doc(db, "scenarios", scenarioId);
    const scenarioSnap = await getDoc(scenarioRef);
    if (!scenarioSnap.exists()) {
      showToast("そのシナリオIDは存在しません");
      return;
    }

    const scenarioData = scenarioSnap.data();
    const kpId = scenarioData.accessKpId;

    const charRef = doc(db, "characters", playerId, "list", currentCharacterId);
    await setDoc(charRef, {
      scenarioId: scenarioId,
      playerId: playerId, 
      updatedAt: new Date().toISOString(),
      accessKpId: kpId
    }, { merge: true });

    showToast("シナリオIDを更新しました ");
  } catch (e) {
    console.error("シナリオ紐づけ失敗", e);
    showToast("シナリオの紐づけに失敗しました。");
  }
}

// シナリオIDの削除
async function clearScenarioId() {
  if (!currentCharacterId) {
    showToast("キャラクターが未選択です");
    return;
  }

  try {
    const charRef = doc(db, "characters", playerId, "list", currentCharacterId);
    await setDoc(charRef, {
      scenarioId: deleteField(),
      playerId: playerId, 
      updatedAt: new Date().toISOString(),
      accessKpId: deleteField()
    }, { merge: true });
   
    document.getElementById("scenario-id-input").value = "";
    
    showToast("シナリオIDを解除しました。");
  } catch (e) {
    console.error("シナリオ解除失敗", e);
    showToast("解除に失敗しました");
  }
}

// --- 表情差分機能 ---

// 表情UIの更新
function updateFaceUI(faceImages, defaultImageUrl) {
    const faceSelect = document.getElementById("face-select");
    const faceListContainer = document.getElementById("face-list");
    faceSelect.innerHTML = "";
    faceListContainer.innerHTML = "";

    const effectiveDefaultUrl = defaultImageUrl || './seeker_vault/default.png';
    const faces = { '通常': effectiveDefaultUrl, ...(faceImages || {}) };

    // 表情名を日本語対応でソート
    const sortedFaces = Object.entries(faces).sort((a, b) => {
        if (a[0] === '通常') return -1; // 「通常」を常に先頭に
        if (b[0] === '通常') return 1;
        return a[0].localeCompare(b[0], 'ja');
    });

    for (const [name, url] of sortedFaces) {
        if (!url) continue; // URLがなければスキップ
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
            ${name !== '通常' ? `<button class="delete-face-button" data-face-name="${name}">削除</button>` : ''}
        `;
        faceListContainer.appendChild(listItem);
    }
}

// 表情の切り替え
function switchFace(event) {
    const selectedUrl = event.target.value;
    if (selectedUrl) {
        document.getElementById("explorer-image").src = selectedUrl;
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
    if (faceName === "通常") {
        showToast("「通常」という名前は使用できません。");
        return;
    }

    try {
        const imageUrl = await uploadFile(file);
        showToast('アップロード成功！表情を保存中...');
        const charRef = doc(db, "characters", playerId, "list", currentCharacterId);
        
        // Read-Modify-Write パターン
        const charSnap = await getDoc(charRef);
        if (!charSnap.exists()) {
            throw new Error("キャラクターデータが見つかりません。");
        }
        const charData = charSnap.data();
        const faceImages = charData.faceImages || {};
        faceImages[faceName] = imageUrl;

        await setDoc(charRef, {
            faceImages: faceImages,
            playerId: playerId,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        showToast(`表情「${faceName}」が保存されました ✅`);
        nameInput.value = "";
        fileInput.value = "";
        await loadCharacterData(currentCharacterId);
    } catch (error) {
        console.error("表情の追加に失敗:", error);
        showToast("表情の追加に失敗しました。");
    }
}

// 表情の削除
async function deleteFace(event) {
    if (!event.target.classList.contains('delete-face-button')) return;

    const faceName = event.target.dataset.faceName;

    if (!confirm(`表情「${faceName}」を削除しますか？`)) {
        return;
    }

    try {
        const charRef = doc(db, "characters", playerId, "list", currentCharacterId);

        const charSnap = await getDoc(charRef);
        if (!charSnap.exists()) {
            console.error("deleteFace: キャラクターデータが見つかりません。");
            throw new Error("キャラクターデータが見つかりません。");
        }

        // ★ charDataを直接変更する
        const charData = charSnap.data();

        if (charData.faceImages && charData.faceImages[faceName]) {
            delete charData.faceImages[faceName]; // charDataから直接削除

            // faceImagesが空オブジェクトになったら、フィールド自体を削除
            if (Object.keys(charData.faceImages).length === 0) {
                delete charData.faceImages;
            }
        } else {
            console.warn("deleteFace: 削除対象の表情が見つかりませんでした。");
            return; // 処理を中断
        }

        // 更新時刻とplayerIdをセット
        charData.updatedAt = new Date().toISOString();
        charData.playerId = playerId; 

        // ★ mergeなしでcharData全体を上書き
        await setDoc(charRef, charData);

        showToast(`表情「${faceName}」が削除されました ✅`);
        await loadCharacterData(currentCharacterId); // 再読み込み

    } catch (error) {
        console.error("表情の削除に失敗:", error);
        showToast("表情の削除に失敗しました。");
    }
}

// ファイル選択時にファイル名を表示する汎用リスナーを設定する関数
function setupFileUploadListener(inputId, nameFieldId) {
  const fileInput = document.getElementById(inputId);
  const nameField = document.getElementById(nameFieldId);
  if (fileInput && nameField) {
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      nameField.textContent = file ? file.name : "ファイルが選択されていません";
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // ボタンイベント
  document.getElementById("send-button").addEventListener("click", sendSay);
  document.getElementById("roll-button").addEventListener("click", rollDice);
  document.getElementById("status-save-button")?.addEventListener("click", saveCharacterData);
  document.getElementById("palette-save-button")?.addEventListener("click", savePaletteOnly);
  document.getElementById("update-name-button").addEventListener("click", saveNameOnly);
  document.getElementById("embed-color-save-button")?.addEventListener("click", saveEmbedColor);
  document.getElementById("show-in-bot-save-button")?.addEventListener("click", saveShowInBot);
  document.getElementById("scenario-update-button")?.addEventListener("click", updateScenarioId);
  document.getElementById("scenario-clear-button")?.addEventListener("click", clearScenarioId);

  
  document.getElementById("load-button").addEventListener("click", async () => {
    if (currentCharacterId) {
      const ref = doc(db, "characters", playerId, "list", currentCharacterId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        loadCharacterPaletteOnly(data);
        showToast("チャットパレットを再読み込みしました！");
      }
    }
  });

  document.getElementById("new-character-button").addEventListener("click", async () => {
    const name = prompt("キャラクター名を入力してください");
    if (!name) return;

    try {
      // 🔽 デフォルトWebhookを取得
      const webhookSnap = await getDoc(doc(db, "defaults", "webhook"));
      const defaultWebhook = webhookSnap.exists() ? webhookSnap.data().url : "";

      const newChar = await addDoc(collection(db, "characters", playerId, "list"), {
        name,
        hp: "", hpMax: "", mp: "", mpMax: "", san: "", sanMax: "",
        other: "", other2: "", other1Name: "", other2Name: "", memo: "",
        palette: "",
        webhook: defaultWebhook, 
        imageUrl: "./seeker_vault/default.png", 
        playerId: playerId, 
        accessKpId: "",
        updatedAt: new Date().toISOString(),
        showInBot: true
      });

      showToast("キャラクターを作成しました");
      await loadCharacterList();
      document.getElementById("character-select").value = newChar.id;
      await loadCharacterData(newChar.id);
    } catch (e) {
      console.error("キャラ作成失敗:", e);
      showToast("キャラ作成に失敗しました");
    }
  });

  document.getElementById("character-select").addEventListener("change", async () => {
    const selected = document.getElementById("character-select").value;
    if (selected) {
      await loadCharacterData(selected);
    }
  });

  document.getElementById("legacy-status-save").addEventListener("click", () => {
  isLegacySave = true;
  saveCharacterData();
  });

  document.getElementById("legacy-status-load").addEventListener("click", async () => {
    if (currentCharacterId) {
      const ref = doc(db, "characters", playerId, "list", currentCharacterId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        loadCharacterStatusOnly(data);
        showToast("ステータスを再読み込みしました！");
      }
    }
  });

  // 画像ファイル選択イベント
  document.getElementById("image-select-button")?.addEventListener("click", () => {
    document.getElementById("image-upload").click();
  });

  // 選択されたファイル名を表示（ファイルが選択されていない場合のフォールバックも含む）
  setupFileUploadListener("image-upload", "image-file-name");

  // 画像アップロード処理
  document.getElementById("image-save-button")?.addEventListener("click", uploadImage);

  // 表情差分関連のイベントリスナー
  document.getElementById("face-select").addEventListener("change", switchFace);
  document.getElementById("add-face-button").addEventListener("click", addFace);
  document.getElementById("face-list").addEventListener("click", deleteFace);
  document.getElementById("new-face-image-select-button").addEventListener("click", () => {
    document.getElementById("new-face-image-upload").click();
  });
  setupFileUploadListener("new-face-image-upload", "new-face-file-name");

  // キャラクター編集の再読み込み
  document.getElementById("edit-load-button")?.addEventListener("click", async () => {
  if (!currentCharacterId) {
    showToast("キャラクターが選択されていません");
    return;
  }

  try {
    const ref = doc(db, "characters", playerId, "list", currentCharacterId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      loadCharacterData(currentCharacterId); // ← UI更新
      showToast("再読み込みしました ✅");
    } else {
      showToast("キャラクターが見つかりません");
    }
  } catch (e) {
    console.error("キャラクター再読み込み失敗", e);
    showToast("再読み込みに失敗しました");
  }
  });

  // セリフ送信テキストエリアの制御
  const textarea = document.getElementById("say-content");

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto"; // 一度高さをリセット
    const lineHeight = 24; // 行の高さ（CSSと合わせる）
    const maxLines = 4;
    const maxHeight = lineHeight * maxLines;

    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  });

  // アコーディオン処理
  document.querySelectorAll(".toggle-button").forEach(button => {
    button.addEventListener("click", () => {
      const parent = button.closest(".section");
      const content = parent?.querySelector(".toggle-content");

      if (!content) return;

      const isOpen = content.style.display === "block";
      content.style.display = isOpen ? "none" : "block";
      button.classList.toggle("open", !isOpen);
    });
  });

  // パラメータの反映
  [
    "hp-input", "hp-max-input", "mp-input", "mp-max-input",
    "san-input", "san-max-input", "other-input", "other2-input",
    "other1-name", "other2-name", "memo-input"
  ].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", updateDisplay);
  });

  updateDisplay();
  loadCharacterList();

  // タブがアクティブに戻ったときにステータスとパレットのみ再読み込み
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      if (!currentCharacterId || !playerId) return;

      try {
        const ref = doc(db, "characters", playerId, "list", currentCharacterId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          loadCharacterStatusOnly(data);
          loadCharacterPaletteOnly(data);
          console.log("アクティブ復帰時に再読み込み完了");
        }
      } catch (error) {
        console.error("アクティブ復帰時のデータ取得エラー:", error);
      }
    }
  });
});