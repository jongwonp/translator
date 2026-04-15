# 기술 설계서

## 1. 시스템 구조

```
┌──────────────────────────────────────────────────┐
│                   서버 1대                        │
│                                                  │
│  ┌─ Next.js ───────────────────────────────────┐ │
│  │                                             │ │
│  │  [프론트엔드]           [API Routes]          │ │
│  │  - UI 전체              - yt-dlp (CLI 실행)   │ │
│  │  - 파일 기반 라우팅      - OpenAI Whisper API  │ │    ┌──────────┐
│  │  - 영상 플레이어         - OpenAI GPT API     │ │←──→│  SQLite   │
│  │                        - 인증 (JWT)          │ │    │          │
│  │                        - DB 접근 (Prisma)    │ │    └──────────┘
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  yt-dlp (시스템에 설치)                            │
└──────────────────────────────────────────────────┘
  TypeScript 단일 언어 / Next.js 단일 프레임워크
```

---

## 2. 기술 스택

| 구성 요소 | 기술 | 선정 이유 |
|----------|------|----------|
| 프레임워크 | Next.js | 프론트엔드 + API Routes로 백엔드까지 단일 프레임워크로 통합 |
| 언어 | TypeScript | 프론트/백엔드 단일 언어, 타입 안전성 |
| DB | SQLite | 2~5명 소규모 사용에 적합, 설치/관리 없음, 파일 하나로 동작 |
| ORM | Prisma | TypeScript 생태계 표준 ORM, SQLite 지원, 스키마 관리 편리 |
| 오디오 추출 | yt-dlp (CLI) | 유튜브/빌리빌리 등 다양한 플랫폼 지원, Node.js에서 CLI로 실행 |
| 음성 인식 | OpenAI Whisper API | 빠른 처리 속도, 서버 부담 없음, 다국어 지원, 타임스탬프 제공 |
| 번역/단어 추출 | OpenAI GPT API | 문맥 기반 고품질 번역 및 단어 분석, Whisper와 API 키 통일 |
| 인증 | JWT (jose) | 소규모 사용자에 적합한 간단한 인증 |
| 배포 | 서버 1대 (Railway, Render 등) | Next.js + SQLite + yt-dlp를 한 곳에서 운영, 무료/저비용 |

---

## 3. API 설계

### 3.1 인증

#### POST /api/auth/register
- **설명**: 회원가입
- **요청**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "사용자이름"
  }
  ```
- **응답**: 201 Created
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "name": "사용자이름"
  }
  ```

#### POST /api/auth/login
- **설명**: 로그인
- **요청**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **응답**: 200 OK
  ```json
  {
    "access_token": "eyJ...",
    "token_type": "bearer"
  }
  ```

---

### 3.2 스크립트

#### POST /api/scripts
- **설명**: 영상 URL로부터 스크립트 생성 요청
- **요청**:
  ```json
  {
    "url": "https://www.youtube.com/watch?v=xxx",
    "source_language": "ja",
    "target_language": "ko"
  }
  ```
- **응답**: 202 Accepted (처리 시간이 길 수 있으므로 비동기)
  ```json
  {
    "script_id": 42,
    "status": "processing"
  }
  ```

#### GET /api/scripts/{script_id}
- **설명**: 스크립트 조회 (처리 완료 후)
- **응답**: 200 OK
  ```json
  {
    "id": 42,
    "url": "https://www.youtube.com/watch?v=xxx",
    "title": "영상 제목",
    "source_language": "ja",
    "target_language": "ko",
    "status": "completed",
    "segments": [
      {
        "id": 1,
        "start": 0.0,
        "end": 3.2,
        "original_text": "今日は自然言語処理について話します",
        "translated_text": "오늘은 자연어 처리에 대해 이야기합니다"
      },
      {
        "id": 2,
        "start": 3.5,
        "end": 7.1,
        "original_text": "まず基本的な概念から始めましょう",
        "translated_text": "먼저 기본적인 개념부터 시작하겠습니다"
      }
    ]
  }
  ```

#### GET /api/scripts
- **설명**: 내 스크립트 목록 조회
- **응답**: 200 OK
  ```json
  {
    "scripts": [
      {
        "id": 42,
        "title": "영상 제목",
        "source_language": "ja",
        "target_language": "ko",
        "status": "completed",
        "created_at": "2026-04-15T10:00:00Z"
      }
    ]
  }
  ```

