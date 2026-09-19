/**
 * 손으로 써보며 확인하려면 리스트에 뜰 팀이 있어야 한다. 그 표본 데이터를 넣고 지운다.
 *
 *   npm run seed         표본 팀·매칭 조건 등록 (이미 있으면 먼저 지우고 다시 넣는다)
 *   npm run seed:clean   표본 데이터만 삭제
 *
 * 표본 팀은 `description` 이 SEED_MARKER 인 팀뿐이라 실제 팀은 건드리지 않는다.
 *
 * 주의: 표본 팀에는 팀원을 넣지 않는다. 지금 auth 계정이 둘뿐이라 팀원으로 넣으면
 * 그 계정에게는 "내 팀" 이 되어 문서 F-05-05 대로 목록에서 빠지기 때문이다.
 * 그래서 표본 팀 프로필은 "팀원 0명" 으로 보인다.
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";

import postgres from "postgres";

import { geocodePlace } from "../src/lib/matching/geocode.ts";

export const SEED_MARKER = "[표본 데이터] 테스트용으로 만든 팀입니다.";

type Seed = {
  name: string;
  sido: string;
  sigungu: string;
  level: number;
  venue: string;
  /** [오늘로부터 며칠 뒤, 시각, 비용] */
  slots: [number, string, string][];
};

/**
 * 필터마다 걸리는 팀이 최소 하나씩은 있도록 지역·레벨·시간대·비용을 흩어 놓았다.
 * 시간은 메인 화면의 8개 구간(오전 6시 … 오후 8시 이후)에 하나씩 떨어지게 잡았다.
 */
const SEEDS: Seed[] = [
  // 수원 — GPS 를 끄면 활동 지역(시/군)이 같은 팀만 보이므로, 기존 팀과 같은 수원을 넉넉히 둔다
  { name: "테스트 수원그린", sido: "경기도", sigungu: "수원시", level: 3, venue: "수원월드컵경기장",
    slots: [[0, "07:00", "free"], [3, "15:00", "split"]] },
  { name: "테스트 광교레드", sido: "경기도", sigungu: "수원시", level: 1, venue: "수원종합운동장",
    slots: [[1, "09:00", "split"], [6, "19:00", "free"]] },
  { name: "테스트 영통블루", sido: "경기도", sigungu: "수원시", level: 5, venue: "수원시청",
    slots: [[2, "21:00", "opponent"], [8, "11:00", "free"]] },
  { name: "테스트 매탄화이트", sido: "경기도", sigungu: "수원시", level: 4, venue: "수원월드컵보조구장",
    slots: [[0, "17:00", "split"], [7, "13:00", "negotiable"]] },

  // 서울
  { name: "테스트 마포유나이티드", sido: "서울특별시", sigungu: "마포구", level: 2, venue: "효창운동장",
    slots: [[0, "09:00", "free"], [5, "20:30", "split"]] },
  { name: "테스트 강남일레븐", sido: "서울특별시", sigungu: "강남구", level: 4, venue: "잠실종합운동장",
    slots: [[1, "19:00", "split"], [9, "07:30", "free"]] },
  { name: "테스트 목동스타즈", sido: "서울특별시", sigungu: "양천구", level: 3, venue: "목동운동장",
    slots: [[2, "11:00", "free"], [10, "16:00", "other"]] },

  // 성남 — 두 번째 계정(슬라바)의 활동 지역이라 기본 화면이 휑하지 않게 여럿 둔다
  { name: "테스트 성남시티", sido: "경기도", sigungu: "성남시", level: 5, venue: "탄천종합운동장",
    slots: [[0, "13:00", "opponent"], [4, "21:30", "split"]] },
  { name: "테스트 분당유나이티드", sido: "경기도", sigungu: "성남시", level: 2, venue: "성남종합운동장",
    slots: [[0, "19:30", "free"], [5, "10:00", "split"]] },
  { name: "테스트 위례블랙", sido: "경기도", sigungu: "성남시", level: 4, venue: "탄천종합운동장",
    slots: [[1, "11:00", "split"], [7, "17:00", "free"]] },
  { name: "테스트 모란옐로", sido: "경기도", sigungu: "성남시", level: 3, venue: "성남종합운동장",
    slots: [[2, "08:00", "free"], [9, "20:00", "split"]] },

  // 경기 기타
  { name: "테스트 고양FC", sido: "경기도", sigungu: "고양시", level: 2, venue: "고양종합운동장",
    slots: [[1, "15:00", "free"], [11, "09:30", "split"]] },
  { name: "테스트 안양그린", sido: "경기도", sigungu: "안양시", level: 4, venue: "안양종합운동장",
    slots: [[3, "17:30", "negotiable"], [12, "11:30", "free"]] },

  // 그 밖의 시/도 — 지역 필터와 GPS 반경(멀리 있는 팀)을 확인하려고 둔다
  { name: "테스트 인천세일러", sido: "인천광역시", sigungu: "남동구", level: 1, venue: "인천축구전용경기장",
    slots: [[0, "20:00", "free"], [6, "14:00", "split"]] },
  { name: "테스트 부산갈매기", sido: "부산광역시", sigungu: "해운대구", level: 3, venue: "구덕운동장",
    slots: [[1, "10:00", "split"], [8, "18:00", "free"]] },
  { name: "테스트 대구블루윙", sido: "대구광역시", sigungu: "수성구", level: 4, venue: "대구스타디움",
    slots: [[2, "13:30", "free"], [13, "16:30", "split"]] },
  { name: "테스트 춘천레이크", sido: "강원특별자치도", sigungu: "춘천시", level: 2, venue: "춘천송암스포츠타운",
    slots: [[4, "10:30", "split"]] },
  { name: "테스트 제주오름", sido: "제주특별자치도", sigungu: "제주시", level: 5, venue: "제주월드컵경기장",
    slots: [[5, "12:00", "free"]] },
];

