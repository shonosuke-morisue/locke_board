// ゲーム状態の管理モジュール

import { ServerGameState, Player, Cell, CardData, Faction } from './types';

// プレイヤーコマの色プリセット（最大10人分）
const PLAYER_COLORS = [
  '#e74c3c', // 赤
  '#3498db', // 青
  '#2ecc71', // 緑
  '#f39c12', // オレンジ
  '#9b59b6', // 紫
  '#1abc9c', // ティール
  '#e91e63', // ピンク
  '#ff5722', // ディープオレンジ
  '#607d8b', // ブルーグレー
  '#795548', // ブラウン
];

// カード定義（名称・枚数・詳細テキスト・能力カード判別フラグ）
const CARD_DEFINITIONS: Array<{ name: string; count: number; content: string; isAbility: boolean }> = [
  { name: '[能力]巡洋艦',                  count: 1,  isAbility: true,  content: '攻撃時に巡洋艦の支援を得られる。毎回サイコロを2個振り、その武器で相手を攻撃する。通常の攻撃も行える。\nサイコロの目\n2：D弾（ESPレベル6、攻撃力50）\n3：G弾（ESPレベル5、攻撃力30）\n4-6：ビームキャノン（ESPレベル4、攻撃力は武器火力チェック）\n7-11：支援なし\n12：誤爆（このカードを出したプレイヤーをビームキャノンで攻撃）' },
  { name: '[能力]手下',                    count: 2,  isAbility: true,  content: '手下が1人つく。戦闘時にコンバット・カードを1枚余分にもらえる。\n攻撃時には同調攻撃を行える。ただし、手下が同調するカードはESPレベル2以下に限られる。手下は決していなくならない。' },
  { name: '[能力]ＥＳＰジャマーLv3',       count: 1,  isAbility: true,  content: 'レベル3\n\nこのカードを出すと、相手はESPレベル3以下のESP（コンバット・カード他）は使えない。ただし、それ以上の攻撃を受けるとジャマーは破壊されたことになり、カードを捨てる。' },
  { name: '[能力]ＥＳＰジャマーLv4',       count: 1,  isAbility: true,  content: 'レベル4\nこのカードを出すと、相手はESPレベル4以下のESP（コンバット・カード他）は使えない。ただし、それ以上の攻撃を受けるとジャマーは破壊されたことになり、カードを捨てる。' },
  { name: '[能力]ＥＳＰジャマーLv5',       count: 1,  isAbility: true,  content: 'レベル5\nこのカードを出すと、相手はESPレベル5以下のESP（コンバット・カード他）は使えない。ただし、それ以上の攻撃を受けるとジャマーは破壊されたことになり、カードを捨てる。' },
  { name: '[能力]ＥＳＰフィールドLv3',     count: 1,  isAbility: true,  content: 'レベル3\nESPレベル3までのESPが使用可能となる（ESP能力と同じように考える）。このカードはいつまでも使えるが、戦闘でこのレベルを超える攻撃を受けると破壊されたことになり、カードを捨てる。' },
  { name: '[能力]ＥＳＰフィールドLv4',     count: 1,  isAbility: true,  content: 'レベル4\nESPレベル4までのESPが使用可能となる（ESP能力と同じように考える）。このカードはいつまでも使えるが、戦闘でこのレベルを超える攻撃を受けると破壊されたことになり、カードを捨てる。' },
  { name: '[能力]ＥＳＰフィールドLv5',     count: 1,  isAbility: true,  content: 'レベル5\n\nESPレベル5までのESPが使用可能となる（ESP能力と同じように考える）。このカードはいつまでも使えるが、戦闘でこのレベルを超える攻撃を受けると破壊されたことになり、カードを捨てる。' },
  { name: '[能力]エネルギースーツ',        count: 1,  isAbility: true,  content: 'これを着ていると、相手は全ての攻撃をESPチェック（サイコロ2個でESP能力レベル以下を出す）しなければならない。チェックに成功すると通常通りだが、失敗するとその攻撃は、攻撃をしかけたプレイヤーに向けられる。このカードがなくなることはないが、他のスーツと重ねて着ることはできない。' },
  { name: '[能力]個人用パワードスーツLv4', count: 1,  isAbility: true,  content: 'ESPレベル4のシールド（防御）をしていることになる。このカードはいつでも使えるが、戦闘でこのレベルを超える攻撃を受けると破壊されたことになり、カードを捨てる。なお、スーツ類は2着以上重ねて着ることはできない。' },
  { name: '[能力]個人用パワードスーツLv5', count: 1,  isAbility: true,  content: 'ESPレベル5のシールド（防御）をしていることになる。このカードはいつでも使えるが、戦闘でこのレベルを超える攻撃を受けると破壊されたことになり、カードを捨てる。なお、スーツ類は2着以上重ねて着ることはできない。' },
  { name: '[能力]ニケ',                    count: 1,  isAbility: true,  content: '戦闘時にこのカードを出し、各ラウンドごとに使用できるかチェックを行う。サイコロを2個振り、自分の精神力以下を出すと使用できる。その代わりそのラウンドは通常の攻撃をできない。\nニケの攻撃は避けられない。攻撃力は20。逆に攻撃を受けるとニケは防御できない。耐久力は10。\n精神力チェックに失敗するとニケは使用できないが通常の攻撃はできる。また、サイコロの目が11、12だったラウンドは、失神して何もできない。ニケの耐久力は回復せず、0になると破壊される。' },
  { name: '[能力]亜空間フィールド',        count: 1,  isAbility: true,  content: '内容はESPレベル7のテレポートと同じ。サイコロを2個振る。[使い捨てカード]\nサイコロの目\n2-6：ESPレベル7のテレポートを出したのと同じ。\n7-9：失敗。このカードは捨て、コンバット・カードを使う。\n10-12：原因不明の高周波に襲われる。このラウンドは何もできない。' },
  { name: '[能力]ＥＳＰコントローラー',    count: 1,  isAbility: true,  content: '同じ場所にいるプレイヤーをコントロールできる。自分の順番に相手を指名してこのカードを出す。相手はサイコロを2個振り、自分の精神力以下を出せばコントロールされた相手は同じ場所にいる限り指示通りに動かなくてはならない。ただし毎回自分の番にサイコロを1個振り、1を出せばコントローラーを破壊し、コントロールより脱出できる。その時はこのカードを捨てる。\nコントロールしているプレイヤーはいつでもコントロールをやめられる。同時に2人はコントロールできない。' },
  { name: '[能力]エネルギー吸収ボールLv3', count: 1,  isAbility: true,  content: 'レベル3\ｎESPレベル3のエネルギー吸収ボールを作れる。\nこのカードは防御カードの代わりに使う。攻撃をかけた相手は、サイコロを2個振って自分のESP能力レベル以下を出さないとエネルギーを吸収されてしまう。\nその場合は、さらにサイコロを1個振り、目の数のラウンドの間、気を失って何もできない（戦闘が終了すれば治る）。エネルギーを吸収できなくても防御にはなる。このカードは1度出すと、その先頭が終わるかレベルを超える攻撃を受けると捨てなくてはならない。' },
  { name: '[能力]エネルギー吸収ボールLv4', count: 1,  isAbility: true,  content: 'レベル4\ｎESPレベル4のエネルギー吸収ボールを作れる。\nこのカードは防御カードの代わりに使う。攻撃をかけた相手は、サイコロを2個振って自分のESP能力レベル以下を出さないとエネルギーを吸収されてしまう。\nその場合は、さらにサイコロを1個振り、目の数のラウンドの間、気を失って何もできない（戦闘が終了すれば治る）。エネルギーを吸収できなくても防御にはなる。このカードは1度出すと、その先頭が終わるかレベルを超える攻撃を受けると捨てなくてはならない。' },
  { name: '[能力]エネルギー吸収ボールLv5', count: 1,  isAbility: true,  content: 'レベル5\ｎESPレベル5のエネルギー吸収ボールを作れる。\nこのカードは防御カードの代わりに使う。攻撃をかけた相手は、サイコロを2個振って自分のESP能力レベル以下を出さないとエネルギーを吸収されてしまう。\nその場合は、さらにサイコロを1個振り、目の数のラウンドの間、気を失って何もできない（戦闘が終了すれば治る）。エネルギーを吸収できなくても防御にはなる。このカードは1度出すと、その先頭が終わるかレベルを超える攻撃を受けると捨てなくてはならない。' },
  { name: '[能力]クローン',                count: 3,  isAbility: true,  content: '戦闘で死亡しても、このカードを出せば次の回に再び登場できる。第1部では惑星の宇宙工から（Evillシルエットは盤外）、第2部は基地外周から登場する。\n[カード]' },
  { name: '[能力]ジオイド弾',              count: 1,  isAbility: true,  content: '攻撃カードの代わりに出してサイコロを2個振る。[使い捨てカード]\nサイコロの目\n2-4：ジオイド弾（ESPレベル7、攻撃力100）を使える。通常の攻撃はできない。\n5-9：失敗。このカードは捨てる。通常の攻撃を行う。\n10-12：原因不明の高周波に襲われる。このラウンドは何もできない。' },
  { name: '[能力]変身',                    count: 1,  isAbility: true,  content: 'このカードを出すと、シルエット・カードを別のものと変更できる。\n[使い捨てカード]' },
  { name: '[能力]ラフノールの鏡Lv5',       count: 1,  isAbility: true,  content: 'レベル5\nESPレベル5のシールド（防御）とテレポートの両方を持つ。相手の攻撃を防ぐと同時にテレポートに入る。防御カードと同じように使う。\n[使い捨てカード]' },
  { name: '[能力]ラフノールの鏡Lv6',       count: 1,  isAbility: true,  content: 'レベル6\nESPレベル6のシールド（防御）とテレポートの両方を持つ。相手の攻撃を防ぐと同時にテレポートに入る。防御カードと同じように使う。\n[使い捨てカード]' },
  { name: '[能力]ラフノールの鏡Lv7',       count: 1,  isAbility: true,  content: 'レベル7\nESPレベル7のシールド（防御）とテレポートの両方を持つ。相手の攻撃を防ぐと同時にテレポートに入る。防御カードと同じように使う。\n[使い捨てカード]' },
  { name: '開拓地',                        count: 2,  isAbility: false, content: '（何もなし）' },
  { name: '歓楽街',                        count: 2,  isAbility: false, content: '（何もなし）' },
  { name: '工業地域',                      count: 2,  isAbility: false, content: '（何もなし）' },
  { name: '住宅街',                        count: 2,  isAbility: false, content: '（何もなし）' },
  { name: 'スラム街',                      count: 2,  isAbility: false, content: '（何もなし）' },
  { name: '宇宙港',                        count: 6,  isAbility: false, content: '次の回に別の宇宙港へ行ける。このカードは惑星ボックスに表にして置く。' },
  { name: '逮捕',                          count: 4,  isAbility: false, content: '逮捕され刑務所に行く（コマはこのボックスに置いたまま）。\n次回から刑務所を出るためのチェックを行う。\n（刑務所チャート参照）' },
  { name: '戦闘発生',                      count: 10, isAbility: false, content: 'ランダム戦闘チャートでチェックを行い、何が出てくるかを決める。' },
  { name: 'トラップ',                      count: 3,  isAbility: false, content: 'トラップ・チェックを行い指示に従う。\n（トラップ・チャート参照）' },
  { name: '情報入手',                      count: 13, isAbility: false, content: 'このカードは自分の手元に表にして置く。\n3枚集めると秘密基地を発見したことになる。' },
  { name: '自分の正体露顕',                count: 2,  isAbility: false, content: '自分のキャラクター・カードを全員に公開しなければならない。' },
  { name: '他人の正体判明',                count: 4,  isAbility: false, content: '誰か1人のキャラクター・カードを見ることができる（このカードを引いた人のみ）。' },
];

