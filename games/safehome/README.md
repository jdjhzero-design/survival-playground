# 폭염 타파! 안전한 퇴근길

**Safe Home in Heatwave** — 폭염 경보 속 건설·정비 현장 안전 관리 시뮬레이션 게임

## 실행 방법

`index.html` 파일을 브라우저에서 열면 바로 플레이할 수 있습니다.

```bash
# 로컬 서버로 실행 (선택)
npx serve .
# 또는
python -m http.server 8080
```

## Vercel 배포

이 프로젝트는 **빌드 없는 정적 HTML**이라 Vercel에 그대로 올리면 됩니다.

### 방법 A — GitHub 연동 (추천, 자동 배포)

1. GitHub에 새 저장소 생성 (예: `beatheat`)
2. 로컬에서 푸시:

```bash
cd d:\game\beatheat
git init
git add .
git commit -m "폭염 타파! 안전한 퇴근길 게임"
git branch -M main
git remote add origin https://github.com/사용자명/beatheat.git
git push -u origin main
```

3. [vercel.com](https://vercel.com) → **Add New Project** → GitHub 저장소 Import
4. 설정: Framework **Other**, Root Directory `.`, Build Command 비움, Output Directory `.`
5. Deploy → 이후 `main`에 푸시할 때마다 자동 재배포

### 방법 B — CLI로 바로 배포 (GitHub 없이)

```bash
cd d:\game\beatheat
npx vercel
```

처음 실행 시 Vercel 로그인·프로젝트 이름만 입력하면 URL이 발급됩니다. 프로덕션 배포는:

```bash
npx vercel --prod
```

### 주의

- `assets/` 폴더의 PNG 이미지도 함께 커밋·배포되어야 합니다.
- `character-main.png` 등 용량이 큰 파일은 GitHub 단일 파일 100MB 제한 안에서는 문제 없습니다.

## 게임 목표

오전 9시부터 오후 6시까지, 온열질환자 없이 모든 작업자를 안전하게 퇴근시키세요.

## 조작 요약

| 버튼 | 효과 |
|------|------|
| 💧 물 배급 | 갈증 해소, 위험도 감소 |
| 냉방 가동 | 온도·위험도 상승 억제 |
| 🛑 강제 휴식 | 20분 휴식, 위험도 대폭 감소 (2시간마다 권장) |
| 냉방조끼 지급 | 체력 유지, 위험 상승 속도 완화 |
| ⛔ 옥외작업 중지 | 2단계(35°C)·무더위 시간대 필수 |
| 🚨 전면 중지 | 3단계(38°C+) 필수 |

## 체감온도별 행동요령

| 체감온도 | 경보 | 행동요령 |
|---------|------|----------|
| **33°C+** | 폭염주의보 | 옥외작업을 단축하거나 시간대를 바꾸세요 |
| **35°C+** | 폭염경보 | 무더위 시간대(14~17시), 불가피한 경우 빼고 옥외작업 중지 |
| **38°C+** | 폭염중대경보 | 긴급조치 작업을 제외한 모든 옥외작업 즉시 중지·대피 |

게임 상단에 33·35·38°C 단계가 표시되며, 단계 전환 시 팝업과 현장 행동요령 패널이 갱신됩니다.

## 응급 미니게임

작업자가 쓰러지면 골든타임 응급처치가 시작됩니다.

- **의식 없음** → 1초 안에 [119 신고] 5회 연타
- **의식 있음** → 그늘 이동 → 물 섭취 → 증상 악화 시 119 호출

## 파일 구성

- `index.html` — 게임 UI
- `style.css` — 스타일 및 단계별 화면 효과
- `game.js` — 게임 로직
- `assets/` — 게임 이미지 에셋
  - `character-main.png` — 메인 캐릭터 (시작·작업자 아바타)
  - `character-success.png` — 성공 엔딩
  - `character-fail.png` — 실패 엔딩·쓰러진 작업자
  - `icon-ac.png` — 냉방 가동 버튼
  - `icon-cooling-vest.png` — 냉방조끼 지급 버튼
  - `icon-water.png` — 물 배급 버튼
  - `icon-rest.png` — 강제 휴식 버튼
  - `icon-thermometer.png` — 체감온도 표시 (38°C 사이렌 연출)
