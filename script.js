import { showToast } from './utils.js';

const sayButton = document.getElementById("send-button");
const diceCommandInput = document.getElementById("dice-command");
const rollButton = document.getElementById("roll-button");
const chatPaletteInput = document.getElementById("chat-palette-input");

sayButton.addEventListener("click", sendSay);
diceCommandInput.addEventListener("input", showSuggestions);
rollButton.addEventListener("click", rollDice);

const paletteKey = "chatPalette";
let chatPalette = [];

window.updateChatPalette = function() { // グローバルスコープで定義
  chatPalette = chatPaletteInput.value.split('\n').filter(line => line.trim() !== '');
};

function showSuggestions() {
  const input = document.getElementById("dice-command").value.toLowerCase();
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";

  if (!input) {
    suggestions.style.display = "none";
    return;
  }

  const matches = chatPalette.filter(line => line.toLowerCase().includes(input));
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

async function rollDice() {
  const command = document.getElementById("dice-command").value.trim();
  if (!command) return;

  const workerUrl = new URL("https://rollworker.kai-chan-tsuru.workers.dev/");
  workerUrl.searchParams.append("command", command);

  try {
    const response = await fetch(workerUrl.toString());
    const result = await response.json();
    let displayText = `🎲 ${command}: `;
    if (result.ok) {
      displayText += result.text;
      showToast("ダイスを振りました！");
      if (result.text.includes("致命的失敗")) {
        displayText += " 💀";
      } else if (result.text.includes("失敗")) {
        displayText += " 😞";
      } else if (result.text.includes("スペシャル") || result.text.includes("成功")) {
        displayText += " 😊";
      } else if (result.text.includes("決定的成功")) {
        displayText += " 🎉🎊";
      }
    } else {
      displayText += "エラー: " + result.reason;
    }
    document.getElementById("result").innerText = displayText;
  } catch (error) {
    document.getElementById("result").innerText = "⚠️ 通信エラーが発生しました";
    console.error("Fetch error:", error);
  }
}

async function sendSay() {
  const content = document.getElementById("say-content").value.trim();
  if (!content) return;

  try {
    const response = await fetch("https://sayworker.kai-chan-tsuru.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "探索者 太郎",
        message: content
      })
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