// デッキを展開する（枚数分カードを生成してシャッフル、計78枚）
function buildDeck(): Array<{ name: string; content: string; isAbility: boolean }> {
  const deck: Array<{ name: string; content: string; isAbility: boolean }> = [];
  for (const def of CARD_DEFINITIONS) {
    for (let i = 0; i < def.count; i++) {
      deck.push({ name: def.name, content: def.content, isAbility: def.isAbility });
    }
  }
  // Fisher-Yates シャッフル
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 初期ボードを生成する（6行×7列）
export function createInitialBoard(): Cell[][] {
  // 78枚デッキをシャッフルして先頭36枚をボードに配置
  const deck = buildDeck();
  let cardIndex = 0;

  const board: Cell[][] = [];

  for (let row = 0; row < 6; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < 7; col++) {
      if (col === 0) {
        // 宇宙港マス（カードなし）
        rowCells.push({
          row,
          col,
          isSpaceport: true,
          card: null,
        });
      } else {
        // デッキから1枚取り出してマスに配置
        const { name, content, isAbility } = deck[cardIndex++];

        const card: CardData = {
          id: `card-${row}-${col}`,
          name,
          content,
          isAbility,
          isFaceUp: false,
          isAmbush: false,
          ambushLabel: null,
          openedBy: null,
        };

        rowCells.push({
          row,
          col,
          isSpaceport: false,
          card,
        });
      }
    }
    board.push(rowCells);
  }

  return board;
}

