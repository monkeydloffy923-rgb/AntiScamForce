import { useState, useEffect, useRef } from "react";

const SCAMMER_DB = [
  { username: "@crypto_profit_99", type: "Crypto Scam", reports: 47, risk: "HIGH", date: "2026-04-10", message: "Send 0.1 BTC to get 1 BTC back guaranteed!" },
  { username: "@job_offer_official", type: "Job Scam", reports: 31, risk: "HIGH", date: "2026-04-15", message: "Work from home $500/day, no experience needed!" },
  { username: "@nft_drop_free", type: "NFT Scam", reports: 23, risk: "MEDIUM", date: "2026-04-20", message: "Claim your free NFT worth $10,000 now!" },
  { username: "@telegram_support_help", type: "Impersonation", reports: 58, risk: "HIGH", date: "2026-03-28", message: "Your account is at risk, verify now." },
  { username: "@lucky_winner_2026", type: "Lottery Scam", reports: 19, risk: "MEDIUM", date: "2026-05-01", message: "You've won $50,000! Send $50 processing fee." },
];

const SCAM_PATTERNS = [
  { pattern: /free.*bitcoin|bitcoin.*free/i, label: "Crypto Giveaway Scam", severity: "HIGH" },
  { pattern: /send.*btc|send.*eth|send.*usdt/i, label: "Crypto Transfer Scam", severity: "HIGH" },
  { pattern: /guaranteed.*profit|profit.*guaranteed/i, label: "Investment Fraud", severity: "HIGH" },
  { pattern: /click.*link|link.*click/i, label: "Phishing Link", severity: "MEDIUM" },
  { pattern: /won.*prize|prize.*won|lottery/i, label: "Lottery Scam", severity: "HIGH" },
  { pattern: /work from home.*\$|earn.*day.*no experience/i, label: "Job Scam", severity: "MEDIUM" },
  { pattern: /verify.*account|account.*verify/i, label: "Account Takeover", severity: "HIGH" },
  { pattern: /limited.*offer|offer.*limited.*time/i, label: "Urgency Manipulation", severity: "LOW" },
  { pattern: /admin|support.*telegram|telegram.*official/i, label: "Impersonation", severity: "HIGH" },
  { pattern: /nft.*free|free.*nft|airdrop/i, label: "NFT/Airdrop Scam", severity: "MEDIUM" },
];

function getRiskColor(risk) {
  if (risk === "HIGH") return "#ff3b3b";
  if (risk === "MEDIUM") return "#ff9900";
  return "#00c896";
}

function ScamBadge({ level }) {
  const color = getRiskColor(level);
  return (
    <span style={{
      background: color + "22",
      color,
      border: `1px solid ${color}55`,
      borderRadius: 4,
      padding: "2px 10px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
    }}>{level}</span>
  );
}

function Tab({ label, active, onClick, icon }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "#0f1f35" : "transparent",
      color: active ? "#29d4ff" : "#6a8aab",
      border: "none",
      borderBottom: active ? "2px solid #29d4ff" : "2px solid transparent",
      padding: "12px 22px",
      cursor: "pointer",
      fontFamily: "'DM Mono', monospace",
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 0.5,
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <span>{icon}</span>{label}
    </button>
  );
}

function Notification({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 999,
      background: "#0a2540",
      border: "1px solid #29d4ff44",
      borderLeft: "4px solid #29d4ff",
      color: "#c8eeff",
      padding: "14px 22px",
      borderRadius: 8,
      fontSize: 13,
      fontFamily: "'DM Mono', monospace",
      boxShadow: "0 8px 32px #000a",
      animation: "slideIn 0.3s ease",
      maxWidth: 320,
    }}>{msg}</div>
  );
}

