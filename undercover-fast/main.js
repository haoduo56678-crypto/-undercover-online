const screenContainer = document.getElementById('screen-container');
const restartBtn = document.getElementById('restart-btn');

/**
 * 词库：每组包含普通玩家词语与卧底词语。
 */
const WORD_PAIRS = [
  ['咖啡', '奶茶'],
  ['地铁', '公交'],
  ['猫', '狗'],
  ['汉堡', '披萨'],
  ['苹果', '梨'],
  ['篮球', '足球'],
  ['雪碧', '可乐'],
  ['老师', '校长'],
  ['牙刷', '梳子'],
  ['手机', '平板'],
  ['火锅', '烧烤'],
  ['飞机', '高铁']
];

/**
 * 全局游戏状态。
 */
const state = {
  stage: 'setup',
  players: [],
  round: 1,
  currentRevealIndex: 0,
  currentDescriberIndex: 0,
  votes: {},
  eliminatedPlayerId: null,
  result: null,
  civilianWord: '',
  undercoverWord: ''
};

/**
 * 根据当前状态重新渲染整个界面。
 */
function render() {
  switch (state.stage) {
    case 'setup':
      renderSetup();
      break;
    case 'reveal':
      renderReveal();
      break;
    case 'describe':
      renderDescribe();
      break;
    case 'vote':
      renderVote();
      break;
    case 'roundResult':
      renderRoundResult();
      break;
    case 'gameOver':
      renderGameOver();
      break;
  }
}

/**
 * 工具函数：生成唯一玩家 ID。
 */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * 工具函数：返回仍存活的玩家。
 */
function alivePlayers() {
  return state.players.filter(player => player.alive);
}

/**
 * 工具函数：按索引获取当前存活玩家。
 */
function alivePlayerAt(index) {
  return alivePlayers()[index] || null;
}

/**
 * 随机打乱数组。
 */
function shuffle(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

/**
 * 初始化新对局：随机词语、随机卧底、重置回合状态。
 */
function startGame() {
  if (state.players.length < 3 || state.players.length > 8) return;

  const [civilianWord, undercoverWord] = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  const randomPlayers = shuffle(state.players.map(player => ({ ...player })));
  const undercoverIndex = Math.floor(Math.random() * randomPlayers.length);

  state.civilianWord = civilianWord;
  state.undercoverWord = undercoverWord;
  state.players = randomPlayers.map((player, index) => ({
    ...player,
    alive: true,
    role: index === undercoverIndex ? 'undercover' : 'civilian',
    word: index === undercoverIndex ? undercoverWord : civilianWord,
  }));
  state.round = 1;
  state.currentRevealIndex = 0;
  state.currentDescriberIndex = 0;
  state.votes = {};
  state.eliminatedPlayerId = null;
  state.result = null;
  state.stage = 'reveal';
  render();
}

/**
 * 渲染玩家录入界面。
 */
function renderSetup() {
  screenContainer.innerHTML = `
    <section class="grid two">
      <div class="card panel">
        <h2>1. 添加玩家</h2>
        <p class="muted">请输入 3–8 名玩家昵称。本版本为同一设备轮流查看词语。</p>
        <div class="player-input-row">
          <input id="player-name-input" type="text" maxlength="20" placeholder="输入玩家昵称" />
          <button id="add-player-btn" class="primary-btn">添加玩家</button>
        </div>
        <ul class="player-list">
          ${state.players.length ? state.players.map(player => `
            <li class="player-item">
              <span>${player.name}</span>
              <button class="danger-btn remove-player-btn" data-id="${player.id}">移除</button>
            </li>
          `).join('') : '<li class="notice">还没有玩家，先添加 3–8 名玩家。</li>'}
        </ul>
      </div>

      <div class="card panel">
        <h2>2. 开始游戏</h2>
        <ul class="status-list">
          <li class="status-item"><span>玩家人数</span><strong>${state.players.length} / 8</strong></li>
          <li class="status-item"><span>游戏模式</span><strong>本地轮流</strong></li>
          <li class="status-item"><span>卧底人数</span><strong>1 人</strong></li>
        </ul>
        <div class="notice">每位玩家查看自己的词语后，请把设备递给下一位玩家。</div>
        <div style="margin-top: 16px;">
          <button id="start-game-btn" class="primary-btn" ${state.players.length < 3 || state.players.length > 8 ? 'disabled' : ''}>开始对局</button>
        </div>
      </div>
    </section>
  `;

  document.getElementById('add-player-btn').addEventListener('click', addPlayer);
  document.getElementById('player-name-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addPlayer();
    }
  });
  document.querySelectorAll('.remove-player-btn').forEach(button => {
    button.addEventListener('click', () => removePlayer(button.dataset.id));
  });
  document.getElementById('start-game-btn').addEventListener('click', startGame);
}

/**
 * 添加玩家到列表。
 */
