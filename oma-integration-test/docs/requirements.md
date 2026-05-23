# Todo App Requirements

## Functional Requirements
- FR1: 사용자는 할 일 항목을 추가할 수 있다
- FR2: 사용자는 할 일 항목을 완료 표시할 수 있다
- FR3: 사용자는 할 일 항목을 삭제할 수 있다
- FR4: 할 일 목록은 서버에 저장된다
- FR5: 페이지 새로고침 후에도 데이터가 유지된다

## Non-Functional Requirements
- NFR1: 응답 시간 200ms 이내
- NFR2: WCAG 2.1 AA 접근성 준수
- NFR3: OWASP Top 10 보안 기준 충족
- NFR4: 모바일 반응형 지원 (375px~)

## Architecture
- 프론트엔드: 정적 HTML/CSS/JS (SPA 아님)
- 백엔드: Express REST API
- 데이터베이스: SQLite
- 인프라: AWS (Terraform)
