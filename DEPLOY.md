# 배포 안내

이 프로젝트는 빌드 과정이 없는 정적 사이트입니다. 아래 파일만 업로드하면 바로 운영할 수 있습니다.

## 배포 대상 파일

- `index.html`
- `style.css`
- `visualizer.js`

## Vercel

1. Vercel 대시보드에서 `Add New Project`를 선택합니다.
2. 이 폴더를 GitHub 저장소로 올리거나, `Browse`로 직접 업로드합니다.
3. Framework Preset은 `Other` 또는 `No Framework`로 둡니다.
4. Build Command와 Output Directory는 비워둡니다.
5. 배포 후 발급된 URL로 접속합니다.

## GitHub Pages

1. 새 GitHub 저장소를 만들고 현재 폴더의 파일을 업로드합니다.
2. 저장소 `Settings`로 이동합니다.
3. `Pages` 메뉴에서 `Deploy from a branch`를 선택합니다.
4. `main` 브랜치의 `/root`를 배포 대상으로 지정합니다.
5. 잠시 후 발급된 GitHub Pages URL로 접속합니다.

## Netlify

1. Netlify에 로그인합니다.
2. 대시보드에서 `Add new site`를 선택합니다.
3. 현재 폴더를 드래그 앤 드롭하거나 Git 저장소를 연결합니다.
4. 빌드 설정은 필요 없습니다.
5. 배포 완료 후 생성된 사이트 URL을 사용합니다.

## 로컬 테스트

다음 명령으로 로컬 서버를 띄운 뒤 브라우저에서 확인합니다.

```powershell
python -m http.server 8000
```

브라우저 주소:

```text
http://127.0.0.1:8000/
```