export default function AntiScamApp() {
  const [tab, setTab] = useState("check");
  const [checkInput, setCheckInput] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const [reportUsername, setReportUsername] = useState("");
  const [reportType, setReportType] = useState("Crypto Scam");
  const [reportMsg, setReportMsg] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [reportDone, setReportDone] = useState(false);

  const [analyzeMsg, setAnalyzeMsg] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [db, setDb] = useState(SCAMMER_DB);
  const [dbSearch, setDbSearch] = useState("");
  const [notification, setNotification] = useState(null);

  const aiAnalyze = async (message) => {
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const localMatches = SCAM_PATTERNS.filter(p => p.pattern.test(message));
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an expert scam detection AI for Telegram messages. Analyze messages for scam patterns. 
Return ONLY a valid JSON object (no markdown, no extra text) with these fields:
{
  "riskScore": 0-100,
  "riskLevel": "LOW"|"MEDIUM"|"HIGH",
  "scamType": "string or null",
  "indicators": ["array", "of", "red", "flags"],
  "verdict": "brief verdict sentence",
  "advice": "what the user should do"
}`,
          messages: [{ role: "user", content: `Analyze this Telegram message for scam indicators:\n\n"${message}"` }]
        })
      });
      const data = await response.json();
      const text = data.content.map(i => i.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      parsed.localMatches = localMatches;
      setAnalyzeResult(parsed);
    } catch (e) {
      const localMatches = SCAM_PATTERNS.filter(p => p.pattern.test(message));
      const score = localMatches.length === 0 ? 10 : localMatches.some(m => m.severity === "HIGH") ? 85 : 50;
      setAnalyzeResult({
        riskScore: score,
        riskLevel: score > 70 ? "HIGH" : score > 40 ? "MEDIUM" : "LOW",
        scamType: localMatches[0]?.label || null,
        indicators: localMatches.map(m => m.label),
        verdict: score > 70 ? "This message shows strong scam indicators." : score > 40 ? "This message has some suspicious elements." : "This message appears relatively safe.",
        advice: score > 40 ? "Do not click any links or send any money. Block and report this user." : "Stay cautious. Never share personal info with strangers.",
        localMatches,
      });
    }
    setAnalyzing(false);
  };

  const handleCheck = async () => {
    if (!checkInput.trim()) return;
    setChecking(true);
    setCheckResult(null);
    await new Promise(r => setTimeout(r, 700));
    const query = checkInput.trim().toLowerCase().replace(/^@/, "");
    const found = db.find(s => s.username.toLowerCase().replace(/^@/, "") === query);
    if (found) {
      setCheckResult({ found: true, data: found });
    } else {
      setCheckResult({ found: false, username: checkInput.trim() });
    }
    setChecking(false);
  };

  const handleReport = () => {
    if (!reportUsername.trim() || !reportMsg.trim()) return;
    const newEntry = {
      username: reportUsername.startsWith("@") ? reportUsername : "@" + reportUsername,
      type: reportType,
      reports: 1,
      risk: "HIGH",
      date: new Date().toISOString().split("T")[0],
      message: reportMsg,
      note: reportNote,
    };
    setDb(prev => [newEntry, ...prev]);
    setReportDone(true);
    setNotification("✅ Scammer reported and added to the database!");
    setTimeout(() => {
      setReportDone(false);
      setReportUsername("");
      setReportMsg("");
      setReportNote("");
    }, 2000);
  };

  const filteredDb = db.filter(s =>
    s.username.toLowerCase().includes(dbSearch.toLowerCase()) ||
    s.type.toLowerCase().includes(dbSearch.toLowerCase())
  );

  const inputStyle = {
    background: "#071828",
    border: "1px solid #1a3a5c",
    borderRadius: 8,
    color: "#c8eeff",
    padding: "11px 16px",
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border 0.2s",
  };

  const btnStyle = {
    background: "linear-gradient(135deg, #0f6fff, #29d4ff)",
    color: "#000",
    border: "none",
    borderRadius: 8,
    padding: "12px 28px",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    letterSpacing: 0.5,
    transition: "opacity 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#040e1a",
      color: "#c8eeff",
      fontFamily: "'DM Mono', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: #2a5070; }
        textarea:focus, input:focus { border-color: #29d4ff !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #040e1a; }
        ::-webkit-scrollbar-thumb { background: #1a3a5c; border-radius: 3px; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .card { animation: fadeUp 0.4s ease; }
        .btn:hover { opacity: 0.85; }
        .row-hover:hover { background: #071828 !important; }
      `}</style>

      {notification && <Notification msg={notification} onClose={() => setNotification(null)} />}

      {/* Header */}
      <div style={{ background: "#06111f", borderBottom: "1px solid #0d2a45", padding: "0 32px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #0f6fff22, #29d4ff33)",
              border: "1px solid #29d4ff44",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>🛡️</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
                TeleGuard
              </div>
              <div style={{ fontSize: 10, color: "#29d4ff", letterSpacing: 2, textTransform: "uppercase" }}>Anti-Scam Intelligence</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#6a8aab" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00c896", display: "inline-block", animation: "pulse 2s infinite" }}></span>
            {db.length} entries in database
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex" }}>
          <Tab label="Check User" icon="🔍" active={tab === "check"} onClick={() => setTab("check")} />
          <Tab label="Report Scammer" icon="🚨" active={tab === "report"} onClick={() => setTab("report")} />
          <Tab label="AI Analyzer" icon="🤖" active={tab === "analyze"} onClick={() => setTab("analyze")} />
          <Tab label="Database" icon="🗄️" active={tab === "db"} onClick={() => setTab("db")} />
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>

        {/* CHECK TAB */}
        {tab === "check" && (
          <div className="card">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Check a Telegram User</div>
              <div style={{ color: "#6a8aab", fontSize: 13 }}>Enter a username or link to check against our scammer database.</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              <input
                style={inputStyle}
                placeholder="@username or t.me/username"
                value={checkInput}
                onChange={e => setCheckInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCheck()}
              />
              <button className="btn" style={{ ...btnStyle, whiteSpace: "nowrap" }} onClick={handleCheck} disabled={checking}>
                {checking ? "Checking…" : "Check"}
              </button>
            </div>

            {checking && (
              <div style={{ textAlign: "center", color: "#29d4ff", padding: 32, fontSize: 13, animation: "pulse 1s infinite" }}>
                🔍 Scanning database…
              </div>
            )}

            {checkResult && !checking && (
              <div style={{
                background: checkResult.found ? "#1a050555" : "#00200f55",
                border: `1px solid ${checkResult.found ? "#ff3b3b44" : "#00c89644"}`,
                borderRadius: 12,
                padding: 24,
                animation: "fadeUp 0.3s ease",
              }}>
                {checkResult.found ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                      <span style={{ fontSize: 28 }}>⚠️</span>
                      <div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#ff3b3b" }}>SCAMMER DETECTED</div>
                        <div style={{ color: "#ff7070", fontSize: 12 }}>{checkResult.data.username}</div>
                      </div>
                      <div style={{ marginLeft: "auto" }}><ScamBadge level={checkResult.data.risk} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      {[
                        ["Scam Type", checkResult.data.type],
                        ["Reports", checkResult.data.reports + " users reported"],
                        ["First Seen", checkResult.data.date],
                        ["Risk Level", checkResult.data.risk],
                      ].map(([k, v]) => (
                        <div key={k} style={{ background: "#00000033", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 10, color: "#6a8aab", marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>{k}</div>
                          <div style={{ fontSize: 13, color: "#fff" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "#00000033", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "#6a8aab", marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Known Scam Message</div>
                      <div style={{ fontSize: 13, color: "#ffb070", fontStyle: "italic" }}>"{checkResult.data.message}"</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#ff9090", background: "#ff000011", borderRadius: 8, padding: "10px 14px", border: "1px solid #ff300022" }}>
                      🚫 <strong>Do not</strong> engage, click links, or send money. Block and report this user immediately.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: 28 }}>✅</span>
                      <div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#00c896" }}>Not in Database</div>
                        <div style={{ color: "#60d8a8", fontSize: 12 }}>{checkResult.username}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#6a8aab" }}>
                      This user isn't in our scammer database. However, always stay cautious — use the <strong style={{ color: "#29d4ff" }}>AI Analyzer</strong> to check suspicious messages.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* REPORT TAB */}
        {tab === "report" && (
          <div className="card">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Report a Scammer</div>
              <div style={{ color: "#6a8aab", fontSize: 13 }}>Help protect the community by reporting scammers.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "#6a8aab", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Scammer Username *</label>
                <input style={inputStyle} placeholder="@username" value={reportUsername} onChange={e => setReportUsername(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#6a8aab", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Scam Type *</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={reportType} onChange={e => setReportType(e.target.value)}>
                  {["Crypto Scam", "Job Scam", "Lottery Scam", "Impersonation", "NFT Scam", "Romance Scam", "Phishing", "Investment Fraud", "Other"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#6a8aab", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Scam Message They Sent *</label>
                <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder="Paste the message the scammer sent you..." value={reportMsg} onChange={e => setReportMsg(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#6a8aab", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Additional Notes</label>
                <input style={inputStyle} placeholder="Any other details..." value={reportNote} onChange={e => setReportNote(e.target.value)} />
              </div>
              <button className="btn" style={{ ...btnStyle, marginTop: 4 }} onClick={handleReport} disabled={reportDone}>
                {reportDone ? "✅ Reported!" : "🚨 Submit Report"}
              </button>
            </div>
          </div>
        )}

        {/* ANALYZE TAB */}
        {tab === "analyze" && (
          <div className="card">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>AI Message Analyzer</div>
              <div style={{ color: "#6a8aab", fontSize: 13 }}>Paste a suspicious Telegram message and let AI detect scam patterns.</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <textarea
                style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                placeholder="Paste the suspicious message here..."
                value={analyzeMsg}
                onChange={e => setAnalyzeMsg(e.target.value)}
              />
            </div>
            <button className="btn" style={btnStyle} onClick={() => aiAnalyze(analyzeMsg)} disabled={analyzing || !analyzeMsg.trim()}>
              {analyzing ? "🤖 Analyzing…" : "🤖 Analyze with AI"}
            </button>

            {analyzing && (
              <div style={{ textAlign: "center", color: "#29d4ff", padding: 32, fontSize: 13, animation: "pulse 1s infinite" }}>
                🤖 AI is analyzing the message…
              </div>
            )}

            {analyzeResult && !analyzing && (
              <div style={{ marginTop: 24, animation: "fadeUp 0.3s ease" }}>
                {/* Risk meter */}
                <div style={{
                  background: "#06111f",
                  border: `1px solid ${getRiskColor(analyzeResult.riskLevel)}44`,
                  borderRadius: 12,
                  padding: 22,
                  marginBottom: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800 }}>Risk Assessment</div>
                    <ScamBadge level={analyzeResult.riskLevel} />
                  </div>
                  <div style={{ background: "#040e1a", borderRadius: 6, height: 10, marginBottom: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: analyzeResult.riskScore + "%",
                      background: `linear-gradient(90deg, #0f6fff, ${getRiskColor(analyzeResult.riskLevel)})`,
                      borderRadius: 6,
                      transition: "width 1s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6a8aab" }}>
                    <span>Safe</span>
                    <span style={{ color: getRiskColor(analyzeResult.riskLevel), fontWeight: 700 }}>{analyzeResult.riskScore}/100</span>
                    <span>Dangerous</span>
                  </div>
                </div>

                {analyzeResult.scamType && (
                  <div style={{ background: "#06111f", borderRadius: 10, padding: "12px 16px", marginBottom: 12, border: "1px solid #1a3a5c" }}>
                    <span style={{ fontSize: 11, color: "#6a8aab", letterSpacing: 1, textTransform: "uppercase" }}>Scam Type: </span>
                    <span style={{ color: "#ff9900", fontWeight: 600 }}>{analyzeResult.scamType}</span>
                  </div>
                )}

                <div style={{ background: "#06111f", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #1a3a5c" }}>
                  <div style={{ fontSize: 11, color: "#6a8aab", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Red Flags Detected</div>
                  {analyzeResult.indicators && analyzeResult.indicators.length > 0 ? (
                    analyzeResult.indicators.map((flag, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, fontSize: 13 }}>
                        <span style={{ color: "#ff3b3b" }}>⚑</span> {flag}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: "#00c896" }}>No major red flags detected.</div>
                  )}
                </div>

                <div style={{ background: "#06111f", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #1a3a5c" }}>
                  <div style={{ fontSize: 11, color: "#6a8aab", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Verdict</div>
                  <div style={{ fontSize: 13, color: "#fff" }}>{analyzeResult.verdict}</div>
                </div>

                <div style={{
                  background: analyzeResult.riskLevel === "HIGH" ? "#1a050555" : "#00200f55",
                  borderRadius: 10, padding: "14px 16px",
                  border: `1px solid ${getRiskColor(analyzeResult.riskLevel)}33`,
                  fontSize: 13,
                  color: analyzeResult.riskLevel === "HIGH" ? "#ff9090" : "#70d8a8",
                }}>
                  💡 <strong>Advice:</strong> {analyzeResult.advice}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DB TAB */}
        {tab === "db" && (
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Scammer Database</div>
                <div style={{ color: "#6a8aab", fontSize: 13 }}>{filteredDb.length} known scammers</div>
              </div>
              <input
                style={{ ...inputStyle, width: 200 }}
                placeholder="Search…"
                value={dbSearch}
                onChange={e => setDbSearch(e.target.value)}
              />
            </div>

            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #0d2a45" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1.4fr 1fr 80px 80px",
                background: "#06111f",
                padding: "10px 16px",
                fontSize: 10, color: "#6a8aab", letterSpacing: 1, textTransform: "uppercase",
                borderBottom: "1px solid #0d2a45",
              }}>
                <span>Username</span><span>Type</span><span>Reports</span><span>Risk</span>
              </div>
              {filteredDb.length === 0 && (
                <div style={{ textAlign: "center", padding: 32, color: "#6a8aab", fontSize: 13 }}>No results found.</div>
              )}
              {filteredDb.map((s, i) => (
                <div key={i} className="row-hover" style={{
                  display: "grid", gridTemplateColumns: "1.4fr 1fr 80px 80px",
                  padding: "13px 16px",
                  borderBottom: i < filteredDb.length - 1 ? "1px solid #0d2a4577" : "none",
                  fontSize: 13,
                  transition: "background 0.15s",
                  cursor: "default",
                }}>
                  <span style={{ color: "#29d4ff", fontWeight: 500 }}>{s.username}</span>
                  <span style={{ color: "#c8eeff" }}>{s.type}</span>
                  <span style={{ color: "#6a8aab" }}>{s.reports}</span>
                  <span><ScamBadge level={s.risk} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "24px 0 32px", color: "#1a3a5c", fontSize: 11, letterSpacing: 1 }}>
        TELEGUARD • ANTI-SCAM INTELLIGENCE • PROTECT THE COMMUNITY
      </div>
    </div>
  );
}