---

### 3.3 단어 추출 및 단어장

#### POST /api/scripts/{script_id}/extract-words
- **설명**: 스크립트에서 어려운 단어 추출 (저장 전 미리보기)
- **요청**:
  ```json
  {
    "segment_ids": [1, 2, 3],
    "level": "intermediate"
  }
  ```
  - `segment_ids`: 추출 대상 세그먼트 (생략 시 전체)
  - `level`: 사용자 수준 (beginner / intermediate / advanced)
- **응답**: 200 OK
  ```json
  {
    "words": [
      {
        "word": "自然言語処理",
        "reading": "しぜんげんごしょり",
        "meaning": "자연어 처리",
        "example": "今日は自然言語処理について話します",
        "segment_id": 1
      },
      {
        "word": "概念",
        "reading": "がいねん",
        "meaning": "개념",
        "example": "まず基本的な概念から始めましょう",
        "segment_id": 2
      }
    ]
  }
  ```

#### POST /api/vocabulary
- **설명**: 선택한 단어를 단어장에 저장
- **요청**:
  ```json
  {
    "script_id": 42,
    "words": [
      {
        "word": "自然言語処理",
        "reading": "しぜんげんごしょり",
        "meaning": "자연어 처리",
        "example": "今日は自然言語処理について話します"
      }
    ]
  }
  ```
- **응답**: 201 Created

#### GET /api/vocabulary
- **설명**: 내 단어장 조회
- **쿼리 파라미터**: `language`, `script_id`, `search`, `page`, `limit`
- **응답**: 200 OK
  ```json
  {
    "total": 150,
    "words": [
      {
        "id": 1,
        "word": "自然言語処理",
        "reading": "しぜんげんごしょり",
        "meaning": "자연어 처리",
        "example": "今日は自然言語処理について話します",
        "language": "ja",
        "source_title": "영상 제목",
        "created_at": "2026-04-15T10:30:00Z"
      }
    ]
  }
  ```

#### DELETE /api/vocabulary/{word_id}
- **설명**: 단어장에서 단어 삭제
- **응답**: 204 No Content

#### GET /api/vocabulary/export
- **설명**: 단어장 CSV 내보내기 (Anki 호환)
- **쿼리 파라미터**: `language`
- **응답**: CSV 파일 다운로드

---

### 3.4 사용자 설정

#### PUT /api/settings
- **설명**: 학습 수준 등 사용자 설정 저장
- **요청**:
  ```json
  {
    "language_levels": {
      "ja": "intermediate",
      "en": "advanced",
      "zh": "beginner"
    }
  }
  ```
- **응답**: 200 OK

---

## 4. DB 스키마

### users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | 사용자 ID |
| email | VARCHAR UNIQUE | 이메일 |
| password_hash | VARCHAR | 비밀번호 해시 |
| name | VARCHAR | 이름 |
| language_levels | TEXT (JSON) | 언어별 학습 수준 설정 |
| created_at | TIMESTAMP | 가입일 |

### scripts
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | 스크립트 ID |
| user_id | FK → users | 소유자 |
| url | VARCHAR | 원본 영상 URL |
| title | VARCHAR | 영상 제목 |
| source_language | VARCHAR | 원본 언어 코드 |
| target_language | VARCHAR | 번역 언어 코드 |
| status | VARCHAR | 상태 (processing / completed / failed) |
| created_at | TIMESTAMP | 생성일 |

### segments
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | 세그먼트 ID |
| script_id | FK → scripts | 소속 스크립트 |
| start_time | FLOAT | 시작 시간 (초) |
| end_time | FLOAT | 종료 시간 (초) |
| original_text | TEXT | 원본 텍스트 |
| translated_text | TEXT | 번역 텍스트 |
| position | INTEGER | 순서 |

### vocabulary
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | 단어 ID |
| user_id | FK → users | 소유자 |
| script_id | FK → scripts (nullable) | 출처 스크립트 |
| word | VARCHAR | 단어 |
| reading | VARCHAR | 발음/읽기 (후리가나, 병음 등) |
| meaning | TEXT | 뜻 |
| example | TEXT | 예문 |
| language | VARCHAR | 언어 코드 |
| created_at | TIMESTAMP | 저장일 |