// 初期ゲーム状態を生成する
export function createInitialGameState(): ServerGameState {
  return {
    phase: 'LOBBY',
    players: [],
    board: createInitialBoard(),
    ambushPositions: [],
  };
}

// 新しいプレイヤーを追加する
export function addPlayer(
  state: ServerGameState,
  socketId: string,
  name: string,
  playerId: string
): Player {
  const isHost = state.players.length === 0;
  // 既存プレイヤーが使っていない色を先頭から選ぶ
  const usedColors = new Set(state.players.map((p) => p.color));
  const color =
    PLAYER_COLORS.find((c) => !usedColors.has(c)) ?? PLAYER_COLORS[0];

  const player: Player = {
    id: playerId,      // 安定したUUID
    socketId,          // 現在のSocket.id
    name,
    faction: undefined,
    isHost,
    isApproved: isHost, // ホストは自動承認
    color,
    position: null,
    isConnected: true,
  };

  state.players.push(player);
  return player;
}

// 既存プレイヤーのSocket.idを更新して再接続処理を行う
export function reconnectPlayer(
  player: Player,
  newSocketId: string
): void {
  player.socketId = newSocketId;
  player.isConnected = true;
}

// プレイヤーを切断状態にする（リストからは削除しない）
export function disconnectPlayer(state: ServerGameState, socketId: string): void {
  const player = state.players.find((p) => p.socketId === socketId);
  if (player) {
    player.isConnected = false;
  }

  // ホストが切断した場合、接続中の次のプレイヤーをホストにする
  if (!state.players.some((p) => p.isHost && p.isConnected)) {
    const nextHost = state.players.find((p) => p.isConnected);
    if (nextHost) {
      // 元のホストからホスト権を外す
      state.players.forEach((p) => { p.isHost = false; });
      nextHost.isHost = true;
    }
  }
}

