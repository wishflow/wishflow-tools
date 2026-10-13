#!/bin/sh
set -eu

REPOSITORY_BASE_URL='https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet'
EXPECTED_PET_JSON_SHA256='9279ef338ef91cb56b99753f56f4335fa1dc55f38a765a7008a182fc5a92b2da'
EXPECTED_SPRITESHEET_SHA256='3bb176b93e06e7a9d73717f26ac102f816f64d083e77d11691f3aa63958306a0'

fail() {
  printf '错误：%s\n' "$*" >&2
  exit 1
}

for utility in curl mktemp cmp mkdir mv rm find wc tr grep awk cp; do
  command -v "$utility" >/dev/null 2>&1 || fail "缺少必需工具：$utility。请安装该工具后重试。"
done

if command -v sha256sum >/dev/null 2>&1; then
  hash_file() { sha256sum "$1" | awk 'NR == 1 { print $1 }'; }
elif command -v shasum >/dev/null 2>&1; then
  hash_file() { shasum -a 256 "$1" | awk 'NR == 1 { print $1 }'; }
else
  fail '找不到 sha256sum 或 shasum，无法校验安装文件。'
fi

if [ -n "${CODEX_HOME:-}" ]; then
  codex_home=$CODEX_HOME
else
  codex_home=${HOME:?无法确定用户主目录}/.codex
fi

pets_dir=$codex_home/pets
target_dir=$pets_dir/uu-usagi
tmp_dir=
stage_dir=

cleanup() {
  if [ -n "$stage_dir" ]; then rm -rf "$stage_dir"; fi
  if [ -n "$tmp_dir" ]; then rm -rf "$tmp_dir"; fi
}

trap cleanup 0
trap 'exit 1' HUP INT TERM

tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/usagi-pet.XXXXXX") || fail '无法创建下载临时目录。'
pet_json_download=$tmp_dir/pet.json
spritesheet_download=$tmp_dir/spritesheet.webp

curl -fsSL "$REPOSITORY_BASE_URL/pets/uu-usagi/pet.json" -o "$pet_json_download" || fail '下载 pet.json 失败。'
curl -fsSL "$REPOSITORY_BASE_URL/pets/uu-usagi/spritesheet.webp" -o "$spritesheet_download" || fail '下载 spritesheet.webp 失败。'

actual_pet_json_hash=$(hash_file "$pet_json_download") || fail '无法计算 pet.json 的 SHA-256。'
actual_spritesheet_hash=$(hash_file "$spritesheet_download") || fail '无法计算 spritesheet.webp 的 SHA-256。'
[ "$actual_pet_json_hash" = "$EXPECTED_PET_JSON_SHA256" ] || fail 'pet.json 的 SHA-256 不匹配，已停止安装。'
[ "$actual_spritesheet_hash" = "$EXPECTED_SPRITESHEET_SHA256" ] || fail 'spritesheet.webp 的 SHA-256 不匹配，已停止安装。'
grep -Eq '"spritesheetPath"[[:space:]]*:[[:space:]]*"spritesheet\.webp"' "$pet_json_download" || fail 'pet.json 未指向同目录下的 spritesheet.webp。'

target_exists=false
if [ -e "$target_dir" ] || [ -L "$target_dir" ]; then target_exists=true; fi

if [ "$target_exists" = true ]; then
  [ -d "$target_dir" ] || fail "安装目标已存在但不是目录：$target_dir。请手动检查后重试。"
  total_entries=$(find "$target_dir" -print | wc -l | tr -d '[:space:]')
  directory_entries=$(find "$target_dir" -type d -print | wc -l | tr -d '[:space:]')
  link_entries=$(find "$target_dir" -type l -print | wc -l | tr -d '[:space:]')
  if [ "$total_entries" = 3 ] && [ "$directory_entries" = 1 ] && [ "$link_entries" = 0 ] \
    && [ -f "$target_dir/pet.json" ] && [ -f "$target_dir/spritesheet.webp" ] \
    && cmp -s "$target_dir/pet.json" "$pet_json_download" \
    && cmp -s "$target_dir/spritesheet.webp" "$spritesheet_download"; then
    printf 'Usagi 已安装：%s\n' "$target_dir"
    exit 0
  fi
  fail "安装目标包含不同、缺失或额外内容：$target_dir。请手动检查；安装器不会覆盖或删除现有文件。"
fi

mkdir -p "$pets_dir" || fail "无法创建宠物目录：$pets_dir"
stage_dir=$(mktemp -d "$pets_dir/.uu-usagi.XXXXXX") || fail "无法在安装目标旁创建暂存目录：$pets_dir"
cp "$pet_json_download" "$stage_dir/pet.json"
cp "$spritesheet_download" "$stage_dir/spritesheet.webp"

cmp -s "$pet_json_download" "$stage_dir/pet.json" || fail '暂存后的 pet.json 校验失败。'
cmp -s "$spritesheet_download" "$stage_dir/spritesheet.webp" || fail '暂存后的 spritesheet.webp 校验失败。'
if [ -e "$target_dir" ] || [ -L "$target_dir" ]; then
  fail "安装目标在准备期间出现：$target_dir。原目录未覆盖，请检查后重试。"
fi

mv "$stage_dir" "$target_dir" || fail "无法将完整宠物包移动到：$target_dir"
stage_dir=
printf 'Usagi 已安装到：%s\n' "$target_dir"
printf '请在 ChatGPT / Codex 的 Pets 设置中刷新并手动选择 Usagi；CLI 可运行 /pets uu-usagi。\n'
