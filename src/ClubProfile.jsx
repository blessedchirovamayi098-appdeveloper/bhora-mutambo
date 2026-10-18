import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./ClubProfile.css";

const first = (row, keys, fallback = "") => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return fallback;
};

const norm = (value) => String(value ?? "").trim().toLowerCase();

const nameOf = (row) =>
  String(
    first(
      row,
      ["football_name", "full_name", "display_name", "player_name", "name"],
      "Unnamed member"
    )
  );

const roleOf = (row) =>
  norm(first(row, ["role", "registration_type", "member_type", "official_role"], "player"));

const statusOf = (row) => norm(first(row, ["status", "approval_status"], ""));

const photoOf = (row) => {
  const photo = first(
    row,
    [
      "photo_url",
      "photo_path",
      "profile_picture",
      "profile_image",
      "avatar_url",
      "image_url",
      "image_path",
      "photo",
    ],
    ""
  );

  if (!photo) return "";
  if (/^https?:\/\//i.test(String(photo))) return photo;

  const { data } = supabase.storage.from("football-images").getPublicUrl(photo);
  return data?.publicUrl || "";
};

const approved = (row) => ["approved", "active", "accepted"].includes(statusOf(row));

const isStaff = (row) =>
  /coach|manager|referee|official|trainer|assistant coach/.test(roleOf(row));

const clubMatch = (row, club) => {
  if (!row || !club) return false;

  const id = first(row, ["club_id", "team_id", "club_uuid"], null);
  if (id && club.id) return String(id) === String(club.id);

  const clubName = norm(first(row, ["club_name", "club", "team_name"], ""));
  return Boolean(
    clubName &&
    [club.name, club.short_name, club.slug].some((value) => norm(value) === clubName)
  );
};

const registrationKey = (row) =>
  first(row, ["registration_id", "player_registration_id"], null);

const mergePerson = (base, extra) => {
  const merged = { ...base };

  Object.entries(extra || {}).forEach(([key, value]) => {
    if (
      (merged[key] === undefined || merged[key] === null || merged[key] === "") &&
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      merged[key] = value;
    }
  });

  merged.registration_id = registrationKey(base) || registrationKey(extra);
  return merged;
};

// Keep separate registrations separate, even when names are identical.
const buildPeople = (registrations, roster, profiles) => {
  const people = new Map();

  registrations.forEach((row) => {
    people.set(`registration:${row.id}`, {
      ...row,
      registration_id: row.id,
    });
  });

  [...roster, ...profiles].forEach((row) => {
    const registrationId = registrationKey(row);

    if (registrationId) {
      const key = `registration:${registrationId}`;
      const existing = people.get(key);

      if (existing) {
        people.set(key, mergePerson(existing, row));
      } else {
        people.set(key, { ...row, registration_id: registrationId });
      }
      return;
    }

    if (row.id) {
      const key = `standalone:${row.id}`;
      if (!people.has(key)) people.set(key, { ...row });
    }
  });

  return [...people.values()];
};

const score = (match, side) => {
  const raw = first(
    match,
    side === "home"
      ? ["home_score", "home_full_time_score", "home_goals"]
      : ["away_score", "away_full_time_score", "away_goals"],
    null
  );

  return raw === null || raw === "" ? null : Number(raw);
};

const isCompleted = (match) =>
  ["completed", "complete", "finished", "full time", "full-time", "ft"].includes(
    norm(match?.status)
  );

const matchDate = (match) =>
  first(match, ["kickoff_at", "match_date", "date", "scheduled_at", "created_at"], "");

const fmtDate = (value) => {
  if (!value) return "Date TBC";
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
};

export default function ClubProfile({ club, onClose }) {
  const [tab, setTab] = useState("overview");
  const [records, setRecords] = useState({
    clubs: [],
    roster: [],
    profiles: [],
    registrations: [],
    matches: [],
    events: [],
    lineups: [],
    suspensions: [],
  });
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!supabase || !club?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const tables = [
        ["clubs", "clubs"],
        ["roster", "approved_roster"],
        ["profiles", "approved_player_profiles"],
        ["registrations", "registrations"],
        ["matches", "matches"],
        ["events", "match_events"],
        ["lineups", "match_lineups"],
        ["suspensions", "suspensions"],
      ];

      const results = await Promise.all(
        tables.map(async ([key, table]) => {
          let query = supabase.from(table).select("*");

          if (key === "registrations") {
            query = query.eq("club_id", club.id).eq("status", "Approved");
          }

          const { data, error } = await query.limit(2500);
          return { key, data: data || [], error: error?.message || "" };
        })
      );

      if (!active) return;

      const next = {};
      const missing = [];

      results.forEach(({ key, data, error }) => {
        next[key] = data;
        if (error) missing.push(key);
      });

      setRecords(next);
      setUnavailable(missing);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [club?.id]);

  const clubNames = useMemo(() => {
    const map = new Map();
    records.clubs.forEach((item) => {
      map.set(String(item.id), item.name || item.short_name || "Club");
    });
    return map;
  }, [records.clubs]);

  const clubNameFor = (id, fallback = "Club") =>
    id ? clubNames.get(String(id)) || fallback : fallback;

  const relatedMatches = useMemo(
    () =>
      records.matches
        .filter(
          (match) =>
            String(match.home_club_id) === String(club?.id) ||
            String(match.away_club_id) === String(club?.id)
        )
        .sort(
          (a, b) =>
            new Date(matchDate(b) || 0).getTime() -
            new Date(matchDate(a) || 0).getTime()
        ),
    [records.matches, club?.id]
  );

  const registrations = useMemo(
    () =>
      records.registrations.filter(
        (row) => clubMatch(row, club) && approved(row)
      ),
    [records.registrations, club]
  );

  const roster = useMemo(() => {
    const clubRoster = records.roster.filter((row) => clubMatch(row, club));
    const clubProfiles = records.profiles.filter((row) => clubMatch(row, club));

    const eligibleRoster = clubRoster.filter((row) => {
      const status = statusOf(row);
      return !status || approved(row);
    });

    const eligibleProfiles = clubProfiles.filter((row) => {
      const status = statusOf(row);
      return !status || approved(row);
    });

    return buildPeople(registrations, eligibleRoster, eligibleProfiles);
  }, [records.roster, records.profiles, registrations, club]);

  const players = useMemo(() => roster.filter((row) => !isStaff(row)), [roster]);
  const staff = useMemo(
    () =>
      roster.filter(
        (row) => isStaff(row) && row.is_published === true
      ),
    [roster]
  );

  const playerLookup = useMemo(() => {
    const map = new Map();

    // Put registration rows first, then merge linked rows without losing their role.
    records.registrations.forEach((row) => {
      if (row.id) map.set(String(row.id), row);
    });

    [...records.roster, ...records.profiles].forEach((row) => {
      if (row.id && !map.has(String(row.id))) map.set(String(row.id), row);

      const registrationId = registrationKey(row);
      if (registrationId) {
        const key = String(registrationId);
        const existing = map.get(key);
        map.set(key, existing ? mergePerson(existing, row) : { ...row, registration_id: registrationId });
      }
    });

    return map;
  }, [records.registrations, records.roster, records.profiles]);

  const playerStats = useMemo(() => {
    const counts = new Map();
    const emptyStats = () => ({ goals: 0, assists: 0, yellow: 0, red: 0 });

    const getStats = (registrationId) => {
      const key = String(registrationId);
      if (!counts.has(key)) counts.set(key, emptyStats());
      return counts.get(key);
    };

    records.events.forEach((event) => {
      const match = relatedMatches.find(
        (item) => String(item.id) === String(event.match_id)
      );
      if (!match) return;
      if (String(event.club_id) !== String(club?.id)) return;

      const type = norm(event.event_type);
      const scorerId = event.player_registration_id;

      if (scorerId) {
        const scorer = playerLookup.get(String(scorerId));
        const scorerRole = scorer ? roleOf(scorer) : "player";

        if (!isStaff({ role: scorerRole })) {
          const scorerStats = getStats(scorerId);
          if (type.includes("goal") && !type.includes("own")) scorerStats.goals += 1;
          if (type.includes("yellow")) scorerStats.yellow += 1;
          if (type.includes("red")) scorerStats.red += 1;
        }
      }

      const assistId = event.assist_registration_id;
      if (assistId && type.includes("goal") && !type.includes("own")) {
        const assister = playerLookup.get(String(assistId));
        const assisterRole = assister ? roleOf(assister) : "player";
        if (!isStaff({ role: assisterRole })) getStats(assistId).assists += 1;
      }
    });

    return players
      .map((player) => {
        const id = registrationKey(player) || player.id;
        const stats = counts.get(String(id)) || emptyStats();

        const totalPoints =
          stats.goals * 5 +
          stats.assists * 3 -
          stats.yellow -
          stats.red * 3;

        return {
          ...player,
          registration_id: id,
          stats,
          totalPoints,
        };
      })
      .sort(
        (a, b) =>
          b.totalPoints - a.totalPoints ||
          b.stats.goals - a.stats.goals ||
          b.stats.assists - a.stats.assists
      );
  }, [players, records.events, relatedMatches, club?.id, playerLookup]);

  const stats = useMemo(() => {
    const result = {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
      cleanSheets: 0,
    };

    relatedMatches.forEach((match) => {
      if (
        !isCompleted(match) ||
        score(match, "home") === null ||
        score(match, "away") === null
      ) {
        return;
      }

      const isHome = String(match.home_club_id) === String(club?.id);
      const gf = score(match, isHome ? "home" : "away");
      const ga = score(match, isHome ? "away" : "home");

      result.played++;
      result.gf += gf;
      result.ga += ga;

      if (gf > ga) {
        result.won++;
        result.points += 3;
      } else if (gf === ga) {
        result.drawn++;
        result.points++;
      } else {
        result.lost++;
      }

      if (ga === 0) result.cleanSheets++;
    });

    return result;
  }, [relatedMatches, club?.id]);

  const suspensions = useMemo(
    () =>
      records.suspensions.filter(
        (row) =>
          String(row.club_id) === String(club?.id) ||
          players.some(
            (player) =>
              String(registrationKey(player) || player.id) ===
              String(row.player_registration_id)
          )
      ),
    [records.suspensions, players, club?.id]
  );

  const matchName = (match, side) =>
    clubNameFor(
      side === "home" ? match.home_club_id : match.away_club_id,
      side === "home" ? "Home club" : "Away club"
    );

  return (
    <section
      className="club-profile-panel"
      id="club-profile"
      aria-label={`${club?.name || "Club"} profile`}
    >
      <div className="club-profile-head">
        <div className="club-profile-identity">
          <span className="club-profile-mark">
            {String(club?.short_name || club?.name || "FC").slice(0, 3).toUpperCase()}
          </span>
          <div>
            <span className="club-profile-kicker">OFFICIAL CLUB PROFILE</span>
            <h2>{club?.name}</h2>
            <p>{club?.description || "Club information, squad and performance overview."}</p>
          </div>
        </div>
        <button
          className="club-profile-close"
          onClick={onClose}
          type="button"
          aria-label="Close club profile"
        >
          ✕ Close
        </button>
      </div>

      <div className="club-profile-tabs" role="tablist" aria-label="Club profile sections">
        {[
          ["overview", "Overview"],
          ["squad", "Players & squad"],
          ["staff", "Coaches & referees"],
          ["matches", "Matches & stats"],
          ["discipline", "Discipline"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="club-profile-loading">Loading live club records from Supabase…</div>
      ) : (
        <>
          {unavailable.length > 0 && (
            <p className="club-profile-note">
              Some sections could not be loaded. Check Supabase table permissions for:{" "}
              {unavailable.join(", ")}.
            </p>
          )}

          {tab === "overview" && (
            <>
              <div className="club-profile-stat-grid">
                {[
                  ["Players", players.length],
                  ["Matches", stats.played],
                  ["Wins", stats.won],
                  ["Goals", stats.gf],
                  ["Points", stats.points],
                  ["Clean sheets", stats.cleanSheets],
                ].map(([label, value]) => (
                  <div className="club-profile-stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="club-profile-columns">
                <div className="club-profile-card">
                  <div className="club-profile-card-title">
                    <h3>Recent matches</h3>
                    <button type="button" onClick={() => setTab("matches")}>View all →</button>
                  </div>
                  {relatedMatches.slice(0, 4).length ? (
                    relatedMatches.slice(0, 4).map((match) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        homeName={matchName(match, "home")}
                        awayName={matchName(match, "away")}
                      />
                    ))
                  ) : (
                    <p className="club-profile-empty">No match records are linked to this club yet.</p>
                  )}
                </div>

                <div className="club-profile-card">
                  <div className="club-profile-card-title">
                    <h3>Top performers</h3>
                    <button type="button" onClick={() => setTab("squad")}>View squad →</button>
                  </div>
                  {playerStats.slice(0, 5).map((player) => (
                    <div className="club-profile-performer" key={player.registration_id || player.id}>
                      <span className="club-profile-player-avatar">
                        {nameOf(player).slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{nameOf(player)}</strong>
                        <small>{first(player, ["position_or_specialty", "position"], "Player")}</small>
                      </div>
                      <b>{player.stats.goals} G</b>
                    </div>
                  ))}
                  {!playerStats.length && (
                    <p className="club-profile-empty">Player performance will appear when match events are recorded.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === "squad" && (
            <>
              <div className="club-profile-section-title">
                <div>
                  <span className="club-profile-kicker">FIRST TEAM</span>
                  <h3>Players & squad</h3>
                </div>
                <span>{players.length} squad records</span>
              </div>
              <div className="club-profile-people-grid">
                {playerStats.map((player) => (
                  <article className="club-profile-person" key={player.registration_id || player.id}>
                    <div className="club-profile-photo">
                      <span>{nameOf(player).slice(0, 1).toUpperCase()}</span>
                      {photoOf(player) && (
                        <img
                          src={photoOf(player)}
                          alt={`${nameOf(player)} profile`}
                          onError={(event) => { event.currentTarget.style.display = "none"; }}
                        />
                      )}
                    </div>
                    <div className="club-profile-person-banner">
                      <span>{first(player, ["jersey_number", "shirt_number", "number"], "—")}</span>
                      <small>{first(player, ["position_or_specialty", "position"], "Squad member")}</small>
                    </div>
                    <div className="club-profile-person-body">
                      <h4>{nameOf(player)}</h4>
                      <p>{first(player, ["status"], "Approved squad")}</p>
                      <div className="club-profile-mini-stats">
                        <span><b>{player.stats.goals}</b>Goals</span>
                        <span><b>{player.stats.assists}</b>Assists</span>
                        <span><b>{player.stats.yellow}</b>Yellow</span>
                        <span><b>{player.stats.red}</b>Red</span>
                        <span><b>{player.totalPoints}</b>Total Points</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!players.length && (
                <p className="club-profile-empty">No approved players were found for this club.</p>
              )}
            </>
          )}

          {tab === "staff" && (
            <>
              <div className="club-profile-section-title">
                <div>
                  <span className="club-profile-kicker">CLUB PERSONNEL</span>
                  <h3>Coaches, managers & referees</h3>
                </div>
                <span>{staff.length} staff records</span>
              </div>
              <div className="club-profile-people-grid">
                {staff.map((person) => (
                  <article className="club-profile-person staff" key={person.registration_id || person.id}>
                    <div className="club-profile-photo">
                      <span>{nameOf(person).slice(0, 1).toUpperCase()}</span>
                      {photoOf(person) && (
                        <img
                          src={photoOf(person)}
                          alt={`${nameOf(person)} profile`}
                          onError={(event) => { event.currentTarget.style.display = "none"; }}
                        />
                      )}
                    </div>
                    <div className="club-profile-person-banner">
                      <span>✦</span>
                      <small>{first(person, ["role", "position_or_specialty"], "Official")}</small>
                    </div>
                    <div className="club-profile-person-body">
                      <h4>{nameOf(person)}</h4>
                      <p>{first(person, ["experience"], "Club official")}</p>
                      <div className="club-profile-contact">
                        {first(person, ["email"], "")}
                        {first(person, ["phone"], "") ? ` · ${person.phone}` : ""}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!staff.length && (
                <p className="club-profile-empty">No approved staff records are linked to this club yet.</p>
              )}
            </>
          )}

          {tab === "matches" && (
            <>
              <div className="club-profile-section-title">
                <div>
                  <span className="club-profile-kicker">PERFORMANCE CENTRE</span>
                  <h3>Match results & club statistics</h3>
                </div>
                <span>{stats.played} completed matches</span>
              </div>
              <div className="club-profile-stat-grid compact">
                {[
                  ["Played", stats.played],
                  ["Won", stats.won],
                  ["Drawn", stats.drawn],
                  ["Lost", stats.lost],
                  ["Goals for", stats.gf],
                  ["Goals against", stats.ga],
                  ["Goal difference", stats.gf - stats.ga],
                  ["League points", stats.points],
                ].map(([label, value]) => (
                  <div className="club-profile-stat" key={label}>
                    <span>{label}</span>
                    <strong>{label === "Goal difference" && value > 0 ? `+${value}` : value}</strong>
                  </div>
                ))}
              </div>
              <div className="club-profile-match-reports">
                {relatedMatches.map((match) => (
                  <ClubMatchReport
                    key={match.id}
                    match={match}
                    homeName={matchName(match, "home")}
                    awayName={matchName(match, "away")}
                    lineups={records.lineups}
                    events={records.events}
                    playerLookup={playerLookup}
                  />
                ))}
              </div>
              {!relatedMatches.length && (
                <p className="club-profile-empty">Fixtures will appear here after the club is scheduled in a match.</p>
              )}
            </>
          )}

          {tab === "discipline" && (
            <>
              <div className="club-profile-section-title">
                <div>
                  <span className="club-profile-kicker">FAIR PLAY</span>
                  <h3>Discipline & suspensions</h3>
                </div>
                <span>{suspensions.length} records</span>
              </div>
              <div className="club-profile-card">
                {suspensions.map((item) => {
                  const player = playerLookup.get(String(item.player_registration_id));
                  return (
                    <div className="club-profile-discipline-row" key={item.id}>
                      <div>
                        <strong>{player ? nameOf(player) : "Player record"}</strong>
                        <small>{first(item, ["reason"], "Disciplinary record")}</small>
                      </div>
                      <span className={`discipline-status ${norm(item.status)}`}>
                        {item.status || "Recorded"}
                      </span>
                      <small>
                        {Math.max(0, Number(item.matches_total || 0) - Number(item.matches_served || 0))} matches remaining
                      </small>
                    </div>
                  );
                })}
                {!suspensions.length && (
                  <p className="club-profile-empty">No suspensions or disciplinary records are linked to this club.</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function ClubMatchReport({ match, homeName, awayName, lineups, events, playerLookup }) {
  const homeScore = score(match, "home");
  const awayScore = score(match, "away");
  const completed = isCompleted(match);

  const matchLineups = lineups.filter(
    (row) => String(row.match_id) === String(match.id)
  );

  const matchEvents = events
    .filter((row) => String(row.match_id) === String(match.id))
    .sort((a, b) => Number(a.minute || 0) - Number(b.minute || 0));

  const teamRows = (teamId) =>
    matchLineups.filter((row) => String(row.club_id) === String(teamId));

  const teams = [
    { id: match.home_club_id, name: homeName },
    { id: match.away_club_id, name: awayName },
  ];

  const playerFor = (row) =>
    playerLookup.get(String(row.player_registration_id));

  return (
    <article className="club-profile-match-report">
      <div className="club-profile-match-score">
        <div>
          <span>{homeName}</span>
          <strong>{completed && homeScore !== null ? homeScore : "—"}</strong>
        </div>
        <span className="club-profile-vs">VS</span>
        <div>
          <strong>{completed && awayScore !== null ? awayScore : "—"}</strong>
          <span>{awayName}</span>
        </div>
      </div>

      <div className="club-profile-match-meta">
        <span>{fmtDate(matchDate(match))}</span>
        <span>{first(match, ["venue"], "Venue TBC")}</span>
        <span className={`club-match-status ${completed ? "done" : "upcoming"}`}>
          {match.status || "Scheduled"}
        </span>
      </div>

      {matchLineups.length > 0 && (
        <div className="club-profile-lineup-grid">
          {teams.map((team) => {
            const rows = teamRows(team.id);
            return (
              <div className="club-profile-lineup-team" key={String(team.id)}>
                <h4>{team.name}</h4>
                <div className="club-profile-lineup-pitch">
                  {rows.map((row) => {
                    const player = playerFor(row);
                    return (
                      <div className="club-profile-lineup-player" key={row.id}>
                        <span>{row.jersey_number ?? "—"}</span>
                        <strong>{player ? nameOf(player) : "Player"}</strong>
                        <small>{row.position || row.lineup_role || "Squad member"}</small>
                      </div>
                    );
                  })}
                  {!rows.length && <p>No lineup records for this club.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {matchEvents.length > 0 && (
        <div className="club-profile-events">
          <h4>Match events</h4>
          {matchEvents.map((event) => {
            const player = playerFor(event);
            const type = String(event.event_type || "Event").replaceAll("_", " ");
            const lower = type.toLowerCase();

            return (
              <div key={event.id}>
                <time>{event.minute ?? "—"}{event.minute != null ? "′" : ""}</time>
                <span className={`club-event-icon ${lower.includes("red") ? "red" : lower.includes("yellow") ? "yellow" : ""}`}>
                  {type}
                </span>
                <strong>{player ? nameOf(player) : "Match record"}</strong>
                <small>{event.notes || ""}</small>
              </div>
            );
          })}
        </div>
      )}

      {!matchLineups.length && !matchEvents.length && (
        <p className="club-profile-empty compact-empty">
          Lineups and match events will appear when an administrator records them.
        </p>
      )}
    </article>
  );
}

function MatchRow({ match, homeName, awayName }) {
  const homeScore = score(match, "home");
  const awayScore = score(match, "away");
  const completed = isCompleted(match);

  return (
    <div className="club-profile-match-row">
      <div>
        <strong>{homeName}</strong>
        <span>
          {completed && homeScore !== null && awayScore !== null
            ? `${homeScore} – ${awayScore}`
            : " vs "}
        </span>
        <strong>{awayName}</strong>
      </div>
      <small>{fmtDate(matchDate(match))} · {match.venue || "Venue TBC"}</small>
      <span className={`club-match-status ${completed ? "done" : "upcoming"}`}>
        {completed ? "Completed" : match.status || "Scheduled"}
      </span>
    </div>
  );
}