require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();

// 미들웨어 설정
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(express.static("static")); // HTML, CSS, JS, 이미지 파일들이 위치할 폴더
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// DB 연결 설정 (로컬 테스트 및 네이버 클라우드 대응)
//const pool = new Pool({
//  host: process.env.DB_HOST,
//  port: process.env.DB_PORT,
//  user: process.env.DB_USER,
//  password: process.env.DB_PASSWORD,
//  database: process.env.DB_NAME,
//});

//local test 용
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // 클라우드 DB 외부 접속 시 필요
  },
});

// ═══════════════════════════════════════════════
//  [DB 자동 초기화 함수]
// ═══════════════════════════════════════════════
async function initDB() {
  try {
    console.log("⏳ 데이터베이스 초기화 및 검증 중...");

    // 1. 이벤트 테이블 (향후 확장성을 위해)
    await pool.query(`
            CREATE TABLE IF NOT EXISTS dima_events (
                id SERIAL PRIMARY KEY,
                event_name VARCHAR(100) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    // 2. 사용자 및 관리자 테이블 (여권 번호 기반)
    await pool.query(`
            CREATE TABLE IF NOT EXISTS dima_users (
                id SERIAL PRIMARY KEY,
                passport_id VARCHAR(20) UNIQUE NOT NULL,  
                device_id VARCHAR(100) UNIQUE,           -- 브라우저 쿠키용 UUID
                role VARCHAR(20) DEFAULT 'USER',         -- 'USER', 'GENERAL_ADMIN', 'SUPER_ADMIN'
                created_at TIMESTAMP DEFAULT (now() AT TIME ZONE 'Asia/Seoul')
            );
        `);

    await pool.query(`
            CREATE TABLE IF NOT EXISTS dima_stampspot (
                id SERIAL PRIMARY KEY,
                event_id INT REFERENCES dima_events(id),
                name VARCHAR(100) NOT NULL,
                lat DOUBLE PRECISION NOT NULL,
                lng DOUBLE PRECISION NOT NULL,
                radius_m INT DEFAULT 100            -- 기본 100m 로               
            );
        `);

    // 4. 스탬프 획득 기록 테이블 (상태 변화 및 스푸핑 방지용 위치 기록)
    await pool.query(`
            CREATE TABLE IF NOT EXISTS dima_stamps (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES dima_users(id),
                dima_id INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'ARRIVED',
                acquired_lat NUMERIC(10,7),
                acquired_lng NUMERIC(10,7),
                acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, dima_id)
            )
        `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS dima_surveys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES dima_users(id),
          q1 INT, q2 INT, q3 INT, q4 TEXT, q5 INT,
          name VARCHAR(50),
          student_id VARCHAR(50),
          department VARCHAR(100),
          phone VARCHAR(20),
          created_at TIMESTAMP DEFAULT (now() AT TIME ZONE 'Asia/Seoul')
    );
`);  

    // 메인 이벤트 생성
    const eventCheck = await pool.query(
      `SELECT id FROM dima_events WHERE event_name = 'Miracle_DIMA_GIFT_Festa_2026'`,
    );
    let eventId = null;
    if (eventCheck.rows.length === 0) {
      const newEvent = await pool.query(`
                INSERT INTO dima_events (event_name) VALUES ('Miracle_DIMA_GIFT_Festa_2026') RETURNING id
            `);
      eventId = newEvent.rows[0].id;
    } else {
      eventId = eventCheck.rows[0].id;
    }

    const dimaCheck = await pool.query(`SELECT id FROM dima_stampspot LIMIT 1`);
    if (dimaCheck.rows.length === 0 && eventId) {
    // const FESTIVAL_LAT = 37.0589182; // DIMA   
    //  const FESTIVAL_LNG = 127.3581239; // DIMA

      const FESTIVAL_LAT = 37.4895143;   //테스트용
      const FESTIVAL_LNG = 126.9555654;  //테스트용

      await pool.query(
        `
                INSERT INTO dima_stampspot (event_id, name, lat, lng, radius_m) VALUES 
                ($1, 'G', $2, $3, 100), 
                ($1, 'I', $2, $3, 100), 
                ($1, 'F', $2, $3, 100),
                ($1, 'T', $2, $3, 100)
            `,
        [eventId, FESTIVAL_LAT, FESTIVAL_LNG],
      );
    }

    console.log("✅ DB 및 테이블 초기화 완료!");
  } catch (err) {
    console.error("❌ DB 초기화 에러:", err);
  }
}

