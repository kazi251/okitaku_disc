// kp.js（Cloudflare Worker経由のfetch対応版）

const BASE_API = 'https://firestore-api.kai-chan-tsuru.workers.dev/firestore';

// Firestore のドキュメント取得
async function getDocument(path) {
  const res = await fetch(`${BASE_API}/${path}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.fields || {};
}

// Firestore のドキュメント作成/更新
async function setDocument(path, fields) {
  const res = await fetch(`${BASE_API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.fields || {};
}

// シナリオ作成（新規）
async function createScenario(kpId, title) {
  const scenarioId = crypto.randomUUID();
  const path = `kpUsers/${kpId}/scenarios/${scenarioId}`;
  const fields = {
    title: { stringValue: title }
  };
  await setDocument(path, fields);
  return { scenarioId, title };
}

// シナリオ一覧取得
async function loadScenarios(kpId) {
  // Collectionリスト取得は未対応のため、シナリオIDは事前に保存しておく必要あり
  const listPath = `kpUsers/${kpId}`;
  const data = await getDocument(listPath);
  const scenarioIds = data.scenarioIds?.arrayValue?.values?.map(v => v.stringValue) || [];

  const results = [];
  for (const id of scenarioIds) {
    try {
      const scenario = await getDocument(`kpUsers/${kpId}/scenarios/${id}`);
      results.push({ id, title: scenario.title?.stringValue || '(タイトルなし)' });
    } catch (e) {
      console.warn(`Failed to load scenario ${id}:`, e);
    }
  }
  return results;
}

// シナリオIDをリストに追加
async function addScenarioIdToList(kpId, scenarioId) {
  const path = `kpUsers/${kpId}`;
  const existing = await getDocument(path);
  const currentIds = existing.scenarioIds?.arrayValue?.values?.map(v => v.stringValue) || [];
  if (!currentIds.includes(scenarioId)) {
    currentIds.push(scenarioId);
  }
  await setDocument(path, {
    ...existing,
    scenarioIds: {
      arrayValue: {
        values: currentIds.map(id => ({ stringValue: id }))
      }
    }
  });
}

// プレイヤーのWebhook登録
async function updatePlayerWebhook(playerId, scenarioId, webhookUrl) {
  const path = `players/${playerId}`;
  const fields = {
    scenarioId: { stringValue: scenarioId },
    webhookUrl: { stringValue: webhookUrl }
  };
  await setDocument(path, fields);
}
