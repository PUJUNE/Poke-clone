---
date: 2026-06-11
type: session-log
project: "100. Fable/Poke"
source: claude
tags:
  - session-log
status: done
---

## 세션 개요

포켓몬 클론 게임(Poke) 코드베이스의 레벨업·스킬 해금·진화 시스템 구조를 파악.

## 입력 자료

- `game.js` — 게임 로직 전체
- `pokedex.js` — 포켓몬 데이터(learnset, evolutions 포함)

## 수행 작업

1. 레벨업 시 스킬 해금 시스템 구현 여부 확인
2. 이상해씨(#1) learnset 및 진화 조건 조회

## 주요 판단

- 스킬 해금: `learnMovesAt(game.js:449)` — learnset에서 현재 레벨과 일치하는 기술을 자동 습득. 슬롯(4개) 초과 시 교체 UI 제공
- 레벨업 흐름: `gainExp → levelUpTo → learnMovesAt` 순 호출
- 이상해씨 learnset: Lv1(몸통박치기·울음소리), Lv13(덩굴채찍), Lv20(독가루), Lv27(면도날잎), Lv34(성장), Lv41(수면가루), Lv48(솔라빔)
- 이상해씨 진화: Lv16 → 이상해풀(#2)

## 생성·수정한 파일

없음 (읽기 전용 세션)

## 남은 작업

없음

## 관련 링크

- [[game.js]] learnMovesAt:449, levelUpTo:467
- [[pokedex.js]] POKEDEX[1]