initDB();

// ═══════════════════════════════════════════════
//  [공통 함수 및 미들웨어]
// ═══════════════════════════════════════════════

// 1. 하버사인 공식: 두 위도/경도 사이의 거리(km) 계산
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// 2. 사용자 인증 미들웨어 (브라우저 쿠키의 device_id 확인)
const authenticate = async (req, res, next) => {
  const { device_id } = req.cookies;
  if (!device_id)
    return res.status(401).json({ error: "세션이 만료되었거나 없습니다." });
  try {
    const userRes = await pool.query(
      "SELECT * FROM dima_users WHERE device_id = $1",
      [device_id],
    );
    if (userRes.rows.length === 0)
      return res.status(401).json({ error: "유효하지 않은 사용자입니다." });
    req.user = userRes.rows[0];
    next();
  } catch (e) {
    res.status(500).json({ error: "인증 오류" });
  }
};

// ═══════════════════════════════════════════════
//  [사용자 계정 및 여권 API]
// ═══════════════════════════════════════════════

// 1. 신규 시작 (여권 번호 발급)
app.post("/api/tour/start", async (req, res) => {
  try {
    let { device_id } = req.cookies;

    // 브라우저에 쿠키가 없으면 새로 발급 (120일 유지)
    if (!device_id) {
      device_id = uuidv4();
      res.cookie("device_id", device_id, {
        httpOnly: true,
        maxAge: 120 * 24 * 3600000,
      });
    }

    // 여권 번호 생성 로직 (예: DIMA-A1B2-C3D4)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let passport_id = "DIMA-";
    for (let i = 0; i < 4; i++)
      passport_id += chars.charAt(Math.floor(Math.random() * chars.length));
    passport_id += "-";
    for (let i = 0; i < 4; i++)
      passport_id += chars.charAt(Math.floor(Math.random() * chars.length));

    // DB에 저장 (기존에 발급받은 쿠키가 있다면 무시)
    await pool.query(
      `INSERT INTO dima_users (passport_id, device_id, created_at) 
       VALUES ($1, $2, (now() AT TIME ZONE 'Asia/Seoul'))
       ON CONFLICT (device_id) DO NOTHING`,
      [passport_id, device_id],
    );

    // 해당 기기의 여권 번호 반환
    const userRes = await pool.query(
      "SELECT passport_id FROM dima_users WHERE device_id = $1",
      [device_id],
    );
    res.json({ success: true, passport_id: userRes.rows[0].passport_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "여권 발급 중 오류가 발생했습니다." });
  }
});

// 2. 이어하기 (기존 여권 번호로 세션 복구)
app.post("/api/tour/resume", async (req, res) => {
  try {
    const { passport_id } = req.body;
    if (!passport_id)
      return res.status(400).json({ error: "여권 번호를 입력해주세요." });

    // DB에 해당 여권이 있는지 확인
    const userRes = await pool.query(
      "SELECT * FROM dima_users WHERE passport_id = $1",
      [passport_id],
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "존재하지 않는 여권 번호입니다." });

    // 새 브라우저로 접속한 것이므로 새로운 device_id를 생성하여 업데이트
    const new_device_id = uuidv4();
    await pool.query(
      "UPDATE dima_users SET device_id = $1 WHERE passport_id = $2",
      [new_device_id, passport_id],
    );

    // 브라우저에 쿠키 굽기
    res.cookie("device_id", new_device_id, {
      httpOnly: true,
      maxAge: 120 * 24 * 3600000,
    });
    res.json({ success: true, passport_id });
  } catch (err) {
    res.status(500).json({ error: "이어하기 처리 중 오류가 발생했습니다." });
  }
});

