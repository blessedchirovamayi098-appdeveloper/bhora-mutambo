

import { useEffect, useMemo, useState } from "react";

import { supabase } from "./supabase";

import "./ClubProfile.css";



const first = (row, keys, fallback = "") => {

  for (const key of keys) {

    if (

      row?.[key] !== undefined &&

      row?.[key] !== null &&

      row[key] !== ""

    ) {

      return row[key];

    }

  }

  return fallback;

};



const norm = (value) => String(value ?? "").trim().toLowerCase();





const isOfficialGoalkeeper = (row) =>

  OFFICIAL_GOALKEEPER_IDS.has(

    String(registrationKey(row) || row?.id || "")

  );



const nameOf = (row) =>

  String(

    first(

      row,

      ["football_name", "full_name", "display_name", "player_name", "name"],

      "Unnamed member"

    )

  );



const roleOf = (row) =>

  norm(

    first(

      row,

      ["role", "registration_type", "member_type", "official_role"],

      "player"

    )

  );



const positionOf = (row) =>

  norm(

    first(

      row,

      [

        "position_or_specialty",

        "position",

        "playing_position",

        "preferred_position",

        "player_position",

      ],

      ""

    )

  );



const isGoalkeeper = (row) => {
  const position = positionOf(row);

  return (
    /\b(goalkeeper|goal keeper|gk)\b/i.test(position)
  );
};
const statusOf = (row) =>

  norm(first(row, ["status", "approval_status"], ""));



const approved = (row) =>

  ["approved", "active", "accepted"].includes(statusOf(row));



const isStaff = (row) =>

  /coach|manager|referee|official|trainer|assistant coach/.test(roleOf(row));



const registrationKey = (row) =>

  first(row, ["registration_id", "player_registration_id"], null);



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



  if (/^https?:\/\//i.test(String(photo))) {

    return String(photo);

  }



  if (!supabase) return "";



  const { data } = supabase.storage

    .from("football-images")

    .getPublicUrl(String(photo));



  return data?.publicUrl || "";

};



const clubMatch = (row, club) => {

  if (!row || !club) return false;



  const id = first(row, ["club_id", "team_id", "club_uuid"], null);



  // Prefer the actual club ID. Do not fall back to a name

  // when a different club ID is already present.

  if (id && club.id) {

    return String(id) === String(club.id);

  }



  const clubName = norm(

    first(row, ["club_name", "club", "team_name"], "")

  );



  return Boolean(

    clubName &&

    [club.name, club.short_name, club.slug].some(

      (value) => norm(value) === clubName

    )

  );

};



const mergePerson = (base, extra) => {

  const merged = { ...base };



  Object.entries(extra || {}).forEach(([key, value]) => {

    if (

      (merged[key] === undefined ||

        merged[key] === null ||

        merged[key] === "") &&

      value !== undefined &&

      value !== null &&

      value !== ""

    ) {

      merged[key] = value;

    }

  });



  merged.registration_id =

    registrationKey(base) || registrationKey(extra);



  return merged;

};





