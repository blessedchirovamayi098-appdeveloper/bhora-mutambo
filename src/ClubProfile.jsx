import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./ClubProfile.css";

const first = (row, keys, fallback = "") => {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null && row[key] !== "") return row[key];
  return fallback;
};
const norm = (value) => String(value ?? "").trim().toLowerCase();
const roleOf = (row) => norm(first(row, ["role", "registration_type", "member_type", "official_role", "position"], "player"));
const statusOf = (row) => norm(first(row, ["status", "approval_status"], ""));
const nameOf = (row) => String(first(row, ["display_name", "full_name", "player_name", "football_name", "name"], "Unnamed member"));
const clubMatch = (row, club) => {
  const id = first(row, ["club_id", "team_id", "club_uuid"], null);
  if (id && club?.id) return String(id) === String(club.id);
  const name = norm(first(row, ["club_name", "club", "team_name"], ""));
  return Boolean(name && (name === norm(club?.name) || name === norm(club?.short_name)));
};
const isCompleted = (match) => ["completed", "complete", "finished", "full time", "full-time", "ft"].includes(norm(match.status));
const score = (match, side) => {
  const keys = side === "home" ? ["home_score", "home_full_time_score", "home_goals"] : ["away_score", "away_full_time_score", "away_goals"];
  const raw = first(match, keys, null);
  return raw === null || raw === "" ? null : Number(raw);
};
const fmtDate = (value) => {
  if (!value) return "Date TBC";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const shortDateKey = (match) => first(match, ["kickoff_at", "match_date", "date", "scheduled_at", "created_at"], "");

export default function ClubProfile({ club, onClose }) {
  const [tab, setTab] = useState("overview");
  const [records, setRecords] = useState({ roster: [], profiles: [], registrations: [], matches: [], events: [], lineups: [], suspensions: [] });
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !club) { setLoading(false); return; }
      setLoading(true);
      const tables = [
        ["roster", "approved_roster"], ["profiles", "approved_player_profiles"],
        ["registrations", "registrations"], ["matches", "matches"],
        ["events", "match_events"], ["lineups", "match_lineups"], ["suspensions", "suspensions"]
      ];
      const results = await Promise.all(tables.map(async ([key, table]) => {
        const { data, error } = await supabase.from(table).select("*").limit(2500);
        return { key, data: data || [], error: error?.message || "" };
      }));
      if (!active) return;
      const next = {};
      const missing = [];
      results.forEach((result) => { next[result.key] = result.data; if (result.error) missing.push(result.key); });
      setRecords(next);
      setUnavailable(missing);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [club]);

  const relatedMatches = useMemo(() => records.matches.filter((m) => {
    const homeId = first(m, ["home_club_id", "home_team_id"], null);
    const awayId = first(m, ["away_club_id", "away_team_id"], null);
    if (homeId || awayId) return String(homeId) === String(club?.id) || String(awayId) === String(club?.id);
    return clubMatch({ club_name: first(m, ["home_club_name", "home_club", "home_team"], "") }, club) ||
      clubMatch({ club_name: first(m, ["away_club_name", "away_club", "away_team"], "") }, club);
  }).sort((a, b) => new Date(shortDateKey(b) || 0) - new Date(shortDateKey(a) || 0)), [records.matches, club]);

  const roster = useMemo(() => {
    const source = [...records.roster, ...records.profiles].filter((row) => clubMatch(row, club));
    const seen = new Set();
    return source.filter((row) => {
      const key = String(first(row, ["id", "player_id", "user_id"], nameOf(row)) ) + "|" + nameOf(row);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }, [records.roster, records.profiles, club]);

  const registrations = useMemo(() => records.registrations.filter((r) => clubMatch(r, club) && ["approved", "active", "accepted"].includes(statusOf(r))), [records.registrations, club]);
  const staff = useMemo(() => {
    const combined = [...roster, ...registrations];
    const seen = new Set();
    return combined.filter((row) => {
      const role = roleOf(row);
      const key = String(first(row, ["id", "user_id"], nameOf(row)));
      if (!/coach|manager|referee|official|assistant coach|trainer/.test(role) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [roster, registrations]);
  const players = useMemo(() => roster.filter((r) => !/coach|manager|referee|official|trainer/.test(roleOf(r))), [roster]);

  const stats = useMemo(() => {
    const result = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, cleanSheets: 0 };
    relatedMatches.filter((m) => isCompleted(m) && score(m, "home") !== null && score(m, "away") !== null).forEach((m) => {
      const homeId = first(m, ["home_club_id", "home_team_id"], null);
      const isHome = homeId ? String(homeId) === String(club?.id) : clubMatch({ club_name: first(m, ["home_club_name", "home_club", "home_team"], "") }, club);
      const gf = score(m, isHome ? "home" : "away");
      const ga = score(m, isHome ? "away" : "home");
      result.played++; result.gf += gf; result.ga += ga;
      if (gf > ga) { result.won++; result.points += 3; }
      else if (gf === ga) { result.drawn++; result.points++; }
      else result.lost++;
      if (ga === 0) result.cleanSheets++;
    });
    return result;
  }, [relatedMatches, club]);

  const playerStats = useMemo(() => {
    const eventCounts = new Map();
    records.events.forEach((event) => {
      const match = relatedMatches.find((m) => String(m.id) === String(first(event, ["match_id"], "")));
      if (!match) return;
      const eventClubId = first(event, ["club_id", "team_id"], null);
      const homeId = first(match, ["home_club_id", "home_team_id"], null);
      const awayId = first(match, ["away_club_id", "away_team_id"], null);
      const eventClubName = first(event, ["club_name", "team_name"], "");
      const belongs = eventClubId ? String(eventClubId) === String(club?.id) : norm(eventClubName) === norm(club?.name);
      if (!belongs && homeId && awayId) return;
      const playerId = String(first(event, ["player_id", "roster_id"], ""));
      const playerName = String(first(event, ["player_name", "full_name", "name"], ""));
      const key = playerId || playerName;
      if (!key) return;
      const current = eventCounts.get(key) || { goals: 0, assists: 0, yellow: 0, red: 0 };
      const type = norm(first(event, ["event_type", "type", "event", "kind"], ""));
      if (type.includes("goal") && !type.includes("own")) current.goals++;
      if (type.includes("assist")) current.assists++;
      if (type.includes("yellow")) current.yellow++;
      if (type.includes("red")) current.red++;
      eventCounts.set(key, current);
    });
    return players.map((player) => {
      const id = String(first(player, ["id", "player_id", "user_id"], ""));
      const counts = eventCounts.get(id) || eventCounts.get(nameOf(player)) || {};
      return { ...player, stats: { goals: Number(first(player, ["goals", "total_goals"], counts.goals || 0)), assists: Number(first(player, ["assists", "total_assists"], counts.assists || 0)), yellow: Number(first(player, ["yellow_cards", "yellow_card_count"], counts.yellow || 0)), red: Number(first(player, ["red_cards", "red_card_count"], counts.red || 0)) } };
    }).sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists);
  }, [players, records.events, relatedMatches, club]);

  const suspensions = useMemo(() => records.suspensions.filter((s) =>
    clubMatch(s, club) || players.some((p) => String(first(p, ["id", "player_id"], "")) === String(first(s, ["player_id", "roster_id"], "!")))
  ), [records.suspensions, players, club]);

  return <section className="club-profile-panel" id="club-profile" aria-label={`${club?.name || "Club"} profile`}>
    <div className="club-profile-head">
      <div className="club-profile-identity"><span className="club-profile-mark">{String(club?.short_name || club?.name || "FC").slice(0, 3).toUpperCase()}</span><div><span className="club-profile-kicker">OFFICIAL CLUB PROFILE</span><h2>{club?.name}</h2><p>{club?.description || "Club information, squad and performance overview."}</p></div></div>
      <button className="club-profile-close" onClick={onClose} type="button" aria-label="Close club profile">✕ Close</button>
    </div>
    <div className="club-profile-tabs" role="tablist" aria-label="Club profile sections">
      {[["overview","Overview"],["squad","Players & squad"],["staff","Coaches & referees"],["matches","Matches & stats"],["discipline","Discipline"]].map(([key,label]) => <button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?"active":""} onClick={() => setTab(key)}>{label}</button>)}
    </div>
    {loading ? <div className="club-profile-loading">Loading live club records from Supabase…</div> : <>
      {unavailable.length > 0 && <p className="club-profile-note">Some data sections could not be loaded due to table permissions or schema availability. Available records are still shown.</p>}
      {tab === "overview" && <>
        <div className="club-profile-stat-grid">{[["Players",players.length],["Matches",stats.played],["Wins",stats.won],["Goals",stats.gf],["Points",stats.points],["Clean sheets",stats.cleanSheets]].map(([label,value])=><div className="club-profile-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="club-profile-columns"><div className="club-profile-card"><div className="club-profile-card-title"><h3>Recent matches</h3><button type="button" onClick={()=>setTab("matches")}>View all →</button></div>{relatedMatches.slice(0,4).length ? relatedMatches.slice(0,4).map((m)=><MatchRow key={m.id} match={m}/>) : <p className="club-profile-empty">No match records are linked to this club yet.</p>}</div><div className="club-profile-card"><div className="club-profile-card-title"><h3>Top performers</h3><button type="button" onClick={()=>setTab("squad")}>View squad →</button></div>{playerStats.slice(0,5).map((p)=><div className="club-profile-performer" key={first(p,["id","player_id"],nameOf(p))}><span className="club-profile-player-avatar">{nameOf(p).slice(0,1).toUpperCase()}</span><div><strong>{nameOf(p)}</strong><small>{first(p,["position","playing_position"],"Player")}</small></div><b>{p.stats.goals} G</b></div>)}{!playerStats.length&&<p className="club-profile-empty">Player performance appears here as records are approved and matches are recorded.</p>}</div></div>
      </>}
      {tab === "squad" && <><div className="club-profile-section-title"><div><span className="club-profile-kicker">FIRST TEAM</span><h3>Players & squad</h3></div><span>{playerStats.length} squad records</span></div><div className="club-profile-people-grid">{playerStats.map((p)=><article className="club-profile-person" key={first(p,["id","player_id"],nameOf(p))}><div className="club-profile-person-banner"><span>{first(p,["shirt_number","jersey_number","number"],"—")}</span><small>{first(p,["position","playing_position"],"Squad member")}</small></div><div className="club-profile-person-body"><h4>{nameOf(p)}</h4><p>{first(p,["status","squad_status"],"Approved squad")}</p><div className="club-profile-mini-stats"><span><b>{p.stats.goals}</b>Goals</span><span><b>{p.stats.assists}</b>Assists</span><span><b>{p.stats.yellow}</b>Yellow</span><span><b>{p.stats.red}</b>Red</span></div></div></article>)}</div>{!players.length&&<p className="club-profile-empty">No approved player profiles or roster records were found for this club.</p>}</>}
      {tab === "staff" && <><div className="club-profile-section-title"><div><span className="club-profile-kicker">CLUB PERSONNEL</span><h3>Coaches, managers & referees</h3></div><span>{staff.length} staff records</span></div><div className="club-profile-people-grid">{staff.map((p)=><article className="club-profile-person staff" key={first(p,["id","user_id"],nameOf(p))}><div className="club-profile-person-banner"><span>✦</span><small>{first(p,["role","registration_type","member_type","official_role","position"],"Official")}</small></div><div className="club-profile-person-body"><h4>{nameOf(p)}</h4><p>{first(p,["qualification","experience","bio","description"],"Club official")}</p><div className="club-profile-contact">{first(p,["email"],"")}{first(p,["phone","phone_number"],"") ? ` · ${first(p,["phone","phone_number"],"")}` : ""}</div></div></article>)}</div>{!staff.length&&<p className="club-profile-empty">No approved coach, manager or referee records are linked to this club yet. Approved registration roles will appear here.</p>}</>}
      {tab === "matches" && <><div className="club-profile-section-title"><div><span className="club-profile-kicker">PERFORMANCE CENTRE</span><h3>Match results & club statistics</h3></div><span>{stats.played} completed matches</span></div><div className="club-profile-stat-grid compact">{[["Played",stats.played],["Won",stats.won],["Drawn",stats.drawn],["Lost",stats.lost],["Goals for",stats.gf],["Goals against",stats.ga],["Goal difference",stats.gf-stats.ga],["League points",stats.points]].map(([label,value])=><div className="club-profile-stat" key={label}><span>{label}</span><strong>{value>0&&label==="Goal difference"?`+${value}`:value}</strong></div>)}</div><div className="club-profile-match-reports">{relatedMatches.map((m)=><ClubMatchReport key={m.id} match={m} lineups={records.lineups} events={records.events} />)}</div>{!relatedMatches.length&&<p className="club-profile-empty">Fixtures will appear here after the club is scheduled in a match.</p>}</>}
      {tab === "discipline" && <><div className="club-profile-section-title"><div><span className="club-profile-kicker">FAIR PLAY</span><h3>Discipline & suspensions</h3></div><span>{suspensions.length} records</span></div><div className="club-profile-card">{suspensions.map((s)=><div className="club-profile-discipline-row" key={first(s,["id","uuid"],JSON.stringify(s))}><div><strong>{first(s,["player_name","full_name","name"],"Player record")}</strong><small>{first(s,["reason","offence","description"],"Disciplinary record")}</small></div><span className={`discipline-status ${norm(first(s,["status"],"pending"))}`}>{first(s,["status"],"Recorded")}</span><small>{first(s,["matches_remaining","remaining_matches"],"—")} matches remaining</small></div>)}{!suspensions.length&&<p className="club-profile-empty">No suspensions or disciplinary records are linked to this club.</p>}</div></>}
    </>}
  </section>;
}


function ClubMatchReport({ match, lineups, events }) {
  const homeId = first(match, ["home_club_id", "home_team_id"], null);
  const awayId = first(match, ["away_club_id", "away_team_id"], null);
  const homeName = first(match, ["home_club_name", "home_club", "home_team"], "Home club");
  const awayName = first(match, ["away_club_name", "away_club", "away_team"], "Away club");
  const homeScore = score(match, "home");
  const awayScore = score(match, "away");
  const completed = isCompleted(match);
  const matchLineups = lineups.filter((row) => String(first(row, ["match_id", "fixture_id"], "")) === String(match.id));
  const matchEvents = events.filter((row) => String(first(row, ["match_id", "fixture_id"], "")) === String(match.id))
    .sort((a, b) => Number(first(a, ["minute", "event_minute"], 0)) - Number(first(b, ["minute", "event_minute"], 0)));
  const teamRows = (teamId, teamName) => matchLineups.filter((row) => {
    const rowClubId = first(row, ["club_id", "team_id"], null);
    if (rowClubId && teamId) return String(rowClubId) === String(teamId);
    return norm(first(row, ["club_name", "team_name"], "")) === norm(teamName);
  });
  const teams = [
    { id: homeId, name: homeName, rows: teamRows(homeId, homeName) },
    { id: awayId, name: awayName, rows: teamRows(awayId, awayName) }
  ];
  const isStarter = (row) => Boolean(first(row, ["is_starting_xi", "starting_xi", "is_starter"], false)) ||
    ["starter", "starting xi", "starting_xi"].includes(norm(first(row, ["squad_role", "lineup_status"], "")));
  return <article className="club-profile-match-report">
    <div className="club-profile-match-score">
      <div><span>{homeName}</span><strong>{completed && homeScore !== null ? homeScore : "—"}</strong></div>
      <span className="club-profile-vs">VS</span>
      <div><strong>{completed && awayScore !== null ? awayScore : "—"}</strong><span>{awayName}</span></div>
    </div>
    <div className="club-profile-match-meta">
      <span>{fmtDate(shortDateKey(match))}</span>
      <span>{first(match, ["venue", "ground", "location"], "Venue TBC")}</span>
      <span className={`club-match-status ${completed ? "done" : "upcoming"}`}>{first(match, ["status"], "Scheduled")}</span>
    </div>
    {matchLineups.length > 0 && <div className="club-profile-lineup-grid">
      {teams.map((team) => <div className="club-profile-lineup-team" key={String(team.id || team.name)}>
        <h4>{team.name}</h4>
        <div className="club-profile-lineup-pitch">
          {team.rows.filter(isStarter).map((row, index) => <div className="club-profile-lineup-player" key={first(row, ["id", "player_id"], `${nameOf(row)}-${index}`)}>
            <span>{first(row, ["shirt_number", "jersey_number", "number"], "—")}</span>
            <strong>{nameOf(row)}</strong><small>{first(row, ["position", "lineup_position"], "Player")}</small>
          </div>)}
          {!team.rows.some(isStarter) && <p>Starting XI has not been marked yet.</p>}
        </div>
        <div className="club-profile-bench"><strong>Squad & bench</strong>
          {team.rows.filter((row) => !isStarter(row)).map((row, index) => <div key={first(row, ["id", "player_id"], `${nameOf(row)}-bench-${index}`)}>
            <span>#{first(row, ["shirt_number", "jersey_number", "number"], "—")}</span><strong>{nameOf(row)}</strong>
            <small>{first(row, ["position", "lineup_position"], "Player")} · {first(row, ["minutes_played", "minutes"], 0)} min</small>
          </div>)}
        </div>
      </div>)}
    </div>}
    {matchEvents.length > 0 && <div className="club-profile-events"><h4>Match events</h4>
      {matchEvents.map((event, index) => {
        const eventType = String(first(event, ["event_type", "type", "event"], "Event")).replaceAll("_", " ");
        const eventLower = eventType.toLowerCase();
        return <div key={first(event, ["id", "uuid"], `${index}-${eventType}`)}>
          <time>{first(event, ["minute", "event_minute"], "—")}{first(event, ["minute", "event_minute"], null) !== null ? "′" : ""}</time>
          <span className={`club-event-icon ${eventLower.includes("red") ? "red" : eventLower.includes("yellow") ? "yellow" : ""}`}>{eventType}</span>
          <strong>{first(event, ["player_name", "full_name", "name"], "Match record")}</strong>
          <small>{first(event, ["description", "notes"], "")}</small>
        </div>;
      })}
    </div>}
    {matchLineups.length === 0 && matchEvents.length === 0 && <p className="club-profile-empty compact-empty">Starting XI, substitutes, goals, cards and the event timeline will appear here after an administrator records the match report.</p>}
  </article>;
}

function MatchRow({ match }) {
  const home = first(match, ["home_club_name", "home_club", "home_team"], "Home club");
  const away = first(match, ["away_club_name", "away_club", "away_team"], "Away club");
  const hs = score(match, "home"), as = score(match, "away");
  return <div className="club-profile-match-row"><div><strong>{home}</strong><span>{isCompleted(match) && hs !== null ? `${hs} – ${as}` : "vs"} </span><strong>{away}</strong></div><small>{fmtDate(shortDateKey(match))} · {first(match, ["venue","ground","location"],"Venue TBC")}</small><span className={`club-match-status ${isCompleted(match)?"done":"upcoming"}`}>{isCompleted(match)?"Completed":first(match,["status"],"Scheduled")}</span></div>;
}
