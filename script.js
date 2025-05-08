<script>
  const paletteKey = "chatPalette";
  let chatPalette = [];

  function savePalette() {
    const raw = document.getElementById("palette-input").value;
    chatPalette = raw.split("\n").filter(line => line.trim());
    localStorage.setItem(paletteKey, JSON.stringify(chatPalette));
    alert("保存しました！");
  }

  function loadPalette() {
    const saved = localStorage.getItem(paletteKey);
    if (saved) {
      chatPalette = JSON.parse(saved);
      document.getElementById("palette-input").value = chatPalette.join("\n");
    }
  }

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
  if (!command) {
    alert("コマンドを入力してください");
    return;
  }

  const workerUrl = new URL("https://rollworker.kai-chan-tsuru.workers.dev/");
  workerUrl.searchParams.append("command", command);
  workerUrl.searchParams.append("name", "探索者 太郎");

  try {
    const response = await fetch(workerUrl.toString());
    const result = await response.json();
    const text = result.ok ? result.text : "エラー: " + result.reason;
    document.getElementById("result").innerText = `🎲 結果: ${text}`;

  } catch (error) {
    document.getElementById("result").innerText = "⚠️ 通信エラーが発生しました";
    console.error("Fetch error:", error);
  }
}


async function sendSay() {
  const content = document.getElementById("say-content").value.trim();
  if (!content) {
    alert("セリフを入力してください");
    return;
  }

  try {
    const response = await fetch("https://sayworker.kai-chan-tsuru.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "探索者 太郎",
        message: content
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`送信失敗: ${response.status} ${errorText}`);
    }

    document.getElementById("say-content").value = "";
    alert("送信しました！");
  } catch (error) {
    alert(`セリフ送信中にエラーが発生しました: ${error.message}`);
    console.error(error);
  }
}

  loadPalette();
</script>