const buildPeople = (registrations, roster, profiles) => {

  const people = new Map();



  // Use approved public roster and profile records as the

  // primary sources. Registrations are optional enrichment only.

  [...(roster || []), ...(profiles || [])].forEach((row) => {

    if (!row || !approved(row)) return;



    const registrationId = registrationKey(row);

    const key = registrationId

      ? `registration:${registrationId}`

      : `record:${row.id}`;



    if (key === "record:undefined") return;



    const existing = people.get(key);



    if (existing) {

      people.set(key, mergePerson(existing, row));

    } else {

      people.set(key, {

        ...row,

        registration_id: registrationId || null,

      });

    }

  });



  // Merge registration information only if it is already

  // available through an authorized source.

  (registrations || []).forEach((row) => {

    if (!row?.id) return;



    const key = `registration:${row.id}`;

    const existing = people.get(key);



    if (existing) {

      people.set(key, mergePerson(existing, row));

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

  [

    "completed",

    "complete",

    "finished",

    "full time",

    "full-time",

    "ft",

  ].includes(norm(match?.status));



const matchDate = (match) =>

  first(

    match,

    ["kickoff_at", "match_date", "date", "scheduled_at", "created_at"],

    ""

  );



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



const emptyRecords = {

  clubs: [],

  roster: [],

  profiles: [],

  registrations: [],

  matches: [],

  events: [],

  lineups: [],

  suspensions: [],

  performance: [],

  voting: [],

};



export default function ClubProfile({ club, onClose }) {

  const [tab, setTab] = useState("overview");

  const [records, setRecords] = useState(emptyRecords);

  const [loading, setLoading] = useState(true);

  const [unavailable, setUnavailable] = useState([]);





  useEffect(() => {

    let active = true;



    async function load() {

      if (!supabase || !club?.id) {

        setRecords(emptyRecords);

        setUnavailable([]);

        setLoading(false);

        return;

      }



      setLoading(true);



      const tables = [

        ["clubs", "clubs"],

        ["roster", "approved_roster"],

        ["profiles", "approved_player_profiles"],

        ["matches", "matches"],

        ["events", "match_events"],

        ["lineups", "match_lineups"],

        ["performance", "match_player_points"],

        ["voting", "finalised_match_voting_results"],

      ];



      try {

        const results = await Promise.all(

          tables.map(async ([key, table]) => {

            try {

              const { data, error } = await supabase

                .from(table)

                .select("*")

                .limit(2500);



              return {

                key,

                data: data || [],

                error: error?.message || "",

              };

            } catch (error) {

              return {

                key,

                data: [],

                error: error?.message || "Unable to load table",

              };

            }

          })

        );



        if (!active) return;



        const next = { ...emptyRecords };

        const missing = [];



        results.forEach(({ key, data, error }) => {

          next[key] = data;



          if (error) {

            missing.push(key);

            console.error(

              `Club profile: unable to load ${key}:`,

              error

            );

          }

        });



        setRecords(next);

        setUnavailable(missing);

      } catch (error) {

        if (!active) return;



        console.error("Club profile loading error:", error);

        setRecords(emptyRecords);

        setUnavailable(tables.map(([key]) => key));

      } finally {

        if (active) setLoading(false);

      }

    }



    load();



    return () => {

      active = false;

    };

  }, [club?.id]);





  const clubNames = useMemo(() => {

    const map = new Map();



    records.clubs.forEach((item) => {

      if (item.id) {

        map.set(

          String(item.id),

          item.name || item.short_name || "Club"

        );

      }

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

        .sort((a, b) => {

          const dateA = new Date(matchDate(a) || 0).getTime();

          const dateB = new Date(matchDate(b) || 0).getTime();



          return (

            (Number.isNaN(dateB) ? 0 : dateB) -

            (Number.isNaN(dateA) ? 0 : dateA)

          );

        }),

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

    const clubRoster = records.roster.filter((row) =>

      clubMatch(row, club)

    );



    const clubProfiles = records.profiles.filter((row) =>

      clubMatch(row, club)

    );



    const eligibleRoster = clubRoster.filter((row) => {

      const status = statusOf(row);

      return !status || approved(row);

    });



    const eligibleProfiles = clubProfiles.filter((row) => {

      const status = statusOf(row);

      return !status || approved(row);

    });



    return buildPeople(

      registrations,

      eligibleRoster,

      eligibleProfiles

    );

  }, [records.roster, records.profiles, registrations, club]);



  const players = useMemo(

    () => roster.filter((row) => !isStaff(row)),

    [roster]

  );



  const staff = useMemo(() => {

    return records.roster.filter((row) => {

      const role = roleOf(row);

      const isRelevantRole =

        role.includes("coach") || role.includes("referee");



      return (

        isRelevantRole &&

        clubMatch(row, club) &&

        (!statusOf(row) || approved(row))

      );

    });

  }, [records.roster, club]);







  const playerLookup = useMemo(() => {

    const map = new Map();



    [...records.roster, ...records.profiles].forEach((row) => {

      const registrationId = registrationKey(row);

      if (!registrationId) return;



      const key = String(registrationId);

      const existing = map.get(key);



      map.set(

        key,

        existing

          ? mergePerson(existing, row)

          : {

            ...row,

            registration_id: registrationId,

          }

      );

    });



    return map;

  }, [records.roster, records.profiles]);





  const playerStats = useMemo(() => {

    const counts = new Map();



    const emptyStats = () => ({

      goals: 0,

      assists: 0,

      yellow: 0,

      red: 0,

      cleanSheets: 0,

      penaltySaves: 0,

      ownGoals: 0,

      matchPoints: 0,

      votingPoints: 0,

      totalVotes: 0,

      votingMatches: 0,

      matchesPlayed: 0,

      matchIds: new Set(),

    });



    const getStats = (registrationId) => {

      const key = String(registrationId);



      if (!counts.has(key)) {

        counts.set(key, emptyStats());

      }



      return counts.get(key);

    };



    records.performance.forEach((row) => {

      if (String(row.club_id) !== String(club?.id)) return;



      const registrationId = first(

        row,

        ["player_registration_id", "registration_id"],

        null

      );



      if (!registrationId) return;



      const stats = getStats(registrationId);



      stats.goals += Number(row.goals || 0);

      stats.assists += Number(row.assists || 0);

      stats.yellow += Number(row.yellow_cards || 0);

      stats.red += Number(row.red_cards || 0);

      stats.cleanSheets += Number(row.clean_sheets || 0);

      stats.penaltySaves += Number(row.penalty_saves || 0);

      stats.ownGoals += Number(row.own_goals || 0);

      stats.matchPoints += Number(row.total_points || 0);



      if (row.match_id) {

        stats.matchIds.add(String(row.match_id));

      }

    });



    records.voting.forEach((row) => {

      const registrationId = row.registration_id;

      if (!registrationId) return;



      const person = playerLookup.get(String(registrationId));

      if (!person || !clubMatch(person, club)) return;



      const stats = getStats(registrationId);



      stats.votingPoints += Number(row.voting_points || 0);

      stats.totalVotes += Number(row.total_votes || 0);



      if (row.match_voting_id) {

        stats.votingMatches++;

      }

    });



    return players.map((player) => {

      const id = registrationKey(player) || player.id;

      const stats = counts.get(String(id)) || emptyStats();



      const cleanStats = {

        ...stats,

        matchesPlayed: stats.matchIds.size,

      };



      delete cleanStats.matchIds;



      return {

        ...player,

        registration_id: id,

        stats: { ...cleanStats, vr: cleanStats.votingPoints },
        totalPoints: cleanStats.matchPoints + cleanStats.votingPoints,

      };

    }).sort(

      (a, b) =>

        b.totalPoints - a.totalPoints ||

        b.stats.matchPoints - a.stats.matchPoints ||

        b.stats.goals - a.stats.goals ||

        b.stats.assists - a.stats.assists

    );

  }, [

    players,

    records.performance,

    records.voting,

    playerLookup,

    club?.id,

  ]);

  const goalkeeperStats = useMemo(
    () =>
      playerStats
        .filter(isGoalkeeper)
        .sort(
          (a, b) =>
            b.totalPoints - a.totalPoints ||
            b.stats.cleanSheets - a.stats.cleanSheets ||
            b.stats.penaltySaves - a.stats.penaltySaves
        ),
    [playerStats]
  );



  const staffStats = useMemo(() => {
    const results = new Map();
    const getStats = (person) => {
      const registrationId = registrationKey(person);
      const key = String(registrationId || person.id);
      if (!results.has(key)) results.set(key, {
        matches: 0, wins: 0, losses: 0, draws: 0, matchesRefereed: 0,
        yellow: Number(first(person, ["yellow_cards"], 0)) || 0,
        red: Number(first(person, ["red_cards"], 0)) || 0,
        votingPoints: 0, performancePoints: 0, totalPoints: 0,
        totalVotes: 0, votingMatches: 0,
      });
      return results.get(key);
    };

    staff.forEach((person) => {
      const personStats = getStats(person);
      const personId = String(person.id);
      const role = roleOf(person);
      const coach = role.includes("coach");
      const referee = role.includes("referee");

      records.matches.forEach((match) => {
        if (!isCompleted(match) || score(match, "home") === null || score(match, "away") === null) return;
        const homeCoach = String(match.home_coach_roster_id || "") === personId;
        const awayCoach = String(match.away_coach_roster_id || "") === personId;
        const refereeIds = [match.referee_1_roster_id, match.referee_2_roster_id, match.referee_3_roster_id].filter(Boolean).map(String);
        if (coach && (homeCoach || awayCoach)) {
          personStats.matches++;
          const homeScore = score(match, "home");
          const awayScore = score(match, "away");
          const teamScore = homeCoach ? homeScore : awayScore;
          const opponentScore = homeCoach ? awayScore : homeScore;
          if (teamScore > opponentScore) personStats.wins++;
          else if (teamScore < opponentScore) personStats.losses++;
          else personStats.draws++;
        }
        if (referee && refereeIds.includes(personId)) personStats.matchesRefereed++;
      });

      const registrationId = registrationKey(person);
      if (!registrationId) return;
      records.voting.filter((row) => String(row.registration_id) === String(registrationId)).forEach((row) => {
        personStats.votingPoints += Number(row.voting_points || 0);
        personStats.performancePoints += Number(first(row, ["match_performance_points", "performance_points"], 0)) || 0;
        personStats.yellow += Number(first(row, ["yellow_cards", "official_yellow_cards", "coach_yellow_cards"], 0)) || 0;
        personStats.red += Number(first(row, ["red_cards", "official_red_cards", "coach_red_cards"], 0)) || 0;
        personStats.totalVotes += Number(row.total_votes || 0);
        if (row.match_voting_id) personStats.votingMatches++;
      });
      personStats.vr = personStats.votingPoints;
      personStats.totalPoints = personStats.vr + personStats.performancePoints;
    });
    return results;
  }, [staff, records.matches, records.voting]);
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



      const isHome =

        String(match.home_club_id) === String(club?.id);



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



      if (ga === 0) {

        result.cleanSheets++;

      }

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

      side === "home"

        ? match.home_club_id

        : match.away_club_id,

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

            {String(

              club?.short_name || club?.name || "FC"

            )

              .slice(0, 3)

              .toUpperCase()}

          </span>



          <div>

            <span className="club-profile-kicker">

              OFFICIAL CLUB PROFILE

            </span>

            <h2>{club?.name}</h2>

            <p>

              {club?.description ||

                "Club information, squad and performance overview."}

            </p>

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



      <div

        className="club-profile-tabs"

        role="tablist"

        aria-label="Club profile sections"

      >

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

        <div className="club-profile-loading">

          Loading live club records from Supabase…

        </div>

      ) : (

        <>

          {unavailable.length > 0 && (

            <p className="club-profile-note">

              Some sections could not be loaded. Check Supabase

              table permissions for: {unavailable.join(", ")}.

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

                  <div

                    className="club-profile-stat"

                    key={label}

                  >

                    <span>{label}</span>

                    <strong>{value}</strong>

                  </div>

                ))}

              </div>



              <div className="club-profile-columns">

                <div className="club-profile-card">

                  <div className="club-profile-card-title">

                    <h3>Recent matches</h3>

                    <button

                      type="button"

                      onClick={() => setTab("matches")}

                    >

                      View all →

                    </button>

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

                    <p className="club-profile-empty">

                      No match records are linked to this club yet.

                    </p>

                  )}

                </div>



                <div className="club-profile-card">

                  <div className="club-profile-card-title">

                    <h3>Top performers</h3>

                    <button

                      type="button"

                      onClick={() => setTab("squad")}

                    >

                      View squad →

                    </button>

                  </div>



                  {playerStats.slice(0, 5).map((player) => (

                    <div

                      className="club-profile-performer"

                      key={

                        player.registration_id || player.id

                      }

                    >

                      <span className="club-profile-player-avatar">

                        {nameOf(player).slice(0, 1).toUpperCase()}

                      </span>



                      <div>

                        <strong>{nameOf(player)}</strong>

                        <small>

                          {first(

                            player,

                            ["position_or_specialty", "position"],

                            "Player"

                          )}

                        </small>

                      </div>



                      <b>{player.stats.goals} G</b>

                    </div>

                  ))}



                  {!playerStats.length && (

                    <p className="club-profile-empty">

                      Player performance will appear when match

                      events are recorded.

                    </p>

                  )}

                </div>

              </div>

            </>

          )}



          {tab === "squad" && (

            <>

              <div className="club-profile-section-title">

                <div>

                  <span className="club-profile-kicker">

                    FIRST TEAM

                  </span>

                  <h3>Players & squad</h3>

                </div>

                <span>{players.length} squad records</span>

              </div>


              <div className="club-profile-people-grid">

                {playerStats.map((player) => {

                  const photo = photoOf(player);



                  return (

                    <article
                      className={`club-profile-person ${isGoalkeeper(player) ? "goalkeeper" : ""
                        }`}

                      key={

                        player.registration_id || player.id

                      }

                    >

                      <div className="club-profile-photo">

                        <span>

                          {nameOf(player)

                            .slice(0, 1)

                            .toUpperCase()}

                        </span>



                        {photo && (

                          <img

                            src={photo}

                            alt={`${nameOf(player)} profile`}

                            onError={(event) => {

                              event.currentTarget.style.display =

                                "none";

                            }}

                          />

                        )}

                      </div>



                      <div className="club-profile-person-banner">

                        <span>

                          {first(

                            player,

                            ["jersey_number", "shirt_number", "number"],

                            "—"

                          )}

                        </span>

                        <small>

                          {first(

                            player,

                            ["position_or_specialty", "position"],

                            "Squad member"

                          )}

                        </small>

                      </div>

                      <div className="club-profile-person-body">

                        <h4>{nameOf(player)}</h4>



                        <p>

                          {first(

                            player,

                            ["experience"],

                            "Squad member"

                          )}

                        </p>



                        <div className="club-profile-mini-stats staff-stats">
                          <span><b>{player.stats.goals}</b>Goals</span>
                          <span><b>{player.stats.assists}</b>Assists</span>
                          <span><b>{player.stats.yellow}</b>Yellow Cards</span>
                          <span><b>{player.stats.red}</b>Red Cards</span>
                          <span><b>{player.stats.ownGoals}</b>Own Goals</span>
                          <span><b>{player.stats.cleanSheets}</b>Clean Sheets</span>
                          <span><b>{player.stats.penaltySaves}</b>Penalty Saves</span>
                          <span><b>{player.stats.vr}</b>VR</span>
                          <span><b>{player.totalPoints}</b>Total Points</span>
                        </div>

                      </div>

                    </article>

                  );

                })}

              </div>



              {!players.length && (

                <p className="club-profile-empty">

                  No approved players were found for this club.

                </p>

              )}

            </>

          )}



          {tab === "staff" && (

            <>

              <div className="club-profile-section-title">

                <div>

                  <span className="club-profile-kicker">

                    CLUB PERSONNEL

                  </span>

                  <h3>Coaches, managers & referees</h3>

                </div>

                <span>{staff.length} staff records</span>

              </div>



              <div className="club-profile-people-grid">

                {staff.map((person) => {

                  const photo = photoOf(person);



                  return (

                    <article

                      className="club-profile-person staff"

                      key={person.registration_id || person.id}

                    >

                      <div className="club-profile-photo">

                        <span>

                          {nameOf(person)

                            .slice(0, 1)

                            .toUpperCase()}

                        </span>



                        {photo && (

                          <img

                            src={photo}

                            alt={`${nameOf(person)} profile`}

                            onError={(event) => {

                              event.currentTarget.style.display = "none";

                            }}

                          />

                        )}

                      </div>



                      <div className="club-profile-person-banner">

                        <span>✦</span>

                        <small>

                          {first(

                            person,

                            ["role", "position_or_specialty"],

                            "Official"

                          )}

                        </small>

                      </div>



                      <div className="club-profile-person-body">

                        <h4>{nameOf(person)}</h4>

                        <p>

                          {first(person, ["experience"], "Club official")}

                        </p>



                        <div className="club-profile-contact">

                          {first(person, ["email"], "")}

                          {first(person, ["phone"], "")

                            ? ` · ${person.phone}`

                            : ""}

                        </div>

                        {(() => {
                          const key = String(registrationKey(person) || person.id);
                          const personStats = staffStats.get(key) || {};
                          const isCoach = roleOf(person).includes("coach");
                          const isReferee = roleOf(person).includes("referee");
                          return (
                            <div className="club-profile-mini-stats staff-stats">
                              {isCoach && <>
                                <span><b>{personStats.matches || 0}</b>Matches</span>
                                <span><b>{personStats.wins || 0}</b>Wins</span>
                                <span><b>{personStats.losses || 0}</b>Losses</span>
                                <span><b>{personStats.draws || 0}</b>Draws</span>
                                <span><b>{personStats.yellow || 0}</b>Yellow Cards</span>
                                <span><b>{personStats.red || 0}</b>Red Cards</span>
                              </>}
                              {isReferee && <span><b>{personStats.matchesRefereed || 0}</b>Matches Refereed</span>}
                              <span><b>{personStats.vr || 0}</b>VR (Voting Rating)</span>
                              <span><b>{personStats.totalPoints || 0}</b>Total Points</span>
                            </div>
                          );
                        })()}

                      </div>

                    </article>

                  );

                })}

              </div>



              {!staff.length && (

                <p className="club-profile-empty">

                  No approved staff records are linked to this club yet.

                </p>

              )}

            </>

          )}





          {tab === "matches" && (

            <>

              <div className="club-profile-section-title">

                <div>

                  <span className="club-profile-kicker">

                    PERFORMANCE CENTRE

                  </span>

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

                  <div

                    className="club-profile-stat"

                    key={label}

                  >

                    <span>{label}</span>

                    <strong>

                      {label === "Goal difference" && value > 0

                        ? `+${value}`

                        : value}

                    </strong>

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

                <p className="club-profile-empty">

                  Fixtures will appear here after the club is

                  scheduled in a match.

                </p>

              )}

            </>

          )}



          {tab === "discipline" && (

            <>

              <div className="club-profile-section-title">

                <div>

                  <span className="club-profile-kicker">

                    FAIR PLAY

                  </span>

                  <h3>Discipline & suspensions</h3>

                </div>

                <span>{suspensions.length} records</span>

              </div>



              <div className="club-profile-card">

                {suspensions.map((item) => {

                  const player = playerLookup.get(

                    String(item.player_registration_id)

                  );



                  return (

                    <div

                      className="club-profile-discipline-row"

                      key={item.id}

                    >

                      <div>

                        <strong>

                          {player

                            ? nameOf(player)

                            : "Player record"}

                        </strong>

                        <small>

                          {first(

                            item,

                            ["reason"],

                            "Disciplinary record"

                          )}

                        </small>

                      </div>



                      <span

                        className={`discipline-status ${norm(

                          item.status

                        )}`}

                      >

                        {item.status || "Recorded"}

                      </span>



                      <small>

                        {Math.max(

                          0,

                          Number(item.matches_total || 0) -

                          Number(item.matches_served || 0)

                        )}{" "}

                        matches remaining

                      </small>

                    </div>

                  );

                })}



                {!suspensions.length && (

                  <p className="club-profile-empty">

                    No suspensions or disciplinary records are

                    linked to this club.

                  </p>

                )}

              </div>

            </>

          )}

        </>

      )}

    </section>

  );

}