// 1. 유저가 '이미 신청 완료한 경품 목록' 조회 API
app.get("/api/tour/prize_status", authenticate, async (req, res) => {
  try {
    const checkRes = await pool.query(
      "SELECT ticket_type FROM dima_ticket_logs WHERE passport_id = $1",
      [req.user.passport_id], // 유저의 여권번호로 조회
    );
    // 수령한 이력이 있으면 배열에 'COMPLETION' 이라는 플래그를 넣어 프론트엔드로 전달
    const claimedPrizes = checkRes.rowCount > 0 ? ["COMPLETION"] : [];
    res.json({ success: true, claimedPrizes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "경품 상태 확인 오류" });
  }
});

// ═══════════════════════════════════════════════
//  [스탬프투어 핵심 진행 API]
// ═══════════════════════════════════════════════

// 3. GPS 위치 인증 및 도착 처리 (스푸핑 방지 포함)
app.post("/api/tour/arrive", authenticate, async (req, res) => {
  try {
    const { dima_id, lat, lng } = req.body;
    const { id: user_id, role } = req.user;

    const targetRes = await pool.query(
      "SELECT id, lat, lng, radius_m FROM dima_stampspot WHERE id = $1",
      [dima_id],
    );
    if (targetRes.rowCount === 0)
      return res
        .status(404)
        .json({ error: "해당 이벤트존을 찾을 수 없습니다." });

    const target = targetRes.rows[0];

    // --- GPS 스푸핑 및 반경 검증 (관리자는 패스) ---
    if (role !== "SUPER_ADMIN" && role !== "GENERAL_ADMIN") {
      // 1) 반경 검사 (m 단위)
      const distToTarget =
        getDistanceFromLatLonInKm(lat, lng, target.lat, target.lng) * 1000;
      if (distToTarget > target.radius_m) {
        return res.status(403).json({
          error: `이벤트 장소 ${target.radius_m.toLocaleString()}m 이내에 접근해야 합니다. (현재 거리: ${Math.round(distToTarget).toLocaleString()}m)`,
        });
      }
    }

    // --- 검증 통과 시 상태 업데이트 (도착 완료) ---
    // ★ 수정: 이미 GAME_CLEARED나 PHOTO_SUBMITTED 상태라면 status를 덮어쓰지 않고 유지합니다.
    const stampRes = await pool.query(
      `
            INSERT INTO dima_stamps (user_id, dima_id, status, acquired_lat, acquired_lng, acquired_at) 
            VALUES ($1, $2, 'NAVI_CLEARED', $3, $4, (now() AT TIME ZONE 'Asia/Seoul'))
            ON CONFLICT (user_id, dima_id) 
            DO UPDATE SET acquired_at = CASE 
                WHEN dima_stamps.status = 'PHOTO_SUBMITTED' THEN dima_stamps.acquired_at 
                ELSE (now() AT TIME ZONE 'Asia/Seoul') 
            END
            RETURNING status
        `,
      [user_id, dima_id, lat, lng],
    );

    const current_status = stampRes.rows[0].status; // 현재 유저의 상태 가져오기

    res.json({
      success: true,
      status: current_status, // ★ 프론트엔드에 현재 상태(ARRIVED 등) 전달
      message: "위치 인증에 성공했습니다.",
      prize_completed: req.user.roulette_status === "COMPLETED",
      user_id: req.user.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "위치 검증 중 서버 에러가 발생했습니다." });
  }
});

