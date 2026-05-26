# GEO Platform 통합 가이드

> Frontend + Backend + AI Server 연동 및 Docker Compose 실행 방법

---

## 1. 시스템 구성

```
브라우저
  │
  ▼
Frontend (localhost:3000)  ← Python SimpleHTTPServer
  │  URL 입력 → 주문 접수
  ▼
Backend  (localhost:8080)  ← Spring Boot (Java 21)
  │  URL 크롤링 (Jsoup) + AI 호출
  ▼
AI Server (Tailscale)      ← FastAPI + LoRA 모델
  └─ https://desktop-75bjpd-lab4090.tail6dd0ea.ts.net:8443
  
PostgreSQL (localhost:5432) ← 주문·분석 결과 저장
```

---

## 2. 실행 방법 (Docker Compose)

### 사전 준비
- [Docker Desktop](https://www.docker.com/products/docker-desktop) 설치
- WSL2 활성화 (Windows)

### 실행

```bash
# Downloads 폴더 기준
cd C:\Users\{사용자명}\Downloads

docker compose up --build
```

### 접속 주소

| 서비스 | 주소 |
|--------|------|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 API | http://localhost:8080 |
| DB | localhost:5432 |

> AI 서버는 Tailscale 네트워크에 별도 배포되어 있으므로 Docker에 포함되지 않습니다.

---

## 3. API 흐름

```
1. 로그인
   POST /api/v1/auth/dummy-login
   → JWT 토큰 발급 (localStorage 저장)

2. 분석 요청
   POST /api/v1/geo/analyze
   Body: { "targetUrl": "https://example.com", "categoryStatus": "NEWS" }
   → { "message": "...", "orderId": 1 }

3. 결과 조회 (3초마다 폴링)
   GET /api/v1/geo/report/{orderId}
   → { "orderId": 1, "targetUrl": "...", "jobStatus": "SUCCESS",
       "aiResult": { "content": "AI 분석 텍스트..." }, "createdAt": "..." }
```

### categoryStatus 값 매핑

| 서비스 유형 | categoryStatus |
|------------|---------------|
| 쇼핑몰 / 이커머스 | ECOMMERCE |
| 뉴스 / 미디어 | NEWS |
| SaaS / 테크 | TECHBLOG |
| 교육 / 학술 | EDUCATION |
| 의료·로컬·기타 | ETC |

---

## 4. 변경 사항

### Frontend 변경

#### geo-order.html
- **제거**: HTML 본문 텍스트 직접 입력창
- **제거**: JSON-LD 직접 입력창
- **이유**: 백엔드가 URL에서 자동 크롤링하므로 사용자 입력 불필요

#### geo-result.html
- **변경**: KPI 카드 3개 → 5개 (AI 평가 기준 변경 반영)

| 이전 | 이후 |
|------|------|
| Schema Completeness | 엔티티 밀도 |
| Information Density | 구조적 접근성 |
| GEO-Readiness | 출처 명확성 |
| *(없음)* | 환각 저항성 |
| *(없음)* | 도메인 최적화 |

#### geo-scripts.js
| 항목 | 이전 | 이후 |
|------|------|------|
| 로그인 | 즉시 리다이렉트 | `/api/v1/auth/dummy-login` 호출 → JWT 저장 |
| 주문 제출 | AI 서버 직접 호출 | 백엔드 `/api/v1/geo/analyze` 호출 |
| 결과 표시 | sessionStorage 데이터 사용 | orderId로 백엔드 3초 폴링 |

---

### Backend 변경

#### GeoAiService.java
- **변경**: AI 서버 URL 하드코딩 → `application.yaml` 환경변수로 분리
- **변경**: `GeoEvaluationResponse` 레코드 필드 수정
  - 이전: `{status, result}`
  - 이후: `{status, result_type, content}` ← AI 서버 실제 응답 형식에 맞춤

#### GeoAsyncWorker.java
- **변경**: AI 응답 저장 방식 수정
  - 이전: `parseJsonMap(result)` → AI 텍스트를 JSON으로 파싱 시도 (오류 발생)
  - 이후: `Map.of("content", text)` → 텍스트 그대로 DB 저장

#### SecurityConfig.java
- **제거**: `.oauth2Login()` → OAuth2 클라이언트 설정 없이도 기동 가능
- **추가**: 아래 엔드포인트 인증 없이 허용
  - `POST /api/v1/auth/dummy-login`
  - `POST /api/v1/geo/analyze`
  - `GET /api/v1/geo/report/**`
  - `POST /api/v1/geo/signUp`

#### ClientUpdateForm.java
- **수정**: 클래스명 `UserUpdateForm` → `ClientUpdateForm` (파일명과 불일치로 컴파일 오류 발생하던 문제 수정)

#### application.yaml
- **추가**: 데이터베이스 설정 (환경변수 주입, 기본값 H2)
- **추가**: `jwt.secret` 기본값
- **추가**: `geo.ai-server.url` 환경변수 (`AI_SERVER_URL`)

---

## 5. 환경변수 목록

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `AI_SERVER_URL` | Tailscale AI 서버 URL | AI 서버 주소 |
| `SPRING_DATASOURCE_URL` | H2 인메모리 | DB 접속 URL |
| `SPRING_DATASOURCE_USERNAME` | sa | DB 사용자 |
| `SPRING_DATASOURCE_PASSWORD` | *(없음)* | DB 비밀번호 |
| `JWT_SECRET` | 기본 개발용 키 | JWT 서명 키 |

---

## 6. AI 서버 응답 형식

AI 서버(`/evaluate`)는 다음 형식의 텍스트를 반환합니다:

```
Total Score: 75 / 100

[엔티티 밀도]
- 점수: 15 / 20
- 강점: ...
- 개선점: ...

[구조적 접근성]
- 점수: 14 / 20
...
```

프론트엔드의 `parseAiResponse()` 함수가 이 텍스트를 파싱하여 5개 항목별 점수와 피드백을 추출합니다.
