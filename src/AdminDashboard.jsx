
import "./AdminDashboard.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const SECTIONS = [
  { key: "overview", label: "Overview", description: "League activity and system statistics." },
  { key: "clubs", label: "Clubs", description: "Manage the club directory." },
  { key: "approved_roster", label: "Players & roster", description: "Manage approved squad members." },
  { key: "approved_player_profiles", label: "Player profiles", description: "Manage public player profiles." },
  { key: "matches", label: "Matches", description: "Create fixtures and update results." },
  { key: "match_lineups", label: "Lineups & player stats", description: "Manage match lineups and publication." },
  { key: "match_events", label: "Match events", description: "Record goals, cards and incidents." },
  { key: "standings", label: "League standings", description: "Calculate standings from completed results." },
  { key: "reports", label: "Reports & exports", description: "Download league records as CSV." },
  { key: "suspensions", label: "Discipline", description: "Manage player suspensions." },
  { key: "admin_users", label: "Administrators", description: "Manage the administrator allowlist." },
];

const COMPETITIONS = [
  "International Students Football League",
  "International Students Cup",
  "Nations Friendship Cup",
  "Manav Rachna University Football Hub Cup",
  "Manav Laliga Cup",
  "Chibuku Super Cup",
  "Castle Challenge Cup",
  "Independence Cup",
  "Christmas Cup",
  "Heroes Day Cup",
];

const SEASONS = Array.from({ length: 24 }, (_, i) => `${2026 + i}-${2027 + i}`);
const MATCH_STATUSES = ["Scheduled", "Live", "Completed", "Postponed", "Cancelled"];
const DEFAULT_VENUE = "Manav Rachna University Football Pitch";

const TABLE_COLUMNS = {
  clubs: ["id", "name", "slug", "short_name", "description", "created_at"],
  admin_users: ["user_id", "display_name", "created_at"],
  matches: [
    "id", "competition", "season", "home_club_id", "away_club_id",
    "kickoff_at", "venue", "status", "home_score", "away_score",
    "notes", "created_at",
  ],
  match_lineups: [
    "id", "match_id", "club_id", "player_registration_id",
    "lineup_role", "position", "jersey_number", "is_published",
    "created_at", "updated_at",
  ],
  match_events: [
    "id", "match_id", "club_id", "player_registration_id",
    "event_type", "minute", "notes", "created_by", "created_at",
  ],
};

const OVERVIEW_TABLES = {
  clubs: "clubs",
  roster: "approved_roster",
  profiles: "approved_player_profiles",
  registrations: "registrations",
  matches: "matches",
  lineups: "match_lineups",
  events: "match_events",
  suspensions: "suspensions",
  admins: "admin_users",
};