function dateAfter(days: number): string {
  const day = new Date();
  day.setDate(day.getDate() + days);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

const sql = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL!, { prepare: false });

async function clean(): Promise<number> {
  const removed = await sql`
    DELETE FROM teams WHERE description = ${SEED_MARKER} RETURNING id`;
  return removed.length;
}

async function seed(): Promise<void> {
  const [owner] = await sql<{ id: string }[]>`
    SELECT id FROM public.users ORDER BY created_at LIMIT 1`;
  if (!owner) {
    console.error("users 테이블이 비어 있습니다. 먼저 로그인해 계정을 하나 만들어주세요.");
    process.exit(1);
  }

  const removed = await clean();
  if (removed) console.log(`기존 표본 팀 ${removed}개를 지웠습니다.`);

  let conditions = 0;
  let missingCoords = 0;

  for (const team of SEEDS) {
    const teamId = randomUUID();
    // 경기 장소 좌표가 있어야 "내 주변" 반경 필터를 확인할 수 있다 (문서 7.1)
    const coords = await geocodePlace(team.venue);
    if (!coords) missingCoords += 1;

    await sql`
      INSERT INTO teams (id, name, region_sido, region_sigungu, level, created_by, description)
      VALUES (${teamId}, ${team.name}, ${team.sido}, ${team.sigungu}, ${team.level},
              ${owner.id}, ${SEED_MARKER})`;

    for (const [offset, time, cost] of team.slots) {
      await sql`
        INSERT INTO match_conditions
          (team_id, desired_date, desired_time, location_text,
           opponent_level_min, opponent_level_max, cost_type, location_lat, location_lng, notes)
        VALUES (${teamId}, ${dateAfter(offset)}, ${time}, ${team.venue},
                ${Math.max(1, team.level - 1)}, ${Math.min(5, team.level + 1)}, ${cost},
                ${coords?.lat ?? null}, ${coords?.lng ?? null},
                ${"표본 데이터입니다. 심판은 상호 협의합니다."})`;
      conditions += 1;
    }
  }

  console.log(`표본 팀 ${SEEDS.length}개, 매칭 조건 ${conditions}건을 넣었습니다.`);
  if (missingCoords) {
    console.log(
      `좌표를 못 찾은 팀 ${missingCoords}개는 "내 주변" 반경에는 안 잡히고 지역 일치로만 노출됩니다.`,
    );
  }
  console.log(`되돌리려면 \`npm run seed:clean\` 을 실행하세요.`);
}

const command = process.argv[2] ?? "seed";

if (command === "seed") {
  await seed();
} else if (command === "clean") {
  const removed = await clean();
  console.log(`표본 팀 ${removed}개를 지웠습니다. (매칭 조건도 함께 지워집니다)`);
} else {
  console.error("사용법: npm run seed | npm run seed:clean");
  process.exit(1);
}

await sql.end();
