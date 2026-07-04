// ゲーム状態の管理モジュール

import { ServerGameState, Player, Cell, CardData, Faction, DiceState } from './types';

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

// 重要拠点のラベル（設定順）
export const KEY_POINT_LABELS = ['エネルギー・ルーム', 'コンピューター・ルーム', '研究室', '指令室'];

// 重要拠点ごとの説明文（KEY_POINT_LABELS と同じ並び順）
// TODO: 仮文言。正式な説明文に差し替える
export const KEY_POINT_DESCRIPTIONS: { [label: string]: string } = {
  'エネルギー・ルーム': 'ここに入ったGoodキャラクターのプレイヤーは、次の順番に「破壊」を宣言すれば破壊できる',
  'コンピューター・ルーム': 'ここに入ったGoodキャラクターのプレイヤーは、次の順番に「破壊」を宣言すれば破壊できる',
  '研究室': 'ここに入ったGoodキャラクターのプレイヤーは、次の順番に「破壊」を宣言すれば破壊できる',
  '指令室': 'ここに入ったGoodキャラクターのプレイヤーは、次の順番に「破壊」を宣言すれば破壊できる',
};

// 秘密基地カード定義（52枚）
const BASE_CARD_RAW: Array<{ name: string; count: number; content: string }> = [
  { name: 'ESPコントローラーシステム',  count: 1,  content: 'サイコロ2個を振り、精神力以下を出せば何事もない。失敗すると基地プレイヤーの1人（サイコロを振り大きい目を出した人）にコントロールされ、ゲーム終了まで指示通りに動かなくてはならない。' },
  { name: 'E.K.',                       count: 1,  content: 'ここに入ると脱出できるまで以下の手順を繰り返す。\n1.コンバット・カードを山にする。\n2.上から1枚めくる。\n3.サイコロを2個振る。精神力以下なら終了。次の自分の順番でここから脱出できる。それ以外は次へ。\n4.コンバット・カードが自分の使用できる攻撃カードならばその攻撃力で自分を攻撃し、また2へ戻る。この時、防御はできない。それ以外のカードなら何もせずに2へ戻る。' },
  { name: 'エネルギー吸収体',           count: 3,  content: 'サイコロ2個を振り、ESP能力レベル以下を出せないとエネルギーを吸収されてしまう。サイコロを1個振り、その目の数だけ気を失う（何もできない）。' },
  { name: 'オーディオルーム',           count: 1,  content: 'シルエットが聖悠紀のプレイヤーは必ず捕まり、サイコロを1個降って出た数だけ休みとなる。\n他のプレイヤーはサイコロを2個振って精神力以下を出さないと超音波（オーディオ）攻撃により気を失い1回休み。いずれも耐久力は回復しない。' },
  { name: 'カーンの聖母',               count: 2,  content: 'キャラクターが男のプレイヤーは精神力チェック（サイコロ2個で精神力以下なら成功）に失敗すると聖母に捕まる。以後毎回サイコロを1個振り、1か2が出るまでここから出られない。\n聖母に捕まっているプレイヤーがいると、基地プレイヤーは侵入してきたプレイヤーに対し、戦闘の時に脅しをかけられる。\n脅しに乗ると、侵入プレイヤーのコンバット・カードは1枚減らされる。脅しに乗らないと、捕まっているプレイヤーはサイコロを1個振り、456で耐久力を失う。この脅しは戦闘の前に1回だけ行える。' },
  { name: '喫茶店「ダリア」',           count: 1,  content: 'ここに入ったプレイヤーはサイコロ1個を振り、出た目の数だけ休み、シルエットが聖悠紀のプレイヤーは、出た目の2倍休み。この間、耐久力は回復する。' },
  { name: 'キング編集室',               count: 1,  content: 'キャラクターが聖悠紀のプレイヤーがここに入り、サイコロ2個で精神力以下の数を出すと破壊することができる。これに成功すると聖悠紀は勝利を得る。\n他のプレイヤーには一切関係なし。' },
  { name: '警戒装置 [1-1]',             count: 2,  content: 'ESPジャマーレベル1\nESPレベル1以下のESP（コンバット・カード他）は使用できない。\nオートマチック・レイガン\n●ESPレベル：1\n●攻撃力は武器火力チェック\n●耐久力：2\n●精神力は機械なので0\n幻覚にはかからない。\n\nESPジャマーは指定レベルを超えた攻撃を受けると破壊され無効になる。\nオートマチック・レイガンが破壊されたらこのカードは取り除く。' },
  { name: '警戒装置 [1-2]',             count: 1,  content: 'ESPジャマーレベル1\nESPレベル1以下のESP（コンバット・カード他）は使用できない。\nブラスター\n●ESPレベル：2\n●攻撃力は武器火力チェック\n●耐久力：2\n●精神力は機械なので0\n幻覚にはかからない。\n\nESPジャマーは指定レベルを超えた攻撃を受けると破壊され無効になる。\nブラスターが破壊されたらこのカードは取り除く。' },
  { name: '警戒装置 [2-1]',             count: 1,  content: 'ESPジャマーレベル2\nESPレベル2以下のESP（コンバット・カード他）は使用できない。\nオートマチック・レイガン\n●ESPレベル：1\n●攻撃力は武器火力チェック\n●耐久力：2\n●精神力は機械なので0\n幻覚にはかからない。\n\nESPジャマーは指定レベルを超えた攻撃を受けると破壊され無効になる。\nオートマチック・レイガンが破壊されたらこのカードは取り除く。' },
  { name: '警戒装置 [2-2]',             count: 1,  content: 'ESPジャマーレベル2\nESPレベル2以下のESP（コンバット・カード他）は使用できない。\nブラスター\n●ESPレベル：2\n●攻撃力は武器火力チェック\n●耐久力：2\n●精神力は機械なので0\n幻覚にはかからない。\n\nESPジャマーは指定レベルを超えた攻撃を受けると破壊され無効になる。\nブラスターが破壊されたらこのカードは取り除く。' },
  { name: '警戒装置 [3-2]',             count: 1,  content: 'ESPジャマーレベル3\nESPレベル3以下のESP（コンバット・カード他）は使用できない。\nブラスター\n●ESPレベル：2\n●攻撃力は武器火力チェック\n●耐久力：2\n●精神力は機械なので0\n幻覚にはかからない。\n\nESPジャマーは指定レベルを超えた攻撃を受けると破壊され無効になる。\nブラスターが破壊されたらこのカードは取り除く。' },
  { name: '警戒装置 [3-3]',             count: 1,  content: 'ESPジャマーレベル3\nESPレベル3以下のESP（コンバット・カード他）は使用できない。\nバズーカ\n●ESPレベル：3\n●攻撃力は武器火力チェック\n●耐久力：2\n●精神力は機械なので0\n幻覚にはかからない。\n\nESPジャマーは指定レベルを超えた攻撃を受けると破壊され無効になる。\nバズーカが破壊されたらこのカードは取り除く。' },
  { name: '警戒装置 [4-3]',             count: 1,  content: 'ESPジャマーレベル4\nESPレベル4以下のESP（コンバット・カード他）は使用できない。\nバズーカ\n●ESPレベル：3\n●攻撃力は武器火力チェック\n●耐久力：2\n●精神力は機械なので0\n幻覚にはかからない。\n\nESPジャマーは指定レベルを超えた攻撃を受けると破壊され無効になる。\nバズーカが破壊されたらこのカードは取り除く。' },
  { name: '警戒装置 [4-4]',             count: 1,  content: 'ESPジャマーレベル4\nESPレベル4以下のESP（コンバット・カード他）は使用できない。\nビームキャノン\n●ESPレベル：4\n●攻撃力は武器火力チェック\n●耐久力：2\n●精神力は機械なので0\n幻覚にはかからない。\n\nESPジャマーは指定レベルを超えた攻撃を受けると破壊され無効になる。\nビームキャノンが破壊されたらこのカードは取り除く。' },
  { name: '警戒装置 [5-4]',             count: 1,  content: 'ESPジャマーレベル5\nESPレベル5以下のESP（コンバット・カード他）は使用できない。\nビームキャノン\n●ESPレベル：4\n●攻撃力は武器火力チェック\n●耐久力：2\n●精神力は機械なので0\n幻覚にはかからない。\n\nESPジャマーは指定レベルを超えた攻撃を受けると破壊され無効になる。\nビームキャノンが破壊されたらこのカードは取り除く。' },
  { name: '化粧室',                     count: 1,  content: '女性のシルエットのプレイヤーがここに入ると、精神力チェック（サイコロ2個で精神力以下なら成功）を行う。失敗すると化粧を始めて、サイコロ1個を振って出た数だけ休みとなる。耐久力は回復しない。' },
  { name: '幻覚の部屋[4]',              count: 1,  content: 'レベル4\nESP能力レベル4以下のプレイヤーは精神力チェック（サイコロ2個で精神力以下で成功）をする。成功すれば何も起こらないが、失敗すると幻覚にかかり自分で自分を攻撃する。次に以下の手順を幻覚から覚めるまで繰り返す。\n1.コンバットカードを1枚めくる。\n2.精神力チェックをする。成功すれば幻覚から覚める。\n3.コンバット・カードが自分の使用できる攻撃カードなら、その攻撃力で自分を攻撃して1に戻る。防御はできない。それ以外のカードなら何もせず1に戻る。' },
  { name: '幻覚の部屋[6]',              count: 1,  content: 'レベル6\nESP能力レベル6以下のプレイヤーは精神力チェック（サイコロ2個で精神力以下で成功）をする。成功すれば何も起こらないが、失敗すると幻覚にかかり自分で自分を攻撃する。次に以下の手順を幻覚から覚めるまで繰り返す。\n1.コンバットカードを1枚めくる。\n2.精神力チェックをする。成功すれば幻覚から覚める。\n3.コンバット・カードが自分の使用できる攻撃カードなら、その攻撃力で自分を攻撃して1に戻る。防御はできない。それ以外のカードなら何もせず1に戻る。' },
  { name: 'サイン会場',                 count: 1,  content: '誰かがここに入ると、全プレイヤーはサイン会に出かける。各自サイコロを1個振り、出た目の数だけ休み（耐久力は回復しない）。シルエットがロックのプレイヤーは、出た目の2倍休み。\n少ない数を出して逃げたプレイヤーを、他のプレイヤーは「人気がない」と言って笑わなければならない。' },
  { name: '重積ヴォーティクス',         count: 1,  content: 'ここに入ると戦闘結果表10:1の欄で攻撃を1回受ける。ただし攻撃の前にコンバット・カードを7枚受け取り、その中に使えるテレポートがあれば、サイコロ2個を振り精神力以下を出せばテレポートできる（テレポートを使うためにチェックが必要なら、それはまた別に行わなければならない）。\n失敗しても次の回には移動できる。' },
  { name: '通路',                       count: 10, content: '通路' },
  { name: 'トラップ',                   count: 2,  content: 'トラップ（罠）にかかった。このボックスにプレイヤーが入るたび、トラップ・チャートを見てチェックを行う。' },
  { name: 'ノヴァ（新星）',             count: 1,  content: 'ここに入ったプレイヤーは自分の能力に応じ、この基地のある惑星の太陽をノヴァにし、惑星ごと破壊することができる。サイコロを2個振り、自分のESP能力レベル以下を出すと、全プレイヤーは死亡。この場合はGoodの勝利となる。個人的な勝利・敗北条件もそのまま適用される。' },
  { name: 'ブラックホール',             count: 1,  content: 'ここに入るとサイコロを2個不利、自分のESP能力レベル以下を出せば無事。失敗するとブラックホールに落ち、ホワイトホールに出る。ホワイトホールのカードが見つからなければゲームに登場できない（ゲーム終了時には死亡と同じ）、。' },
  { name: '兵員室',                     count: 3,  content: '第1部の戦闘発生と同じ。ただし、相手が全滅しないうちに戦闘が終了するとこのカードは残り、またここに入ると再びランダム戦闘チャートでチェックを行う。' },
  { name: 'ホワイトホール',             count: 1,  content: 'ブラックホールに落ちたプレイヤーがいる時は、ここに登場できる。それ以外は何もない。' },
  { name: '山羊牧場',                   count: 1,  content: 'シルエットがロックのプレイヤーは、ここへ入ると山羊牧場（盤外）へテレポートされる。山羊を集まるのにサイコロ1個で出た目の数だけかかる。その間ゲームには参加できない（耐久力も回復しない）。\n終了したら基地の外周から再登場する。' },
  { name: 'ランダムテレポート',         count: 8,  content: 'サイコロを2個振り、赤色＝タテ、白色＝ヨコに対応したボックスへ移動する。もちろん、移動した先の指示に従う。' },
];