// 4. 미니게임 완료 처리 API
app.post("/api/tour/game_clear", authenticate, async (req, res) => {
  try {
    const { dima_id } = req.body;
    const { id: user_id } = req.user;

    // 상태가 'ARRIVED'인 경우에만 'GAME_CLEARED'로 업데이트 (중복 호출 방지)
    const updateRes = await pool.query(
      `
            UPDATE dima_stamps 
            SET status = 'GAME_CLEARED' 
            WHERE user_id = $1 AND dima_id = $2 AND status IN ('ARRIVED', 'NAVI_CLEARED')
            RETURNING id
        `,
      [user_id, dima_id],
    );

    if (updateRes.rowCount === 0) {
      return res.status(400).json({
        error: "게임 완료 처리를 할 수 없는 상태이거나 이미 처리되었습니다.",
      });
    }

    res.json({
      success: true,
      message: "🎉 모든 미니게임을 완료했습니다! 이제 인증샷을 찍어주세요.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "게임 완료 처리 중 오류가 발생했습니다." });
  }
});

// [추가] 3-2. AR 길안내 완료 처리 API
app.post("/api/tour/navi_clear", authenticate, async (req, res) => {
  try {
    const { dima_id } = req.body;
    const { id: user_id } = req.user;

    // 현재 상태가 'ARRIVED'인 경우에만 'NAVI_CLEARED'로 업데이트
    const updateRes = await pool.query(
      `
            UPDATE dima_stamps 
            SET status = 'NAVI_CLEARED' 
            WHERE user_id = $1 AND dima_id = $2 AND status = 'ARRIVED'
            RETURNING id
        `,
      [user_id, dima_id],
    );

    if (updateRes.rowCount === 0) {
      return res.status(400).json({
        error: "길안내 완료 처리를 할 수 없는 상태이거나 이미 처리되었습니다.",
      });
    }

    res.json({
      success: true,
      message: "길안내 완료 상태가 서버에 기록되었습니다.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "길안내 완료 처리 중 오류가 발생했습니다." });
  }
});

const fs = require("fs");

// 이미지 파일이 물리적으로 저장될 폴더 생성 선언 (public/uploads)
const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 5. 스탬프 획득 완료 API (서버 사진 저장 제거)
app.post("/api/tour/photo_upload", authenticate, async (req, res) => {
  try {
    const { dima_id } = req.body; // image_data, review_text는 더 이상 받지 않음
    const { id: user_id } = req.user;

    // DB 업데이트: photo_url, review_text 관련 업데이트 제거하고 상태만 변경
    const updateRes = await pool.query(
      `
        UPDATE dima_stamps 
        SET status = 'PHOTO_SUBMITTED', acquired_at = (now() AT TIME ZONE 'Asia/Seoul')
        WHERE user_id = $1 AND dima_id = $2 AND status != 'PHOTO_SUBMITTED'  
        RETURNING id
      `,
      [user_id, dima_id],
    );

    if (updateRes.rowCount === 0) {
      return res.status(400).json({
        error:
          "최종 인증 처리를 진행할 수 없는 상태이거나 이미 완료된 곳입니다.",
      });
    }

    res.json({
      success: true,
      message: "🎉 축하합니다! 스탬프를 획득하셨습니다!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "스탬프 인증 서버 처리 중 오류가 발생했습니다.",
    });
  }
});

// 6. 내 스탬프 획득 현황 조회 API
app.get("/api/tour/my_stamps", authenticate, async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const stampRes = await pool.query(
      `
            SELECT dima_id, status, acquired_at
            FROM dima_stamps 
            WHERE user_id = $1
        `,
      [user_id],
    );

    res.json({ success: true, stamps: stampRes.rows });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "스탬프 기록을 불러오는 중 오류가 발생했습니다." });
  }
});


