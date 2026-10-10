#!/usr/bin/env bash
#
# bridge.sh - GitHub CLI 适配层
# 供 C++ 核心调用，统一输出 JSON
#
# 用法: bridge.sh <action> [args...]
# 输出: {"ok":true,"data":...} 或 {"ok":false,"error":"..."}
#
set -uo pipefail

# ---------- 环境检查 ----------
command -v gh >/dev/null 2>&1 || {
  printf '%s\n' '{"ok":false,"error":"gh CLI not found"}'
  exit 127
}

command -v jq >/dev/null 2>&1 || {
  printf '%s\n' '{"ok":false,"error":"jq not found"}'
  exit 127
}

gh auth status >/dev/null 2>&1 || {
  printf '%s\n' '{"ok":false,"error":"not authenticated, run: gh auth login"}'
  exit 1
}

# ---------- 输出助手 ----------
ok() {
  local data="$1"
  [ -n "$data" ] || fail "empty output from gh"
  jq -cn --argjson d "$data" '{ok:true,data:$d}' 2>/dev/null \
    || fail "invalid JSON from gh"
}

fail() {
  jq -cn --arg m "$1" '{ok:false,error:$m}'
  exit 1
}

# ---------- 路由 ----------
action="${1:-}"
[ -n "$action" ] || fail "missing action"
shift

case "$action" in

  me)
    out=$(gh api /user 2>&1) || fail "gh api /user: $out"
    ok "$out"
    ;;

  repos)
    out=$(gh repo list --limit 50 \
      --json id,name,nameWithOwner,description,isPrivate,stargazerCount,updatedAt,primaryLanguage,url \
      2>&1) || fail "gh repo list: $out"
    ok "$out"
    ;;

  repo)
    slug="${1:-}"; [ -n "$slug" ] || fail "usage: repo <owner/name>"
    out=$(gh api "repos/$slug" 2>&1) || fail "gh api repos/$slug: $out"
    ok "$out"
    ;;

  issues)
    slug="${1:-}"; [ -n "$slug" ] || fail "usage: issues <owner/name>"
    out=$(gh issue list --repo "$slug" --limit 50 --state open \
      --json number,title,state,author,labels,createdAt,updatedAt,comments,url \
      2>&1) || fail "gh issue list: $out"
    ok "$out"
    ;;

  issue)
    slug="${1:-}"; num="${2:-}"
    [ -n "$slug" ] && [ -n "$num" ] || fail "usage: issue <owner/name> <number>"
    out=$(gh issue view "$num" --repo "$slug" \
      --json number,title,body,state,author,labels,comments,createdAt,updatedAt,url \
      2>&1) || fail "gh issue view: $out"
    ok "$out"
    ;;

  pulls)
    slug="${1:-}"; [ -n "$slug" ] || fail "usage: pulls <owner/name>"
    out=$(gh pr list --repo "$slug" --limit 50 --state open \
      --json number,title,state,author,labels,createdAt,updatedAt,isDraft,url \
      2>&1) || fail "gh pr list: $out"
    ok "$out"
    ;;

  pr)
    slug="${1:-}"; num="${2:-}"
    [ -n "$slug" ] && [ -n "$num" ] || fail "usage: pr <owner/name> <number>"
    out=$(gh pr view "$num" --repo "$slug" \
      --json number,title,body,state,author,labels,comments,files,additions,deletions,createdAt,updatedAt,url,mergeable \
      2>&1) || fail "gh pr view: $out"
    ok "$out"
    ;;

  notifications)
    out=$(gh api /notifications 2>&1) || fail "gh api /notifications: $out"
    ok "$out"
    ;;

  dashboard)
    prs=$(gh search prs --author=@me --state=open --limit 15 \
      --json number,title,repository,updatedAt,url,isDraft 2>&1) \
      || fail "dashboard prs: $prs"
    issues=$(gh search issues --author=@me --state=open --limit 15 \
      --json number,title,repository,updatedAt,url 2>&1) \
      || fail "dashboard issues: $issues"
    repos=$(gh repo list --limit 8 \
      --json nameWithOwner,description,stargazerCount,updatedAt,primaryLanguage,isPrivate 2>&1) \
      || fail "dashboard repos: $repos"

    out=$(jq -cn \
      --argjson prs "$prs" \
      --argjson issues "$issues" \
      --argjson repos "$repos" \
      '{prs:$prs, issues:$issues, repos:$repos}') \
      || fail "dashboard jq failed"

    ok "$out"
    ;;

  search)
    q="${1:-}"; [ -n "$q" ] || fail "usage: search <query>"
    out=$(gh search repos "$q" --limit 30 \
      --json id,name,nameWithOwner,description,stargazersCount,updatedAt,language,url \
      2>&1) || fail "gh search repos: $out"
    ok "$out"
    ;;

  *)
    fail "unknown action: $action"
    ;;
esac