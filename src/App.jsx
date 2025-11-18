import React, { useEffect, useMemo, useState } from "react";

// 簡易 i18n 辞書
const translations = {
  ja: {
    title: "相関係数 推測ゲーム",
    toggleLang: "言語",
    help: "散布図を見て相関係数を推測してみよう！楕円ガイドをヒントにスライダーを動かしてみてください。",
    guessSection: "相関係数の推測",
    guessR: "相関係数 r",
    evaluate: "採点",
    nextData: "次のデータ",
    score: "得点",
    grade: "評価",
    trueR: "真の相関係数",
    dataSettings: "データ設定",
    nPoints: "データ数 N",
    showEllipseHint: "楕円ガイドを表示（推測値の r）",
    showTrueEllipse: "採点後に真の楕円も表示（真の r）",
    settingsToggleOpen: "▶ 設定を開く",
    settingsToggleClose: "▼ 設定を閉じる",
    rDigitsLabel: "相関係数の小数点以下の桁数",
    vizSettings: "可視化・ヒント",
  },
  en: {
    title: "Correlation Guessing Game",
    toggleLang: "Language",
    help: "Look at the scatter plot and guess the correlation! Use the ellipse guide as a visual hint.",
    guessSection: "Guess the correlation",
    guessR: "Guess correlation r",
    evaluate: "Evaluate",
    nextData: "Next data",
    score: "Score",
    grade: "Grade",
    trueR: "True correlation",
    dataSettings: "Data settings",
    nPoints: "Number of points N",
    showEllipseHint: "Show ellipse hint (for r)",
    showTrueEllipse: "Show true ellipse after evaluation",
    settingsToggleOpen: "▶ Open settings",
    settingsToggleClose: "▼ Close settings",
    rDigitsLabel: "Decimal places for r",
    vizSettings: "Visualization & hints",
  },
};