function addPlayer() {
  const input = document.getElementById('player-name-input');
  const name = input.value.trim();
  if (!name || state.players.length >= 8) return;
  state.players.push({ id: uid(), name });
  input.value = '';
  render();
}

/**
 * 从列表中移除玩家。
 */
function removePlayer(playerId) {
  state.players = state.players.filter(player => player.id !== playerId);
  render();
}

/**
 * 渲染轮流查看词语界面。
 */
function renderReveal() {
  const player = state.players[state.currentRevealIndex];
  const isLast = state.currentRevealIndex === state.players.length - 1;

  screenContainer.innerHTML = `
    <section class="card panel stage-card">
      <div class="round-title">
        <h2>查看词语阶段</h2>
        <span class="badge">玩家 ${state.currentRevealIndex + 1} / ${state.players.length}</span>
      </div>
      <p class="muted"><strong>${player.name}</strong>，请单独查看你的词语，其他人不要偷看。</p>
      <div class="word-box" id="word-box">点击下方按钮查看</div>
      <div class="stage-actions">
        <button id="show-word-btn" class="primary-btn">查看我的词语</button>
        <button id="next-player-btn" class="secondary-btn" disabled>${isLast ? '进入描述阶段' : '下一位玩家'}</button>
      </div>
    </section>
  `;

  const wordBox = document.getElementById('word-box');
  const showWordBtn = document.getElementById('show-word-btn');
  const nextPlayerBtn = document.getElementById('next-player-btn');

  showWordBtn.addEventListener('click', () => {
    wordBox.textContent = player.word;
    nextPlayerBtn.disabled = false;
  });

  nextPlayerBtn.addEventListener('click', () => {
    state.currentRevealIndex += 1;
    if (state.currentRevealIndex >= state.players.length) {
      state.stage = 'describe';
      state.currentDescriberIndex = 0;
    }
    render();
  });
}

/**
 * 渲染描述阶段：按顺序提醒玩家发言。
 */
function renderDescribe() {
  const alive = alivePlayers();
  const currentPlayer = alivePlayerAt(state.currentDescriberIndex);
  const isLast = state.currentDescriberIndex === alive.length - 1;

  screenContainer.innerHTML = `
    <section class="card panel stage-card">
      <div class="round-title">
        <h2>第 ${state.round} 轮 · 描述阶段</h2>
        <span class="badge">${state.currentDescriberIndex + 1} / ${alive.length}</span>
      </div>
      <p class="muted">现在轮到 <strong>${currentPlayer.name}</strong> 用一句话描述自己的词语，但不能直接说出词本身。</p>
      <div class="notice">建议大家说完后再把设备交给下一位玩家。</div>
      <div class="stage-actions" style="margin-top: 20px;">
        <button id="next-description-btn" class="primary-btn">${isLast ? '进入投票阶段' : '下一位描述'}</button>
      </div>
      <div class="card panel" style="margin-top: 18px; text-align: left;">
        <h3>当前存活玩家</h3>
        <ul class="player-list">
          ${alive.map(player => `<li class="player-item"><span>${player.name}</span><span class="badge">存活</span></li>`).join('')}
        </ul>
      </div>
    </section>
  `;

  document.getElementById('next-description-btn').addEventListener('click', () => {
    state.currentDescriberIndex += 1;
    if (state.currentDescriberIndex >= alive.length) {
      state.stage = 'vote';
      state.votes = {};
    }
    render();
  });
}

/**
 * 渲染投票界面：每名存活玩家轮流投票。
 */
function renderVote() {
  const alive = alivePlayers();
  const votingPlayers = Object.keys(state.votes).length;
  const currentVoter = alive[votingPlayers];

  if (!currentVoter) {
    finishVoting();
    return;
  }

  screenContainer.innerHTML = `
    <section class="grid two">
      <div class="card panel">
        <div class="round-title">
          <h2>第 ${state.round} 轮 · 投票阶段</h2>
          <span class="badge">${votingPlayers + 1} / ${alive.length}</span>
        </div>
        <p class="muted">现在由 <strong>${currentVoter.name}</strong> 投票。不能投给自己。</p>
        <div id="vote-list">
          ${alive.filter(player => player.id !== currentVoter.id).map(player => `
            <button class="vote-btn" data-target-id="${player.id}">${player.name}</button>
          `).join('')}
        </div>
      </div>

      <div class="card panel">
        <h2>投票进度</h2>
        <ul class="result-list">
          ${alive.map(player => `
            <li class="result-item">
              <span>${player.name}</span>
              <strong>${state.votes[player.id] ? '已投票' : '待投票'}</strong>
            </li>
          `).join('')}
        </ul>
      </div>
    </section>
  `;

  document.querySelectorAll('.vote-btn').forEach(button => {
    button.addEventListener('click', () => {
      state.votes[currentVoter.id] = button.dataset.targetId;
      render();
    });
  });
}