// 최종 설문 및 개인정보 제출 API
app.post("/api/tour/submit_survey", authenticate, async (req, res) => {
    try {
        const { id: user_id } = req.user;
        const { survey, participant } = req.body;

        await pool.query(
            `INSERT INTO dima_surveys 
             (user_id, q1, q2, q3, q4, q5, name, student_id, department, phone) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                user_id, 
                survey.q1, survey.q2, survey.q3, survey.q4, survey.q5,
                participant.name, participant.studentId, participant.department, participant.phone
            ]
        );

        res.json({ success: true, message: "설문 및 정보가 저장되었습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "데이터 저장 중 서버 에러가 발생했습니다." });
    }
});
// =======================================================
// [새로운 정석 설계] 관리자 전용 독립 시스템 (dima_admins)
// =======================================================

async function initAdminDB() {
  try {
    // 1. [독립] 관리자 테이블 생성 (컬럼명을 session_token으로 변경하여 유저 테이블과 완전히 분리)
    await pool.query(`
            CREATE TABLE IF NOT EXISTS dima_admins (
                id SERIAL PRIMARY KEY,
                login_id VARCHAR(50) UNIQUE NOT NULL,
                login_pw VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'GENERAL_ADMIN', -- 'GENERAL_ADMIN', 'SUPER_ADMIN'
                session_token VARCHAR(100) UNIQUE,       -- <-- 관리자 세션 저장용 독립 컬럼
                created_at TIMESTAMP DEFAULT (now() AT TIME ZONE 'Asia/Seoul')
            );
        `);
    await pool.query(
      "ALTER TABLE dima_admins ADD COLUMN IF NOT EXISTS session_token VARCHAR(100) UNIQUE;",
    );

    // 2. 최고 관리자 초기 계정 강제 세팅
    await pool.query(`
            INSERT INTO dima_admins (login_id, login_pw, role) 
            VALUES ('superadmin', 'admin1234!', 'SUPER_ADMIN')
            ON CONFLICT (login_id) 
            DO UPDATE SET login_pw = 'admin1234!', role = 'SUPER_ADMIN';
        `);

    // 관리자 경품(이용권) 발급 이력 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dima_ticket_logs (
        id SERIAL PRIMARY KEY,
        passport_id VARCHAR(20) NOT NULL,
        admin_id VARCHAR(50) NOT NULL,
        ticket_type VARCHAR(50) NOT NULL,
        issued_at TIMESTAMP DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
        UNIQUE(passport_id) -- 1인 1회 제한
      );    
    `);
    console.log("✅ [보안 격리 완료] 관리자 전용 독립 DB 세팅 완료!");
  } catch (err) {
    console.error("❌ 관리자 DB 세팅 에러:", err);
  }
}
initAdminDB();

// 4. 🔒 관리자 전용 세션 인증 미들웨어 (관광객 쿠키와 충돌 차단)
const authenticateAdmin = async (req, res, next) => {
  const { admin_token } = req.cookies; // 브라우저에서 'admin_token' 쿠키를 읽음
  if (!admin_token)
    return res
      .status(401)
      .json({ error: "관리자 세션이 만료되었습니다. 다시 로그인하세요." });

  try {
    // dima_admins 테이블의 session_token 컬럼에서 검증
    const adminRes = await pool.query(
      "SELECT * FROM dima_admins WHERE session_token = $1",
      [admin_token],
    );
    if (adminRes.rows.length === 0) {
      return res
        .status(401)
        .json({ error: "유효하지 않은 관리자 세션입니다." });
    }
    req.admin = adminRes.rows[0];
    next();
  } catch (e) {
    res.status(500).json({ error: "관리자 인증 오류" });
  }
};

// 통계 화면 접근 권한 (SUPER_ADMIN, STAT_ADMIN 만 가능)
const verifyStatAccess = (req, res, next) => {
  const role = req.admin.role;
  if (
    role !== "SUPER_ADMIN" &&
    role !== "STAT_ADMIN" &&
    role !== "GENERAL_ADMIN"
  ) {
    return res.status(403).json({ error: "통계 시스템 접근 권한이 없습니다." });
  }
  next();
};

// 현장 스캐너 접근 권한 (SUPER_ADMIN, SCAN_ADMIN 만 가능)
const verifyScanAccess = (req, res, next) => {
  const role = req.admin.role;
  if (
    role !== "SUPER_ADMIN" &&
    role !== "SCAN_ADMIN" &&
    role !== "GENERAL_ADMIN"
  ) {
    return res.status(403).json({ error: "스캐너 접근 권한이 없습니다." });
  }
  next();
};

// 계정 생성 권한 (오직 SUPER_ADMIN 만 가능)
const verifySuperAdminRole = (req, res, next) => {
  if (req.admin.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "최고 관리자 권한이 필요합니다." });
  }
  next();
};

// =======================================================
// [관리자 전용 로그인 / 로그아웃 API]
// =======================================================

// 관리자 로그인
app.post("/api/admin/login", async (req, res) => {
  const { login_id, login_pw } = req.body;
  try {
    const adminRes = await pool.query(
      "SELECT * FROM dima_admins WHERE login_id = $1",
      [login_id],
    );
    if (adminRes.rows.length === 0)
      return res.status(401).json({ error: "등록되지 않은 계정입니다." });

    const adminUser = adminRes.rows[0];
    if (login_pw !== adminUser.login_pw)
      return res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });

    // 로그인 성공 시 새로운 세션 토큰 발행 후 session_token 컬럼에 저장
    const adminSessionId = uuidv4();
    await pool.query("UPDATE dima_admins SET session_token = $1 WHERE id = $2", [
      adminSessionId,
      adminUser.id,
    ]);

    // 브라우저에는 'admin_token'이라는 이름으로 쿠키를 구워줌
    res.cookie("admin_token", adminSessionId, {
      httpOnly: true,
      maxAge: 12 * 3600000,
    });
    res.json({
      success: true,
      role: adminUser.role,
      message: "관리자 로그인 성공",
    });
  } catch (err) {
    res.status(500).json({ error: "서버 오류로 로그인을 처리할 수 없습니다." });
  }
});