function TrophyDock({ count }) {
  const maxIcons = 8;
  const icons = Math.min(count, maxIcons);
  const more = Math.max(0, count - maxIcons);
  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 50,
        padding: "8px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(0,0,0,0.15)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
        backdropFilter: "blur(2px)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#555",
          marginBottom: 4,
          textAlign: "center",
          fontWeight: 700,
        }}
      >
        S-streak
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 20, lineHeight: 1 }}>
          {count === 0 && <span>🏆×0</span>}
          {Array.from({ length: icons }).map((_, i) => (
            <span key={i}>🏆</span>
          ))}
          {more > 0 && (
            <span style={{ marginLeft: 6, fontWeight: 800 }}>+{more}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 標準正規乱数（Box-Muller）
function randn(rng) {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default function App() {
  const [lang, setLang] = useState("ja");
  const t = (k) => (translations[lang] && translations[lang][k]) || k;

  const [trophies, setTrophies] = useState(0);

  const [N, setN] = useState(80);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));

  const [guessR, setGuessR] = useState(0);
  const [score, setScore] = useState(null);
  const [grade, setGrade] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showEllipseHint, setShowEllipseHint] = useState(true);
  const [showTrueEllipse, setShowTrueEllipse] = useState(true);

  // 相関係数の小数桁数
  const [rDigits, setRDigits] = useState(2);

  const width = 640;
  const height = 480;
  const pad = 50;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  // データ生成 & 統計量算出
  const {
    points,
    trueR,
    meanX,
    meanY,
    stdX,
    stdY,
    rawMinX,
    rawMaxX,
    rawMinY,
    rawMaxY,
  } = useMemo(() => {
    const rng = mulberry32(seed);
    const rTrue = -0.95 + 1.9 * rng(); // [-0.95, 0.95]

    const arr = [];
    for (let i = 0; i < N; i++) {
      const z1 = randn(rng);
      const z2 = randn(rng);
      const x0 = z1;
      const y0 =
        rTrue * z1 + Math.sqrt(Math.max(1e-6, 1 - rTrue ** 2)) * z2;

      const sx = 0.7 + 1.3 * rng();
      const sy = 0.7 + 1.3 * rng();
      const mx = rng() * 4 - 2;
      const my = rng() * 4 - 2;

      const x = mx + sx * x0;
      const y = my + sy * y0;
      arr.push({ x, y });
    }

    const xs = arr.map((p) => p.x);
    const ys = arr.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const vx =
      xs.reduce((acc, v) => acc + (v - mx) ** 2, 0) / xs.length || 1e-6;
    const vy =
      ys.reduce((acc, v) => acc + (v - my) ** 2, 0) / ys.length || 1e-6;

    return {
      points: arr,
      trueR: rTrue,
      meanX: mx,
      meanY: my,
      stdX: Math.sqrt(vx),
      stdY: Math.sqrt(vy),
      rawMinX: minX,
      rawMaxX: maxX,
      rawMinY: minY,
      rawMaxY: maxY,
    };
  }, [seed, N]);

  const rawRangeX = rawMaxX - rawMinX || 1;
  const rawRangeY = rawMaxY - rawMinY || 1;

  const domainMinX = rawMinX - rawRangeX * 0.1;
  const domainMaxX = rawMaxX + rawRangeX * 0.1;
  const domainMinY = rawMinY - rawRangeY * 0.1;
  const domainMaxY = rawMaxY + rawRangeY * 0.1;

  const rangeX = domainMaxX - domainMinX || 1;
  const rangeY = domainMaxY - domainMinY || 1;

  const sx = (x) =>
    pad + ((x - domainMinX) / rangeX) * plotW;
  const sy = (y) =>
    pad + (1 - (y - domainMinY) / rangeY) * plotH;

  const numberFmt = (v, d = 2) =>
    Number.isFinite(v) ? v.toFixed(d) : "—";

  // スコア計算
  function evaluate() {
    const diff = Math.abs(guessR - trueR); // 0〜2
    const norm = diff / 2; // 0〜1

    // const penalty = Math.min(1, Math.pow(norm, 0.9) * 2.5); // 厳しめ
    const penalty = Math.min(1, Math.pow(norm, 1.0) * 2.3); // ふつう
    // const penalty = Math.min(1, Math.pow(norm, 1.1) * 2.1); // 甘め

    const raw = Math.max(0, (1 - penalty) * 100);
    const sc = Number(raw.toFixed(2));
    setScore(sc);

    const g =
      sc >= 95 ? "S" : sc >= 85 ? "A" : sc >= 75 ? "B" : sc >= 65 ? "C" : "F";
    setGrade(g);

    if (g === "S") {
      setTrophies((prev) => prev + 1);
    } else {
      setTrophies(0);
    }
  }

  // // データ変更時：推測値を真値から適度にずらして初期化
  // useEffect(() => {
  //   const rng = Math.random;
  //   // trueR が端に近いときは、ずらし幅を自動で小さくする
  //   const maxOffset = 0.9 - Math.abs(trueR);        // 端からの余裕
  //   // 余裕があまりないときは、強制的に小さめのずらしにする
  //   const baseDelta = 0.3 + 0.3 * rng();            // もとの 0.3〜0.6
  //   const scaledDelta = maxOffset > 0 ? Math.min(baseDelta, maxOffset) : 0.2;
  //   const sign = rng() < 0.5 ? -1 : 1;
  //   let init = trueR + sign * scaledDelta;
  //   // 念のため [-0.95, 0.95] にクリップ（±1 にべったりしないように）
  //   init = Math.max(-0.95, Math.min(0.95, init));
  //   setGuessR(init);
  //   setScore(null);
  //   setGrade(null);
  // }, [seed, trueR]);
  // データ変更時：推測値を真の相関とは無関係にランダム初期化
  useEffect(() => {
    // -0.8 〜 0.8 の一様乱数（端に張り付かず適度にばらける）
    const init = -0.8 + 1.6 * Math.random();
    setGuessR(init);
    setScore(null);
    setGrade(null);
  }, [seed]);

  // 数学的に正しい感じの楕円（共分散行列の等高線）
  function ellipsePathForR(r, scale = 1.5) {
    if (!Number.isFinite(stdX) || !Number.isFinite(stdY)) return "";
    const sigmaX = Math.max(stdX, 1e-6);
    const sigmaY = Math.max(stdY, 1e-6);
    const rho = Math.max(-0.999, Math.min(0.999, r));

    const covXX = sigmaX * sigmaX;
    const covYY = sigmaY * sigmaY;
    const covXY = rho * sigmaX * sigmaY;

    const a11 = Math.sqrt(covXX);
    const a21 = covXY / a11;
    const tmp = covYY - a21 * a21;
    const a22 = Math.sqrt(Math.max(1e-9, tmp));

    const steps = 80;
    const k = scale; // 楕円のサイズ（マハラノビス距離のスケール）

    let path = "";
    for (let i = 0; i <= steps; i++) {
      const theta = (2 * Math.PI * i) / steps;
      const u0 = Math.cos(theta);
      const u1 = Math.sin(theta);
      const ex = k * (a11 * u0);
      const ey = k * (a21 * u0 + a22 * u1);
      const x = meanX + ex;
      const y = meanY + ey;
      const px = sx(x);
      const py = sy(y);
      path += (i === 0 ? "M " : " L ") + px.toFixed(2) + "," + py.toFixed(2);
    }
    path += " Z";
    return path;
  }

  const stepR = useMemo(() => 1 / Math.pow(10, rDigits), [rDigits]); // 0.1,0.01,0.001,...

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: 16,
      }}
    >
      <style>{`
        @keyframes pop {
          0% { transform: scale(0.9); opacity: .7; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .score-pop { animation: pop 600ms ease-out; }
      `}</style>

      {/* ヘッダ */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>{t("title")}</h1>
        <div style={{ marginLeft: "auto" }}>
          <label>
            {t("toggleLang")}:{" "}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{ fontSize: 14 }}
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </div>
      <div style={{ color: "#555", marginTop: 4 }}>{t("help")}</div>

      {/* 上部バー：左（説明）／中央（スライダー）／右（採点ボタン） */}
      <div
        style={{
          marginTop: 12,
          padding: 8,
          border: "2px solid #1976d2",
          borderRadius: 12,
          background: "#e3f2fd",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr auto",
            alignItems: "center",
            columnGap: 16,
          }}
        >
          {/* 左：簡単な説明（お好みで変更／削除可） */}
          <div style={{ fontSize: 12, color: "#444" }}>
            {t("guessSection")}
          </div>

          {/* 中央：相関係数スライダー＋数値入力 */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontWeight: 700,
                marginBottom: 4,
                fontSize: 14,
              }}
            >
              {t("guessR")}
            </div>
            <div style={{ maxWidth: 420, margin: "0 auto" }}>
              <input
                type="range"
                min={-1}
                max={1}
                step={stepR}
                value={guessR}
                onChange={(e) => setGuessR(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ marginTop: 4 }}>
                <input
                  type="number"
                  step={stepR}
                  min={-1}
                  max={1}
                  value={Number(guessR.toFixed(rDigits))}
                  onChange={(e) =>
                    setGuessR(
                      Math.max(-1, Math.min(1, Number(e.target.value) || 0))
                    )
                  }
                  style={{ width: 110, fontSize: 18 }}
                />
              </div>
            </div>
          </div>

          {/* 右：採点／次のデータ */}
          <div style={{ textAlign: "right" }}>
            <button
              onClick={() => {
                if (score == null) {
                  evaluate();
                } else {
                  setSeed(Math.floor(Math.random() * 1e9));
                  setScore(null);
                  setGrade(null);
                }
              }}
              style={{
                padding: "10px 14px",
                fontWeight: 800,
                fontSize: 18,
                border: "2px solid #d32f2f",
                background: "#ffebee",
                borderRadius: 8,
                minWidth: 180,
              }}
            >
              {score == null ? "✅ " + t("evaluate") : "🔁 " + t("nextData")}
            </button>
          </div>
        </div>
      </div>

      {/* グラフ */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative" }}>
          <svg
            width={width}
            height={height}
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 8,
            }}
          >
            {/* グラフタイトル位置に真の相関係数（採点後のみ） */}
            {score != null && (
              <text
                x={width / 2}
                y={24}
                textAnchor="middle"
                fontSize={16}
                fontWeight={700}
                fill="#333"
              >
                {t("trueR")}: r = {numberFmt(trueR, rDigits)}
              </text>
            )}

            {/* 軸 */}
            <line
              x1={sx(domainMinX)}
              y1={sy(0)}
              x2={sx(domainMaxX)}
              y2={sy(0)}
              stroke="#555"
              strokeWidth={1}
            />
            <line
              x1={sx(0)}
              y1={sy(domainMinY)}
              x2={sx(0)}
              y2={sy(domainMaxY)}
              stroke="#555"
              strokeWidth={1}
            />

            {/* 軸目盛り */}
            {Array.from({ length: 6 }).map((_, i) => {
              const vx = domainMinX + (rangeX * i) / 5;
              return (
                <g key={`xtick-${i}`}>
                  <line
                    x1={sx(vx)}
                    y1={sy(domainMinY)}
                    x2={sx(vx)}
                    y2={sy(domainMinY) + 6}
                    stroke="#777"
                    strokeWidth={0.8}
                  />
                  <text
                    x={sx(vx)}
                    y={sy(domainMinY) + 20}
                    fontSize={11}
                    textAnchor="middle"
                    fill="#555"
                  >
                    {vx.toFixed(1)}
                  </text>
                </g>
              );
            })}
            {Array.from({ length: 6 }).map((_, i) => {
              const vy = domainMinY + (rangeY * i) / 5;
              return (
                <g key={`ytick-${i}`}>
                  <line
                    x1={sx(domainMinX)}
                    y1={sy(vy)}
                    x2={sx(domainMinX) + 6}
                    y2={sy(vy)}
                    stroke="#777"
                    strokeWidth={0.8}
                  />
                  <text
                    x={sx(domainMinX) - 6}
                    y={sy(vy) + 3}
                    fontSize={11}
                    textAnchor="end"
                    fill="#555"
                  >
                    {vy.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* 楕円ガイド（推測値 r） */}
            {showEllipseHint && (
              <path
                d={ellipsePathForR(guessR, 1.5)}
                fill="rgba(46,125,50,0.06)"
                stroke="#2e7d32"
                strokeDasharray="5 4"
              />
            )}

            {/* 真の楕円（採点後のみ） */}
            {showTrueEllipse && score != null && (
              <path
                d={ellipsePathForR(trueR, 1.5)}
                fill="rgba(211,47,47,0.04)"
                stroke="#d32f2f"
                strokeDasharray="5 4"
              />
            )}

            {/* 散布図 */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={3}
                fill="rgba(33,150,243,0.9)"
              />
            ))}
          </svg>

          {/* スコアオーバーレイ */}
          {score != null && (
            <div
              className="score-pop"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "center",
                borderRadius: 14,
                padding: "10px 14px",
                color: "#fff",
                background:
                  grade === "S"
                    ? "linear-gradient(135deg,#00c853,#4caf50)"
                    : grade === "A"
                      ? "linear-gradient(135deg,#2196f3,#42a5f5)"
                      : grade === "B"
                        ? "linear-gradient(135deg,#673ab7,#7e57c2)"
                        : grade === "C"
                          ? "linear-gradient(135deg,#ff9800,#ffb74d)"
                          : "linear-gradient(135deg,#f44336,#ef5350)",
                boxShadow:
                  "0 8px 24px rgba(0,0,0,0.25), 0 0 28px rgba(255,255,255,0.2) inset",
                border: "2px solid rgba(255,255,255,0.3)",
                backdropFilter: "blur(2px)",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {score >= 95
                  ? "🏆"
                  : score >= 85
                    ? "🎉"
                    : score >= 75
                      ? "✨"
                      : score >= 65
                        ? "💪"
                        : "🔥"}{" "}
                {t("score")}: {score.toFixed(2)}
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  fontWeight: 900,
                  fontSize: 20,
                  background: "rgba(0,0,0,0.18)",
                  border: "2px solid rgba(255,255,255,0.35)",
                }}
              >
                {t("grade")}: {grade}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 設定トグル */}
      <button
        onClick={() => setShowSettings((s) => !s)}
        style={{
          marginTop: 12,
          padding: "8px 12px",
          fontWeight: 800,
          borderRadius: 8,
        }}
      >
        {showSettings ? t("settingsToggleClose") : t("settingsToggleOpen")}
      </button>

      {/* 設定パネル */}
      {showSettings && (
        <section
          style={{
            marginTop: 8,
            border: "1px dashed #bbb",
            borderRadius: 10,
            padding: 12,
            display: "grid",
            gridTemplateColumns: "1.2fr 1.2fr",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}
            >
              {t("dataSettings")}
            </div>
            <label style={{ display: "block", marginBottom: 8 }}>
              {t("nPoints")}
              <input
                type="number"
                min={20}
                max={500}
                value={N}
                onChange={(e) =>
                  setN(
                    Math.max(
                      20,
                      Math.min(500, Number(e.target.value) || 80)
                    )
                  )
                }
                style={{ width: 100, marginLeft: 8 }}
              />
            </label>
          </div>

          <div>
            <div
              style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}
            >
              {t("vizSettings")}
            </div>
            <label style={{ display: "block", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={showEllipseHint}
                onChange={(e) => setShowEllipseHint(e.target.checked)}
              />{" "}
              {t("showEllipseHint")}
            </label>
            <label style={{ display: "block", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={showTrueEllipse}
                onChange={(e) => setShowTrueEllipse(e.target.checked)}
              />{" "}
              {t("showTrueEllipse")}
            </label>
            <label style={{ display: "block", marginTop: 8 }}>
              {t("rDigitsLabel")}
              <select
                value={rDigits}
                onChange={(e) =>
                  setRDigits(
                    Math.max(1, Math.min(4, Number(e.target.value) || 2))
                  )
                }
                style={{ marginLeft: 8 }}
              >
                {[1, 2, 3, 4].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      <TrophyDock count={trophies} />
    </div>
  );
}