/**
 * 统计投票并淘汰得票最高者，如平票则随机选一人淘汰。
 */
function finishVoting() {
  const voteCount = {};
  Object.values(state.votes).forEach(targetId => {
    voteCount[targetId] = (voteCount[targetId] || 0) + 1;
  });

  const maxVotes = Math.max(...Object.values(voteCount));
  const candidates = Object.entries(voteCount)
    .filter(([, count]) => count === maxVotes)
    .map(([playerId]) => playerId);

  const eliminatedId = candidates[Math.floor(Math.random() * candidates.length)];
  const eliminatedPlayer = state.players.find(player => player.id === eliminatedId);
  eliminatedPlayer.alive = false;
  state.eliminatedPlayerId = eliminatedId;

  const result = checkGameResult();
  if (result) {
    state.result = result;
    state.stage = 'gameOver';
  } else {
    state.stage = 'roundResult';
  }
  render();
}

/**
 * 检查游戏是否结束。
 * - 卧底出局：平民胜
 * - 只剩 2 人且卧底还活着：卧底胜
 */
function checkGameResult() {
  const alive = alivePlayers();
  const aliveUndercover = alive.find(player => player.role === 'undercover');

  if (!aliveUndercover) {
    return { winner: 'civilian', message: '卧底已被找出，普通玩家获胜！' };
  }

  if (alive.length <= 2) {
    return { winner: 'undercover', message: '卧底成功存活到最后，卧底获胜！' };
  }

  return null;
}

/**
 * 渲染单轮结算界面。
 */
function renderRoundResult() {
  const eliminatedPlayer = state.players.find(player => player.id === state.eliminatedPlayerId);
  const voteCount = {};
  Object.values(state.votes).forEach(targetId => {
    voteCount[targetId] = (voteCount[targetId] || 0) + 1;
  });

  screenContainer.innerHTML = `
    <section class="grid two">
      <div class="card panel">
        <h2>第 ${state.round} 轮结果</h2>
        <p><strong>${eliminatedPlayer.name}</strong> 被淘汰。</p>
        <p>身份：<span class="${eliminatedPlayer.role === 'undercover' ? 'role-undercover' : 'role-civilian'}">${eliminatedPlayer.role === 'undercover' ? '卧底' : '普通玩家'}</span></p>
        <p>他的词语：<strong>${eliminatedPlayer.word}</strong></p>
        <button id="next-round-btn" class="primary-btn">进入下一轮</button>
      </div>

      <div class="card panel">
        <h2>票数统计</h2>
        <ul class="result-list">
          ${Object.entries(voteCount).map(([playerId, count]) => {
            const player = state.players.find(item => item.id === playerId);
            return `<li class="result-item"><span>${player.name}</span><strong>${count} 票</strong></li>`;
          }).join('')}
        </ul>
      </div>
    </section>
  `;

  document.getElementById('next-round-btn').addEventListener('click', () => {
    state.round += 1;
    state.currentDescriberIndex = 0;
    state.votes = {};
    state.eliminatedPlayerId = null;
    state.stage = 'describe';
    render();
  });
}

/**
 * 渲染最终结算界面。
 */
function renderGameOver() {
  screenContainer.innerHTML = `
    <section class="card panel stage-card">
      <h2>游戏结束</h2>
      <p class="win">${state.result.message}</p>
      <div class="notice" style="text-align: left; margin: 18px 0;">
        <p><strong>普通玩家词语：</strong>${state.civilianWord}</p>
        <p><strong>卧底词语：</strong>${state.undercoverWord}</p>
      </div>
      <ul class="player-list" style="text-align: left; margin-bottom: 18px;">
        ${state.players.map(player => `
          <li class="player-item">
            <span>${player.name}</span>
            <strong class="${player.role === 'undercover' ? 'role-undercover' : 'role-civilian'}">${player.role === 'undercover' ? '卧底' : '普通玩家'}</strong>
          </li>
        `).join('')}
      </ul>
      <div class="stage-actions">
        <button id="play-again-btn" class="primary-btn">同一批玩家再来一局</button>
        <button id="back-setup-btn" class="secondary-btn">返回玩家设置</button>
      </div>
    </section>
  `;

  document.getElementById('play-again-btn').addEventListener('click', startGame);
  document.getElementById('back-setup-btn').addEventListener('click', resetAll);
}

/**
 * 重置为初始状态。
 */
function resetAll() {
  state.stage = 'setup';
  state.players = [];
  state.round = 1;
  state.currentRevealIndex = 0;
  state.currentDescriberIndex = 0;
  state.votes = {};
  state.eliminatedPlayerId = null;
  state.result = null;
  state.civilianWord = '';
  state.undercoverWord = '';
  render();
}

restartBtn.addEventListener('click', resetAll);
render();
