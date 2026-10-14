
import { useCallback, useEffect, useMemo, useState } from "react";
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
  return (
    <article className="club-card">
      <div className="club-card-top">
        <span
          className="club-badge"
          style={{ color: club.color, borderColor: club.color }}
        >
          {club.name.slice(0, 2).toUpperCase()}
        </span>
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

function MatchCard({ match }) {
  const [lineupOpen, setLineupOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const completed = match.status === "Completed";

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
            : "match-status-scheduled"
            }`}
        >
          {completed ? "Full Time" : "Scheduled"}
        </span>
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
          {completed ? (
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
  const completedStatuses = ["completed", "complete", "finished", "full time", "full-time", "ft"];
  const sourceMatches = liveMatches.length ? liveMatches.map((row) => {
    const value = (keys, fallback = null) => { for (const key of keys) if (row?.[key] != null && row[key] !== "") return row[key]; return fallback; };
    const clubById = (id, fallbackName) => publicClubs.find((club) => String(club.id) === String(id))?.name || fallbackName || "Club TBC";
    const kickoff = value(["kickoff_at", "match_date", "scheduled_at", "date"]);
    const date = kickoff ? new Date(kickoff) : null;
    const status = String(value(["status"], "Scheduled"));
    const isDone = completedStatuses.includes(status.trim().toLowerCase());
    return {
      id: row.id, competition: value(["competition", "competition_name"], "MRU Football League"),
      season: value(["season", "season_name"], "2026–2027"),
      home: clubById(value(["home_club_id", "home_team_id"]), value(["home_club_name", "home_club", "home_team"], "Home club")),
      away: clubById(value(["away_club_id", "away_team_id"]), value(["away_club_name", "away_club", "away_team"], "Away club")),
      date: date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}) : "Date TBC",
      time: date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}) : "Time TBC",
      venue: value(["venue", "ground", "location"], "Manav Rachna Football Pitch"),
      status: isDone ? "Completed" : "Scheduled",
      homeScore: value(["home_score", "home_full_time_score", "home_goals"]),
      awayScore: value(["away_score", "away_full_time_score", "away_goals"]),
      halfTime: value(["half_time_score", "half_time"], null),
      homeFormation: value(["home_formation"], "4-3-3"), awayFormation: value(["away_formation"], "4-3-3"),
      homeLineup: [], awayLineup: [], events: []
    };
  }) : SAMPLE_MATCHES;

  const matches = sourceMatches.filter((match) => {
    const tabMatches = matchTab === "upcoming" ? match.status !== "Completed" : match.status === "Completed";
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
          {liveMatches.length ? "Match centre is displaying the latest available Supabase fixtures and results." : "Sample fixtures are shown until live match records are available from Supabase."}
        </p>
      </div>
    </section>
  );
}

function RegistrationForm() {
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

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!photo) {
      setError("A profile picture is compulsory. Please upload one.");
      return;
    }

    if (form.fullName.trim().length < 2) {
      setError("Please enter your full legal name.");
      return;
    }

    if (form.footballName.trim().length < 2) {
      setError("Please enter the name people know you by in football.");
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

    setNotice(
      "Validation successful. Your registration has NOT been saved because the database and photo storage are not connected yet."
    );
  }

  return (
    <form className="registration-form" onSubmit={handleSubmit} noValidate>
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
                  nextRole === "Player" ? previous.jerseyNumber : "",
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
            <option value="">Select a club</option>
            {CLUBS.map((club) => (
              <option key={club.name} value={club.name}>
                {club.name}
              </option>
            ))}
          </select>
        </div>

        {form.role === "Player" && (
          <div className="form-field">
            <label htmlFor="jerseyNumber">Jersey number (1–99) *</label>
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
            <small>The club must confirm the number is available.</small>
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

      <button className="primary-button submit-button" type="submit">
        Validate registration details <span aria-hidden="true">→</span>
      </button>

      <p className="form-disclaimer">
        This demo validates your details locally. It does not upload your
        picture or save your registration. Secure storage and submission
        require the backend connection.
      </p>
    </form>
  );
}

function TopPlayers({ publicClubs = CLUBS }) {
  const [selectedClub, setSelectedClub] = useState("All Clubs");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPlayers() {
      if (!supabase) {
        if (active) { setPlayers(SAMPLE_TOP_PLAYERS); setIsDemo(true); setLoading(false); }
        return;
      }
      const safeQuery = async (table) => {
        const { data, error } = await supabase.from(table).select("*").limit(2500);
        return error ? [] : (data || []);
      };
      const [roster, profiles, events] = await Promise.all([
        safeQuery("approved_roster"), safeQuery("approved_player_profiles"), safeQuery("match_events")
      ]);
      if (!active) return;
      const clubName = (row) => {
        const id = row.club_id || row.team_id;
        return publicClubs.find((club) => id && String(club.id) === String(id))?.name ||
          row.club_name || row.club || row.team_name || "Club not assigned";
      };
      const name = (row) => row.display_name || row.full_name || row.player_name || row.football_name || row.name || "Unnamed player";
      const counts = new Map();
      events.forEach((event) => {
        const playerKey = String(event.player_id || event.roster_id || event.player_name || event.full_name || event.name || "");
        if (!playerKey) return;
        const current = counts.get(playerKey) || { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
        const type = String(event.event_type || event.type || event.event || "").toLowerCase();
        if (type.includes("goal") && !type.includes("own")) current.goals++;
        if (type.includes("assist")) current.assists++;
        if (type.includes("yellow")) current.yellowCards++;
        if (type.includes("red")) current.redCards++;
        counts.set(playerKey, current);
      });
      const seen = new Set();
      const list = [...roster, ...profiles].filter((row) => {
        const key = String(row.player_id || row.user_id || row.football_name || row.full_name || row.name || row.id || name(row));
        if (seen.has(key)) return false;
        seen.add(key); return true;
      }).map((row) => {
        const key = String(row.player_id || row.user_id || row.id || "");
        const eventCounts = counts.get(key) || counts.get(name(row)) || {};
        return {
          name: name(row), club: clubName(row),
          goals: Number(row.goals ?? row.total_goals ?? eventCounts.goals ?? 0),
          assists: Number(row.assists ?? row.total_assists ?? eventCounts.assists ?? 0),
          yellowCards: Number(row.yellow_cards ?? row.yellow_card_count ?? eventCounts.yellowCards ?? 0),
          redCards: Number(row.red_cards ?? row.red_card_count ?? eventCounts.redCards ?? 0)
        };
      }).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
      setPlayers(list); setIsDemo(false); setLoading(false);
    }
    loadPlayers();
    return () => { active = false; };
  }, [publicClubs]);

  const filteredPlayers = useMemo(() => players.filter((player) => selectedClub === "All Clubs" || player.club === selectedClub)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 10), [players, selectedClub]);

  return (
    <section className="section" id="statistics">
      <div className="section-inner">
        <SectionTitle eyebrow="PLAYER PERFORMANCE" title="TOP 10 PLAYERS" description="Discover the leading players across our football clubs using available roster and match-event records." />
        <div className="leaderboard-toolbar">
          <label htmlFor="leaderboardClub">Filter by club</label>
          <select id="leaderboardClub" value={selectedClub} onChange={(event) => setSelectedClub(event.target.value)}>
            <option>All Clubs</option>
            {publicClubs.map((club) => <option key={club.id || club.name}>{club.name}</option>)}
          </select>
        </div>
        {loading ? <p className="empty-state">Loading player performance…</p> : filteredPlayers.length ? <div className="table-wrap">
          <table className="standings-table leaderboard-table">
            <thead><tr><th>Rank</th><th>Player</th><th>Club</th><th>Goals</th><th>Assists</th><th>Yellow Cards</th><th>Red Cards</th></tr></thead>
            <tbody>{filteredPlayers.map((player, index) => <tr key={`${player.name}-${player.club}`}>
              <td><span className={`rank-number ${index < 3 ? "rank-highlight" : ""}`}>{String(index + 1).padStart(2, "0")}</span></td>
              <td className="leaderboard-player">{player.name}</td><td>{player.club}</td><td className="leaderboard-goals">{player.goals}</td><td>{player.assists}</td>
              <td><span className="yellow-card-count">{player.yellowCards}</span></td><td><span className="red-card-count">{player.redCards}</span></td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="empty-state">No player statistics are available for this selection yet. Approve player profiles and record match events to populate this leaderboard.</p>}
        <p className="data-note">{isDemo ? "Preview-only examples are shown while Supabase is not configured. These are not official player statistics." : "Player totals use available approved player records and match-event data. Missing event records are not inferred."}</p>
      </div>
    </section>
  );
}

export default function App() {
  const [selectedClub, setSelectedClub] = useState("All Clubs");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminNotice, setAdminNotice] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [publicClubs, setPublicClubs] = useState(CLUBS.map((club) => ({ ...club })));
  const [activeClub, setActiveClub] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [livePlayerCount, setLivePlayerCount] = useState(0);
  const [liveDataLoaded, setLiveDataLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPublicData() {
      if (!supabase) { setLiveDataLoaded(true); return; }
      const safeQuery = async (table) => {
        const { data, error } = await supabase.from(table).select("*").limit(2500);
        return error ? [] : (data || []);
      };
      const [clubs, matches, roster, profiles] = await Promise.all([
        safeQuery("clubs"), safeQuery("matches"), safeQuery("approved_roster"), safeQuery("approved_player_profiles")
      ]);
      if (!active) return;
      if (clubs.length) {
        setPublicClubs(clubs.map((club, index) => ({
          ...club,
          color: CLUBS[index % CLUBS.length]?.color || "#00dca0",
          description: club.description || "University football club competing in the Manav Rachna football community."
        })));
      }
      setLiveMatches(matches);
      setLivePlayerCount(new Set([...roster, ...profiles].map((row) => String(row.player_id || row.user_id || row.football_name || row.full_name || row.name || row.id || JSON.stringify(row)))).size);
      setLiveDataLoaded(true);
    }
    loadPublicData();
    return () => { active = false; };
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
    const completedStatuses = ["completed", "complete", "finished", "full time", "full-time", "ft"];
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

  if (adminUser) return <AdminDashboard user={adminUser} onSignOut={handleAdminSignOut} />;

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
              <RegistrationForm />
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