function ClubMatchReport({

  match,

  homeName,

  awayName,

  lineups,

  events,

  playerLookup,

}) {

  const homeScore = score(match, "home");

  const awayScore = score(match, "away");

  const completed = isCompleted(match);



  const matchLineups = lineups.filter(

    (row) => String(row.match_id) === String(match.id)

  );



  const matchEvents = events

    .filter(

      (row) => String(row.match_id) === String(match.id)

    )

    .sort(

      (a, b) =>

        Number(a.minute || 0) - Number(b.minute || 0)

    );



  const teamRows = (teamId) =>

    matchLineups.filter(

      (row) => String(row.club_id) === String(teamId)

    );



  const teams = [

    { id: match.home_club_id, name: homeName },

    { id: match.away_club_id, name: awayName },

  ];



  const playerFor = (row) => {

    const registrationId = first(

      row,

      ["player_registration_id", "registration_id"],

      null

    );



    return registrationId

      ? playerLookup.get(String(registrationId))

      : null;

  };



  const assistFor = (row) => {

    const registrationId = row.assist_registration_id;



    return registrationId

      ? playerLookup.get(String(registrationId))

      : null;

  };



  return (

    <article className="club-profile-match-report">

      <div className="club-profile-match-score">

        <div>

          <span>{homeName}</span>

          <strong>

            {completed && homeScore !== null

              ? homeScore

              : "—"}

          </strong>

        </div>



        <span className="club-profile-vs">VS</span>



        <div>

          <strong>

            {completed && awayScore !== null

              ? awayScore

              : "—"}

          </strong>

          <span>{awayName}</span>

        </div>

      </div>



      <div className="club-profile-match-meta">

        <span>{fmtDate(matchDate(match))}</span>

        <span>{first(match, ["venue"], "Venue TBC")}</span>

        <span

          className={`club-match-status ${completed ? "done" : "upcoming"

            }`}

        >

          {match.status || "Scheduled"}

        </span>

      </div>



      {matchLineups.length > 0 && (

        <div className="club-profile-lineup-grid">

          {teams.map((team) => {

            const rows = teamRows(team.id);



            return (

              <div

                className="club-profile-lineup-team"

                key={String(team.id)}

              >

                <h4>{team.name}</h4>



                <div className="club-profile-lineup-pitch">

                  {rows.map((row) => {

                    const player = playerFor(row);



                    return (

                      <div

                        className="club-profile-lineup-player"

                        key={row.id}

                      >

                        <span>

                          {row.jersey_number ?? "—"}

                        </span>

                        <strong>

                          {player ? nameOf(player) : "Player"}

                        </strong>

                        <small>

                          {row.position ||

                            row.lineup_role ||

                            "Squad member"}

                        </small>

                      </div>

                    );

                  })}



                  {!rows.length && (

                    <p>No lineup records for this club.</p>

                  )}

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

            const assist = assistFor(event);



            const type = String(

              event.event_type || "Event"

            ).replaceAll("_", " ");



            const lower = type.toLowerCase();



            return (

              <div key={event.id}>

                <time>

                  {event.minute ?? "—"}

                  {event.minute != null ? "′" : ""}

                </time>



                <span

                  className={`club-event-icon ${lower.includes("red")

                    ? "red"

                    : lower.includes("yellow")

                      ? "yellow"

                      : ""

                    }`}

                >

                  {type}

                </span>



                <strong>

                  {player ? nameOf(player) : "Match record"}

                </strong>



                {assist && (

                  <small>

                    Assist: {nameOf(assist)}

                  </small>

                )}



                {event.notes && (

                  <small>{event.notes}</small>

                )}

              </div>

            );

          })}

        </div>

      )}



      {!matchLineups.length && !matchEvents.length && (

        <p className="club-profile-empty compact-empty">

          Lineups and match events will appear when an

          administrator records them.

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

          {completed &&

            homeScore !== null &&

            awayScore !== null

            ? `${homeScore} – ${awayScore}`

            : " vs "}

        </span>

        <strong>{awayName}</strong>

      </div>



      <small>

        {fmtDate(matchDate(match))} ·{" "}

        {match.venue || "Venue TBC"}

      </small>



      <span

        className={`club-match-status ${completed ? "done" : "upcoming"

          }`}

      >

        {completed

          ? "Completed"

          : match.status || "Scheduled"}

      </span>

    </div>

  );

}
