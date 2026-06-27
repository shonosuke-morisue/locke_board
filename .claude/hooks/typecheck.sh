#!/usr/bin/env bash
# 編集された TypeScript ファイルを型チェックする PostToolUse フック。
# Edit/Write の後に、該当プロジェクト(client/server)で tsc --noEmit を実行し、
# 型エラーがあれば exit 2 で Claude にエラー内容をフィードバックする。
# （リンター未導入・ts-node-dev の中間コンパイルエラー対策）

# stdin の JSON から file_path を抽出（jq が無い環境のため node を使用）
input=$(cat)
file_path=$(printf '%s' "$input" | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d));
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(s);
    process.stdout.write((j.tool_input && j.tool_input.file_path) || "");
  } catch (e) {}
});
')

# TypeScript ファイル以外は対象外
case "$file_path" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac

# client / server のどちらに属するか判定（どちらでもなければスキップ）
case "$file_path" in
  *client/*) proj="client" ;;
  *server/*) proj="server" ;;
  *) exit 0 ;;
esac

dir="${CLAUDE_PROJECT_DIR:-.}/$proj"
tsc_bin="$dir/node_modules/.bin/tsc"

# 依存未インストール（tsc が無い）ならスキップ
[ -x "$tsc_bin" ] || exit 0

out=$(cd "$dir" && "$tsc_bin" --noEmit 2>&1)
status=$?

if [ "$status" -ne 0 ]; then
  {
    echo "❌ 型チェックエラー ($proj): 編集後に tsc --noEmit が失敗しました。修正してください。"
    echo "$out"
  } >&2
  exit 2
fi

exit 0