const BASE_CARD_DEFINITIONS = BASE_CARD_RAW.flatMap(({ name, count, content }) =>
  Array.from({ length: count }, () => ({ name, content }))
);

// 惑星カード定義（名称・枚数・詳細テキスト・能力カード判別フラグ）
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
  { name: '[能力]エネルギー吸収ボールLv3', count: 1,  isAbility: true,  content: 'レベル3\nESPレベル3のエネルギー吸収ボールを作れる。\nこのカードは防御カードの代わりに使う。攻撃をかけた相手は、サイコロを2個振って自分のESP能力レベル以下を出さないとエネルギーを吸収されてしまう。\nその場合は、さらにサイコロを1個振り、目の数のラウンドの間、気を失って何もできない（戦闘が終了すれば治る）。エネルギーを吸収できなくても防御にはなる。このカードは1度出すと、その先頭が終わるかレベルを超える攻撃を受けると捨てなくてはならない。' },
  { name: '[能力]エネルギー吸収ボールLv4', count: 1,  isAbility: true,  content: 'レベル4\nESPレベル4のエネルギー吸収ボールを作れる。\nこのカードは防御カードの代わりに使う。攻撃をかけた相手は、サイコロを2個振って自分のESP能力レベル以下を出さないとエネルギーを吸収されてしまう。\nその場合は、さらにサイコロを1個振り、目の数のラウンドの間、気を失って何もできない（戦闘が終了すれば治る）。エネルギーを吸収できなくても防御にはなる。このカードは1度出すと、その先頭が終わるかレベルを超える攻撃を受けると捨てなくてはならない。' },
  { name: '[能力]エネルギー吸収ボールLv5', count: 1,  isAbility: true,  content: 'レベル5\nESPレベル5のエネルギー吸収ボールを作れる。\nこのカードは防御カードの代わりに使う。攻撃をかけた相手は、サイコロを2個振って自分のESP能力レベル以下を出さないとエネルギーを吸収されてしまう。\nその場合は、さらにサイコロを1個振り、目の数のラウンドの間、気を失って何もできない（戦闘が終了すれば治る）。エネルギーを吸収できなくても防御にはなる。このカードは1度出すと、その先頭が終わるかレベルを超える攻撃を受けると捨てなくてはならない。' },
  { name: '[能力]クローン',                count: 3,  isAbility: true,  content: '戦闘で死亡しても、このカードを出せば次の回に再び登場できる。第1部では惑星の宇宙港から（Evillシルエットは盤外）、第2部は基地外周から登場する。\n[カード]' },
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