// プレイヤーが自発的に退出する（リストから削除し、ホストなら移譲する）
export function leaveGame(state: ServerGameState, socketId: string): void {
  const index = state.players.findIndex((p) => p.socketId === socketId);
  if (index === -1) return;

  const leavingPlayer = state.players[index];
  const wasHost = leavingPlayer.isHost;

  // プレイヤーをリストから削除
  state.players.splice(index, 1);

  // ホストが退出した場合、接続中の次のプレイヤー（承認済み優先）にホスト権を移譲
  if (wasHost && state.players.length > 0) {
    state.players.forEach((p) => { p.isHost = false; });
    const nextHost =
      state.players.find((p) => p.isConnected && p.isApproved) ??
      state.players.find((p) => p.isConnected) ??
      state.players[0];
    nextHost.isHost = true;
    // 新しいホストは自動承認
    nextHost.isApproved = true;
  }
}

// evilプレイヤーのソケットIDリストを取得する
export function getEvilPlayerIds(state: ServerGameState): string[] {
  return state.players
    .filter((p) => p.faction === 'evil')
    .map((p) => p.id);
}

// ゲームを終了する（プレイヤーも含めてすべてリセット）
export function endGame(state: ServerGameState): void {
  state.phase = 'LOBBY';
  state.board = createInitialBoard();
  state.ambushPositions = [];
  state.players = []; // 全プレイヤーを削除
}

// ゲームをリスタートする（フェーズをLOBBYに戻し、ボードをリセット）
export function restartGame(state: ServerGameState): void {
  state.phase = 'LOBBY';
  state.board = createInitialBoard();
  state.ambushPositions = [];

  // 切断中のプレイヤーを削除し、接続中のプレイヤーの状態をリセット
  state.players = state.players.filter((p) => p.isConnected);
  state.players.forEach((player) => {
    player.faction = undefined;
    player.isApproved = player.isHost; // ホストのみ自動承認
    player.position = null;
  });
}

// 指定したクライアント向けにゲーム状態をフィルタリングして送信用データを作成する
export function createFilteredGameState(
  state: ServerGameState,
  socketId: string
): import('./types').GameState {
  // socketId から対応するプレイヤーを検索（安定したidではなく現在のsocketIdで照合）
  const player = state.players.find((p) => p.socketId === socketId);
  const isEvil = player?.faction === 'evil';
  const playerId = player?.id ?? null;

  // ボードのフィルタリング：秘密情報を各プレイヤーの権限に応じて制限
  const filteredBoard = state.board.map((row) =>
    row.map((cell) => {
      if (!cell.card) return cell;

      const card = cell.card;
      // 能力カードの名称・詳細は開いた本人のみ閲覧可能
      const canSeeAbilityContent = !card.isAbility || card.openedBy === playerId;

      return {
        ...cell,
        card: {
          ...card,
          name:    canSeeAbilityContent ? card.name    : '',
          content: canSeeAbilityContent ? card.content : '',
          // evilは常に待ち伏せ情報が見える、goodはカードがオープンされた時のみ表示
          isAmbush: card.isAmbush && (isEvil || card.isFaceUp),
          ambushLabel: (isEvil || card.isFaceUp) ? card.ambushLabel : null,
        },
      };
    })
  );

  // 待ち伏せ設定済み数（evilのみ）
  const ambushSetCount = isEvil ? state.ambushPositions.length : 0;

  return {
    phase: state.phase,
    players: state.players,
    board: filteredBoard,
    myId: player?.id ?? socketId, // 安定したUUID（Player.id）を返す
    myFaction: player?.faction,
    ambushSetCount,
  };
}
