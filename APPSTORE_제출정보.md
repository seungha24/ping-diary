# ping-diary · App Store 제출 정보 (복붙용)

> App Store Connect가 활성화되면 아래 값을 각 칸에 그대로 붙여넣으면 됩니다.
> Apple ID: seungha24 / 팀 ID: LGJL9B44HU / 번들 ID: `com.seungha.pingdiary`

---

## 1. 앱 이름 / 부제

| 항목 | 값 |
|------|-----|
| **이름 (App Name, 30자)** | `ping-diary` |
| **부제 (Subtitle, 30자)** | `AI가 답해주는 감정 일기장` |

## 2. 프로모션 텍스트 (170자, 심사 없이 언제든 수정 가능)

```
하루의 감정을 기록하면 AI가 진심으로 답해주는 일기장. 선생님·엄마·소설가·시인 등 원하는 목소리를 골라 오늘의 나를 돌아보세요.
```

## 3. 설명 (Description, 4000자)

```
ping-diary는 하루의 감정을 기록하면, AI가 당신의 이야기에 진심으로 응답해주는 감정 일기장입니다.

■ 나에게 맞는 목소리를 골라보세요
선생님, 엄마, 소설가, 전기 작가, 시인 — 5가지 페르소나 중 원하는 목소리를 고르면, 그날의 일기 속 구체적인 순간에 반응하는 코멘트를 받아볼 수 있어요. 뻔한 위로가 아니라, 내가 쓴 이야기를 진짜로 읽은 듯한 한마디.

■ 사진과 함께 남기는 하루
일상, 여행, 독서, 맛집, 음악 등 폴더로 정리하고, 사진을 더해 그날의 분위기를 오래 간직하세요.

■ 소중한 사람과 함께 쓰는 일기
가족, 친구, 모임과 그룹을 만들어 서로의 일기를 나눠보세요. 공개하고 싶은 기록만 골라서 공유할 수 있어요.

■ 캘린더와 통계로 돌아보기
달력에서 그날의 기록을 한눈에 보고, 얼마나 꾸준히 썼는지 통계로 확인하세요.

■ 안전하게
부적절한 콘텐츠는 신고·차단할 수 있고, AI 코멘트는 안전 필터를 거칩니다. 당신의 일기는 당신의 것입니다.

지금, 오늘의 마음을 ping-diary에 남겨보세요.
```

## 4. 키워드 (100자, 쉼표 구분·띄어쓰기 없이)

```
일기,감정일기,다이어리,AI일기,일기장,감정기록,저널,회고,글쓰기,다이어리앱,journal,마음일기,하루기록
```

## 5. 카테고리

| 항목 | 값 |
|------|-----|
| 기본 카테고리 | **라이프스타일** |
| 보조 카테고리 | **소셜 네트워킹** (그룹 공유 기능 때문에) |

## 6. URL

| 항목 | 값 |
|------|-----|
| 개인정보 처리방침 URL | `https://ping-diary.vercel.app/privacy.html` |
| 지원(Support) URL | `https://ping-diary.vercel.app` |
| 마케팅 URL (선택) | `https://ping-diary.vercel.app` |
| 저작권 | `2026 seungha Park` |

---

## 7. App Privacy 설문 (⚠️ 중요 — 정확히 답해야 함)

**데이터를 수집하나요? → 예**

수집 항목 (전부 "앱 기능"용, "사용자에 연결됨 Yes", "추적 No"):

| 데이터 유형 | 세부 | 용도 |
|------------|------|------|
| 연락처 정보 | 이메일 주소 | 계정 (앱 기능) |
| 연락처 정보 | 이름(표시 이름) | 앱 기능 |
| 사용자 콘텐츠 | 사진 | 앱 기능 |
| 사용자 콘텐츠 | 기타 사용자 콘텐츠 (일기 본문) | 앱 기능 |
| 식별자 | 사용자 ID | 앱 기능 |

- **추적(App Tracking Transparency): 없음** — 다른 앱/웹으로 추적하지 않음
- **광고: 없음**
- 일기 본문·사진은 AI 코멘트 생성을 위해 **OpenAI**로 전송됨(처리 위탁). Supabase(저장), Railway/Vercel(호스팅)은 서비스 제공업체. → 이 내용은 privacy.html에 이미 명시돼 있음.

---

## 8. 연령 등급 (Age Rating)

- 사용자 생성 콘텐츠(UGC)와 그룹 공유가 있으므로, 설문에서 **"사용자 생성 콘텐츠" 항목에 해당**으로 답.
- 신고/차단 기능이 있으므로 그 부분 체크.
- 예상 등급: **12+** (정직하게 답하면 됨. 과장/축소 금지)

---

## 9. 심사 메모 (App Review Information)

**⚠️ 데모 계정 필수** — 애플 심사자가 로그인해서 앱을 확인해야 함. 이메일 회원가입으로 테스트 계정을 미리 하나 만들어 아이디/비번을 여기 적어주세요.

심사 메모 예시(영문 권장):
```
Demo account:
  Email: (테스트 계정 이메일)
  Password: (비밀번호)

Notes:
- This is an AI diary app. After writing a diary entry, users can request an AI-generated reflective comment (persona-based). Generated comments pass an OpenAI moderation safety filter.
- Social logins (Google/Kakao/Naver) require Korean accounts; please use the email/password demo account above to review all features.
- Shared (group) content can be reported and blocked from within the app.
```

---

## 10. ⚠️ 반드시 알아둘 리스크 — Sign in with Apple (지침 4.8)

애플 지침 4.8: **제3자 소셜 로그인(Google/Kakao/Naver)을 제공하면, "Apple로 로그인" 또는 동등한 개인정보 보호 로그인도 제공**해야 함.

- 우리 앱엔 **이메일 회원가입**이 있어서 "동등한 대안"으로 인정될 여지가 있지만, **보장되진 않음**. 애플이 "Apple로 로그인 추가하라"고 거절할 가능성이 실제로 있음.
- **대응 플랜**: 만약 이 사유로 거절되면 → "Apple로 로그인" 버튼을 추가하면 됨(내가 구현 가능). 미리 넣을 수도 있는데, 일단 제출해보고 거절되면 추가하는 전략도 가능.

---

## 남은 준비물 (내가 못 만드는 것 = 사용자 몫)
- [ ] **스크린샷** — 아이폰 6.7"(예: 15 Pro Max)와 6.5" 사이즈 필요. 시뮬레이터/실기기 캡처.
- [ ] **데모 계정** 생성 (위 심사 메모용)
- [ ] App Store Connect 활성화 대기 → 앱 등록 → 빌드 업로드
