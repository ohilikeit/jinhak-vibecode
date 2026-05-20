# /ship — .harness git 커밋

`.harness/state.md`, `.harness/plans/`, `.harness/logs/` 같이 자동화 기록을 git에 atomic 커밋합니다. **소스 코드는 건드리지 않습니다**.

## 실행

미리 보기 (어떤 파일이 커밋될지):

```bash
npx -y jinhak-harness ship
```

실제 커밋:

```bash
npx -y jinhak-harness ship --confirm
```

원격 푸시까지:

```bash
npx -y jinhak-harness ship --confirm --push
```

`$ARGUMENTS` 그대로 전달:

```bash
npx -y jinhak-harness ship $ARGUMENTS
```

## 사용 시점

- 일주일 단위로 자동화 활동을 정리하고 싶을 때
- 다른 사람과 `.harness/state.md` 의 결정 로그를 공유할 때
- git 저장소가 아닌 폴더에서는 안내 후 종료(무해).
