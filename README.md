# 문서 결재 시스템

적은 인원이 간단하게 사용할 수 있는 문서 결재 시스템입니다.

## 기능

- **로그인**: 아이디/비밀번호 로그인
- **문서 작성**: 제목, 내용, 결재자 선택
- **결재**: 승인/반려 처리
- **조회**: 상태별 필터, 내 문서만 보기
- **관리자**: 사용자 등록/수정/삭제 (admin 권한)

## 개발 환경

`.env` 파일에 `DATABASE_URL` (Supabase PostgreSQL 연결 문자열) 설정 후:

```bash
npm install
npm run dev
```

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3000

## 배포 환경

```bash
npm install
npm run build
npm run start
```

- 단일 서버로 실행 (Express가 빌드된 React 정적 파일 서빙)
- `PORT` 환경 변수 사용 (Replit 등에서 자동 지정)

## 배포 가이드

GitHub + Replit 배포 방법은 [배포_가이드.md](./배포_가이드.md) 를 참고하세요.

## 초기 계정

| 아이디 | 비밀번호 | 역할 |
|--------|----------|------|
| admin  | admin123 | 관리자 |
| user1  | user123  | 일반 |

## 기술 스택

- Frontend: React, Vite, React Router
- Backend: Express, Supabase PostgreSQL (pg)
- 인증: JWT