---

## 5. 주요 흐름

### 5.1 스크립트 생성 흐름

```
사용자: URL 입력 + 언어 설정 + "변환" 클릭
  │
  ▼
API Route: scripts 레코드 생성 (status: processing)
  │
  ▼
API Route: yt-dlp CLI 실행 → 오디오 추출
  │
  ▼
API Route: OpenAI Whisper API 호출 → 타임스탬프 포함 세그먼트 생성
  │
  ▼
API Route: [번역 필요 시] OpenAI GPT API로 세그먼트별 번역
  │
  ▼
API Route: segments 저장 (Prisma), status → completed
  │
  ▼
프론트: 완성된 스크립트 + 영상 플레이어 표시
```

### 5.2 단어 추출 흐름

```
사용자: 스크립트 확인 후 "단어 추출하기" 클릭
  │
  ▼
사용자: (선택) 특정 세그먼트 범위 지정
  │
  ▼
API Route: 빈도 리스트로 1차 필터링 (사용자 수준 이하 제거)
  │
  ▼
API Route: 사용자 단어장과 대조하여 이미 저장된 단어 제거
  │
  ▼
API Route: OpenAI GPT API로 2차 분석 (문맥 확인, 발음/뜻 생성)
  │
  ▼
프론트: 추출된 단어 목록 표시
  │
  ▼
사용자: 저장할 단어 선택 → "저장" 클릭
  │
  ▼
API Route: vocabulary에 저장 (Prisma)
```

### 5.3 영상-스크립트 연동 흐름

```
프론트: 영상 플레이어 임베드 (유튜브 iframe API / 빌리빌리)
  │
  ├─ [사용자 → 영상] 스크립트 세그먼트 클릭
  │   → player.seekTo(segment.start_time)
  │
  └─ [영상 → 스크립트] 영상 재생 중 timeupdate 이벤트
      → 현재 시간에 해당하는 세그먼트 하이라이트
      → 해당 세그먼트로 자동 스크롤
```

---

## 6. 배포 구성

```
┌──────────────────────────────────────────────────┐
│              서버 1대 (Railway / Render 등)         │
│                                                   │
│  ┌─ Next.js ────────────────────────────────────┐ │
│  │  프론트엔드 (UI) + API Routes (백엔드)          │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ yt-dlp (시스템 설치) ───────────────────────┐  │
│  │  오디오 추출용 CLI                            │  │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ SQLite ─────────────────────────────────────┐ │
│  │  translator.db (파일 1개)                     │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
         ↕ OpenAI API (Whisper + GPT)
```

- **배포**: 서버 1대에 모든 것을 통합 (Next.js + yt-dlp + SQLite)
- **추천 환경**: Railway 또는 Render (무료/저비용 티어)
- **도메인**: 배포 플랫폼 기본 도메인 또는 커스텀 도메인
- **HTTPS**: 배포 플랫폼에서 자동 제공

---

## 7. 제약 사항 / 기술적 리스크

| 항목 | 리스크 | 대응 방안 |
|------|--------|----------|
| DRM 콘텐츠 | 넷플릭스 등 DRM 영상은 오디오 추출 불가 | 지원 플랫폼을 유튜브/빌리빌리로 한정 |
| 빌리빌리 임베드 제한 | 일부 영상 임베드 불가 | 해당 시점 URL을 새 탭으로 여는 대안 제공 |
| OpenAI API 비용 | 음성 인식 + 번역 + 단어 추출 시 토큰 사용 | 하이브리드 단어 추출로 토큰 최소화, 10분 영상 약 $0.07 |
| OpenAI API 장애 | 외부 서비스 의존, 장애 시 전체 기능 중단 | 에러 처리 및 재시도 로직 |
| 빈도 리스트 품질 | 언어별 리스트의 커버리지 차이 | JLPT/HSK 등 공인 기준 사용, LLM으로 보완 |
| SQLite 동시 쓰기 | 동시 쓰기 요청 시 잠금 | 2~5명 규모에서는 문제 없음, 사용자 증가 시 PostgreSQL 전환 (Prisma라 코드 변경 최소) |
| 저작권 | 스크립트 배포 시 저작권 문제 | 개인 학습 용도로 한정, 스크립트 공개 기능 미제공 |
