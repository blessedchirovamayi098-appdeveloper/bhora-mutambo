import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase, supabaseConfigured } from "./supabase";
import AdminDashboard from "./AdminDashboard";
import ClubProfile from "./ClubProfile";
import "./App.css";

const CLUBS = [
  {
    name: "Reborn FC",
    color: "#39ff14",
    description:
      "Building a stronger team through discipline, unity and determination.",
  },
  {
    name: "Leaving FC",
    color: "#ff303b",
    description:
      "Competing with confidence, teamwork and a winning mentality.",
  },
  {
    name: "All Stars FC",
    color: "#39ff14",
    description:
      "Bringing talented players together to shine on the pitch.",
  },
  {
    name: "Part 2 FC",
    color: "#ff303b",
    description:
      "A team built on commitment, resilience and football passion.",
  },
  {
    name: "Part 3 FC",
    color: "#39ff14",
    description: "Growing together through competition and teamwork.",
  },
  {
    name: "Mageez",
    color: "#ff303b",
    description: "Creativity, skill and ambition in every match.",
  },
];

const OFFICIAL_GOALKEEPER_IDS = new Set([
  "6188bdf0-3c28-47c3-957d-94c36f9e8b34",
  "a4840726-309b-4db0-a6f0-c3d16d52ed4e",
  "95badfb7-3ed7-48f3-ba70-6b02b315e981",
  "82364d21-22a9-44aa-9b41-e66ee6c2210a",
  "b53073d4-92db-4be8-b014-eb9239a9bc0e",
  "19956c3d-5e43-44be-8f2f-784d48d20e9b",
]);

const NAV_ITEMS = [
  ["Home", "home"],
  ["Clubs", "clubs"],
  ["Fixtures", "fixtures"],
  ["Standings", "standings"],
  ["Top 10 Players", "statistics"],
  ["Register", "register"],
  ["About", "about"],
];

// Demo data only. Replace with verified Supabase records later.
const SAMPLE_TOP_PLAYERS = [
  { name: "Player One", club: "Reborn FC", goals: 12, assists: 7, yellowCards: 1, redCards: 0 },
  { name: "Player Two", club: "All Stars FC", goals: 10, assists: 5, yellowCards: 2, redCards: 0 },
  { name: "Player Three", club: "Mageez", goals: 9, assists: 6, yellowCards: 1, redCards: 1 },
  { name: "Player Four", club: "Leaving FC", goals: 8, assists: 4, yellowCards: 3, redCards: 0 },
  { name: "Player Five", club: "Part 2 FC", goals: 7, assists: 5, yellowCards: 2, redCards: 0 },
  { name: "Player Six", club: "Part 3 FC", goals: 6, assists: 3, yellowCards: 1, redCards: 0 },
  { name: "Player Seven", club: "Reborn FC", goals: 5, assists: 4, yellowCards: 2, redCards: 1 },
  { name: "Player Eight", club: "Mageez", goals: 4, assists: 6, yellowCards: 3, redCards: 0 },
  { name: "Player Nine", club: "All Stars FC", goals: 3, assists: 2, yellowCards: 0, redCards: 0 },
  { name: "Player Ten", club: "Leaving FC", goals: 2, assists: 3, yellowCards: 2, redCards: 1 },
];

const SAMPLE_MATCHES = [
  {
    id: "match-1",
    competition: "MRU Football League",
    season: "2026-2027",
    home: "All Stars FC",
    away: "Part 2 FC",
    date: "15 Oct 2026",
    time: "4:00 pm",
    venue: "Manav Rachna Football Pitch",
    status: "Scheduled",
    homeScore: null,
    awayScore: null,
    halfTime: null,
    homeFormation: "4-3-3",
    awayFormation: "4-3-3",
    homeLineup: [],
    awayLineup: [],
    events: [],
  },
  {
    id: "match-2",
    competition: "MRU Football League",
    season: "2026-2027",
    home: "Leaving FC",
    away: "Part 3 FC",
    date: "11 Oct 2026",
    time: "4:30 pm",
    venue: "Manav Rachna Football Pitch",
    status: "Completed",
    homeScore: 2,
    awayScore: 3,
    halfTime: "0–1",
    homeFormation: "4-3-3",
    awayFormation: "4-3-3",
    homeLineup: [
      { number: 4, name: "Gibson Tazivaishe Matongo", position: "CB", minutes: 90, goals: 0, assists: 0, cards: "0Y / 0R" },
      { number: 8, name: "Samuel (BEAST)", position: "CM", minutes: 70, goals: 0, assists: 0, cards: "0Y / 0R", substituted: 70 },
      { number: 10, name: "Ethan Preth", position: "Midfielder", minutes: 85, goals: 1, assists: 0, cards: "0Y / 0R", substituted: 85 },
      { number: 12, name: "Bhudha", position: "LW", minutes: 90, goals: 0, assists: 0, cards: "0Y / 1R" },
      { number: 12, name: "GIWUS (CHINHOI)", position: "CM", minutes: 90, goals: 1, assists: 0, cards: "1Y / 0R" },
      { number: 14, name: "Zinks", position: "CF", minutes: 90, goals: 0, assists: 0, cards: "0Y / 0R" },
      { number: 24, name: "LEE", position: "CDM", minutes: 90, goals: 0, assists: 0, cards: "0Y / 0R" },
      { number: 25, name: "Emmanuel Zvawanda", position: "RB", minutes: 55, goals: 0, assists: 0, cards: "0Y / 0R", substituted: 55 },
      { number: 30, name: "Brooklyn Wuta", position: "RW", minutes: 75, goals: 0, assists: 1, cards: "0Y / 0R", substituted: 75 },
      { number: 39, name: "Peters C", position: "CB", minutes: 90, goals: 0, assists: 0, cards: "0Y / 0R" },
      { number: 16, name: "Maka Vincent", position: "CM", minutes: 5, goals: 0, assists: 0, cards: "0Y / 0R", entered: 85 },
      { number: 18, name: "Bruno Mhlanga", position: "RW", minutes: 15, goals: 0, assists: 1, cards: "0Y / 0R", entered: 75 },
    ],
    awayLineup: [
      { number: 4, name: "JayGee", position: "CB", minutes: 90, goals: 1, assists: 0, cards: "0Y / 0R" },
      { number: 7, name: "Charlton Kambate", position: "RB", minutes: 90, goals: 0, assists: 0, cards: "0Y / 0R" },
      { number: 8, name: "Thomchik", position: "CM", minutes: 90, goals: 0, assists: 0, cards: "0Y / 0R" },
      { number: 10, name: "Taflo", position: "CM", minutes: 90, goals: 0, assists: 0, cards: "0Y / 0R" },
      { number: 15, name: "HANDSOME", position: "Forward", minutes: 45, goals: 1, assists: 0, cards: "0Y / 0R", substituted: 45 },
      { number: 17, name: "MAN-NNERSA", position: "GK", minutes: 90, goals: 0, assists: 1, cards: "1Y / 0R" },
      { number: 22, name: "Kambate", position: "CB", minutes: 90, goals: 0, assists: 0, cards: "0Y / 0R" },
      { number: 24, name: "Munaboy", position: "CDM", minutes: 45, goals: 0, assists: 0, cards: "0Y / 0R", substituted: 45 },
      { number: 27, name: "Gande", position: "RW", minutes: 90, goals: 0, assists: 0, cards: "0Y / 0R" },
      { number: 30, name: "Mukudzeishe Mbara", position: "CF", minutes: 90, goals: 0, assists: 1, cards: "0Y / 0R" },
      { number: 47, name: "Nkosie", position: "LB", minutes: 45, goals: 0, assists: 0, cards: "0Y / 0R", substituted: 45 },
      { number: 5, name: "ILOMO", position: "CM", minutes: 45, goals: 0, assists: 0, cards: "0Y / 0R", entered: 45 },
      { number: 14, name: "Shonz", position: "LB", minutes: 45, goals: 1, assists: 0, cards: "1Y / 0R", entered: 45 },
      { number: null, name: "Basiru", position: "CDM", minutes: 45, goals: 0, assists: 0, cards: "0Y / 0R", entered: 45 },
    ],
    events: [
      { minute: 45, description: "Nkosie left the match" },
      { minute: 45, description: "Shonz entered the match" },
      { minute: 45, description: "Munaboy left the match" },
      { minute: 45, description: "Basiru entered the match" },
      { minute: 45, description: "HANDSOME left the match" },
      { minute: 45, description: "ILOMO entered the match" },
      { minute: 55, description: "Emmanuel Zvawanda left the match" },
      { minute: 70, description: "Samuel (BEAST) left the match" },
      { minute: 75, description: "Brooklyn Wuta left the match" },
      { minute: 75, description: "Bruno Mhlanga entered the match" },
      { minute: 85, description: "Ethan Preth left the match" },
      { minute: 85, description: "Maka Vincent entered the match" },
    ],
  },
  {
    id: "match-3",
    competition: "MRU Football League",
    season: "2026-2027",
    home: "Mageez",
    away: "Part 2 FC",
    date: "10 Oct 2026",
    time: "4:30 pm",
    venue: "Manav Rachna University Football Pitch",
    status: "Completed",
    homeScore: 1,
    awayScore: 1,
    halfTime: "0–1",
    homeFormation: "4-3-3",
    awayFormation: "4-3-3",
    homeLineup: [],
    awayLineup: [],
    events: [],
  },
];

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