// 관리자 로그아웃 (이 부분이 지적해주신 부분입니다!)
app.post("/api/admin/logout", authenticateAdmin, async (req, res) => {
  try {
    // DB에서 해당 관리자의 session_token을 비워버림
    await pool.query(
      "UPDATE dima_admins SET session_token = NULL WHERE id = $1",
      [req.admin.id],
    );
    // 브라우저의 admin_token 쿠키도 완전 삭제
    res.clearCookie("admin_token");
    res.json({ success: true, message: "안전하게 로그아웃 되었습니다." });
  } catch (e) {
    res.status(500).json({ error: "로그아웃 처리 중 오류" });
  }
});

app.post(
  "/api/admin/issue_ticket",
  authenticateAdmin,
  verifyScanAccess,
  async (req, res) => {
    const { passport_id } = req.body;

    try {
      // 1. 이미 경품을 수령했는지 확인
      const checkRes = await pool.query(
        "SELECT id FROM dima_ticket_logs WHERE passport_id = $1",
        [passport_id],
      );
      if (checkRes.rowCount > 0) {
        return res
          .status(400)
          .json({ error: "이미 경품 수령이 완료된 사용자입니다." });
      }

      // 2. 사용자의 상태를 '룰렛 가능(READY)'으로 업데이트
      await pool.query(
        "UPDATE dima_users SET roulette_status = 'READY' WHERE passport_id = $1",
        [passport_id],
      );

      res.json({
        success: true,
        message: "사용자 기기에서 룰렛이 활성화되었습니다!",
      });
    } catch (err) {
      console.error("스캔 에러:", err);
      res.status(500).json({ error: "처리 중 서버 오류가 발생했습니다." });
    }
  },
);


// =======================================================
// [대시보드 기능 API - 장기 이벤트 최적화 버전]
// =======================================================

// 🌟 이벤트 공식 오픈일 (이 날짜 이후 데이터만 집계)
const EVENT_START_DATE = "2026-09-01 00:00:00+09";

app.get("/api/admin/dashboard-stats", authenticateAdmin, verifyStatAccess, async (req, res) => {
    try {
        let { start_date, end_date } = req.query;
        
        // 날짜 파라미터가 넘어오면 해당 일자 기준, 없으면 전체 기간(EVENT_START_DATE ~ 2099년)
        const startParam = start_date ? `${start_date} 00:00:00+09` : EVENT_START_DATE;
        const endParam = end_date ? `${end_date} 23:59:59+09` : '2099-12-31 23:59:59+09';

        // 1. 기간 내 경품 발급 내역 (티켓)
        const ticketRes = await pool.query(`
            SELECT ticket_type, COUNT(*) as issue_count 
            FROM dima_ticket_logs 
            WHERE issued_at >= $1 AND issued_at <= $2 
            GROUP BY ticket_type
        `, [startParam, endParam]);
        
        // 2. 기간 내 거점별 방문/완료 현황
        const dimaRes = await pool.query(`
            SELECT l.id, l.name, 
                   COUNT(s.id) as total_arrivals, 
                   SUM(CASE WHEN s.status = 'PHOTO_SUBMITTED' THEN 1 ELSE 0 END) as total_completions 
            FROM dima_stampspot l 
            LEFT JOIN dima_stamps s ON l.id = s.dima_id AND s.acquired_at >= $1 AND s.acquired_at <= $2 
            GROUP BY l.id, l.name 
            ORDER BY l.id ASC
        `, [startParam, endParam]);
        
        // 3. 재고 현황 (재고는 특정 기간 조회가 무의미하므로 전체 실시간 현황을 가져옵니다)
        const prizeRes = await pool.query("SELECT id, name, total_quantity, remaining_quantity FROM dima_prizes ORDER BY id ASC");
        
        // 4. 기간 내 5개 완주자 수
        const completedUsers = await pool.query(`
            SELECT COUNT(*) as cnt FROM (
                SELECT user_id FROM dima_stamps 
                WHERE status = 'PHOTO_SUBMITTED' AND acquired_at >= $1 AND acquired_at <= $2 
                GROUP BY user_id HAVING COUNT(*) >= 5
            ) as t
        `, [startParam, endParam]);
        
        // 5. 기간 내 총 경품 수령자 수
        const prizeRecipients = await pool.query(`
            SELECT COUNT(DISTINCT passport_id) as cnt 
            FROM dima_ticket_logs 
            WHERE issued_at >= $1 AND issued_at <= $2
        `, [startParam, endParam]);

        res.json({
            success: true,
            tickets: ticketRes.rows, 
            stampspot: dimaRes.rows,
            prizes: prizeRes.rows,
            completed_users: completedUsers.rows[0].cnt,
            prize_recipients: prizeRecipients.rows[0].cnt
        });
    } catch (err) { 
        res.status(500).json({ error: "통계 조회 실패" }); 
    }
});