// デッキ配列から惑星編ボード（6×7）を生成する
function createBoardFromDeck(
  deck: Array<{ name: string; content: string; isAbility: boolean }>
): Cell[][] {
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
          isDestroyed: false,
          isKeyPoint: false,
          keyPointLabel: null,
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

// 初期ボードを生成する（6行×7列・全78枚デッキの先頭36枚を配置）
export function createInitialBoard(): Cell[][] {
  return createBoardFromDeck(buildDeck());
}

// 秘密基地編の初期ボードを生成する（6行×6列）
export function createInitialBaseBoard(): Cell[][] {
  // 52枚デッキをシャッフルして先頭36枚をボードに配置
  const deck = [...BASE_CARD_DEFINITIONS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const board: Cell[][] = [];
  for (let row = 0; row < 6; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < 6; col++) {
      const { name, content } = deck[row * 6 + col];
      const card: CardData = {
        id: `base-card-${row}-${col}`,
        name,
        content,
        isAbility: false,
        isFaceUp: false,
        isAmbush: false,
        ambushLabel: null,
        openedBy: null,
        isDestroyed: false,
        isKeyPoint: false,
        keyPointLabel: null,
      };
      rowCells.push({ row, col, isSpaceport: false, card });
    }
    board.push(rowCells);
  }
  return board;
}

// 初期ゲーム状態を生成する
// ダイスの初期状態を生成する
function createInitialDice(): DiceState {
  return { values: [1, 1], rolledByName: null, rollId: 0 };
}

export function createInitialGameState(): ServerGameState {
  return {
    phase: 'LOBBY',
    players: [],
    board: createInitialBoard(),
    ambushPositions: [],
    baseBoard: null,
    keyPointPositions: [],
    dice: createInitialDice(),
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

// 待ち伏せ設定フェーズ移行時の処理:
// evil プレイヤー1人につき能力カードを1枚配布し、配布分を除いた残りでボードを再生成する
export function dealAmbushCards(state: ServerGameState): void {
  const deck = buildDeck(); // 全78枚シャッフル済み
  const evilPlayers = state.players.filter((p) => p.faction === 'evil');

  // 既存の配布をクリア（リスタート時の再配布に備える）
  state.players.forEach((p) => {
    p.dealtCard = null;
  });

  // 能力カードを先頭から evil の人数分取り出して配布。残りはボード用デッキへ。
  const remaining: Array<{ name: string; content: string; isAbility: boolean }> = [];
  let dealtCount = 0;
  for (const card of deck) {
    if (dealtCount < evilPlayers.length && card.isAbility) {
      evilPlayers[dealtCount].dealtCard = { name: card.name, content: card.content };
      dealtCount++;
    } else {
      remaining.push(card);
    }
  }

  // 配布分を除いた残りデッキからボードを再生成する
  state.board = createBoardFromDeck(remaining);
}

// ゲームを終了する（プレイヤーも含めてすべてリセット）
export function endGame(state: ServerGameState): void {
  state.phase = 'LOBBY';
  state.board = createInitialBoard();
  state.ambushPositions = [];
  state.baseBoard = null;
  state.keyPointPositions = [];
  state.dice = createInitialDice();
  state.players = []; // 全プレイヤーを削除
}

// ゲームをリスタートする（フェーズをLOBBYに戻し、ボードをリセット）
export function restartGame(state: ServerGameState): void {
  state.phase = 'LOBBY';
  state.board = createInitialBoard();
  state.ambushPositions = [];
  state.baseBoard = null;
  state.keyPointPositions = [];
  state.dice = createInitialDice();

  // 切断中のプレイヤーを削除し、接続中のプレイヤーの状態をリセット
  state.players = state.players.filter((p) => p.isConnected);
  state.players.forEach((player) => {
    player.faction = undefined;
    player.isApproved = player.isHost; // ホストのみ自動承認
    player.position = null;
    player.dealtCard = null;
  });
}

// ダイスを振る（2個・1〜6）。全員共有のダイス状態を更新する
export function rollDice(state: ServerGameState, playerName: string): void {
  const roll = () => Math.floor(Math.random() * 6) + 1;
  state.dice = {
    values: [roll(), roll()],
    rolledByName: playerName,
    rollId: state.dice.rollId + 1,
  };
}

// 秘密基地編に遷移する（BASE_SETUPフェーズ、全プレイヤーを除外ゾーンに移動）
export function startBase(state: ServerGameState): void {
  state.phase = 'BASE_SETUP';
  state.baseBoard = createInitialBaseBoard();
  state.keyPointPositions = [];
  // 全プレイヤーを除外ゾーンにリセット
  state.players.forEach((player) => {
    player.position = { row: -1, col: -1 };
  });
}

// 重要拠点を設定する（設定順にラベルを付与）
export function setKeyPoints(
  state: ServerGameState,
  positions: Array<{ row: number; col: number }>
): void {
  if (!state.baseBoard) return;

  // 全マスの重要拠点フラグをリセット
  state.baseBoard.forEach((row) => {
    row.forEach((cell) => {
      if (cell.card) {
        cell.card.isKeyPoint = false;
        cell.card.keyPointLabel = null;
      }
    });
  });

  // 新しい重要拠点を設定（設定順にラベルを付与）
  state.keyPointPositions = positions;
  positions.forEach(({ row, col }, index) => {
    const card = state.baseBoard![row][col].card;
    if (card) {
      card.isKeyPoint = true;
      card.keyPointLabel = KEY_POINT_LABELS[index];
    }
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
      // （未参加ソケットは playerId が null になり、未開封カードの openedBy === null と
      //   一致して全開示されてしまうため、null を明示的に除外する）
      const canSeeAbilityContent =
        !card.isAbility || (playerId !== null && card.openedBy === playerId);

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

  // 秘密基地編ボードのフィルタリング（重要拠点情報はgoodプレイヤーに非公開）
  const filteredBaseBoard = state.baseBoard
    ? state.baseBoard.map((row) =>
        row.map((cell) => {
          if (!cell.card) return cell;
          const card = cell.card;
          // 重要拠点情報はevilか表向きの場合のみ公開
          const canSeeKeyPoint = isEvil || card.isFaceUp;
          // 重要拠点が見える場合は、名称・説明文を重要拠点のものに差し替える
          // （元のカードのデータは state 側で保持し、ここでは送信用にのみ上書き）
          const showKeyPointInfo = canSeeKeyPoint && card.isKeyPoint && card.keyPointLabel !== null;
          return {
            ...cell,
            card: {
              ...card,
              isKeyPoint: canSeeKeyPoint ? card.isKeyPoint : false,
              keyPointLabel: canSeeKeyPoint ? card.keyPointLabel : null,
              name: showKeyPointInfo ? card.keyPointLabel! : card.name,
              content: showKeyPointInfo
                ? (KEY_POINT_DESCRIPTIONS[card.keyPointLabel!] ?? card.content)
                : card.content,
            },
          };
        })
      )
    : null;

  // players から各プレイヤー個人の秘匿情報（配布カード）とサーバー内部のsocketIdを除外して送信する
  const filteredPlayers = state.players.map((p) => {
    const { dealtCard, socketId, ...rest } = p;
    return rest;
  });

  // goodプレイヤーの獲得カード: 惑星編ボードで自分が開いて表のままの能力カード
  // （裏に戻されると isFaceUp が false になり自動的にリストから外れる。
  //   待ち伏せマスは戦闘扱いのため、元が能力カードでも獲得対象にしない）
  const myAcquiredCards =
    player?.faction === 'good'
      ? state.board.flatMap((row) =>
          row.flatMap((cell) =>
            cell.card &&
            cell.card.isAbility &&
            !cell.card.isAmbush &&
            cell.card.isFaceUp &&
            cell.card.openedBy === playerId
              ? [{ name: cell.card.name, content: cell.card.content }]
              : []
          )
        )
      : [];

  return {
    phase: state.phase,
    players: filteredPlayers,
    board: filteredBoard,
    baseBoard: filteredBaseBoard,
    myId: player?.id ?? socketId, // 安定したUUID（Player.id）を返す
    myDealtCard: player?.dealtCard ?? null, // 自分に配布された能力カード（evilのみ）
    myAcquiredCards, // 惑星編で開いて獲得した能力カード（goodのみ）
    dice: state.dice, // ダイスは公開情報（フィルタなし）
  };
}