function ClubCard({ club, onSelect }) {
  const logoUrl = club.logo_path
    ? supabase.storage
      .from("football-images")
      .getPublicUrl(club.logo_path)
      .data?.publicUrl
    : "";

  return (
    <article className="club-card">
      <div className="club-card-top">
        {logoUrl ? (
          <img
            className="admin-club-logo"
            src={logoUrl}
            alt={`${club.name} logo`}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span
            className="club-badge"
            style={{ color: club.color, borderColor: club.color }}
          >
            {club.name.slice(0, 2).toUpperCase()}
          </span>
        )}

        <span className="club-status">FOOTBALL CLUB</span>
      </div>

      <h3>{club.name}</h3>
      <p>{club.description}</p>

      <button
        className="text-button"
        type="button"
        onClick={() => onSelect(club)}
      >
        View club <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}


function TeamLineup({ teamName, formation, players }) {
  return (
    <div className="lineup-team">
      <div className="lineup-team-heading">
        <h4>{teamName}</h4>
        <span className="formation-badge">{formation}</span>
      </div>

      {players.length === 0 ? (
        <p className="empty-state">
          The lineup has not been recorded for this match.
        </p>
      ) : (
        <div className="football-pitch">
          <div className="pitch-half-line" />
          <div className="pitch-centre-circle" />

          <div className="pitch-player-grid">
            {players.map((player, index) => {
              const yellowCards =
                Number(player.cards?.match(/(\d+)Y/)?.[1]) || 0;
              const redCards =
                Number(player.cards?.match(/(\d+)R/)?.[1]) || 0;

              const rating =
                player.rating == null
                  ? null
                  : Number(player.rating).toFixed(1);

              return (
                <div
                  className="pitch-player"
                  key={`${player.name}-${player.number}-${index}`}
                  title={`${player.name} — ${player.position}`}
                >
                  <div className="pitch-player-photo">
                    <span>{player.number ?? "—"}</span>
                  </div>

                  {rating !== null && (
                    <span className="player-rating">{rating}</span>
                  )}

                  <strong className="pitch-player-name">
                    {player.name}
                  </strong>

                  <small className="pitch-player-position">
                    {player.position}
                  </small>

                  <div className="player-card-icons" aria-label="Cards">
                    {yellowCards > 0 && (
                      <span className="yellow-card-icon" title="Yellow card">
                        {yellowCards > 1 ? `${yellowCards}Y` : "Y"}
                      </span>
                    )}

                    {redCards > 0 && (
                      <span className="red-card-icon" title="Red card">
                        R
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function getCardCount(cardText, cardType) {
  const pattern = new RegExp(`(\\d+)${cardType}`);
  return Number(cardText?.match(pattern)?.[1] || 0);
}

function PlayerPerformanceTable({ match }) {
  const players = [
    ...match.homeLineup.map((player) => ({ ...player, club: match.home })),
    ...match.awayLineup.map((player) => ({ ...player, club: match.away })),
  ];

  if (!players.length) {
    return (
      <p className="empty-state">
        Player statistics will appear here after the match statistics have
        been recorded.
      </p>
    );
  }

  return (
    <div className="table-wrap">
      <table className="standings-table leaderboard-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Club</th>
            <th>Min</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>Yellow Cards</th>
            <th>Red Cards</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={`${player.name}-${player.club}-${index}`}>
              <td>
                {player.number != null ? `#${player.number} ` : ""}
                {player.name}
              </td>
              <td>{player.club}</td>
              <td>{player.minutes}</td>
              <td>{player.goals}</td>
              <td>{player.assists}</td>
              <td>
                <span className="yellow-card-count">
                  {getCardCount(player.cards, "Y")}
                </span>
              </td>
              <td>
                <span className="red-card-count">
                  {getCardCount(player.cards, "R")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchReport({ match }) {
  const allPlayers = [
    ...match.homeLineup.map((player) => ({
      ...player,
      club: match.home,
    })),
    ...match.awayLineup.map((player) => ({
      ...player,
      club: match.away,
    })),
  ];

  const totalGoals = allPlayers.reduce(
    (total, player) => total + (Number(player.goals) || 0),
    0
  );

  const totalAssists = allPlayers.reduce(
    (total, player) => total + (Number(player.assists) || 0),
    0
  );

  const totalYellowCards = allPlayers.reduce(
    (total, player) =>
      total + (Number(player.cards?.match(/(\d+)Y/)?.[1]) || 0),
    0
  );

  const totalRedCards = allPlayers.reduce(
    (total, player) =>
      total + (Number(player.cards?.match(/(\d+)R/)?.[1]) || 0),
    0
  );

  const events = [...(match.events || [])].sort(
    (a, b) => a.minute - b.minute
  );

  return (
    <div className="match-report">
      <div className="match-summary">
        <h3>Match summary</h3>

        <div className="match-summary-grid">
          <div>
            <small>Goals in player records</small>
            <strong>{totalGoals}</strong>
          </div>

          <div>
            <small>Assists</small>
            <strong>{totalAssists}</strong>
          </div>

          <div>
            <small>Yellow cards</small>
            <strong>{totalYellowCards}</strong>
          </div>

          <div>
            <small>Red cards</small>
            <strong>{totalRedCards}</strong>
          </div>
        </div>

        <p className="data-note">
          These totals come from the displayed demo player records. They
          may differ from the match score because the demo data is incomplete.
        </p>
      </div>

      <div className="match-report-section">
        <h3>Lineups and formations</h3>

        <div className="lineups-grid">
          <TeamLineup
            teamName={match.home}
            formation={match.homeFormation}
            players={match.homeLineup}
          />

          <TeamLineup
            teamName={match.away}
            formation={match.awayFormation}
            players={match.awayLineup}
          />
        </div>
      </div>

      <div className="match-report-section">
        <h3>Player performance</h3>

        <PlayerPerformanceTable match={match} />
      </div>

      <div className="match-report-section">
        <h3>Match timeline</h3>

        {events.length === 0 ? (
          <p className="empty-state">
            No timed match events have been recorded.
          </p>
        ) : (
          <div className="match-timeline">
            {events.map((event, index) => {
              const description = event.description || "";
              const lowerDescription = description.toLowerCase();

              const type = event.type
                ? event.type.toLowerCase()
                : lowerDescription.includes("red card")
                  ? "red"
                  : lowerDescription.includes("yellow card")
                    ? "yellow"
                    : lowerDescription.includes("goal")
                      ? "goal"
                      : lowerDescription.includes("entered") ||
                        lowerDescription.includes("left the match")
                        ? "substitution"
                        : "event";

              return (
                <article
                  className={`timeline-event timeline-${type}`}
                  key={`${event.minute}-${description}-${index}`}
                >
                  <div className="timeline-minute">
                    {event.minute}'
                  </div>

                  <div className="timeline-marker" aria-hidden="true">
                    {type === "goal"
                      ? "⚽"
                      : type === "yellow"
                        ? "🟨"
                        : type === "red"
                          ? "🟥"
                          : type === "substitution"
                            ? "↕"
                            : "•"}
                  </div>

                  <div className="timeline-content">
                    <strong>
                      {type === "goal"
                        ? "GOAL"
                        : type === "yellow"
                          ? "YELLOW CARD"
                          : type === "red"
                            ? "RED CARD"
                            : type === "substitution"
                              ? "SUBSTITUTION"
                              : "MATCH EVENT"}
                    </strong>

                    <p>{description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="data-note">
          Only events recorded in the match data are shown. Card events
          need their own minute and player details to appear at the correct
          time in the timeline.
        </p>
      </div>
    </div>
  );
}


function PublicMatchClock({ match }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const phase = String(match.clockPhase || "not_started").toLowerCase();
  const elapsedSaved = Math.max(
    0,
    Number(match.clockElapsedSeconds) || 0
  );

  const startedAt = match.clockStartedAt
    ? new Date(match.clockStartedAt).getTime()
    : NaN;

  let elapsed = elapsedSaved;

  if (
    Number.isFinite(startedAt) &&
    ["first_half", "second_half"].includes(phase)
  ) {
    elapsed += Math.max(0, Math.floor((now - startedAt) / 1000));
  }

  // Each half is capped at 45 minutes of playing time.
  const displaySeconds =
    phase === "first_half"
      ? Math.min(elapsed, 45 * 60)
      : phase === "second_half"
        ? Math.min(elapsed, 90 * 60)
        : phase === "halftime"
          ? 45 * 60
          : phase === "completed"
            ? 90 * 60
            : 0;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const labels = {
    not_started: "NOT STARTED",
    first_half: "FIRST HALF",
    halftime: "HALF-TIME",
    second_half: "SECOND HALF",
    completed: "FULL-TIME",
  };

  return (
    <div className={`public-match-clock ${phase === "first_half" || phase === "second_half" ? "clock-live" : ""}`}>
      <span className="clock-phase">
        {(phase === "first_half" || phase === "second_half") && (
          <span className="status-dot" />
        )}
        {labels[phase] || "MATCH CLOCK"}
      </span>
      <strong>{formatTime(displaySeconds)}</strong>
    </div>
  );
}



function MatchCard({ match }) {
  const [lineupOpen, setLineupOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const completed = match.status === "Completed";
  const isLive = match.status === "Live";

  return (
    <article className="public-match-card">
      <div className="public-match-header">
        <div>
          <span className="competition-badge">
            {match.competition}
          </span>
          <p className="match-season-label">
            Season {match.season}
          </p>
        </div>


        <span
          className={`match-status ${completed
            ? "match-status-completed"
            : isLive
              ? "match-status-live"
              : "match-status-scheduled"
            }`}
        >
          {completed ? "Full Time" : isLive ? "LIVE" : "Scheduled"}
        </span>

        <PublicMatchClock match={match} />


      </div>

      <div className="fixture-scoreline">
        <div className="fixture-team">
          <span className="match-club-avatar">
            {match.home.slice(0, 2).toUpperCase()}
          </span>
          <h3>{match.home}</h3>
          <small>Home</small>
        </div>

        <div className="fixture-score">
          {completed || isLive ? (
            <>
              <strong>
                {match.homeScore} <span>–</span> {match.awayScore}
              </strong>
              {match.halfTime && (
                <small>HT {match.halfTime}</small>
              )}
            </>
          ) : (
            <>
              <strong className="versus">VS</strong>
              <small>{match.time}</small>
            </>
          )}
        </div>

        <div className="fixture-team">
          <span className="match-club-avatar">
            {match.away.slice(0, 2).toUpperCase()}
          </span>
          <h3>{match.away}</h3>
          <small>Away</small>
        </div>
      </div>

      <div className="match-meta">
        <p>📅 {match.date} · {match.time}</p>
        <p>📍 {match.venue}</p>
        <p>🏆 {match.competition}</p>
      </div>

      <div className="match-card-actions">
        <button
          className="secondary-button"
          type="button"
          aria-expanded={lineupOpen}
          onClick={() => setLineupOpen((previous) => !previous)}
        >
          {lineupOpen ? "Hide lineups ↑" : "View lineups ↓"}
        </button>

        <button
          className="primary-button"
          type="button"
          aria-expanded={reportOpen}
          onClick={() => setReportOpen((previous) => !previous)}
        >
          {reportOpen ? "Hide match report ↑" : "Full match report →"}
        </button>
      </div>

      {lineupOpen && (
        <div className="quick-lineups">
          <h3>Team lineups</h3>

          <div className="lineups-grid">
            <TeamLineup
              teamName={match.home}
              formation={match.homeFormation}
              players={match.homeLineup}
            />

            <TeamLineup
              teamName={match.away}
              formation={match.awayFormation}
              players={match.awayLineup}
            />
          </div>
        </div>
      )}

      {reportOpen && <MatchReport match={match} />}
    </article>
  );
}


function MatchCentre({ liveMatches = [], publicClubs = CLUBS }) {
  const [matchTab, setMatchTab] = useState("upcoming");
  const [selectedClub, setSelectedClub] = useState("All Clubs");
  const completedStatuses = [
    "completed",
    "complete",
    "finished",
    "full time",
    "full-time",
    "ft",
  ];

  const liveStatuses = [
    "live",
    "in progress",
    "in-progress",
    "ongoing",
    "1st half",
    "2nd half",
    "halftime",
    "half time",
    "ht",
  ];
  const sourceMatches = liveMatches.length ? liveMatches.map((row) => {
    const value = (keys, fallback = null) => { for (const key of keys) if (row?.[key] != null && row[key] !== "") return row[key]; return fallback; };
    const clubById = (id, fallbackName) => publicClubs.find((club) => String(club.id) === String(id))?.name || fallbackName || "Club TBC";
    const kickoff = value(["kickoff_at", "match_date", "scheduled_at", "date"]);
    const date = kickoff ? new Date(kickoff) : null;
    const status = String(value(["status"], "scheduled")).trim().toLowerCase();

    const homeScore = value([
      "home_score",
      "home_full_time_score",
      "home_goals",
    ]);

    const awayScore = value([
      "away_score",
      "away_full_time_score",
      "away_goals",
    ]);

    const isDone = completedStatuses.includes(status);
    const isLive = liveStatuses.includes(status);
    const hasScores =
      homeScore !== null &&
      awayScore !== null &&
      homeScore !== "" &&
      awayScore !== "" &&
      Number.isFinite(Number(homeScore)) &&
      Number.isFinite(Number(awayScore));

    const displayStatus = isDone
      ? hasScores
        ? "Completed"
        : "Result Pending"
      : isLive
        ? "Live"
        : "Scheduled";
    return {
      id: row.id, competition: value(["competition", "competition_name"], "MRU Football League"),
      season: value(["season", "season_name"], "2026–2027"),
      home: clubById(value(["home_club_id", "home_team_id"]), value(["home_club_name", "home_club", "home_team"], "Home club")),
      away: clubById(value(["away_club_id", "away_team_id"]), value(["away_club_name", "away_club", "away_team"], "Away club")),
      date: date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Date TBC",
      time: date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "Time TBC",
      venue: value(["venue", "ground", "location"], "Manav Rachna Football Pitch"),
      status: displayStatus,
      homeScore: hasScores ? Number(homeScore) : null,
      awayScore: hasScores ? Number(awayScore) : null,
      halfTime: value(["half_time_score", "half_time"], null),
      homeFormation: value(["home_formation"], "4-3-3"), awayFormation: value(["away_formation"], "4-3-3"),

      homeLineup: [],
      awayLineup: [],
      events: [],
      clockPhase: value(["clock_phase"], "not_started"),
      clockElapsedSeconds: value(["clock_elapsed_seconds"], 0),
      clockStartedAt: value(["clock_started_at"], null),
      firstHalfAddedMinutes: value(["first_half_added_minutes"], 0),
      secondHalfAddedMinutes: value(["second_half_added_minutes"], 0)
    };

  }) : [];

  const matches = sourceMatches.filter((match) => {
    const tabMatches =
      matchTab === "upcoming"
        ? match.status === "Scheduled" || match.status === "Live"
        : match.status === "Completed";
    const clubMatches = selectedClub === "All Clubs" || match.home === selectedClub || match.away === selectedClub;
    return tabMatches && clubMatches;
  });

  return (
    <section className="section" id="fixtures">
      <div className="section-inner">
        <SectionTitle
          eyebrow="MATCH CENTRE"
          title="FIXTURES AND RESULTS"
          description="Follow upcoming fixtures and explore completed results, lineups and player performances."
        />

        <div className="match-centre-toolbar">
          <div className="match-tabs" role="tablist" aria-label="Match type">
            <button
              type="button"
              role="tab"
              aria-selected={matchTab === "upcoming"}
              className={matchTab === "upcoming" ? "filter-active" : ""}
              onClick={() => setMatchTab("upcoming")}
            >
              Upcoming Matches
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={matchTab === "completed"}
              className={matchTab === "completed" ? "filter-active" : ""}
              onClick={() => setMatchTab("completed")}
            >
              Completed Matches
            </button>
          </div>

          <label className="match-club-filter">
            Filter club
            <select
              value={selectedClub}
              onChange={(event) => setSelectedClub(event.target.value)}
            >
              <option>All Clubs</option>
              {publicClubs.map((club) => (
                <option key={club.name}>{club.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="public-matches-grid">
          {matches.length ? (
            matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))
          ) : (
            <div className="empty-state">
              No {matchTab === "upcoming" ? "upcoming fixtures" : "completed matches"}
              {selectedClub !== "All Clubs" ? ` for ${selectedClub}` : ""} are
              available yet.
            </div>
          )}
        </div>

        <p className="data-note">
          {liveMatches.length
            ? "Fixtures and results are displayed from available Supabase match records."
            : "No official match records are available yet. Fixtures and results will appear here when they are recorded."}
        </p>
      </div>
    </section>
  );
}

function RegistrationForm({ publicClubs = [] }) {
  const [votingPin, setVotingPin] = useState("");
  const [pinCopied, setPinCopied] = useState(false);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    fullName: "",
    footballName: "",
    email: "",
    phone: "",
    role: "Player",
    club: "",
    jerseyNumber: "",
    experience: "",
    message: "",
  });

  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    if (name === "phone") {
      setForm((previous) => ({
        ...previous,
        phone: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else {
      setForm((previous) => ({ ...previous, [name]: value }));
    }

    setError("");
    setNotice("");
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    setError("");
    setNotice("");

    if (!file) {
      setPhoto(null);
      setPreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhoto(null);
      setPreview("");
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhoto(null);
      setPreview("");
      setError("Your profile picture must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!supabase || !supabaseConfigured) {
      setError(
        "Database connection is not configured. Check your .env.local file."
      );
      return;
    }

    if (!photo) {
      setError("A profile picture is compulsory. Please upload one.");
      return;
    }

    if (form.fullName.trim().length < 2) {
      setError("Please enter your full legal name.");
      return;
    }

    if (form.footballName.trim().length < 2) {
      setError("Please enter your football name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setError("Your phone number must contain exactly 10 digits.");
      return;
    }

    if (!form.club) {
      setError("Please select a preferred club.");
      return;
    }

    if (
      form.role === "Player" &&
      (!form.jerseyNumber ||
        Number(form.jerseyNumber) < 1 ||
        Number(form.jerseyNumber) > 99)
    ) {
      setError("Players must select a jersey number from 1 to 99.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("id, name")
        .eq("name", form.club)
        .single();

      if (clubError || !club) {
        throw new Error(
          "Please select a valid club from the available list."
        );
      }

      const extension =
        photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExtension = /^[a-z0-9]+$/.test(extension)
        ? extension
        : "jpg";

      const filePath =
        `registrations/${crypto.randomUUID()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("football-images")
        .upload(filePath, photo, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Photo upload failed: ${uploadError.message}`);
      }

      const { data, error: registrationError } = await supabase.rpc(
        "register_member_with_voting_pin",
        {
          p_full_name: form.fullName.trim(),
          p_football_name: form.footballName.trim(),
          p_email: form.email.trim().toLowerCase(),
          p_phone: form.phone,
          p_role: form.role,
          p_club_id: club.id,
          p_jersey_number:
            form.role === "Player" ? Number(form.jerseyNumber) : null,
          p_experience: form.experience || null,
          p_message: form.message.trim() || null,
          p_photo_path: filePath,
        }
      );

      if (registrationError) {
        throw new Error(registrationError.message);
      }


      const result = data?.[0];

      if (!result?.voting_pin || !result?.registration_id) {
        throw new Error(
          "Registration was saved, but the voting PIN was not returned. Contact the administrator."
        );
      }

      // Save the newly generated PIN for display to the member.
      setVotingPin(result.voting_pin);
      setPinCopied(false);

      setNotice(
        "Registration submitted successfully! Your details and profile picture have been saved for review. Save your voting PIN below."
      );

      setForm({
        fullName: "",
        footballName: "",
        email: "",
        phone: "",
        role: "Player",
        club: "",
        jerseyNumber: "",
        experience: "",
        message: "",
      });

      setPhoto(null);
      setPreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err) {
      console.error("Registration submission failed:", err);
      setError(
        err?.message ||
        "Registration failed. Please check your Supabase configuration and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="registration-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="form-intro">
        <span className="eyebrow">REGISTRATION FORM</span>
        <h3>Join the football community</h3>
        <p>Fields marked with * are compulsory.</p>
      </div>

      <div className="profile-upload">
        <div className="profile-preview">
          {preview ? (
            <img src={preview} alt="Selected profile preview" />
          ) : (
            <span aria-hidden="true">＋</span>
          )}
        </div>

        <div className="profile-upload-copy">
          <label htmlFor="profilePicture">Profile picture *</label>
          <p>Upload a clear photo. Maximum size: 5 MB.</p>
          <input
            id="profilePicture"
            name="profilePicture"
            type="file"
            ref={fileInputRef}
            accept="image/*"
            required
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="fullName">Full legal name *</label>
          <input
            id="fullName"
            name="fullName"
            value={form.fullName}
            onChange={updateField}
            placeholder="Enter your full name"
            autoComplete="name"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="footballName">Football name *</label>
          <input
            id="footballName"
            name="footballName"
            value={form.footballName}
            onChange={updateField}
            placeholder="Your football name or nickname"
            required
          />
          <small>The name teammates know you by.</small>
        </div>

        <div className="form-field">
          <label htmlFor="email">Email address *</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="phone">Phone number *</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={form.phone}
            onChange={updateField}
            placeholder="10-digit phone number"
            maxLength={10}
            required
          />
          <small>{form.phone.length}/10 digits</small>
        </div>

        <div className="form-field">
          <label htmlFor="role">Registration type *</label>
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={(event) => {
              const nextRole = event.target.value;
              setForm((previous) => ({
                ...previous,
                role: nextRole,
                jerseyNumber:
                  nextRole === "Player"
                    ? previous.jerseyNumber
                    : "",
              }));
              setError("");
              setNotice("");
            }}
            required
          >
            <option value="Player">Player</option>
            <option value="Coach">Coach</option>
            <option value="Referee">Referee</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="club">Preferred club *</label>
          <select
            id="club"
            name="club"
            value={form.club}
            onChange={updateField}
            required
          >
            <option value="">
              {publicClubs.length
                ? "Select a club"
                : "No clubs currently available"}
            </option>

            {publicClubs.map((club) => (
              <option key={club.id} value={club.name}>
                {club.name}
              </option>
            ))}
          </select>
        </div>

        {form.role === "Player" && (
          <div className="form-field">
            <label htmlFor="jerseyNumber">
              Jersey number (1–99) *
            </label>
            <select
              id="jerseyNumber"
              name="jerseyNumber"
              value={form.jerseyNumber}
              onChange={updateField}
              required
            >
              <option value="">Choose jersey number</option>
              {Array.from({ length: 99 }, (_, index) => index + 1).map(
                (number) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                )
              )}
            </select>
            <small>
              The club must confirm the number is available.
            </small>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="experience">Football experience</label>
          <select
            id="experience"
            name="experience"
            value={form.experience}
            onChange={updateField}
          >
            <option value="">Select experience</option>
            <option value="Beginner">Beginner</option>
            <option value="1–2 years">1–2 years</option>
            <option value="3–5 years">3–5 years</option>
            <option value="5+ years">5+ years</option>
          </select>
        </div>

        <div className="form-field form-field-full">
          <label htmlFor="message">Additional information</label>
          <textarea
            id="message"
            name="message"
            value={form.message}
            onChange={updateField}
            placeholder="Position, preferred foot, achievements or other details"
            rows={4}
          />
        </div>
      </div>

      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="form-message form-notice" role="status">
          {notice}
        </p>
      )}
      {error && <div className="error-message">{error}</div>}

      {notice && <div className="success-message">{notice}</div>}

      {votingPin && (
        <div className="voting-pin-result">
          <h3>Your Voting PIN</h3>

          <p>
            Your registration has been submitted. Keep this PIN private.
            You will need it to verify yourself when voting.
          </p>

          <div className="voting-pin-number">
            {votingPin}
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(votingPin);
                setPinCopied(true);
              } catch {
                setPinCopied(false);
                setError("Unable to copy automatically. Please write down your PIN.");
              }
            }}
          >
            {pinCopied ? "PIN copied" : "Copy PIN"}
          </button>

          <p>
            Save this PIN now. It will not be displayed again after you leave this page.
          </p>
        </div>
      )}
      <button
        className="primary-button submit-button"
        type="submit"
        disabled={submitting}
      >
        {submitting
          ? "Submitting registration…"
          : "Submit registration"}
        {!submitting && <span aria-hidden="true"> →</span>}
      </button>

      <p className="form-disclaimer">
        Your registration and profile picture will be submitted for review.
        Approval is required before your profile is treated as official.
      </p>
    </form>
  );
}



function TopPlayers({ publicClubs = CLUBS }) {
  const [selectedClub, setSelectedClub] = useState("All Clubs");
  const [players, setPlayers] = useState([]);
  const [votingPin, setVotingPin] = useState("");
  const [pinCopied, setPinCopied] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const [goalkeepers, setGoalkeepers] = useState([]);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [loadErrors, setLoadErrors] = useState({
    players: "",
    goalkeepers: "",
    coaches: "",
    referees: "",
  });

  useEffect(() => {
    let active = true;

    async function loadLeaderboards() {
      if (!supabase || !supabaseConfigured) {
        if (active) {
          setPlayers([]);
          setGoalkeepers([]);
          setCoaches([]);
          setReferees([]);
          setLoadErrors({
            players: "Connect Supabase to display official player statistics.",
            goalkeepers: "Connect Supabase to display official goalkeeper rankings.",
            coaches: "Connect Supabase to display official coach rankings.",
            referees: "Connect Supabase to display official referee rankings.",
          });
          setLoading(false);
        }
        return;
      }

      try {
        const loadView = async (viewName, columns) => {
          const { data, error } = await supabase
            .from(viewName)
            .select(columns)
            .limit(2500);

          return {
            rows: data || [],
            error: error?.message || "",
          };
        };

        const [playerResult, coachResult, refereeResult] = await Promise.all([
          loadView(
            "public_player_leaderboard",
            "rank,registration_id,participant_name,club_id,club_name,match_performance_points,voting_points,total_points,goals,assists,yellow_cards,red_cards,matches_recorded,voting_matches,total_votes"
          ),
          loadView(
            "public_coach_leaderboard",
            "rank,registration_id,participant_name,club_id,club_name,voting_points,total_votes,voting_matches"
          ),
          loadView(
            "public_referee_leaderboard",
            "rank,registration_id,participant_name,club_id,club_name,voting_points,total_votes,voting_matches"
          ),
        ]);

        if (!active) return;

        const normalise = (row, role) => ({
          registrationId: row.registration_id || `${role}-${row.participant_name || row.player || "unknown"}`,
          name: row.participant_name || row.player || row.name || "Unnamed participant",
          clubId: row.club_id == null ? "" : String(row.club_id),
          club: row.club_name || row.club || "Club not assigned",
          rank: Number(row.rank) || null,
          matchPerformancePoints: Number(row.match_performance_points) || 0,
          votingPoints: Number(row.voting_points) || 0,
          totalPoints: Number(row.total_points ?? row.voting_points) || 0,
          goals: Number(row.goals) || 0,
          assists: Number(row.assists) || 0,
          yellowCards: Number(row.yellow_cards) || 0,
          redCards: Number(row.red_cards) || 0,
          matchesRecorded: Number(row.matches_recorded) || 0,
          votingMatches: Number(row.voting_matches) || 0,
          totalVotes: Number(row.total_votes) || 0,
        });

        const normalisedPlayers = playerResult.rows.map((row) => normalise(row, "player"));
        setPlayers(normalisedPlayers);
        setGoalkeepers(
          normalisedPlayers.filter((person) =>
            OFFICIAL_GOALKEEPER_IDS.has(String(person.registrationId))
          )
        );
        setCoaches(coachResult.rows.map((row) => normalise(row, "coach")));
        setReferees(refereeResult.rows.map((row) => normalise(row, "referee")));
        setLoadErrors({
          players: playerResult.error,
          goalkeepers: playerResult.error,
          coaches: coachResult.error,
          referees: refereeResult.error,
        });
        setLoading(false);
      } catch (error) {
        console.error("Failed to load public leaderboards:", error);
        if (active) {
          setLoadErrors({
            players: error?.message || "Player leaderboard could not be loaded.",
            goalkeepers: error?.message || "Goalkeeper leaderboard could not be loaded.",
            coaches: error?.message || "Coach leaderboard could not be loaded.",
            referees: error?.message || "Referee leaderboard could not be loaded.",
          });
          setLoading(false);
        }
      }
    }

    loadLeaderboards();
    const refreshTimer = window.setInterval(loadLeaderboards, 30000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const filterAndRank = useCallback((rows, role) => {
    const filtered = rows.filter((row) =>
      selectedClub === "All Clubs" ||
      row.clubId === selectedClub ||
      row.club === selectedClub
    );

    filtered.sort((a, b) => {
      if (role === "player") {
        return (
          b.totalPoints - a.totalPoints ||
          b.matchPerformancePoints - a.matchPerformancePoints ||
          b.goals - a.goals ||
          b.assists - a.assists ||
          b.votingPoints - a.votingPoints ||
          a.name.localeCompare(b.name)
        );
      }

      return (
        b.votingPoints - a.votingPoints ||
        b.totalVotes - a.totalVotes ||
        b.votingMatches - a.votingMatches ||
        a.name.localeCompare(b.name)
      );
    });

    return filtered.slice(0, role === "coach" || role === "goalkeeper" ? 6 : 10);
  }, [selectedClub]);

  const topPlayers = useMemo(
    () => filterAndRank(players, "player"),
    [players, filterAndRank]
  );
  const topGoalkeepers = useMemo(
    () => filterAndRank(goalkeepers, "goalkeeper"),
    [goalkeepers, filterAndRank]
  );
  const topCoaches = useMemo(
    () => filterAndRank(coaches, "coach"),
    [coaches, filterAndRank]
  );
  const topReferees = useMemo(
    () => filterAndRank(referees, "referee"),
    [referees, filterAndRank]
  );

  const renderParticipantLeaderboard = (title, rows, role, error) => (
    <div className="match-report-section public-leaderboard-section">
      <h3>{title}</h3>

      {error ? (
        <p className="empty-state" role="alert">
          {title} could not be loaded: {error}
        </p>
      ) : rows.length > 0 ? (
        <div className="table-wrap">
          <table className="standings-table leaderboard-table">
            {role === "player" || role === "goalkeeper" ? (
              <>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>{role === "goalkeeper" ? "Goalkeeper" : "Player"}</th>
                    <th>Club</th>
                    <th>Match Points</th>
                    <th>VR (Voting Rating)</th>
                    <th>Total Points</th>
                    <th>Goals</th>
                    <th>Assists</th>
                    <th>Yellow Cards</th>
                    <th>Red Cards</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((person, index) => (
                    <tr key={person.registrationId}>
                      <td>
                        <span className={`rank-number ${index < 3 ? "rank-highlight" : ""}`}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td className="leaderboard-player">{person.name}</td>
                      <td>{person.club}</td>
                      <td>{person.matchPerformancePoints}</td>
                      <td>{person.votingPoints}</td>
                      <td className="leaderboard-points"><strong>{person.totalPoints}</strong></td>
                      <td className="leaderboard-goals">{person.goals}</td>
                      <td>{person.assists}</td>
                      <td><span className="yellow-card-count">{person.yellowCards}</span></td>
                      <td><span className="red-card-count">{person.redCards}</span></td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>{role === "coach" ? "Coach" : "Referee"}</th>
                    <th>Club</th>
                    <th>VR (Voting Rating)</th>
                    <th>Voting Matches</th>
                    <th>Total Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((person, index) => (
                    <tr key={person.registrationId}>
                      <td>
                        <span className={`rank-number ${index < 3 ? "rank-highlight" : ""}`}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td className="leaderboard-player">{person.name}</td>
                      <td>{person.club}</td>
                      <td className="leaderboard-points"><strong>{person.votingPoints}</strong></td>
                      <td>{person.votingMatches}</td>
                      <td>{person.totalVotes}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      ) : (
        <p className="empty-state">
          No finalised {role} voting results are available for this selection yet.
        </p>
      )}
    </div>
  );

  return (
    <section className="section" id="statistics">
      <div className="section-inner">
        <SectionTitle
          eyebrow="OFFICIAL LEAGUE RANKINGS"
          title="LEAGUE LEADERBOARDS"
          description="Official rankings for players, goalkeepers, coaches and referees, based on recorded match performance and finalised voting results."
        />

        <div className="leaderboard-toolbar">
          <label htmlFor="leaderboardClub">Filter by club</label>
          <select
            id="leaderboardClub"
            value={selectedClub}
            onChange={(event) => setSelectedClub(event.target.value)}
          >
            <option value="All Clubs">All Clubs</option>
            {publicClubs.map((club) => (
              <option key={club.id || club.name} value={String(club.id || club.name)}>
                {club.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="empty-state">Loading official leaderboards…</p>
        ) : (
          <>
            {renderParticipantLeaderboard("TOP 10 PLAYERS", topPlayers, "player", loadErrors.players)}
            {renderParticipantLeaderboard("TOP 6 GOALKEEPERS", topGoalkeepers, "goalkeeper", loadErrors.goalkeepers)}
            {renderParticipantLeaderboard("TOP 6 COACHES", topCoaches, "coach", loadErrors.coaches)}
            {renderParticipantLeaderboard("TOP 10 REFEREES", topReferees, "referee", loadErrors.referees)}
          </>
        )}

        <p className="data-note">
          Player and goalkeeper rankings use the official player leaderboard records. Goalkeepers are identified using the league's registered goalkeeper IDs. Coach and referee rankings use finalised VR results. Coach and goalkeeper leaderboards show the top six; player and referee leaderboards show the top ten. Unfinalised votes are not displayed.
        </p>
      </div>
    </section>
  );
}

function PublicVotingPage({ qrToken }) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function verifyMember(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "verify_match_voting_pin",
        {
          p_qr_token: qrToken,
          p_email: email.trim().toLowerCase(),
          p_pin: pin.trim(),
        }
      );

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || "Verification failed.");
      }

      const token = data.session_token;
      if (!token) throw new Error("No voting session was returned.");

      const { data: candidateData, error: candidateError } =
        await supabase.rpc("get_match_voting_candidates", {
          p_session_token: token,
        });

      if (candidateError) throw candidateError;
      if (!candidateData?.success) {
        throw new Error(
          candidateData?.message || "Could not load voting candidates."
        );
      }

      setSessionToken(token);
      setCandidates(candidateData.candidates || []);
      setRatings({});
    } catch (err) {
      setMessage(err.message || "Unable to verify your details.");
    } finally {
      setLoading(false);
    }
  }

  async function submitBallot(event) {
    event.preventDefault();

    if (candidates.some((candidate) =>
      ratings[candidate.candidate_id] === undefined
    )) {
      setMessage("Please rate every candidate before submitting.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "submit_match_voting_ballot",
        {
          p_session_token: sessionToken,
          p_ratings: candidates.map((candidate) => ({
            candidate_id: candidate.candidate_id,
            rating: Number(ratings[candidate.candidate_id]),
          })),
        }
      );

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || "Ballot submission failed.");
      }

      setSubmitted(true);
      setMessage(data.message || "Your ballot has been submitted.");
      setSessionToken("");
    } catch (err) {
      setMessage(err.message || "Could not submit your ballot.");
    } finally {
      setLoading(false);
    }
  }

  const pageStyle = {
    minHeight: "100vh",
    background: "#101820",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
  };

  const panelStyle = {
    width: "100%",
    maxWidth: "620px",
    background: "#1b2732",
    padding: "28px",
    borderRadius: "16px",
    boxSizing: "border-box",
  };

  return (
    <main style={pageStyle}>
      <div style={panelStyle}>
        <p style={{ color: "#a6c86b", letterSpacing: "2px" }}>
          BHORA MUTAMBO
        </p>

        <h1>Match Voting</h1>

        {message && (
          <p role="status" style={{ padding: "12px", background: "#263746", borderRadius: "8px" }}>
            {message}
          </p>
        )}

        {submitted ? (
          <div>
            <h2>Thank you for voting!</h2>
            <p>Your ballot has been recorded successfully.</p>
          </div>
        ) : !sessionToken ? (
          <form onSubmit={verifyMember}>
            <p>Enter your registered email and four-digit voting PIN.</p>

            <label htmlFor="voting-email">Email address</label>
            <input
              id="voting-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={votingInputStyle}
            />

            <label htmlFor="voting-pin">Voting PIN</label>
            <input
              id="voting-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]{4}"
              autoComplete="off"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={votingInputStyle}
            />

            <button type="submit" disabled={loading} style={votingButtonStyle}>
              {loading ? "Verifying..." : "Verify and continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitBallot}>
            <p>Rate every eligible participant from 0 to 10.</p>

            {candidates.map((candidate) => (
              <div
                key={candidate.candidate_id}
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #394956",
                }}
              >
                <strong>{candidate.football_name}</strong>
                <p style={{ color: "#aab7c2", margin: "5px 0" }}>
                  {candidate.role}
                </p>

                <label htmlFor={`rating-${candidate.candidate_id}`}>
                  Your rating
                </label>

                <select
                  id={`rating-${candidate.candidate_id}`}
                  required
                  value={ratings[candidate.candidate_id] ?? ""}
                  onChange={(e) =>
                    setRatings((current) => ({
                      ...current,
                      [candidate.candidate_id]: e.target.value,
                    }))
                  }
                  style={votingInputStyle}
                >
                  <option value="">Select rating</option>
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={i}>
                      {i} / 10
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading || candidates.length === 0}
              style={votingButtonStyle}
            >
              {loading ? "Submitting..." : "Submit my ballot"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

const votingInputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "13px",
  margin: "8px 0 18px",
  borderRadius: "8px",
  border: "1px solid #526474",
  background: "#101820",
  color: "#fff",
};

const votingButtonStyle = {
  width: "100%",
  padding: "14px",
  marginTop: "16px",
  border: "none",
  borderRadius: "8px",
  background: "#a6c86b",
  color: "#101820",
  fontWeight: "700",
  cursor: "pointer",
};

export default function App() {
  const [selectedClub, setSelectedClub] = useState("All Clubs");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminNotice, setAdminNotice] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [publicClubs, setPublicClubs] = useState([]);
  const [activeClub, setActiveClub] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [livePlayerCount, setLivePlayerCount] = useState(0);
  const [liveDataLoaded, setLiveDataLoaded] = useState(false);
  const [refreshingMatches, setRefreshingMatches] = useState(false);


  useEffect(() => {
    let active = true;

    async function loadPublicData() {
      if (!supabase) {
        setLiveDataLoaded(true);
        return;
      }

      const safeQuery = async (table) => {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .limit(2500);

        if (error) {
          console.error(`Failed to load ${table}:`, error.message);
          return [];
        }

        return data || [];
      };

      const [clubs, matches, roster, profiles] = await Promise.all([
        safeQuery("clubs"),
        safeQuery("matches"),
        safeQuery("approved_roster"),
        safeQuery("approved_player_profiles"),
      ]);

      if (!active) return;

      setPublicClubs(
        (clubs.length
          ? clubs
          : CLUBS.map((club) => ({
            ...club,
            id: club.name,
          }))
        ).map((club, index) => ({
          ...club,
          color: club.color || CLUBS[index % CLUBS.length]?.color || "#00dca0",
          description:
            club.description ||
            "University football club competing in the Manav Rachna football community.",
        }))
      );

      setLiveMatches(matches);

      setLivePlayerCount(
        new Set(
          [...roster, ...profiles].map((row) =>
            String(
              row.player_id ||
              row.user_id ||
              row.football_name ||
              row.full_name ||
              row.name ||
              row.id ||
              JSON.stringify(row)
            )
          )
        ).size
      );

      setLiveDataLoaded(true);
    }

    loadPublicData();

    const refreshTimer = setInterval(() => {
      loadPublicData();
    }, 5000);

    return () => {
      active = false;
      clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (!supabase || !supabaseConfigured) return undefined;

    const channel = supabase
      .channel("public-match-clock-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        async () => {
          const { data, error } = await supabase
            .from("matches")
            .select("*")
            .limit(2500);

          if (error) {
            console.error("Failed to refresh public matches:", error.message);
            return;
          }

          setLiveMatches(data || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  const verifyAdmin = useCallback(async (user) => {
    if (!supabase || !user) return;
    // Access is granted only when the authenticated user has an admin_users row.
    const { data, error } = await supabase.from("admin_users").select("*").eq("user_id", user.id).maybeSingle();
    if (error) {
      setAdminNotice(`Signed in, but admin access could not be verified: ${error.message}. Check the admin_users user_id column and its RLS policy.`);
      return;
    }
    if (!data) {
      setAdminNotice("This account is authenticated but is not registered in admin_users. Ask the project owner to authorize this account.");
      await supabase.auth.signOut();
      return;
    }
    setAdminUser(user);
    setShowAdminLogin(false);
    setAdminNotice("");
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) verifyAdmin(data.session.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) setAdminUser(null);
    });
    return () => listener.subscription.unsubscribe();
  }, [verifyAdmin]);

  async function handleAdminLogin(event) {
    event.preventDefault();
    if (!supabaseConfigured || !supabase) { setAdminNotice("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local."); return; }
    const form = new FormData(event.currentTarget);
    setAdminBusy(true); setAdminNotice("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
    setAdminBusy(false);
    if (error) { setAdminNotice(error.message); return; }
    await verifyAdmin(data.user);
  }

  async function handleAdminSignOut() {
    if (supabase) await supabase.auth.signOut();
    setAdminUser(null); setShowAdminLogin(false);
  }

  const visibleClubs = publicClubs.filter(
    (club) => selectedClub === "All Clubs" || club.name === selectedClub
  );

  const publicStandings = useMemo(() => {
    const table = new Map(publicClubs.map((club) => [String(club.id || club.name), {
      id: club.id || club.name, name: club.name, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
    }]));

    const completedStatuses = [
      "completed",
      "complete",
      "finished",
      "full time",
      "full-time",
      "ft",
    ];


    const liveStatuses = ["live", "in progress", "in-progress", "ongoing", "1st half", "2nd half", "halftime", "half time", "ht"];
    const value = (row, keys) => { for (const key of keys) if (row?.[key] != null && row[key] !== "") return row[key]; return null; };
    const clubEntry = (id, name) => table.get(String(id || "")) || [...table.values()].find((item) => item.name.toLowerCase() === String(name || "").toLowerCase());
    liveMatches.filter((match) => completedStatuses.includes(String(match.status || "").trim().toLowerCase())).forEach((match) => {
      const hsRaw = value(match, ["home_score", "home_full_time_score", "home_goals"]);
      const asRaw = value(match, ["away_score", "away_full_time_score", "away_goals"]);
      if (hsRaw == null || asRaw == null) return;
      const home = clubEntry(value(match, ["home_club_id", "home_team_id"]), value(match, ["home_club_name", "home_club", "home_team"]));
      const away = clubEntry(value(match, ["away_club_id", "away_team_id"]), value(match, ["away_club_name", "away_club", "away_team"]));
      if (!home || !away || home.id === away.id) return;
      const hs = Number(hsRaw), as = Number(asRaw);
      home.played++; away.played++; home.goalsFor += hs; home.goalsAgainst += as; away.goalsFor += as; away.goalsAgainst += hs;
      if (hs > as) { home.won++; away.lost++; home.points += 3; }
      else if (hs < as) { away.won++; home.lost++; away.points += 3; }
      else { home.drawn++; away.drawn++; home.points++; away.points++; }
    });
    return [...table.values()].map((club) => ({ ...club, goalDifference: club.goalsFor - club.goalsAgainst }))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
  }, [publicClubs, liveMatches]);

  function openClubProfile(club) {
    setActiveClub(club);
    setSelectedClub(club.name);
    window.setTimeout(() => document.getElementById("club-profile")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }


  const votingQrToken = new URLSearchParams(window.location.search).get("vote");

  if (votingQrToken) {
    return <PublicVotingPage qrToken={votingQrToken} />;
  }

  if (adminUser) {
    return (
      <AdminDashboard
        user={adminUser}
        onSignOut={handleAdminSignOut}
      />
    );
  }


  return (
    <div className="app">
      <header className="site-header" id="home">
        <a
          className="brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            scrollToSection("home");
          }}
        >
          <span className="brand-mark">MR</span>
          <span className="brand-copy">
            <strong>MANAV RACHNA</strong>
            <small>FOOTBALL CLUBS</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(id);
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        <button
          className="nav-button"
          type="button"
          onClick={() => {
            setShowAdminLogin((previous) => !previous);
            setAdminNotice("");
          }}
        >
          Admin Login
        </button>
      </header>

      {showAdminLogin && (
        <div className="admin-login-panel">
          <div>
            <span className="eyebrow">RESTRICTED ACCESS</span>
            <h3>Admin login</h3>
            <p>Sign in with an account authorized in Supabase.</p>
          </div>
          <form onSubmit={handleAdminLogin}>
            <label>Email<input name="email" type="email" placeholder="Admin email" autoComplete="username" required /></label>
            <label>Password<input name="password" type="password" placeholder="Password" autoComplete="current-password" required /></label>
            <button className="primary-button" type="submit" disabled={adminBusy}>{adminBusy ? "Signing in…" : "Sign in"}</button>
            {adminNotice && <p role="status">{adminNotice}</p>}
            {!supabaseConfigured && <p role="status">Supabase environment variables are missing.</p>}
          </form>
        </div>
      )}

      <main>
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">
              <span className="status-dot" /> ONE UNIVERSITY. ONE FOOTBALL COMMUNITY.
            </p>
            <h1>
              BUILT FOR THE
              <br />
              <span>LOVE OF THE GAME.</span>
            </h1>
            <p className="hero-description">
              Meet the clubs, discover players, follow performances and be part
              of the Manav Rachna football community.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => scrollToSection("clubs")}
              >
                Explore clubs <span aria-hidden="true">→</span>
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => scrollToSection("register")}
              >
                Register now
              </button>
            </div>
            <div className="hero-stats">
              <div>
                <strong>{String(publicClubs.length).padStart(2, "0")}</strong>
                <span>REGISTERED CLUBS</span>
              </div>
              <div>
                <strong>{String(liveMatches.length).padStart(2, "0")}</strong>
                <span>MATCH RECORDS</span>
              </div>
              <div>
                <strong>{String(livePlayerCount).padStart(2, "0")}</strong>
                <span>PLAYER RECORDS</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Football graphic">
            <div className="visual-circle">
              <span className="football" aria-hidden="true">⚽</span>
              <span className="visual-label">PLAY WITH PURPOSE</span>
              <span className="visual-number">MRFC</span>
            </div>
          </div>
        </section>

        <div className="welcome-strip">
          <span>DISCIPLINE</span>
          <span className="strip-divider">✦</span>
          <span>TEAMWORK</span>
          <span className="strip-divider">✦</span>
          <span>RESPECT</span>
          <span className="strip-divider">✦</span>
          <span>PASSION</span>
        </div>

        <section className="section" id="clubs">
          <div className="section-inner">
            <SectionTitle
              eyebrow="MEET THE TEAMS"
              title="OUR FOOTBALL CLUBS"
              description="Browse registered clubs, open their profiles and explore squads, staff, match results and discipline records."
            />

            <div className="club-filters" aria-label="Filter clubs">
              <button
                type="button"
                className={selectedClub === "All Clubs" ? "filter-active" : ""}
                onClick={() => setSelectedClub("All Clubs")}
              >
                All clubs
              </button>
              {publicClubs.map((club) => (
                <button
                  key={club.id || club.name}
                  type="button"
                  className={selectedClub === club.name ? "filter-active" : ""}
                  onClick={() => setSelectedClub(club.name)}
                >
                  {club.name}
                </button>
              ))}
            </div>

            <div className="clubs-grid">
              {visibleClubs.map((club) => (
                <ClubCard
                  key={club.name}
                  club={club}
                  onSelect={openClubProfile}
                />
              ))}
            </div>
            {activeClub && <ClubProfile club={activeClub} onClose={() => setActiveClub(null)} />}
            {liveDataLoaded && !supabase && <p className="data-note">Preview mode: connect Supabase to load registered clubs, player records and official statistics.</p>}
          </div>
        </section>

        <MatchCentre liveMatches={liveMatches} publicClubs={publicClubs} />


        <section className="section" id="standings">
          <div className="section-inner">
            <SectionTitle
              eyebrow="LEAGUE TABLE"
              title="CLUB STANDINGS"
              description="Track every club's progress throughout the season."
            />

            <div className="table-wrap standings-table-wrap">
              <table className="standings-table modern-standings-table">
                <thead><tr><th scope="col">#</th><th scope="col">Club</th><th scope="col">MP</th><th scope="col">W</th><th scope="col">D</th><th scope="col">L</th><th scope="col">GF</th><th scope="col">GA</th><th scope="col">GD</th><th scope="col">Pts</th></tr></thead>
                <tbody>{publicStandings.map((club, index) => <tr key={club.id} className={index < 3 ? "standings-top-three" : ""}>
                  <td className="standings-position">{String(index + 1).padStart(2, "0")}</td>
                  <td className="standings-club-name"><span className="standings-club-mark">{club.name.slice(0, 2).toUpperCase()}</span><strong>{club.name}</strong></td>
                  <td>{club.played}</td><td>{club.won}</td><td>{club.drawn}</td><td>{club.lost}</td><td>{club.goalsFor}</td><td>{club.goalsAgainst}</td><td>{club.goalDifference > 0 ? `+${club.goalDifference}` : club.goalDifference}</td><td className="standings-points">{club.points}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <div className="standings-legend"><strong>TABLE KEY</strong><span>MP: Played</span><span>W: Won</span><span>D: Drawn</span><span>L: Lost</span><span>GF: Goals for</span><span>GA: Goals against</span><span>GD: Goal difference</span><span>Pts: Points</span></div>
            <p className="data-note">{liveDataLoaded && liveMatches.length ? "Standings are calculated from completed Supabase match records with both full-time scores." : "Standings update automatically when completed match results are available in Supabase. Clubs without completed matches start on zero points."}</p>
          </div>
        </section>


        <TopPlayers publicClubs={publicClubs} />

        <section className="section registration-section" id="register">
          <div className="section-inner">
            <SectionTitle
              eyebrow="BECOME PART OF THE TEAM"
              title="PLAYER & OFFICIAL REGISTRATION"
              description="Submit your details for review by your preferred club."
            />

            <div className="registration-layout">
              <div className="registration-copy">
                <h3>Your next chapter starts here.</h3>
                <p>
                  Whether you are registering as a player, coach or referee,
                  provide accurate details so the club can identify and contact
                  you.
                </p>
                <ul>
                  <li>Profile picture is compulsory.</li>
                  <li>Provide your full legal name and football name.</li>
                  <li>Players must choose a jersey number from 1–99.</li>
                  <li>Phone numbers must contain exactly 10 digits.</li>
                </ul>
              </div>
              <RegistrationForm publicClubs={publicClubs} />
            </div>
          </div>
        </section>

        <section className="section" id="about">
          <div className="section-inner about-grid">
            <div>
              <p className="eyebrow">ABOUT THE PROJECT</p>
              <h2>MORE THAN A GAME.</h2>
            </div>
            <div>
              <p>
                Manav Rachna Football Clubs-v2 brings club information, player
                performance, match records and registration into one
                football-focused platform.
              </p>
              <p>
                Official registrations, administration, player statistics and
                discipline records require a connected and secure database.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <strong>MANAV RACHNA FOOTBALL CLUBS</strong>
            <p>One football community.</p>
          </div>
          <a
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("home");
            }}
          >
            Back to top ↑
          </a>
        </div>
        <p className="footer-bottom">
          © {new Date().getFullYear()} Manav Rachna Football Clubs-v2
        </p>
      </footer>
    </div>
  );
}