app.post("/api/admin/inventory/update", authenticateAdmin, verifyStatAccess, async (req, res) => {
    try {
        const { prize_id, amount } = req.body;
        const parsedAmount = parseInt(amount);

        // 1. 현재 남은 재고 수량 확인
        const prizeRes = await pool.query("SELECT name, remaining_quantity FROM dima_prizes WHERE id = $1", [prize_id]);
        if (prizeRes.rowCount === 0) return res.status(404).json({ success: false, error: "경품을 찾을 수 없습니다." });

        const currentQuantity = prizeRes.rows[0].remaining_quantity;

        // 2. 차감 시 음수가 되는지 체크 (방어 로직)
        if (parsedAmount < 0 && Math.abs(parsedAmount) > currentQuantity) {
            return res.status(400).json({ 
                success: false, 
                error: `[차감 실패] 현재 남은 수량(${currentQuantity}개)보다 많이 차감할 수 없습니다.` 
            });
        }

        // 3. 문제없을 경우 재고 업데이트 진행
        await pool.query(`
            UPDATE dima_prizes 
            SET remaining_quantity = remaining_quantity + $1,
                total_quantity = CASE WHEN $1 > 0 THEN total_quantity + $1 ELSE total_quantity END
            WHERE id = $2
        `, [parsedAmount, prize_id]);

        res.json({ success: true, message: "재고가 성공적으로 업데이트되었습니다." });
    } catch (err) { 
        res.status(500).json({ success: false, error: "재고 업데이트 중 서버 오류가 발생했습니다." }); 
    }
});

app.get("/api/admin/hourly-stats", authenticateAdmin, verifyStatAccess, async (req, res) => {
    try {
        let { start_date, end_date } = req.query;
        
        const startParam = start_date ? `${start_date} 00:00:00+09` : EVENT_START_DATE;
        const endParam = end_date ? `${end_date} 23:59:59+09` : '2099-12-31 23:59:59+09';

        // 1. 테이블의 동적 열 생성을 위해 전체 경품 목록을 먼저 가져옵니다.
        const prizeListRes = await pool.query("SELECT name FROM dima_prizes ORDER BY id ASC");
        const prizeNames = prizeListRes.rows.map(r => r.name);

        const query = `
            WITH starters AS (
                SELECT hr, COUNT(*) as start_count FROM (
                    SELECT DATE_TRUNC('hour', MIN(acquired_at)) as hr
                    FROM dima_stamps GROUP BY user_id
                ) s GROUP BY hr
            ),
            completers AS (
                SELECT hr, COUNT(*) as complete_count FROM (
                    SELECT DATE_TRUNC('hour', MAX(acquired_at)) as hr
                    FROM dima_stamps WHERE status = 'PHOTO_SUBMITTED'
                    GROUP BY user_id HAVING COUNT(*) >= 5
                ) c GROUP BY hr
            ),
            prizes AS (
                SELECT hr, SUM(cnt) as prize_count, json_object_agg(ticket_type, cnt) as prize_details
                FROM (
                    SELECT DATE_TRUNC('hour', issued_at) as hr, ticket_type, COUNT(*) as cnt
                    FROM dima_ticket_logs 
                    GROUP BY DATE_TRUNC('hour', issued_at), ticket_type
                ) p_sub
                GROUP BY hr
            ),
            all_hours AS (
                SELECT hr FROM starters
                UNION SELECT hr FROM completers
                UNION SELECT hr FROM prizes
            )
            SELECT 
                TO_CHAR(a.hr, 'YYYY-MM-DD HH24:00') || ' ~ ' || TO_CHAR(a.hr + interval '1 hour', 'HH24:00') as time_range,
                COALESCE(s.start_count, 0) as start_count,
                COALESCE(c.complete_count, 0) as complete_count,
                COALESCE(p.prize_count, 0) as prize_count,
                COALESCE(p.prize_details, '{}'::json) as prize_details
            FROM all_hours a
            LEFT JOIN starters s ON a.hr = s.hr
            LEFT JOIN completers c ON a.hr = c.hr
            LEFT JOIN prizes p ON a.hr = p.hr
            WHERE a.hr >= $1 AND a.hr <= $2
            ORDER BY a.hr DESC
        `;
        
        const result = await pool.query(query, [startParam, endParam]);
        res.json({ success: true, stats: result.rows, prizeNames }); // prizeNames 함께 반환
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "시간대별 통계 조회 실패" });
    }
});

