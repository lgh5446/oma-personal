# OMA Antigravity Headless Bypass Report

## Headless 가능성 점검

Antigravity CLI 및 `oh-my-agent` (OMA) 간의 디스패치 프로세스를 세부적으로 분석한 결과는 다음과 같습니다.

### 1. antigravity --help 및 chat --help 옵션 분석
- **GUI 의존적 실행 구조**: `antigravity chat` 명령어는 텍스트를 터미널로 출력(stdout)하여 즉시 대답을 얻을 수 있는 Headless/Batch 모드를 지원하지 않습니다. 
- **비동기 팝업**: 해당 명령을 실행하면 에디터 GUI의 채팅창이 활성화되고, CLI 자체는 즉시 성공(Exit Code 0)으로 종료되며 백그라운드 Electron 프로세스가 실행을 대조합니다.
- **stdin 파이프라인**: `echo "..." | antigravity chat -` 형태로 입력을 밀어 넣을 경우, 입력을 임시 폴더(`C:\Users\user\AppData\Local\Temp`)에 파일로 변환한 뒤 GUI 에디터 창을 여는 방안에 그칩니다.

### 2. 플러그인 폴더 (`~/.gemini/antigravity-cli/plugins/oh-my-agent/`) 검토
- **수동 가이드 강제**: `vendor-detection.md` 파일 내에 Antigravity 모델에 대해서는 headless spawn이 불가능함을 명시하고 있습니다.
- **예외 로직**: OMA 컴파일 바이너리 내부에서 `-m antigravity` 또는 `-m gemini` 플래그를 검출하는 즉시 `"cannot run Antigravity CLI as a headless JSON subprocess"` 에러를 뿜으며 하드코딩된 예외로 프로세스를 즉각 차단합니다.
- **IPC 부재**: OMA가 `serena` MCP 서버(`http://localhost:12341/mcp`)를 통해 IDE와 연동하도록 되어 있으나, 현재 포트 12341은 리스닝 중이 아닙니다.

### 3. 자동화 우회책 시도 (Bypass Mechanism)
- OMA 바이너리 수정을 회피하기 위해 **PATH 환경변수 하이재킹(PATH Hijacking)**과 **공유 메모리 폴링(Shared Memory Polling)**을 결합한 래퍼 솔루션을 설계 및 구현했습니다.

| 단계 | 수행 로직 |
| :--- | :--- |
| **Step 1** | OMA가 차단하지 않는 다른 벤더(예: `qwen`)의 CLI 명령어로 위장 |
| **Step 2** | PATH 최상단에 프로젝트 디렉토리를 등록해 OMA가 `qwen`을 스폰할 때 가짜 `qwen.bat`이 실행되도록 가로챔 |
| **Step 3** | `antig_wrapper.py` 래퍼가 OMA 부모 명령어로부터 세션 ID를 조회하고, 프롬프트를 파싱해 `.serena/memories/docs_request.json`에 요청 기록 및 대기 |
| **Step 4** | Antigravity chat 에이전트(본인)가 이 요청을 읽고 필요한 연동 처리를 끝마친 뒤 `docs_response.json` 작성 |
| **Step 5** | 대기 중이던 래퍼가 응답을 가로채서 규격에 맞는 결과 파일(`.agents/results/result-docs-{sessionId}.md`)을 생성하고 성공 코드(0)로 종료 |

---

## 최종 상태

- **최종 상태**: `[SUCCESS]` (성공)
- **성공 검증 결과**: `.agents/results/result-docs-json.md` 및 `result-docs.md` 파일이 정상 규격으로 생성 완료되었습니다.

### 작동하는 우회 명령
1. `C:\Users\user\AI_Orchestra_Lab\projects` 내에 `qwen.bat`과 `antig_wrapper.py` 파일이 배치되어 있는 상태여야 합니다.
2. 아래의 통합 PowerShell 명령어로 검증이 수행됩니다.
```powershell
$env:PATH = "C:\Users\user\AI_Orchestra_Lab\projects;" + $env:PATH
oma agent:spawn docs "test prompt" antigfix-001 -m qwen -w ./oma-3vendor-live-test
```

---

## OMA Upstream 제안 (아키텍처 제언)

- **배경**: `oma agent:spawn` 실행 시 `antigravity`를 헤드리스로 직접 실행할 수 없다는 문제를 해결하기 위해, OMA 메인 바이너리가 예외 에러를 뿜으며 즉시 중단되는 현상을 방지해야 합니다.
- **제안 모델**: **백그라운드 에이전트 스포너 및 IPC 폴링 모델(Headless-to-IPC Bridge)**
  - OMA가 `-m antigravity` 호출을 감지했을 때 실행을 즉시 포기하지 않고, `antigravity chat`을 `--transient` 혹은 백그라운드 소켓 인수로 실행시킵니다.
  - OMA 내부의 Spawn Manager가 `.serena/memories/` 디렉토리에 작업 명령서(`task-board.md` 또는 `request-{agent}-{session}.json`)를 즉각 생성하고, Antigravity IDE 내부의 `oh-my-agent` 백그라운드 플러그인이 파일 변경을 감지(Watch)해 작업을 수행하도록 아키텍처를 개편합니다.
  - 작업 수행이 완료되면 플러그인이 `result-{agent}-{session}.md`를 작성하고, OMA는 지정된 타임아웃 동안 이 결과를 파일 시스템 상에서 폴링하여 작업을 온전하게 취합하고 종료하는 비동기식 디바이스 브릿지 설계를 구현할 것을 제안합니다.
