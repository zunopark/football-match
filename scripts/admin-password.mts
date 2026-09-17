/**
 * 문서 15.2 (F-17-01) — 어드민 공유 계정 1개의 비밀번호는 bcrypt 해시로만 보관한다.
 *
 *   npm run admin:hash     비밀번호를 입력받아 .env 의 ADMIN_PASSWORD_HASH 에 넣을 값을 출력
 *   npm run admin:verify   .env 의 ADMIN_PASSWORD_HASH 와 입력한 비밀번호가 일치하는지 확인
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;
const MIN_LENGTH = 12;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** 비밀번호가 화면·셸 히스토리에 남지 않도록 TTY 입력은 에코를 끈다. */
async function promptPassword(): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY,
  });
  process.stdout.write("어드민 비밀번호: ");
  (rl as unknown as { _writeToOutput: (chunk: string) => void })._writeToOutput = () => {};

  const password = await rl.question("");
  rl.close();
  process.stdout.write("\n");
  return password.trim();
}

const command = process.argv[2];

if (command === "hash") {
  const password = await promptPassword();
  if (password.length < MIN_LENGTH) fail(`비밀번호는 ${MIN_LENGTH}자 이상으로 설정해주세요.`);

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  console.log(
    `.env 의 ADMIN_PASSWORD_HASH 에 아래 값을 넣은 뒤 \`npm run admin:verify\` 로 확인하세요.\n\n` +
      `ADMIN_PASSWORD_HASH=${hash}\n`,
  );
} else if (command === "verify") {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) fail(".env 의 ADMIN_PASSWORD_HASH 가 비어 있습니다. 먼저 `npm run admin:hash` 를 실행하세요.");

  const password = await promptPassword();
  if (!(await bcrypt.compare(password, hash))) fail("일치하지 않습니다.");

  console.log(`일치합니다. (ADMIN_USERNAME=${process.env.ADMIN_USERNAME ?? "미설정"})`);
} else {
  fail("사용법: npm run admin:hash | npm run admin:verify");
}