app.get(
  "/api/admin/user-stamps/:passport_id",
  authenticateAdmin,
  verifyStatAccess,
  async (req, res) => {
    try {
      const { passport_id } = req.params;
      const stampRes = await pool.query(
        `
            SELECT l.name, s.acquired_at
            FROM dima_stamps s
            JOIN dima_users u ON s.user_id = u.id
            JOIN dima_stampspot l ON s.dima_id = l.id
            WHERE u.passport_id = $1 AND s.status = 'PHOTO_SUBMITTED' AND s.acquired_at >= $2
            ORDER BY s.acquired_at DESC
        `,
        [passport_id, EVENT_START_DATE],
      );
      res.json({ success: true, stamps: stampRes.rows });
    } catch (err) {
      res.status(500).json({ error: "상세 스탬프 조회 실패" });
    }
  },
);

app.get(
  "/api/admin/tickets",
  authenticateAdmin,
  verifyStatAccess,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
            SELECT t.id, t.passport_id, t.admin_id, t.ticket_type, t.issued_at
            FROM dima_ticket_logs t
            WHERE t.issued_at >= $1
            ORDER BY t.issued_at DESC
        `,
        [EVENT_START_DATE],
      );
      res.json({ success: true, tickets: result.rows });
    } catch (err) {
      res.status(500).json({ error: "발급 내역 조회 실패" });
    }
  },
);

app.post("/api/admin/register-manager", authenticateAdmin, verifySuperAdminRole, async (req, res) => {
    const { login_id, login_pw, target_role } = req.body;
    
    // 역할 검증 (현장 스탭 등 불필요한 권한 삭제, GENERAL_ADMIN만 허용)
    if (target_role !== 'GENERAL_ADMIN') {
        return res.status(400).json({ error: "올바르지 않은 권한 설정입니다." });
    }

    try {
        await pool.query(
            "INSERT INTO dima_admins (login_id, login_pw, role) VALUES ($1, $2, $3)", 
            [login_id, login_pw, target_role]
        );
        res.json({ success: true, message: "이벤트 담당자 계정 생성 완료" });
    } catch (err) {
        res.status(500).json({ error: "계정 등록 실패 (이미 존재하는 아이디일 수 있습니다.)" });
    }
});

app.get("/api/admin/inventory", authenticateAdmin, verifyStatAccess, async (req, res) => {
    try {
        const prizeRes = await pool.query("SELECT id, name, total_quantity, remaining_quantity FROM dima_prizes ORDER BY id ASC");
        res.json({ success: true, prizes: prizeRes.rows });
    } catch (err) { 
        res.status(500).json({ error: "재고 조회 실패" }); 
    }
});

// 서버 구동
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 Miracle DIMA, GIFT Festa 2026 서버 포트 ${PORT}에서 실행 중`);
});