const labelize = (value) =>
  String(value).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const slugify = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isCompleted = (match) =>
  ["completed", "complete", "finished", "full time", "full-time", "ft"].includes(
    String(match.status || "").trim().toLowerCase()
  );

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function csvCell(value) {
  const text = value == null
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, data) {
  if (!data?.length) return false;

  const headers = [...new Set(data.flatMap((row) => Object.keys(row)))];
  const csv = [
    headers.map(csvCell).join(","),
    ...data.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
  ].join("\r\n");

  const url = URL.createObjectURL(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

function getPrimaryKey(table, row) {
  if (table === "admin_users") return "user_id";
  if (row && Object.hasOwn(row, "id")) return "id";
  if (row && Object.hasOwn(row, "uuid")) return "uuid";
  return null;
}

export default function AdminDashboard({ user, onSignOut }) {
  const [section, setSection] = useState("overview");
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [overview, setOverview] = useState({
    clubs: [],
    roster: [],
    profiles: [],
    registrations: [],
    matches: [],
    lineups: [],
    events: [],
    suspensions: [],
    admins: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!supabase) return;

    const entries = await Promise.all(
      Object.entries(OVERVIEW_TABLES).map(async ([key, table]) => {
        const { data, error: queryError } = await supabase
          .from(table)
          .select("*")
          .limit(2000);

        if (queryError) {
          console.error(`Unable to load ${table}:`, queryError.message);
          return [key, []];
        }

        return [key, data ?? []];
      })
    );

    const data = Object.fromEntries(entries);
    setOverview(data);
    setClubs(data.clubs);
  }, []);

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setError("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setLoading(true);
    setError("");

    if (["overview", "standings", "reports"].includes(section)) {
      await loadOverview();
      setRows([]);
      setColumns([]);
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from(section)
      .select("*")
      .limit(2000);

    if (queryError) {
      setError(`${queryError.message}. Check the table, column names and Supabase Row Level Security permissions.`);
      setRows([]);
      setColumns([]);
      setLoading(false);
      return;
    }

    const list = data ?? [];
    setRows(list);
    setColumns(list.length ? Object.keys(list[0]) : TABLE_COLUMNS[section] ?? []);

    if (section === "clubs") setClubs(list);

    await loadOverview();
    setLoading(false);
  }, [section, loadOverview]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(needle)
      )
    );
  }, [rows, search]);

  const standings = useMemo(() => {
    const table = new Map(
      overview.clubs.map((club) => [
        club.id,
        {
          club_id: club.id,
          club_name: club.name,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
        },
      ])
    );

    overview.matches
      .filter((match) =>
        isCompleted(match) &&
        match.home_score != null &&
        match.away_score != null
      )
      .forEach((match) => {
        const home = table.get(match.home_club_id);
        const away = table.get(match.away_club_id);
        if (!home || !away) return;

        const homeScore = Number(match.home_score);
        const awayScore = Number(match.away_score);

        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return;

        home.played++;
        away.played++;
        home.gf += homeScore;
        home.ga += awayScore;
        away.gf += awayScore;
        away.ga += homeScore;

        if (homeScore > awayScore) {
          home.won++;
          away.lost++;
          home.points += 3;
        } else if (homeScore < awayScore) {
          away.won++;
          home.lost++;
          away.points += 3;
        } else {
          home.drawn++;
          away.drawn++;
          home.points++;
          away.points++;
        }
      });

    return [...table.values()]
      .map((row) => ({ ...row, gd: row.gf - row.ga }))
      .sort((a, b) =>
        b.points - a.points ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.club_name.localeCompare(b.club_name)
      )
      .map((row, index) => ({ position: index + 1, ...row }));
  }, [overview.clubs, overview.matches]);

  const page = SECTIONS.find((item) => item.key === section);
  const pending = overview.registrations.filter(
    (row) => String(row.status).toLowerCase() === "pending"
  ).length;
  const completed = overview.matches.filter(isCompleted).length;
  const upcoming = overview.matches.filter((match) =>
    ["scheduled", "upcoming", "pending"].includes(
      String(match.status || "").trim().toLowerCase()
    )
  ).length;

  function closeEditor() {
    if (saving) return;
    setEditing(null);
    setDraft({});
  }

  function beginCreate() {
    setError("");
    setNotice("");

    if (section === "clubs") {
      setEditing({ mode: "create", primaryKey: "id" });
      setDraft({ name: "", short_name: "", slug: "", description: "" });
      return;
    }

    if (section === "admin_users") {
      setEditing({ mode: "create", primaryKey: "user_id" });
      setDraft({ user_id: "", display_name: "" });
      return;
    }

    if (section === "matches") {
      setEditing({ mode: "create" });
      setDraft({
        competition: COMPETITIONS[0],
        season: "2026-2027",
        home_club_id: "",
        away_club_id: "",
        kickoff_at: "",
        venue: DEFAULT_VENUE,
        status: "Scheduled",
        home_score: "",
        away_score: "",
        notes: "",
      });
      return;
    }

    if (section === "match_lineups") {
      setEditing({ mode: "create" });
      setDraft({
        match_id: "",
        club_id: "",
        player_registration_id: "",
        lineup_role: "Starting XI",
        position: "",
        jersey_number: "",
        is_published: false,
      });
      return;
    }

    if (!columns.length) {
      setError("No table columns are available. Refresh the table and check its schema and permissions.");
      return;
    }

    const initial = {};
    columns.forEach((column) => {
      if (!["id", "uuid", "created_at", "updated_at", "reviewed_at"].includes(column)) {
        initial[column] = "";
      }
    });

    setEditing({ mode: "create" });
    setDraft(initial);
  }

  function beginEdit(row) {
    const primaryKey = getPrimaryKey(section, row);

    if (!primaryKey) {
      setError(`Editing is disabled for ${section}: no supported primary key was found.`);
      return;
    }

    const next = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key !== primaryKey && !["created_at", "updated_at", "reviewed_at"].includes(key)) {
        next[key] = value == null
          ? ""
          : typeof value === "object"
            ? JSON.stringify(value)
            : typeof value === "boolean"
              ? value
              : String(value);
      }
    });

    setEditing({ mode: "edit", row, primaryKey });
    setDraft(next);
    setError("");
    setNotice("");
  }

  function renderDraftField(key, value) {
    const update = (nextValue) => {
      setDraft((old) => {
        const next = { ...old, [key]: nextValue };

        if (key === "match_id") {
          const match = overview.matches.find((item) => item.id === nextValue);
          if (match && next.club_id && ![match.home_club_id, match.away_club_id].includes(next.club_id)) {
            next.club_id = "";
            next.player_registration_id = "";
          }
        }

        if (key === "club_id") next.player_registration_id = "";
        if (key === "home_club_id" && next.away_club_id === nextValue) next.away_club_id = "";
        if (key === "away_club_id" && next.home_club_id === nextValue) next.home_club_id = "";

        return next;
      });
    };

    const field = (control) => (
      <label key={key} className="admin-field">
        <span>{labelize(key)}</span>
        {control}
      </label>
    );

    const select = (options, placeholder = "Select...") => (
      <select value={value ?? ""} onChange={(event) => update(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    );

    if (section === "matches") {
      if (key === "competition") {
        return field(select(COMPETITIONS.map((item) => ({ value: item, label: item })), "Select competition"));
      }

      if (key === "season") {
        return field(select(SEASONS.map((item) => ({ value: item, label: item })), "Select season"));
      }

      if (key === "status") {
        return field(select(MATCH_STATUSES.map((item) => ({ value: item, label: item })), "Select status"));
      }

      if (key === "home_club_id" || key === "away_club_id") {
        const otherKey = key === "home_club_id" ? "away_club_id" : "home_club_id";
        return field(select(
          clubs.filter((club) => club.id !== draft[otherKey])
            .map((club) => ({ value: club.id, label: club.name })),
          "Select club"
        ));
      }

      if (key === "kickoff_at") {
        return field(
          <input
            type="datetime-local"
            value={toLocalDateTimeInput(value)}
            onChange={(event) => update(event.target.value)}
            required
          />
        );
      }

      if (key === "venue") {
        return field(
          <input value={value ?? ""} onChange={(event) => update(event.target.value)} placeholder={DEFAULT_VENUE} />
        );
      }

      if (key === "home_score" || key === "away_score") {
        return field(
          <input type="number" min="0" step="1" value={value ?? ""} onChange={(event) => update(event.target.value)} />
        );
      }
    }

    if (section === "match_lineups") {
      if (key === "match_id") {
        const options = [...overview.matches]
          .sort((a, b) => new Date(a.kickoff_at || 0) - new Date(b.kickoff_at || 0))
          .map((match) => ({
            value: match.id,
            label: `${clubs.find((club) => club.id === match.home_club_id)?.name || "Home"} vs ${clubs.find((club) => club.id === match.away_club_id)?.name || "Away"} · ${match.kickoff_at ? new Date(match.kickoff_at).toLocaleString() : "Date not set"}`,
          }));

        return field(select(options, "Select match"));
      }

      if (key === "club_id") {
        const match = overview.matches.find((item) => item.id === draft.match_id);
        const matchClubs = match
          ? clubs.filter((club) => [match.home_club_id, match.away_club_id].includes(club.id))
          : [];

        return field(select(
          matchClubs.map((club) => ({ value: club.id, label: club.name })),
          draft.match_id ? "Select match club" : "Select match first"
        ));
      }

      if (key === "player_registration_id") {
        const players = overview.registrations.filter((player) =>
          ["approved", "accepted"].includes(String(player.status || "").toLowerCase()) &&
          player.club_id === draft.club_id
        );

        return field(select(
          players.map((player) => ({
            value: player.id,
            label: `${player.football_name || player.full_name || "Unnamed player"}${player.jersey_number != null ? ` (#${player.jersey_number})` : ""}`,
          })),
          "Select approved player"
        ));
      }

      if (key === "lineup_role") {
        return field(select(
          ["Starting XI", "Substitute", "Unused Substitute"].map((item) => ({ value: item, label: item })),
          "Select lineup role"
        ));
      }

      if (key === "is_published") {
        return field(
          <input type="checkbox" checked={value === true || value === "true"} onChange={(event) => update(event.target.checked)} />
        );
      }

      if (key === "jersey_number") {
        return field(
          <input type="number" min="1" max="99" value={value ?? ""} onChange={(event) => update(event.target.value)} />
        );
      }
    }

    if (section === "match_events") {
      if (key === "event_type") {
        return field(select(
          ["goal", "own_goal", "penalty_goal", "penalty_missed", "yellow_card", "red_card", "substitution", "injury", "other"]
            .map((item) => ({ value: item, label: labelize(item) })),
          "Select event type"
        ));
      }

      if (key === "match_id") {
        return field(select(
          overview.matches.map((match) => ({
            value: match.id,
            label: `${clubs.find((club) => club.id === match.home_club_id)?.name || "Home"} vs ${clubs.find((club) => club.id === match.away_club_id)?.name || "Away"} · ${match.kickoff_at ? new Date(match.kickoff_at).toLocaleString() : ""}`,
          })),
          "Select match"
        ));
      }

      if (key === "club_id") {
        const match = overview.matches.find((item) => item.id === draft.match_id);
        const matchClubs = match
          ? clubs.filter((club) => [match.home_club_id, match.away_club_id].includes(club.id))
          : [];

        return field(select(
          matchClubs.map((club) => ({ value: club.id, label: club.name })),
          draft.match_id ? "Select match club" : "Select match first"
        ));
      }

      if (key === "player_registration_id") {
        const players = overview.registrations.filter((player) => !draft.club_id || player.club_id === draft.club_id);
        return field(select(
          players.map((player) => ({ value: player.id, label: player.football_name || player.full_name || player.id })),
          "Optional: select player"
        ));
      }
    }

    if (key === "club_id" && !["match_lineups", "match_events"].includes(section)) {
      return field(select(clubs.map((club) => ({ value: club.id, label: club.name })), "Select club"));
    }

    if (key === "user_id") {
      return field(
        <input value={value ?? ""} onChange={(event) => update(event.target.value.trim())} placeholder="Supabase Auth user UUID" required />
      );
    }

    if (["is_published", "is_team_captain"].includes(key)) {
      return field(
        <input type="checkbox" checked={value === true || value === "true"} onChange={(event) => update(event.target.checked)} />
      );
    }

    if (key === "status" && section === "suspensions") {
      return field(select(
        ["active", "served", "completed", "cancelled"].map((item) => ({ value: item, label: labelize(item) })),
        "Select status"
      ));
    }

    if (key === "status" && section === "approved_roster") {
      return field(select(
        ["approved", "pending", "inactive", "rejected"].map((item) => ({ value: item, label: labelize(item) })),
        "Select status"
      ));
    }

    if (key === "role" && section === "approved_roster") {
      return field(select(
        ["player", "coach", "manager", "captain", "assistant_coach"].map((item) => ({ value: item, label: labelize(item) })),
        "Select role"
      ));
    }

    if (["description", "notes", "message", "reason", "performance_notes"].includes(key)) {
      return field(
        <textarea rows="3" value={value ?? ""} onChange={(event) => update(event.target.value)} />
      );
    }

    if (key === "kickoff_at") {
      return field(
        <input type="datetime-local" value={toLocalDateTimeInput(value)} onChange={(event) => update(event.target.value)} />
      );
    }

    if (["created_by", "reviewed_by", "reviewed_at", "created_at", "updated_at"].includes(key)) {
      return null;
    }

    const numericField =
      key.includes("minute") ||
      key.includes("score") ||
      key.includes("matches_") ||
      key === "jersey_number" ||
      ["played", "won", "drawn", "lost", "gf", "ga", "gd", "points"].includes(key);

    return field(
      <input
        type={key.toLowerCase().includes("email") ? "email" : numericField ? "number" : "text"}
        min={numericField ? "0" : undefined}
        value={value ?? ""}
        onChange={(event) => update(event.target.value)}
        placeholder={key.includes("_id") ? "Enter the related record UUID" : labelize(key)}
      />
    );
  }

  async function saveDraft(event) {
    event.preventDefault();
    if (!supabase || !editing) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (section === "matches") {
        if (!draft.competition || !draft.season || !draft.home_club_id || !draft.away_club_id || !draft.kickoff_at) {
          setError("Complete the competition, season, both clubs and kick-off time.");
          return;
        }

        if (draft.home_club_id === draft.away_club_id) {
          setError("Home and away clubs must be different.");
          return;
        }
      }

      if (section === "match_lineups") {
        if (!draft.match_id || !draft.club_id || !draft.player_registration_id || !draft.lineup_role) {
          setError("Select a match, club, approved player and lineup role.");
          return;
        }

        const match = overview.matches.find((item) => item.id === draft.match_id);
        if (!match || ![match.home_club_id, match.away_club_id].includes(draft.club_id)) {
          setError("The selected club must be one of the clubs in that match.");
          return;
        }

        const player = overview.registrations.find((item) => item.id === draft.player_registration_id);
        if (!player || player.club_id !== draft.club_id ||
          !["approved", "accepted"].includes(String(player.status || "").toLowerCase())) {
          setError("Select an approved player belonging to the selected club.");
          return;
        }
      }

      let payload = {};

      Object.entries(draft).forEach(([key, value]) => {
        if ([
          "id", "uuid", "created_at", "updated_at",
          "reviewed_at", "created_by", "reviewed_by",
        ].includes(key)) return;

        // Important: match notes must never be converted to NULL.
        if (section === "matches" && key === "notes") {
          payload.notes = String(value ?? "").trim();
          return;
        }

        if (typeof value === "string" && value.trim() === "") {
          payload[key] = null;
          return;
        }

        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
            try {
              payload[key] = JSON.parse(trimmed);
              return;
            } catch {
              // Keep normal text if it is not valid JSON.
            }
          }
        }

        payload[key] = value;
      });

      if (section === "clubs") {
        const name = String(draft.name ?? "").trim();
        const shortName = String(draft.short_name ?? "").trim();
        const slug = slugify(draft.slug || name);
        const description = String(draft.description ?? "").trim();

        if (!name || !shortName || !slug || !description) {
          setError("Complete the club name, short name, slug and description.");
          return;
        }

        payload = { name, short_name: shortName, slug, description };
      }

      if (section === "admin_users") {
        const userId = String(draft.user_id ?? "").trim();
        const displayName = String(draft.display_name ?? "").trim();

        if (!userId || !displayName) {
          setError("Enter the authenticated Supabase user's UUID and display name.");
          return;
        }

        payload = { user_id: userId, display_name: displayName };
      }

      if (section === "matches") {
        const kickoffDate = new Date(draft.kickoff_at);
        if (Number.isNaN(kickoffDate.getTime())) {
          setError("Enter a valid kick-off date and time.");
          return;
        }

        // FIX: Supabase matches.notes has a NOT NULL constraint.
        // An empty notes field must be '' rather than null.
        payload.notes = String(draft.notes ?? "").trim() || "";
        payload.venue = String(draft.venue ?? "").trim() || DEFAULT_VENUE;
        payload.kickoff_at = kickoffDate.toISOString();

        payload.home_score = draft.home_score === "" || draft.home_score == null
          ? null
          : Number(draft.home_score);
        payload.away_score = draft.away_score === "" || draft.away_score == null
          ? null
          : Number(draft.away_score);

        if (
          (payload.home_score != null && (!Number.isInteger(payload.home_score) || payload.home_score < 0)) ||
          (payload.away_score != null && (!Number.isInteger(payload.away_score) || payload.away_score < 0))
        ) {
          setError("Scores must be non-negative whole numbers.");
          return;
        }
      }

      if (section === "match_lineups") {
        if (payload.jersey_number != null) {
          payload.jersey_number = Number(payload.jersey_number);
          if (!Number.isInteger(payload.jersey_number) || payload.jersey_number < 1 || payload.jersey_number > 99) {
            setError("Jersey number must be between 1 and 99.");
            return;
          }
        }

        payload.is_published = draft.is_published === true || draft.is_published === "true";
      }

      if (section === "match_events" && payload.minute != null) {
        payload.minute = Number(payload.minute);
        if (!Number.isInteger(payload.minute) || payload.minute < 0) {
          setError("Event minute must be a non-negative whole number.");
          return;
        }
      }

      let result;

      if (editing.mode === "create") {
        result = await supabase.from(section).insert(payload);
      } else {
        const primaryKey = editing.primaryKey || getPrimaryKey(section, editing.row);

        if (!primaryKey) {
          setError("Could not identify the record's primary key.");
          return;
        }

        if (section === "admin_users") delete payload.user_id;

        result = await supabase
          .from(section)
          .update(payload)
          .eq(primaryKey, editing.row[primaryKey]);
      }

      if (result.error) {
        setError(result.error.message);
        return;
      }

      const wasCreate = editing.mode === "create";
      setEditing(null);
      setDraft({});

      setNotice(
        section === "admin_users"
          ? wasCreate
            ? "Administrator allowlist entry added. This does not create an Auth account."
            : "Administrator display name updated."
          : wasCreate
            ? "Record created successfully."
            : "Record updated successfully."
      );

      await loadRows();
    } catch (saveError) {
      setError(saveError?.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(row) {
    if (!supabase) return;

    const primaryKey = getPrimaryKey(section, row);
    if (!primaryKey) {
      setError("Delete is disabled because the primary key could not be identified.");
      return;
    }

    if (section === "admin_users" && row.user_id === user?.id) {
      setError("You cannot remove your own administrator access while signed in.");
      return;
    }

    const description = section === "clubs"
      ? row.name
      : section === "admin_users"
        ? row.display_name
        : row.full_name || row.football_name || row.id;

    if (!window.confirm(`Delete ${description || "this record"}? This cannot be undone. Linked records may prevent deletion.`)) {
      return;
    }

    setError("");
    setNotice("");

    const { error: deleteError } = await supabase
      .from(section)
      .delete()
      .eq(primaryKey, row[primaryKey]);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setNotice(section === "admin_users"
      ? "Administrator allowlist entry removed. The Auth account was not deleted."
      : "Record deleted successfully.");

    await loadRows();
  }

  function exportRows(filename, data) {
    if (!downloadCsv(filename, data)) {
      setError("There are no records to export yet.");
      return;
    }

    setNotice(`CSV export created: ${filename}`);
    setError("");
  }

  function changeSection(nextSection) {
    setSection(nextSection);
    setSearch("");
    setEditing(null);
    setDraft({});
    setError("");
    setNotice("");
  }

  const canAdd = [
    "clubs", "approved_roster", "approved_player_profiles",
    "matches", "match_lineups", "match_events", "suspensions", "admin_users",
  ].includes(section);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-mark">MR</span>
          <div>
            <strong>MR FOOTBALL</strong>
            <small>ADMINISTRATION</small>
          </div>
        </div>

        <p className="admin-menu-label">MANAGEMENT</p>

        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`admin-nav-item ${section === item.key ? "active" : ""}`}
            onClick={() => changeSection(item.key)}
          >
            {item.label}<span>›</span>
          </button>
        ))}

        <button type="button" className="admin-back" onClick={onSignOut}>
          Sign out
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">CONTROL PANEL</span>
            <h1>Admin dashboard</h1>
          </div>
          <div className="admin-user">
            <span className="admin-avatar">{(user?.email || "A").slice(0, 1).toUpperCase()}</span>
            <span>{user?.email || "Administrator"}</span>
          </div>
        </header>

        <div className="admin-page-heading">
          <div>
            <h2>{page?.label || "Admin dashboard"}</h2>
            <p>{page?.description}</p>
          </div>
          {canAdd && (
            <button type="button" className="primary-button" onClick={beginCreate}>
              {section === "clubs" ? "+ Add club" : section === "admin_users" ? "+ Authorize admin" : "+ Add record"}
            </button>
          )}
        </div>

        {error && <p className="admin-alert error" role="alert">{error}</p>}
        {notice && <p className="admin-alert success" role="status">{notice}</p>}

        {section === "overview" && (
          <>
            <div className="admin-stat-row admin-stat-row-wide">
              {[
                ["Registered clubs", overview.clubs.length],
                ["Approved roster", overview.roster.length],
                ["Player profiles", overview.profiles.length],
                ["Pending applications", pending],
                ["Upcoming matches", upcoming],
                ["Completed matches", completed],
                ["Lineup records", overview.lineups.length],
                ["Match events", overview.events.length],
                ["Active suspensions", overview.suspensions.filter((item) => String(item.status).toLowerCase() === "active").length],
              ].map(([label, value]) => (
                <div className="admin-stat" key={label}>
                  <span>{label}</span>
                  <strong>{loading ? "…" : value}</strong>
                </div>
              ))}
            </div>

            <div className="admin-table-card admin-overview-card">
              <div className="admin-table-toolbar">
                <strong>League standings preview</strong>
                <button type="button" className="secondary-button" onClick={() => changeSection("standings")}>
                  Open standings
                </button>
              </div>

              {loading ? <p className="admin-empty">Loading live statistics…</p> : (
                <div className="admin-table-scroll">
                  <table className="admin-data-table">
                    <thead>
                      <tr>{["#", "Club", "P", "W", "D", "L", "GF", "GA", "GD", "Pts"].map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {standings.slice(0, 6).map((row) => (
                        <tr key={row.club_id}>
                          <td>{row.position}</td><td>{row.club_name}</td><td>{row.played}</td>
                          <td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td>
                          <td>{row.gf}</td><td>{row.ga}</td><td>{row.gd}</td><td><strong>{row.points}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="admin-form-note">Standings are calculated from completed matches with both scores recorded. This calculation does not write to the database.</p>
          </>
        )}

        {section === "standings" && (
          <div className="admin-table-card">
            <div className="admin-table-toolbar">
              <span>3 points for a win · 1 point for a draw</span>
              <button type="button" className="secondary-button" onClick={() => exportRows("manav-rachna-league-standings.csv", standings)}>
                Export standings CSV
              </button>
            </div>
            {loading ? <p className="admin-empty">Calculating standings…</p> : (
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead><tr>{["Pos", "Club", "Played", "Won", "Drawn", "Lost", "GF", "GA", "GD", "Points"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.club_id}>
                        <td>{row.position}</td><td>{row.club_name}</td><td>{row.played}</td>
                        <td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td>
                        <td>{row.gf}</td><td>{row.ga}</td><td>{row.gd}</td><td><strong>{row.points}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="admin-form-note">Standings are calculated from clubs and matches. The separate club_standings table is not updated.</p>
          </div>
        )}

        {section === "reports" && (
          <div className="admin-table-card">
            <div className="admin-table-toolbar">
              <div>
                <strong>Download reports</strong>
                <p className="admin-form-note">CSV files can be opened in Excel, Numbers and Google Sheets.</p>
              </div>
              <button type="button" className="secondary-button" onClick={loadRows}>Refresh report data</button>
            </div>
            <div className="admin-report-grid">
              {[
                ["Clubs directory", "clubs", overview.clubs],
                ["Approved roster", "approved-roster", overview.roster],
                ["Player profiles", "player-profiles", overview.profiles],
                ["Registrations", "registrations", overview.registrations],
                ["Matches & results", "matches-results", overview.matches],
                ["Lineups", "match-lineups", overview.lineups],
                ["Match events", "match-events", overview.events],
                ["League standings", "league-standings", standings],
                ["Suspensions", "suspensions", overview.suspensions],
                ["Administrator allowlist", "admin-users", overview.admins],
              ].map(([label, filename, data]) => (
                <div className="admin-report-item" key={filename}>
                  <div><strong>{label}</strong><span>{data.length} records</span></div>
                  <button type="button" className="secondary-button" onClick={() => exportRows(`mr-football-${filename}.csv`, data)}>
                    Export CSV
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!["overview", "standings", "reports"].includes(section) && (
          <div className="admin-table-card">
            <div className="admin-table-toolbar">
              <input
                aria-label="Search records"
                placeholder={`Search ${page?.label.toLowerCase()}…`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="admin-toolbar-actions">
                <button type="button" className="secondary-button" onClick={() => exportRows(`mr-football-${section}.csv`, filteredRows)}>Export CSV</button>
                <button type="button" className="secondary-button" onClick={loadRows}>Refresh</button>
              </div>
            </div>

            {loading ? <p className="admin-empty">Loading records…</p> : filteredRows.length === 0 ? (
              <p className="admin-empty">No records found. Add a record or check the table permissions.</p>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead><tr>{columns.slice(0, 8).map((column) => <th key={column}>{labelize(column)}</th>)}<th>Actions</th></tr></thead>
                  <tbody>
                    {filteredRows.map((row, index) => (
                      <tr key={row.id ?? row.user_id ?? row.uuid ?? index}>
                        {columns.slice(0, 8).map((column) => (
                          <td key={column}>{String(row[column] ?? "—").slice(0, 90)}</td>
                        ))}
                        <td>
                          <div className="admin-row-actions">
                            <button type="button" onClick={() => beginEdit(row)}>Edit</button>
                            <button type="button" className="danger-link" onClick={() => deleteRow(row)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {section === "admin_users" && (
          <p className="admin-form-note">
            Adding an administrator allowlist entry does not create a Supabase Auth account. Use an existing Auth user's UUID. Secure this table with appropriate Row Level Security policies and never expose the service-role key in frontend code.
          </p>
        )}

        {section === "approved_roster" && (
          <p className="admin-form-note">Roster entries use club_id to link members to clubs. Keep roster records and public player profiles consistent.</p>
        )}

        {section === "match_lineups" && (
          <p className="admin-form-note">
            Record one row per player per match. Select a match, one of its clubs, an approved registered player, lineup role, position, jersey number and publication status. Record goals, cards and substitutions separately in Match events.
          </p>
        )}

        {section === "match_events" && (
          <p className="admin-form-note">Events use match_id, club_id, event_type, minute and notes. Use consistent event labels for goals, cards and substitutions.</p>
        )}

        {section === "suspensions" && (
          <p className="admin-form-note">Keep matches_total, matches_served and status updated. This dashboard does not automatically issue suspensions from red cards.</p>
        )}

        {editing && (
          <div
            className="admin-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeEditor();
            }}
          >
            <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
              <div className="admin-modal-header">
                <div>
                  <span className="eyebrow">
                    {section === "matches" ? "FIXTURE MANAGEMENT" : section === "match_lineups" ? "SQUAD MANAGEMENT" : "RECORD MANAGEMENT"}
                  </span>
                  <h2 id="admin-modal-title">
                    {editing.mode === "create"
                      ? section === "clubs" ? "Add club" : section === "admin_users" ? "Authorize administrator" : "Add record"
                      : "Edit record"}
                  </h2>
                </div>
                <button type="button" className="secondary-button" onClick={closeEditor} disabled={saving}>Close</button>
              </div>

              <form onSubmit={saveDraft}>
                <div className="admin-form-grid">
                  {Object.entries(draft).map(([key, value]) => renderDraftField(key, value))}
                </div>
                <div className="admin-modal-actions">
                  <button type="button" className="secondary-button" onClick={closeEditor} disabled={saving}>Cancel</button>
                  <button type="submit" className="primary-button" disabled={saving}>
                    {saving ? "Saving..." : "Save record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
