import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc , deleteField } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function sendSay() {
    const content = document.getElementById("say-content").value.trim();
    if (!content) return;
    const avatarUrl = document.getElementById("explorer-image").src;
    const webhook = currentCharacterData?.webhook;
    try {
        const response = await fetch("https://sayworker.kai-chan-tsuru.workers.dev/", {
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
  const webhook = currentCharacterData?.webhook;

  const workerUrl = new URL("https://rollworker.kai-chan-tsuru.workers.dev/");
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

    // シナリオID入力欄にも反映
    const scenarioInput = document.getElementById("scenario-id-input");
    if (scenarioInput) {
      scenarioInput.value = data.scenarioId || "";
    }
    
    updateDisplay();
    updateChatPalette();

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
        `ステータス更新\n` +
        `\`\`\`\n` +
        `HP: ${hp} / ${hpMax} ` +
        `MP: ${mp} / ${mpMax} ` +
        `SAN: ${san} / ${sanMax}（不定: ${Math.floor(sanMax * 0.8)}）\n` +
        `${other1Name || "その他1"}: ${other || "-"} ` +
        `${other2Name || "その他2"}: ${other2 || "-"}\n` +
        (memo ? `メモ: ${memo}` : "") + 
        `\`\`\``;

      const avatarUrl = imageSrc;
      const webhook = currentCharacterData?.webhook;

      try {
        await fetch("https://sayworker.kai-chan-tsuru.workers.dev/", {
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

  updateDisplay();
}

function loadCharacterPaletteOnly(data) {
  document.getElementById("chat-palette-input").value = data.palette || "";
  updateChatPalette();
}

async function uploadImage() {
  const fileInput = document.getElementById('image-upload');
  const file = fileInput?.files?.[0];
  if (!file) {
    showToast('ファイルが選択されていません。');
    return;
  }

  showToast('画像アップロード中...');

  try {
    const formData = new FormData();
    formData.append('image', file);
    const workerUrl = 'https://imageworker.kai-chan-tsuru.workers.dev/';

    const response = await fetch(workerUrl, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      const imageUrl = result.imageUrl;

      showToast('アップロード成功！画像を保存中...');

      const ref = doc(db, "characters", playerId, "list", currentCharacterId);
      await setDoc(ref, {
        imageUrl,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      const imageElement = document.getElementById("explorer-image");
      imageElement.src = imageUrl + "?t=" + Date.now(); // キャッシュ防止

      showToast("画像が保存されました ✅");
    } else {
      showToast('アップロード失敗: ' + response.statusText);
    }
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
    const kpId = scenarioData.kpId;

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

window.addEventListener("DOMContentLoaded", () => {
  // ボタンイベント
  document.getElementById("send-button").addEventListener("click", sendSay);
  document.getElementById("roll-button").addEventListener("click", rollDice);
  document.getElementById("status-save-button")?.addEventListener("click", saveCharacterData);
  document.getElementById("palette-save-button")?.addEventListener("click", savePaletteOnly);
  document.getElementById("update-name-button").addEventListener("click", saveNameOnly);
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
      updatedAt: new Date().toISOString()
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
  document.getElementById("image-upload")?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    const nameField = document.getElementById("image-file-name");
    nameField.textContent = file ? file.name : "ファイルが選択されていません";
  });

  // 画像アップロード処理
  document.getElementById("image-save-button")?.addEventListener("click", uploadImage);

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