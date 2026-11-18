import "./AdminDashboard.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { QRCodeSVG } from "qrcode.react";
const SECTIONS = [
  { key: "overview", label: "Overview", description: "League activity and system statistics." },
  { key: "registrations", label: "Registration applications", description: "Review, approve or reject applications." },
  { key: "clubs", label: "Clubs", description: "Manage the club directory." },
  { key: "approved_roster", label: "Players & roster", description: "Manage approved squad members." },
  { key: "coaches", label: "Coaches", description: "Manage coach profiles and approval status." },
  { key: "referees", label: "Referees", description: "Manage referee profiles and approval status." },
  { key: "approved_player_profiles", label: "Player profiles", description: "Manage public player profiles." },
  { key: "matches", label: "Matches", description: "Create fixtures and update results." },
  { key: "match_lineups", label: "Lineups & player stats", description: "Manage match lineups and publication." },
  { key: "match_events", label: "Match events", description: "Record goals, cards and incidents." },
  {
    key: "voting",
    label: "Voting Management",
    description: "Select match participants and manage voting sessions.",
  },
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
const MATCH_STATUSES = [
  "Scheduled",
  "Live",
  "Result Pending",
  "Completed",
  "Postponed",
  "Cancelled",
];
const PLAYER_POSITIONS = [
  "GK",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "CDM",
  "CM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
  "ST",
];
const DEFAULT_VENUE = "Manav Rachna University Football Pitch";

const TABLE_COLUMNS = {
  clubs: [
    "id",
    "name",
    "logo_path",
    "slug",
    "short_name",
    "description",
    "created_at",
  ],
  approved_roster: [
    "id",
    "club_id",
    "role",
    "full_name",
    "photo_path",
    "position_or_specialty",
    "experience",
    "status",
    "is_published",
    "created_at",

  ],
  coaches: [
    "id",
    "club_id",
    "role",
    "full_name",
    "photo_path",
    "position_or_specialty",
    "experience",
    "status",
    "is_published",
    "created_at",

  ],

  referees: [
    "id",
    "club_id",
    "role",
    "full_name",
    "photo_path",
    "position_or_specialty",
    "experience",
    "status",
    "is_published",
    "created_at",

  ],


  suspensions: [
    "id",
    "player_registration_id",
    "club_id",
    "competition",
    "season",
    "reason",
    "source_match_id",
    "matches_total",
    "matches_served",
    "status",
    "notes",
    "created_by",
    "created_at",
  ],



  approved_player_profiles: [
    "id",
    "registration_id",
    "football_name",
    "full_name",
    "jersey_number",
    "photo_path",
    "club_id",
    "club_name",
    "position",
    "is_published",
  ],

  admin_users: ["user_id", "display_name", "created_at"],
  matches: [
    "id",
    "competition",
    "season",
    "home_club_id",
    "away_club_id",
    "home_coach_roster_id",
    "away_coach_roster_id",
    "referee_1_roster_id",
    "referee_2_roster_id",
    "referee_3_roster_id",
    "kickoff_at",
    "match_started_at",

    "clock_phase",
    "clock_elapsed_seconds",
    "clock_started_at",
    "first_half_added_minutes",
    "second_half_added_minutes",

    "venue",
    "status",
    "home_score",
    "away_score",
    "notes",
    "updated_by",
    "created_at",
  ],
  match_lineups: [
    "id", "match_id", "club_id", "player_registration_id",
    "lineup_role", "position", "jersey_number", "is_published",
    "created_at", "updated_at",
  ],

  match_events: [
    "id",
    "match_id",
    "club_id",
    "player_registration_id",
    "assist_registration_id",
    "event_type",
    "minute",
    "notes",
    "created_by",
    "created_at",
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

function getFootballName(person, profiles = [], registrations = []) {
  const profile = profiles.find(
    (item) => item.registration_id === person.id
  );

  const registration = registrations.find(
    (item) =>
      item.id === (person.registration_id || person.id)
  );

  return (
    person.football_name ||
    profile?.football_name ||
    registration?.football_name ||
    person.full_name ||
    registration?.full_name ||
    "Unnamed person"
  );
}


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

async function uploadImage(file, folder = "players") {
  if (!file) return null;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("The image must be smaller than 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = `${crypto.randomUUID()}.${extension}`;
  const storagePath = `${folder}/${safeName}`;

  const { data, error } = await supabase.storage
    .from("football-images")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;

  return data.path;
}


function getImageUrl(path) {
  if (!path || typeof path !== "string") return "";

  // Allow either a full image URL or a path in Supabase Storage.
  if (/^https?:\/\//i.test(path)) return path;

  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage
    .from("football-images")
    .getPublicUrl(cleanPath);

  return data?.publicUrl || "";
}

function AdminImage({ path, alt, className }) {
  const src = getImageUrl(path);

  if (!src) {
    return <span className="admin-image-placeholder">No image</span>;
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
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
  const [logoFile, setLogoFile] = useState(null);
  const [votingMatchId, setVotingMatchId] = useState("");
  const [votingData, setVotingData] = useState(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [votingSaving, setVotingSaving] = useState(false);
  const [votingQrToken, setVotingQrToken] = useState("");
  const [votingQrUrl, setVotingQrUrl] = useState("");
  const [votingQrGenerating, setVotingQrGenerating] = useState(false);
  const [votingQrRevoking, setVotingQrRevoking] = useState(false);
  const [votingMonitor, setVotingMonitor] = useState(null);
  const [votingMonitorLoading, setVotingMonitorLoading] = useState(false);
  const [votingMonitorError, setVotingMonitorError] = useState("");

  const [votingScheduledOpenAt, setVotingScheduledOpenAt] = useState("");
  const [votingScheduledCloseAt, setVotingScheduledCloseAt] = useState("");

  const loadOverview = useCallback(async () => {
    if (!supabase) return;

    const entries = await Promise.all(
      Object.entries(OVERVIEW_TABLES).map(async ([key, table]) => {
        const { data, error: queryError } = await supabase
          .from(table)
          .select("*")
          .limit(2000);

        if (queryError) {
          console.error(`Unable to load ${table}:`, queryError);
          throw new Error(
            `Could not load ${table}: ${queryError.message}`
          );
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

    if (["overview", "standings", "reports", "voting"].includes(section)) {
      try {
        await loadOverview();
        setRows([]);
        setColumns([]);
      } catch (loadError) {
        setError(loadError?.message || "Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const rosterSection = ["coaches", "referees"].includes(section);

    const { data, error: queryError } = await supabase
      .from(rosterSection ? "approved_roster" : section)
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


    const filteredList =
      section === "approved_roster"
        ? list.filter(
          (row) =>
            String(row.role || "").trim().toLowerCase() === "player"
        )
        : section === "coaches"
          ? list.filter(
            (row) =>
              String(row.role || "").trim().toLowerCase() === "coach"
          )
          : section === "referees"
            ? list.filter(
              (row) =>
                String(row.role || "").trim().toLowerCase() === "referee"
            )
            : list;


    setRows(filteredList);
    setColumns(
      list.length > 0
        ? Object.keys(list[0])
        : (TABLE_COLUMNS[section] ?? [])
    );

    if (section === "clubs") setClubs(list);

    try {
      await loadOverview();
    } catch (loadError) {
      setError(loadError?.message || "Could not load related dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [section, loadOverview]);

  async function reviewRegistration(app, newStatus) {
    if (!supabase || !user?.id) {
      setError("Please sign in as an administrator.");
      return;
    }

    if (!["Approved", "Rejected"].includes(newStatus)) {
      setError("Invalid registration status.");
      return;
    }

    setError("");
    setNotice("");

    try {
      const { error: reviewError } = await supabase.rpc(
        "review_registration",
        {
          p_registration_id: app.id,
          p_new_status: newStatus,
          p_reviewed_by: user.id,
        }
      );

      if (reviewError) throw reviewError;

      setNotice(
        newStatus === "Approved"
          ? "Application approved and linked to the club roster."
          : "Application rejected successfully."
      );

      await loadOverview();
      await loadRows();
    } catch (reviewError) {
      setError(
        reviewError?.message || "Could not review the application."
      );
    }
  }
  function toLocalDateTimeInput(value) {
    if (!value) return "";

    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
  }

  function buildVotingQrUrl(token) {
    const url = new URL(window.location.href);

    url.search = "";
    url.hash = "";
    url.searchParams.set("vote", token);

    return url.toString();
  }

  async function generateVotingQr() {
    if (!supabase || !votingMatchId) return;

    // 1. Confirm that the voting session has been created.
    if (!votingData?.session?.id) {
      setError("Save the participant list first to create the voting session.");
      return;
    }

    // 2. Get currently selected participants.
    const selectedIds = (votingData.candidates || [])
      .filter((candidate) => candidate.selected)
      .map((candidate) => candidate.registration_id);

    // 3. Get participants already saved in the database.
    const savedIds = votingData.selected_registration_ids || [];

    // 4. Confirm that selected participants match saved participants.
    const participantsMatch =
      selectedIds.length === savedIds.length &&
      savedIds.every((id) => selectedIds.includes(id));

    if (!participantsMatch || savedIds.length === 0) {
      setError("Save the selected participants before generating the QR code.");
      return;
    }

    // 5. Validate voting schedule.
    if (!votingScheduledOpenAt || !votingScheduledCloseAt) {
      setError("Choose both voting opening and closing times.");
      return;
    }

    if (
      new Date(votingScheduledCloseAt) <=
      new Date(votingScheduledOpenAt)
    ) {
      setError("Closing time must be later than opening time.");
      return;
    }

    setVotingQrGenerating(true);
    setError("");
    setNotice("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_generate_match_voting_qr",
        {
          p_match_id: votingMatchId,
          p_scheduled_open_at: new Date(
            votingScheduledOpenAt
          ).toISOString(),
          p_scheduled_close_at: new Date(
            votingScheduledCloseAt
          ).toISOString(),
        }
      );

      if (error) throw error;

      if (!data?.success || !data?.qr_token) {
        throw new Error(data?.message || "QR generation failed.");
      }

      await loadVoting(votingMatchId);

      setVotingQrToken(data.qr_token);
      setVotingQrUrl(buildVotingQrUrl(data.qr_token));

      setNotice("Voting QR generated successfully.");
    } catch (err) {
      setError(err.message || "Could not generate voting QR.");
    } finally {
      setVotingQrGenerating(false);
    }
  }


  async function revokeVotingQr() {
    if (!supabase || !votingMatchId) return;

    if (!window.confirm("Are you sure you want to revoke this voting QR?")) {
      return;
    }

    setVotingQrRevoking(true);
    setError("");
    setNotice("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_revoke_match_voting_qr",
        { p_match_id: votingMatchId }
      );

      if (error) throw error;

      setVotingQrToken("");
      setVotingQrUrl("");

      setNotice(data?.message || "Voting QR revoked successfully.");
      await loadVoting(votingMatchId);
    } catch (err) {
      setError(err.message || "Could not revoke voting QR.");
    } finally {
      setVotingQrRevoking(false);
    }
  }

  const loadVotingMonitor = useCallback(async (matchId) => {
    if (!supabase || !matchId) {
      setVotingMonitor(null);
      setVotingMonitorError("");
      return;
    }

    setVotingMonitorLoading(true);
    setVotingMonitorError("");

    try {
      const { data, error: monitorError } = await supabase.rpc(
        "admin_get_match_voting_monitor",
        { p_match_id: matchId }
      );

      if (monitorError) throw monitorError;
      setVotingMonitor(data);
    } catch (err) {
      setVotingMonitor(null);
      setVotingMonitorError(
        err?.message || "Could not load live voting participation."
      );
    } finally {
      setVotingMonitorLoading(false);
    }
  }, []);

  async function loadVoting(matchId) {
    if (!supabase || !matchId) {
      setVotingData(null);
      setVotingMonitor(null);
      setVotingMonitorError("");
      return;
    }

    setVotingLoading(true);
    setError("");
    setNotice("");

    try {
      const { data, error: votingError } = await supabase.rpc(
        "admin_get_match_voting",
        { p_match_id: matchId }
      );

      if (votingError) throw votingError;

      setVotingData(data);
      await loadVotingMonitor(matchId);
      setVotingScheduledOpenAt(
        toLocalDateTimeInput(data?.session?.scheduled_open_at)
      );

      setVotingScheduledCloseAt(
        toLocalDateTimeInput(data?.session?.scheduled_close_at)
      );

      setVotingQrToken("");
      setVotingQrUrl("");
    } catch (loadError) {
      setVotingData(null);
      setError(loadError?.message || "Could not load voting information.");
    } finally {
      setVotingLoading(false);
    }
  }
  function selectVotingMatch(matchId) {
    setVotingMatchId(matchId);
    setVotingData(null);
    setVotingMonitor(null);
    setVotingMonitorError("");
    setError("");
    setNotice("");

    if (matchId) {
      loadVoting(matchId);
    }
  }

  function toggleVotingParticipant(registrationId) {
    setVotingData((current) => {
      if (!current) return current;

      return {
        ...current,
        candidates: current.candidates.map((candidate) =>
          candidate.registration_id === registrationId
            ? { ...candidate, selected: !candidate.selected }
            : candidate
        ),
      };
    });
  }


  async function saveVotingParticipants() {
    if (!supabase || !votingMatchId || !votingData) return;

    const currentStatus = votingData.session?.status || "draft";

    if (currentStatus !== "draft") {
      setError("Participants can only be changed while voting is in Draft.");
      return;
    }

    const selectedIds = votingData.candidates
      .filter((candidate) => candidate.selected)
      .map((candidate) => candidate.registration_id);

    if (selectedIds.length === 0) {
      setError("Select at least one voting participant.");
      return;
    }

    setVotingSaving(true);
    setError("");
    setNotice("");

    try {
      const { data, error: saveError } = await supabase.rpc(
        "admin_save_match_voting_participants",
        {
          p_match_id: votingMatchId,
          p_registration_ids: selectedIds,
        }
      );

      if (saveError) throw saveError;

      if (!data) {
        throw new Error("Voting session was not created successfully.");
      }

      await loadVoting(votingMatchId);

      setNotice(
        "Voting session and participant list saved successfully. You can now generate the QR code."
      );
    } catch (saveError) {
      setError(
        saveError?.message ||
        "Could not create the voting session or save participants."
      );
    } finally {
      setVotingSaving(false);
    }
  }


  async function changeVotingStatus(newStatus) {
    if (!supabase || !votingMatchId) return;

    setVotingSaving(true);
    setError("");
    setNotice("");

    try {
      const { data, error: statusError } = await supabase.rpc(
        "admin_set_match_voting_status",
        {
          p_match_id: votingMatchId,
          p_new_status: newStatus,
        }
      );

      if (statusError) throw statusError;

      await loadVoting(votingMatchId);

      setNotice(
        data === "open"
          ? "Voting is now open for this match."
          : "Voting has been closed for this match."
      );
    } catch (statusError) {
      setError(
        statusError?.message || "Could not update the voting status."
      );
    } finally {
      setVotingSaving(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (
      section !== "voting" ||
      !votingMatchId ||
      votingData?.session?.status !== "open"
    ) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadVotingMonitor(votingMatchId);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [
    section,
    votingMatchId,
    votingData?.session?.status,
    loadVotingMonitor,
  ]);

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
    setLogoFile(null);
  }

  function beginCreate() {
    setError("");
    setNotice("");

    if (section === "approved_player_profiles") {
      setEditing({ mode: "create", primaryKey: "id" });
      setDraft({
        registration_id: "",
        football_name: "",
        full_name: "",
        jersey_number: "",
        photo_path: "",
        club_id: "",
        club_name: "",
        position: "",
        is_published: false,
      });
      return;
    }


    if (section === "clubs") {
      setLogoFile(null);
      setEditing({ mode: "create", primaryKey: "id" });
      setDraft({
        name: "",
        short_name: "",
        slug: "",
        description: "",
        logo_path: "",
      });
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
        home_coach_roster_id: "",
        away_coach_roster_id: "",
        referee_1_roster_id: "",
        referee_2_roster_id: "",
        referee_3_roster_id: "",
        match_started_at: "",
        clock_phase: "not_started",
        clock_elapsed_seconds: 0,
        clock_started_at: "",
        first_half_added_minutes: 0,
        second_half_added_minutes: 0,
        updated_by: user?.id || "",
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

    if (section === "match_events") {
      setEditing({ mode: "create" });

      setDraft({
        match_id: "",
        club_id: "",
        player_registration_id: "",
        assist_registration_id: "",
        event_type: "goal",
        minute: "",
        notes: "",
        created_by: user?.id || "",
      });

      return;
    }



    if (["approved_roster", "coaches", "referees"].includes(section)) {
      setEditing({ mode: "create" });
      setDraft({
        club_id: "",
        role: section === "coaches"
          ? "coach"
          : section === "referees"
            ? "referee"
            : "player",
        full_name: "",
        position_or_specialty: "",
        experience: "",
        status: "Approved",
        is_published: false,
      });
      return;
    }

    if (section === "suspensions") {
      setEditing({ mode: "create" });

      setDraft({
        player_registration_id: "",
        jersey_number: "",
        club_id: "",
        competition: "",
        season: "",
        reason: "",
        source_match_id: "",
        matches_total: "",
        matches_served: "0",
        status: "active",
        notes: "",
        created_by: user?.id || "",
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
    if (section === "suspensions") {
      const player = overview.registrations.find(
        (item) => item.id === row.player_registration_id
      );

      next.jersey_number = player?.jersey_number ?? "";
    }

    setEditing({ mode: "edit", row, primaryKey });
    setDraft(next);
  }

  function renderDraftField(key, value) {

    const update = (nextValue) => {
      setDraft((old) => {
        const next = { ...old, [key]: nextValue };

        if (section === "match_events" && key === "event_type") {
          next.player_registration_id = "";
          next.assist_registration_id = "";
        }


        if (section === "approved_player_profiles" && key === "registration_id") {
          const registration = overview.registrations.find(
            (item) => item.id === nextValue
          );

          if (registration) {
            next.football_name =
              registration.football_name || registration.full_name || "Player";
            next.full_name = registration.full_name || "";
            next.jersey_number = registration.jersey_number ?? "";
            next.photo_path = registration.photo_path || "";
            next.club_id = registration.club_id || "";
            next.club_name = registration.club_name || "";
            next.position = registration.position_or_specialty || "";
          }
        }

        if (key === "match_id") {
          const match = overview.matches.find((item) => item.id === nextValue);
          if (match && next.club_id &&
            ![match.home_club_id, match.away_club_id].includes(next.club_id)) {
            next.club_id = "";
            next.player_registration_id = "";
          }
        }



        if (section === "suspensions" && key === "player_registration_id") {
          const player = overview.registrations.find(
            (item) => item.id === nextValue
          );

          next.club_id = player?.club_id || "";
          next.jersey_number = player?.jersey_number ?? "";
        }

        if (section === "suspensions" && key === "club_id") {
          next.player_registration_id = "";
          next.jersey_number = "";
        }


        if (
          key === "club_id" &&
          ["match_lineups", "match_events"].includes(section)
        ) {
          next.player_registration_id = "";
          next.jersey_number = "";
        }
        if (key === "home_club_id" || key === "away_club_id") {
          const coachKey =
            key === "home_club_id"
              ? "home_coach_roster_id"
              : "away_coach_roster_id";

          const coach = overview.roster.find(
            (person) =>
              person.club_id === nextValue &&
              String(person.role || "").toLowerCase() === "coach" &&
              String(person.status || "").toLowerCase() === "approved"
          );

          next[coachKey] = coach?.id || "";
        }

        if (
          key === "referee_1_roster_id" ||
          key === "referee_2_roster_id" ||
          key === "referee_3_roster_id"
        ) {
          // Clear duplicate assignments if a referee is changed.
          const refereeKeys = [
            "referee_1_roster_id",
            "referee_2_roster_id",
            "referee_3_roster_id",
          ];

          const selectedReferee = nextValue;

          refereeKeys.forEach((refereeKey) => {
            if (
              refereeKey !== key &&
              next[refereeKey] === selectedReferee
            ) {
              next[refereeKey] = "";
            }
          });
        }

        if (key === "home_club_id" && next.away_club_id === nextValue) {
          next.away_club_id = "";
        }
        if (key === "away_club_id" && next.home_club_id === nextValue) {
          next.home_club_id = "";
        }
        if (section === "match_lineups" && key === "player_registration_id") {
          const player = overview.registrations.find(
            (item) => item.id === nextValue
          );

          next.jersey_number = player?.jersey_number ?? "";
        }
        return next;
      });
    };



    const field = (control) => (
      <label className="admin-field">
        <span>
          {section === "approved_player_profiles" && key === "is_published"
            ? "Publish profile publicly"
            : labelize(key)}
        </span>
        {control}
      </label>
    );

    if (section === "clubs" && key === "logo_path") {
      return (
        <label className="admin-field">
          <span>Club logo</span>

          {value && (
            <AdminImage
              path={value}
              alt="Current club logo"
              className="admin-club-logo"
            />
          )}

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              setLogoFile(event.target.files?.[0] || null);
            }}
          />

          {logoFile && (
            <small>Selected: {logoFile.name}</small>
          )}

          <small>Choose a JPG, PNG or WebP image, up to 5 MB.</small>
        </label>
      );
    }


    const select = (options, placeholder = "Select...") => (
      <select value={value ?? ""} onChange={(event) => update(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    );
    if (section === "match_events" && key === "event_type") {
      const eventOptions = [
        { value: "goal", label: "Goal (+5 points)" },
        { value: "own_goal", label: "Own Goal (-2 points)" },
        { value: "penalty_missed", label: "Penalty Missed" },
        { value: "penalty_save", label: "Penalty Save (+5 points)" },
        { value: "clean_sheet", label: "Clean Sheet (+7 points)" },
        { value: "yellow_card", label: "Yellow Card (-1 point)" },
        { value: "red_card", label: "Red Card (-3 points)" },
        { value: "substitution", label: "Substitution" },
        { value: "injury", label: "Injury" },
        { value: "other", label: "Other" },
      ];

      return field(
        select(eventOptions, "Select event type")
      );
    }
    if (section === "suspensions" && key === "club_id") {
      return field(
        select(
          clubs.map((club) => ({
            value: club.id,
            label: club.name,
          })),
          "Select club"
        )
      );
    }


    if (section === "suspensions" && key === "player_registration_id") {
      const players = overview.registrations.filter(
        (player) =>
          player.club_id === draft.club_id &&
          String(player.role || "").toLowerCase() === "player" &&
          String(player.status || "").toLowerCase() === "approved"
      );

      return field(
        select(
          players.map((player) => ({
            value: player.id,
            label: `${player.football_name || player.full_name || "Player"}${player.jersey_number != null
              ? ` (#${player.jersey_number})`
              : ""
              }`,
          })),
          draft.club_id ? "Select player" : "Select club first"
        )
      );
    }

    if (section === "suspensions" && key === "jersey_number") {
      return field(
        <input
          value={value ?? ""}
          readOnly
          placeholder="Auto-filled from player"
        />
      );
    }


    if (section === "matches") {
      if (
        [
          "clock_phase",
          "clock_elapsed_seconds",
          "clock_started_at",
          "first_half_added_minutes",
          "second_half_added_minutes",
        ].includes(key)
      ) {
        return null;
      }
      if (
        key === "home_coach_roster_id" ||
        key === "away_coach_roster_id"
      ) {
        const clubId =
          key === "home_coach_roster_id"
            ? draft.home_club_id
            : draft.away_club_id;

        const coaches = overview.roster.filter(
          (person) =>
            person.club_id === clubId &&
            String(person.role || "").toLowerCase() === "coach" &&
            String(person.status || "").toLowerCase() === "approved"
        );

        return field(
          select(
            coaches.map((person) => ({
              value: person.id,
              label: getFootballName(
                person,
                overview.profiles,
                overview.registrations
              ),
            })),
            clubId ? "Select approved coach" : "Select the club first"
          )
        );
      }

      if (key.startsWith("referee_") && key.endsWith("_roster_id")) {
        const refereeKeys = [
          "referee_1_roster_id",
          "referee_2_roster_id",
          "referee_3_roster_id",
        ];

        const referees = overview.roster.filter((person) => {
          const isApprovedReferee =
            String(person.role || "").trim().toLowerCase() === "referee" &&
            String(person.status || "").trim().toLowerCase() === "approved";

          const selectedElsewhere = refereeKeys.some(
            (otherKey) => otherKey !== key && draft[otherKey] === person.id
          );

          return isApprovedReferee && !selectedElsewhere;
        });

        return field(
          select(
            referees.map((person) => ({
              value: person.id,
              label: getFootballName(
                person,
                overview.profiles,
                overview.registrations
              ),
            })),
            "Select an approved referee"
          )
        );
      }

      if (key === "match_started_at") {
        return field(
          <input
            type="datetime-local"
            value={toLocalDateTimeInput(value)}
            onChange={(event) => update(event.target.value)}
          />
        );
      }

      if (key === "updated_by") {
        return field(
          <select
            value={user?.id || ""}
            disabled
            aria-label="Administrator updating fixture"
          >
            <option value={user?.id || ""}>
              {overview.admins.find(
                (admin) => admin.user_id === user?.id
              )?.display_name || user?.email || "Signed-in administrator"}
            </option>
          </select>
        );
      }
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
            label: `${getFootballName(player, overview.profiles, overview.registrations)}${player.jersey_number != null ? ` (#${player.jersey_number})` : ""}`,
          })),
          "Select approved player"
        ));
      }

      if (key === "position") {
        return field(
          select(
            PLAYER_POSITIONS.map((position) => ({
              value: position,
              label: position,
            })),
            "Select player position"
          )
        );
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
          <input
            type="number"
            min="1"
            max="99"
            value={value ?? ""}
            readOnly
            placeholder="Auto-filled from registration"
          />
        );
      }
    }

    if (section === "match_events" && key === "player_registration_id") {
      const goalkeeperEvent = ["clean_sheet", "penalty_save"].includes(
        String(draft.event_type || "").toLowerCase()
      );

      const approvedPlayers = overview.registrations.filter((player) =>
        ["approved", "accepted"].includes(
          String(player.status || "").trim().toLowerCase()
        ) &&
        String(player.role || "").trim().toLowerCase() === "player" &&
        (!draft.club_id || player.club_id === draft.club_id)
      );

      const players = goalkeeperEvent
        ? approvedPlayers.filter((player) =>
          overview.profiles.some(
            (profile) =>
              profile.registration_id === player.id &&
              profile.club_id === player.club_id &&
              profile.is_published === true &&
              ["goalkeeper", "goal keeper", "gk"].includes(
                String(profile.position || "").trim().toLowerCase()
              )
          )
        )
        : approvedPlayers;

      return field(select(
        players.map((player) => {
          const profile = overview.profiles.find(
            (item) => item.registration_id === player.id
          );

          return {
            value: player.id,
            label:
              profile?.football_name ||
              player.football_name ||
              player.full_name ||
              player.id,
          };
        }),
        goalkeeperEvent
          ? "Select goalkeeper"
          : "Optional: select player"
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


    if (key === "assist_registration_id") {
      if (draft.event_type !== "goal") {
        return null;
      }

      const players = overview.registrations.filter(
        (player) =>
          String(player.role || "").trim().toLowerCase() === "player" &&
          ["approved", "accepted"].includes(
            String(player.status || "").trim().toLowerCase()
          ) &&
          player.club_id === draft.club_id &&
          player.id !== draft.player_registration_id
      );

      return field(
        select(
          players.map((player) => ({
            value: player.id,
            label: player.football_name || player.full_name || player.id,
          })),
          "Optional: select assisting player"
        )
      );
    }




    if (section === "approved_player_profiles") {
      if (key === "registration_id") {
        const linkedIds = new Set(
          rows
            .filter((profile) => profile.registration_id && profile.id !== editing?.row?.id)
            .map((profile) => profile.registration_id)
        );

        const availableRegistrations = overview.registrations.filter(
          (registration) =>
            String(registration.role || "").trim().toLowerCase() === "player" &&
            String(registration.status || "").trim().toLowerCase() === "approved" &&
            (!linkedIds.has(registration.id) || registration.id === value)
        );

        return field(
          select(
            availableRegistrations.map((registration) => ({
              value: registration.id,
              label: `${registration.football_name || registration.full_name || "Player"} · #${registration.jersey_number ?? "—"} · ${registration.club_name || "Club"}`,
            })),
            "Select approved registration"
          )
        );
      }

      if (key === "football_name" || key === "full_name" || key === "position" || key === "club_name" || key === "photo_path") {
        return field(
          <input
            value={value ?? ""}
            onChange={(event) => update(event.target.value)}
            placeholder={labelize(key)}
          />
        );
      }

      if (key === "jersey_number") {
        return field(
          <input
            type="number"
            min="1"
            max="99"
            step="1"
            value={value ?? ""}
            onChange={(event) => update(event.target.value)}
          />
        );
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
      const player = draft.player_registration_id
        ? overview.registrations.find(
          (item) => item.id === draft.player_registration_id
        )
        : null;

      const assist = draft.assist_registration_id
        ? overview.registrations.find(
          (item) => item.id === draft.assist_registration_id
        )
        : null;

      const approvedPlayer = (person) =>
        person &&
        person.club_id === draft.club_id &&
        String(person.role || "").trim().toLowerCase() === "player" &&
        ["approved", "accepted"].includes(
          String(person.status || "").trim().toLowerCase()
        );

      if (draft.player_registration_id && !approvedPlayer(player)) {
        setError("Select an approved player belonging to the selected club.");
        return;
      }

      if (draft.assist_registration_id) {
        if (!approvedPlayer(assist)) {
          setError("The assisting player must belong to the selected club and be approved.");
          return;
        }

        if (assist.id === draft.player_registration_id) {
          setError("The scorer and assisting player must be different.");
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
      if (section === "match_events") {
        const goalkeeperEvent = ["clean_sheet", "penalty_save"].includes(
          String(draft.event_type || "").trim().toLowerCase()
        );
        if (draft.minute !== "" && draft.minute != null) {
          const minute = Number(draft.minute);

          if (!Number.isInteger(minute) || minute < 1 || minute > 130) {
            setError("Event minute must be a whole number between 1 and 130.");
            return;
          }
        }
        if (!draft.match_id || !draft.club_id || !draft.event_type) {
          setError("Select a match, club and event type.");
          return;
        }

        const match = overview.matches.find(
          (item) => item.id === draft.match_id
        );

        if (
          !match ||
          ![match.home_club_id, match.away_club_id].includes(draft.club_id)
        ) {
          setError("The selected club must belong to the selected match.");
          return;
        }

        if (goalkeeperEvent) {
          const goalkeeperRegistration = overview.registrations.find(
            (player) =>
              player.id === draft.player_registration_id &&
              player.club_id === draft.club_id &&
              String(player.role || "").trim().toLowerCase() === "player" &&
              ["approved", "accepted"].includes(
                String(player.status || "").trim().toLowerCase()
              )
          );

          const goalkeeperProfile = overview.profiles.find(
            (profile) =>
              profile.registration_id === draft.player_registration_id &&
              profile.club_id === draft.club_id &&
              profile.is_published === true &&
              ["goalkeeper", "goal keeper", "gk"].includes(
                String(profile.position || "").trim().toLowerCase()
              )
          );

          if (!goalkeeperRegistration || !goalkeeperProfile) {
            setError(
              "Select an approved goalkeeper belonging to the selected club."
            );
            return;
          }
        }
      }


      let payload = {};


      if (section === "approved_player_profiles") {
        const registration = overview.registrations.find(
          (item) => item.id === draft.registration_id
        );

        if (
          !draft.registration_id ||
          !registration ||
          String(registration.role || "").trim().toLowerCase() !== "player" ||
          String(registration.status || "").trim().toLowerCase() !== "approved"
        ) {
          setError("Select a valid approved player registration.");
          return;
        }

        if (!String(draft.football_name || "").trim()) {
          setError("Enter the player's football name.");
          return;
        }

        const number = Number(draft.jersey_number);
        if (
          draft.jersey_number === "" ||
          !Number.isInteger(number) ||
          number < 1 ||
          number > 99
        ) {
          setError("Jersey number must be a whole number between 1 and 99.");
          return;
        }
      }


      Object.entries(draft).forEach(([key, value]) => {

        if (
          ["id", "uuid", "created_at", "updated_at", "reviewed_at", "reviewed_by"]
            .includes(key)
        ) {
          return;
        }


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

      if (["approved_roster", "coaches", "referees"].includes(section)) {
        payload = {
          club_id: draft.club_id || null,
          role:
            section === "coaches"
              ? "coach"
              : section === "referees"
                ? "referee"
                : String(draft.role || "player").trim(),
          full_name: String(draft.full_name || "").trim(),
          position_or_specialty: draft.position_or_specialty || null,
          experience: draft.experience || null,
          status: String(draft.status || "approved").trim(),
          is_published:
            draft.is_published === true || draft.is_published === "true",
        };

        if (!payload.club_id || !payload.full_name || !payload.role) {
          setError("Select a club and enter the member's full name and role.");
          return;
        }
      }

      if (section === "approved_player_profiles") {
        payload = {
          registration_id: draft.registration_id,
          football_name: String(draft.football_name || "").trim(),
          full_name: String(draft.full_name || "").trim() || null,
          jersey_number: Number(draft.jersey_number),
          photo_path: String(draft.photo_path || "").trim() || null,
          club_id: draft.club_id,
          club_name: String(draft.club_name || "").trim() || null,
          position: String(draft.position || "").trim() || null,
          is_published:
            draft.is_published === true || draft.is_published === "true",
        };

        if (!payload.club_id) {
          setError("The selected player must have an assigned club.");
          return;
        }
      }




      if (section === "clubs") {
        const name = String(draft.name ?? "").trim();
        const shortName = String(draft.short_name ?? "").trim();
        const slug = slugify(draft.slug || name);
        const description = String(draft.description ?? "").trim();

        if (!name || !shortName || !slug || !description) {
          setError("Complete the club name, short name, slug and description.");
          return;
        }

        let logoPath = String(draft.logo_path || "").trim() || null;

        if (logoFile) {
          const uploadedPath = await uploadImage(logoFile, "club-logos");
          logoPath = uploadedPath;
        }

        payload = {
          name,
          short_name: shortName,
          slug,
          description,
          logo_path: logoPath,
        };
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

        if (
          !draft.competition ||
          !draft.season ||
          !draft.home_club_id ||
          !draft.away_club_id
        ) {
          setError("Complete the competition, season and both clubs.");
          return;
        }

        if (draft.home_club_id === draft.away_club_id) {
          setError("Home and away clubs must be different.");
          return;
        }

        const refereeIds = [
          draft.referee_1_roster_id,
          draft.referee_2_roster_id,
          draft.referee_3_roster_id,
        ].filter(Boolean);

        // Referees are optional, but selected referees must be different.
        if (new Set(refereeIds).size !== refereeIds.length) {
          setError("Each assigned referee must be a different person.");
          return;
        }

        // Coach and referee assignments are optional.
        // A match can be saved without either assignment.


        payload.notes = String(draft.notes ?? "").trim();

        payload.venue =
          String(draft.venue ?? "").trim() || DEFAULT_VENUE;

        payload.kickoff_at = kickoffDate.toISOString();

        const startedAt = draft.match_started_at
          ? new Date(draft.match_started_at)
          : null;

        if (startedAt && Number.isNaN(startedAt.getTime())) {
          setError("Enter a valid match start date and time.");
          return;
        }

        payload.match_started_at = startedAt
          ? startedAt.toISOString()
          : null;

        payload.updated_by = user?.id || null;

        payload.home_score =
          draft.home_score === "" || draft.home_score == null
            ? null
            : Number(draft.home_score);

        payload.away_score =
          draft.away_score === "" || draft.away_score == null
            ? null
            : Number(draft.away_score);

        if (
          (payload.home_score != null &&
            (!Number.isInteger(payload.home_score) ||
              payload.home_score < 0)) ||
          (payload.away_score != null &&
            (!Number.isInteger(payload.away_score) ||
              payload.away_score < 0))
        ) {
          setError("Scores must be non-negative whole numbers.");
          return;
        }
      }



      // Save the record to Supabase.
      const primaryKey =
        editing.primaryKey || getPrimaryKey(section, editing.row);

      let saveQuery;

      const targetTable = ["coaches", "referees"].includes(section)
        ? "approved_roster"
        : section;

      if (["coaches", "referees"].includes(section)) {
        payload.role = section === "coaches" ? "coach" : "referee";
      }

      if (editing.mode === "create") {
        saveQuery = supabase.from(targetTable).insert(payload);
      } else {
        if (!primaryKey || editing.row?.[primaryKey] == null) {
          throw new Error("Cannot update this record: its primary key is missing.");
        }

        saveQuery = supabase
          .from(targetTable)
          .update(payload)
          .eq(primaryKey, editing.row[primaryKey]);
      }

      const { data: savedData, error: saveError } = await saveQuery.select();

      if (saveError) throw saveError;

      if (editing.mode === "edit" && (!savedData || savedData.length === 0)) {
        throw new Error(
          "No record was updated. Check your Supabase permissions and Row Level Security policies."
        );
      }


      setEditing(null);
      setDraft({});
      setLogoFile(null);

      setNotice(
        editing.mode === "create"
          ? "Record created successfully."
          : "Record updated successfully."
      );

      await loadRows();
    } catch (saveError) {
      setError(saveError?.message || "Could not save the record.");
    } finally {
      setSaving(false);
    }
  }

  async function controlMatchClock(match, action, minutes = null) {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const now = new Date().toISOString();
    let updates = {};

    switch (action) {
      case "start_first_half":
        updates = {
          clock_phase: "first_half",
          clock_elapsed_seconds: 0,
          clock_started_at: now,
          match_started_at: now,
          status: "Live",
          updated_by: user?.id || null,
        };
        break;

      case "half_time":
        updates = {
          clock_phase: "halftime",
          clock_elapsed_seconds: 45 * 60,
          clock_started_at: null,
          status: "Live",
          updated_by: user?.id || null,
        };
        break;

      case "start_second_half":
        updates = {
          clock_phase: "second_half",
          clock_elapsed_seconds: 45 * 60,
          clock_started_at: now,
          status: "Live",
          updated_by: user?.id || null,
        };
        break;

      case "complete":
        updates = {
          clock_phase: "completed",
          clock_elapsed_seconds: 90 * 60,
          clock_started_at: null,
          status: "Completed",
          updated_by: user?.id || null,
        };
        break;

      case "set_added_time": {
        const addedMinutes = Number(minutes);

        if (
          !Number.isInteger(addedMinutes) ||
          addedMinutes < 0 ||
          addedMinutes > 20
        ) {
          setError("Added time must be a whole number from 0 to 20.");
          return;
        }

        if (match.clock_phase === "halftime" || match.clock_phase === "second_half") {
          updates = { second_half_added_minutes: addedMinutes };
        } else if (
          match.clock_phase === "first_half" ||
          match.clock_phase === "not_started"
        ) {
          updates = { first_half_added_minutes: addedMinutes };
        } else {
          setError("Added time cannot be changed after the match is completed.");
          return;
        }
        break;
      }

      default:
        setError("Unknown clock action.");
        return;
    }

    setError("");
    setNotice("");

    try {
      const { error: updateError } = await supabase
        .from("matches")
        .update(updates)
        .eq("id", match.id);

      if (updateError) throw updateError;

      setNotice("Match clock updated successfully.");
      await loadRows();
    } catch (clockError) {
      setError(clockError?.message || "Could not update the match clock.");
    }
  }

  async function deleteRow(row) {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const primaryKey = getPrimaryKey(section, row);

    if (!primaryKey || row?.[primaryKey] == null) {
      setError("Cannot delete this record because its primary key is missing.");
      return;
    }

    const recordName =
      row.full_name ||
      row.name ||
      row.competition ||
      row.display_name ||
      row[primaryKey];

    if (
      !window.confirm(
        `Are you sure you want to delete "${recordName}" from ${section}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const targetTable = ["coaches", "referees"].includes(section)
        ? "approved_roster"
        : section;

      const { data, error: deleteError } = await supabase
        .from(targetTable)
        .delete()
        .eq(primaryKey, row[primaryKey])
        .select();

      if (deleteError) throw deleteError;

      if (!data || data.length === 0) {
        throw new Error(
          "No record was deleted. Check your Supabase permissions and Row Level Security policies."
        );
      }

      setNotice("Record deleted successfully.");
      await loadRows();
    } catch (deleteError) {
      setError(deleteError?.message || "Could not delete the record.");
    }
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
    setLogoFile(null);

    if (nextSection === "voting" && votingMatchId) {
      loadVoting(votingMatchId);
    }
  }

  const canAdd = [
    "clubs",
    "approved_roster",
    "coaches",
    "referees",
    "approved_player_profiles",
    "matches",
    "match_lineups",
    "match_events",
    "suspensions",
    "admin_users",
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
            <span className="admin-avatar">
              {(user?.email || "A").slice(0, 1).toUpperCase()}
            </span>
            <span>{user?.email || "Administrator"}</span>
            <span
              style={{
                fontSize: "11px",
                overflowWrap: "anywhere",
                maxWidth: "250px",
              }}
            >
              User ID: {user?.id || "No user ID found"}
            </span>
          </div>
        </header>

        <div className="admin-page-heading">
          <div>
            <h2>{page?.label || "Admin dashboard"}</h2>
            <p>{page?.description}</p>
          </div>
          {canAdd && (
            <button
              type="button"
              className="primary-button"
              onClick={beginCreate}
            >
              {section === "clubs"
                ? "+ Add club"
                : section === "admin_users"
                  ? "+ Authorize admin"
                  : "+ Add record"}
            </button>
          )}
        </div>

        {error && (
          <p className="admin-alert error" role="alert">{error}</p>
        )}
        {notice && (
          <p className="admin-alert success" role="status">{notice}</p>
        )}
        {editing && (
          <div className="admin-editor-card">
            <form className="admin-editor-form" onSubmit={saveDraft}>
              <div className="admin-table-toolbar">
                <h3>
                  {editing.mode === "create"
                    ? `Add ${section === "matches" ? "match" : section === "match_events" ? "match event" : "record"}`
                    : `Edit ${section === "matches" ? "match" : section === "match_events" ? "match event" : "record"}`}
                </h3>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Close
                </button>
              </div>

              <div className="admin-editor-grid">
                {Object.entries(draft).map(([key, value]) => (
                  <div key={key}>
                    {renderDraftField(key, value)}
                  </div>
                ))}
              </div>

              <div className="admin-editor-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editing.mode === "create"
                      ? "Create record"
                      : "Save changes"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {section === "overview" && (
          <div className="admin-table-card">
            <div className="admin-table-toolbar">
              <strong>League overview</strong>
              <button
                type="button"
                className="secondary-button"
                onClick={loadRows}
              >
                Refresh
              </button>
            </div>
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
                [
                  "Active suspensions",
                  overview.suspensions.filter(
                    (item) =>
                      String(item.status).toLowerCase() === "active"
                  ).length,
                ],
              ].map(([label, value]) => (
                <div className="admin-stat" key={label}>
                  <span>{label}</span>
                  <strong>{loading ? "…" : value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "standings" && (
          <div className="admin-table-card">
            <div className="admin-table-toolbar">
              <span>3 points for a win · 1 point for a draw</span>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  exportRows("manav-rachna-league-standings.csv", standings)
                }
              >
                Export standings CSV
              </button>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    {[
                      "Pos", "Club", "Played", "Won", "Drawn",
                      "Lost", "GF", "GA", "GD", "Points",
                    ].map((heading) => (
                      <th key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.club_id}>
                      <td>{row.position}</td>
                      <td>{row.club_name}</td>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td>{row.gf}</td>
                      <td>{row.ga}</td>
                      <td>{row.gd}</td>
                      <td><strong>{row.points}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "reports" && (
          <div className="admin-table-card">
            <div className="admin-table-toolbar">
              <strong>Download reports</strong>
              <button
                type="button"
                className="secondary-button"
                onClick={loadRows}
              >
                Refresh report data
              </button>
            </div>
            {[
              ["Clubs", "clubs", overview.clubs],
              ["Approved roster", "approved-roster", overview.roster],
              ["Player profiles", "player-profiles", overview.profiles],
              ["Registrations", "registrations", overview.registrations],
              ["Matches", "matches", overview.matches],
              ["Lineups", "lineups", overview.lineups],
              ["Match events", "match-events", overview.events],
              ["Standings", "standings", standings],
              ["Suspensions", "suspensions", overview.suspensions],
              ["Administrators", "admins", overview.admins],
            ].map(([label, filename, data]) => (
              <div className="admin-report-item" key={filename}>
                <strong>{label}</strong>
                <span>{data.length} records</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    exportRows(`mr-football-${filename}.csv`, data)
                  }
                >
                  Export CSV
                </button>
              </div>
            ))}
          </div>
        )}
        {section === "voting" && (
          <div className="admin-table-card voting-management">
            <div className="admin-table-toolbar">
              <strong>Match voting management</strong>

              <button
                type="button"
                className="secondary-button"
                disabled={!votingMatchId || votingLoading || votingSaving}
                onClick={() => loadVoting(votingMatchId)}
              >
                Refresh voting
              </button>
            </div>

            <div className="voting-match-selector">
              <label htmlFor="voting-match-select">
                Select match
              </label>

              <select
                id="voting-match-select"
                value={votingMatchId}
                onChange={(event) => selectVotingMatch(event.target.value)}
              >
                <option value="">Choose a match...</option>

                {[...overview.matches]
                  .sort(
                    (a, b) =>
                      new Date(b.kickoff_at || 0) -
                      new Date(a.kickoff_at || 0)
                  )
                  .map((match) => {
                    const home = clubs.find(
                      (club) => club.id === match.home_club_id
                    );
                    const away = clubs.find(
                      (club) => club.id === match.away_club_id
                    );

                    return (
                      <option key={match.id} value={match.id}>
                        {home?.name || "Home"} vs {away?.name || "Away"}
                        {" · "}
                        {match.kickoff_at
                          ? new Date(match.kickoff_at).toLocaleString()
                          : "Date not set"}
                      </option>
                    );
                  })}
              </select>
            </div>

            {!votingMatchId ? (
              <p className="admin-empty">
                Select a match to manage its voting participants.
              </p>
            ) : votingLoading ? (
              <p className="admin-empty">Loading voting information...</p>
            ) : !votingData ? (
              <p className="admin-empty">
                No voting information is available for this match.
              </p>
            ) : (
              <>
                <div className="voting-session-summary">
                  <div>
                    <span>Voting status</span>
                    <strong className={`voting-status ${votingData.session?.status || "draft"}`}>
                      {labelize(votingData.session?.status || "draft")}
                    </strong>
                  </div>

                  <div>
                    <span>Eligible candidates</span>
                    <strong>{votingData.candidates?.length || 0}</strong>
                  </div>

                  <div>
                    <span>Selected participants</span>
                    <strong>
                      <div>
                        <span>Selected participants (saved)</span>
                        <strong>
                          {votingData.selected_registration_ids?.length || 0}
                        </strong>
                      </div>
                    </strong>
                  </div>
                </div>

                <section className="voting-monitor-panel">
                  <div className="voting-group-heading">
                    <div>
                      <h3>Live voting participation</h3>
                      <p className="voting-help-text">
                        Shows who has submitted a ballot, not how anyone voted.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => loadVotingMonitor(votingMatchId)}
                      disabled={votingMonitorLoading}
                    >
                      {votingMonitorLoading ? "Refreshing..." : "Refresh participation"}
                    </button>
                  </div>

                  {votingMonitorError ? (
                    <p className="voting-help-text" role="alert">
                      Participation monitor unavailable: {votingMonitorError}
                      {" "}Confirm that the admin_get_match_voting_monitor SQL function
                      has been created successfully.
                    </p>
                  ) : votingMonitor ? (
                    <>
                      <div className="voting-session-summary voting-monitor-stats">
                        <div>
                          <span>Eligible voters</span>
                          <strong>{votingMonitor.total_eligible_voters ?? 0}</strong>
                        </div>
                        <div>
                          <span>Submitted ballots</span>
                          <strong>{votingMonitor.voted_count ?? 0}</strong>
                        </div>
                        <div>
                          <span>Not yet voted</span>
                          <strong>{votingMonitor.not_voted_count ?? 0}</strong>
                        </div>
                        <div>
                          <span>Participation</span>
                          <strong>
                            {Number(votingMonitor.participation_percentage ?? 0).toFixed(1)}%
                          </strong>
                        </div>
                      </div>

                      <div
                        className="voting-monitor-progress"
                        role="progressbar"
                        aria-label="Voting participation"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(
                          100,
                          Math.max(0, Number(votingMonitor.participation_percentage ?? 0))
                        )}
                        style={{
                          height: "10px",
                          width: "100%",
                          overflow: "hidden",
                          borderRadius: "999px",
                          background: "var(--border-color, #e5e7eb)",
                          margin: "12px 0 18px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(
                              100,
                              Math.max(0, Number(votingMonitor.participation_percentage ?? 0))
                            )}%`,
                            background: "var(--primary-color, #2563eb)",
                            borderRadius: "999px",
                            transition: "width 250ms ease",
                          }}
                        />
                      </div>

                      <div className="voting-group-heading">
                        <h3>Voter submission status</h3>
                        <span>
                          {votingMonitor.voters?.length || 0} eligible members
                        </span>
                      </div>

                      {(votingMonitor.voters || []).length === 0 ? (
                        <p className="admin-empty">
                          No eligible voters with active voting credentials were found.
                        </p>
                      ) : (
                        <div className="admin-table-scroll">
                          <table className="admin-data-table">
                            <thead>
                              <tr>
                                <th>Member</th>
                                <th>Role</th>
                                <th>Submission status</th>
                                <th>Submitted at</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(votingMonitor.voters || []).map((voter) => (
                                <tr key={voter.registration_id}>
                                  <td>{voter.display_name || "Unnamed member"}</td>
                                  <td>{labelize(voter.role || "member")}</td>
                                  <td>
                                    <span
                                      className={`voting-status ${voter.has_voted ? "submitted" : "not-submitted"
                                        }`}
                                    >
                                      {voter.has_voted ? "Voted" : "Not voted"}
                                    </span>
                                  </td>
                                  <td>
                                    {voter.submitted_at
                                      ? new Date(voter.submitted_at).toLocaleString()
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <p className="voting-help-text">
                        Latest submission:{" "}
                        {votingMonitor.last_activity
                          ? new Date(votingMonitor.last_activity).toLocaleString()
                          : "No ballots submitted yet"}
                        {votingData.session?.status === "open"
                          ? " · Automatically refreshes every 10 seconds while this section is open."
                          : ""}
                      </p>
                    </>
                  ) : (
                    <p className="admin-empty">
                      {votingMonitorLoading
                        ? "Loading participation information..."
                        : "Participation information is not available yet."}
                    </p>
                  )}
                </section>

                {["player", "coach", "referee"].map((role) => {
                  const roleCandidates = (votingData.candidates || []).filter(
                    (candidate) => candidate.participant_role === role
                  );

                  return (
                    <section className="voting-participant-group" key={role}>
                      <div className="voting-group-heading">
                        <h3>
                          {role === "player"
                            ? "Players"
                            : role === "coach"
                              ? "Coaches"
                              : "Referees"}
                        </h3>

                        <span>{roleCandidates.length} eligible</span>
                      </div>
                      {roleCandidates.length === 0 ? (
                        <p className="admin-empty">
                          No approved {role} candidates are available for this match.
                        </p>
                      ) : (
                        <div className="voting-candidate-list">
                          {roleCandidates.map((candidate) => (
                            <label
                              className={`voting-candidate-row ${candidate.selected ? "selected" : ""
                                }`}
                              key={candidate.registration_id}
                            >
                              <input
                                type="checkbox"
                                checked={candidate.selected === true}
                                disabled={
                                  votingSaving ||
                                  (votingData.session?.status || "draft") !== "draft"
                                }
                                onChange={() =>
                                  toggleVotingParticipant(
                                    candidate.registration_id
                                  )
                                }
                              />

                              <span className="voting-candidate-details">
                                <strong>{candidate.display_name}</strong>
                                <small>
                                  {candidate.club_name || "No club assigned"}
                                </small>
                              </span>

                              <span className="voting-role-label">
                                {labelize(candidate.participant_role)}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}

                <div className="voting-qr-panel">
                  <h3>Voting QR Code</h3>

                  <p>
                    Set the voting period, generate the QR code, and share it
                    with registered members through your WhatsApp group.
                  </p>

                  <div className="voting-schedule-fields">
                    <label>
                      Voting opening time
                      <input
                        type="datetime-local"
                        value={votingScheduledOpenAt}
                        onChange={(e) => setVotingScheduledOpenAt(e.target.value)}
                        disabled={
                          !["draft", "open"].includes(votingData.session?.status || "draft")
                        }
                      />
                    </label>

                    <label>
                      Voting closing time
                      <input
                        type="datetime-local"
                        value={votingScheduledCloseAt}
                        onChange={(e) => setVotingScheduledCloseAt(e.target.value)}
                        disabled={
                          !["draft", "open"].includes(votingData.session?.status || "draft")
                        }
                      />
                    </label>
                  </div>

                  <div className="voting-qr-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={generateVotingQr}

                      disabled={
                        votingQrGenerating ||
                        votingSaving ||
                        !votingData.session?.id ||
                        !votingData.selected_registration_ids?.length ||
                        !["draft", "open"].includes(
                          votingData.session?.status || "draft"
                        ) ||
                        !votingData.candidates?.some(
                          (candidate) => candidate.selected
                        )
                      }

                    >
                      {votingQrGenerating ? "Generating..." : "Generate / Replace QR"}
                    </button>

                    {votingQrToken && (
                      <button
                        type="button"
                        className="danger-link"
                        onClick={revokeVotingQr}
                        disabled={votingQrRevoking}
                      >
                        {votingQrRevoking ? "Revoking..." : "Revoke QR"}
                      </button>
                    )}
                  </div>


                  {votingQrUrl ? (
                    <div className="voting-qr-display">
                      <QRCodeSVG
                        value={votingQrUrl}
                        size={256}
                        level="H"
                        includeMargin
                      />

                      <h3>Scan to vote</h3>

                      <p>
                        Share this QR code with eligible members using WhatsApp.
                      </p>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(votingQrUrl);
                            setNotice("Voting link copied successfully.");
                          } catch (error) {
                            setError("Could not copy the link. Please copy it manually.");
                          }
                        }}
                      >
                        Copy voting link
                      </button>

                      <p className="voting-help-text">
                        Keep this QR code private to your intended voting group.
                        Generating a replacement invalidates the previous QR code.
                        The QR link is temporarily held in this admin session.
                        If you refresh the page, generate a replacement to obtain a new QR.
                      </p>
                    </div>
                  ) : (
                    <div className="voting-qr-empty">
                      <p>No QR code has been generated for this match yet.</p>
                      <p>
                        Set the opening and closing times, then select
                        <strong> Generate / Replace QR </strong>
                        to create one.
                      </p>
                    </div>
                  )}


                  {!votingQrUrl && votingData.session?.qr_generated_at && (
                    <p className="voting-help-text">
                      A QR code has previously been generated. Its original link
                      cannot be retrieved. Generate a replacement to display a new one.
                    </p>
                  )}
                </div>


                <div className="voting-management-actions">
                  {(votingData.session?.status || "draft") === "draft" && (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={saveVotingParticipants}
                        disabled={votingSaving || votingLoading}
                      >
                        {votingSaving ? "Saving..." : "Save participant list"}
                      </button>

                      {votingData.session?.id && (
                        <button
                          type="button"
                          className="voting-open-button"
                          disabled={
                            votingSaving ||
                            votingLoading ||
                            !votingData.selected_registration_ids?.length
                          }
                          onClick={() => changeVotingStatus("open")}
                        >
                          Open voting
                        </button>
                      )}
                    </>
                  )}

                  {votingData.session?.status === "open" && (
                    <button
                      type="button"
                      className="voting-close-button"
                      disabled={votingSaving || votingLoading}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Close voting for this match? Voters will no longer be able to submit or edit their ballots."
                          )
                        ) {
                          changeVotingStatus("closed");
                        }
                      }}
                    >
                      Close voting
                    </button>
                  )}

                  {votingData.session?.status === "closed" && (
                    <div className="voting-help-text">
                      <p>
                        Voting is closed. The participant list is locked.
                        Use the finalisation action to process the voting results.
                      </p>

                      <button
                        type="button"
                        className="primary-button"
                        disabled={votingSaving || votingLoading}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Retry VR finalisation for this closed match? Existing voting submissions will not be changed."
                            )
                          ) {
                            changeVotingStatus("closed");
                          }
                        }}
                      >
                        {votingSaving ? "Processing..." : "Recover / Finalise VR Results"}
                      </button>
                    </div>
                  )}

                  {votingData.session?.status === "finalised" && (
                    <p className="voting-help-text">
                      Voting has been finalised. This session is permanently locked.
                    </p>
                  )}
                </div>



                {votingData.session?.status === "open" && (
                  <p className="voting-help-text">
                    Voting is open. Close voting before changing the selected participants.
                  </p>
                )}

                {votingData.session?.status === "closed" && (
                  <p className="voting-help-text">
                    Voting is closed. You can edit the participant list or reopen voting.
                  </p>
                )}

                {votingData.session?.status === "draft" && (
                  <p className="voting-help-text">
                    Save at least one participant before opening voting.
                  </p>
                )}
              </>
            )}
          </div>
        )}
        {!["overview", "standings", "reports", "voting"].includes(section) && (
          <div className="admin-table-card">
            <div className="admin-table-toolbar">
              <input
                aria-label="Search records"
                placeholder={`Search ${page?.label?.toLowerCase() || "records"}…`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="admin-toolbar-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    exportRows(`mr-football-${section}.csv`, filteredRows)
                  }
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadRows}
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <p className="admin-empty">Loading records…</p>
            ) : filteredRows.length === 0 ? (
              <p className="admin-empty">No records found.</p>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      {columns.slice(0, 8).map((column) => (
                        <th key={column}>{labelize(column)}</th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, index) => (
                      <tr
                        key={row.id ?? row.user_id ?? row.uuid ?? index}
                      >


                        {columns.slice(0, 8).map((column) => (
                          <td key={column}>
                            {column === "photo_path" ? (
                              <AdminImage
                                path={row.photo_path}
                                alt={`${row.full_name || row.football_name || "Player"} photo`}
                                className="admin-player-photo"
                              />
                            ) : column === "logo_path" ? (
                              <AdminImage
                                path={row.logo_path}
                                alt={`${row.name || "Club"} logo`}
                                className="admin-club-logo"
                              />
                            ) : column === "club_id" ? (
                              (() => {
                                const club = clubs.find(
                                  (item) => String(item.id) === String(row.club_id)
                                );

                                return (
                                  <span className="admin-club-cell">
                                    {club?.logo_path && (
                                      <AdminImage
                                        path={club.logo_path}
                                        alt={`${club.name || "Club"} logo`}
                                        className="admin-club-logo"
                                      />
                                    )}
                                    <span>{club?.name || row.club_id || "—"}</span>
                                  </span>
                                );
                              })()
                            ) : (
                              String(row[column] ?? "—").slice(0, 90)
                            )}
                          </td>
                        ))}

                        <td>
                          <div className="admin-row-actions">
                            {section === "matches" && (
                              <div className="match-control-panel">
                                <div className="match-control-buttons">
                                  {(!row.clock_phase || row.clock_phase === "not_started") && (
                                    <button
                                      type="button"
                                      className="match-control-btn match-start-first"
                                      onClick={() => controlMatchClock(row, "start_first_half")}
                                    >
                                      <span aria-hidden="true">▶</span>
                                      Start 1st Half
                                    </button>
                                  )}

                                  {row.clock_phase === "first_half" && (
                                    <button
                                      type="button"
                                      className="match-control-btn match-half-time"
                                      onClick={() => controlMatchClock(row, "half_time")}
                                    >
                                      <span aria-hidden="true">Ⅱ</span>
                                      Half-Time
                                    </button>
                                  )}

                                  {row.clock_phase === "halftime" && (
                                    <button
                                      type="button"
                                      className="match-control-btn match-start-second"
                                      onClick={() => controlMatchClock(row, "start_second_half")}
                                    >
                                      <span aria-hidden="true">▶</span>
                                      Start 2nd Half
                                    </button>
                                  )}

                                  {row.clock_phase === "second_half" && (
                                    <button
                                      type="button"
                                      className="match-control-btn match-complete"
                                      onClick={() => controlMatchClock(row, "complete")}
                                    >
                                      <span aria-hidden="true">■</span>
                                      Complete Match
                                    </button>
                                  )}
                                </div>

                                <div className="match-phase-status">
                                  <span aria-hidden="true">◷</span>
                                  <span>
                                    Current phase: {
                                      !row.clock_phase || row.clock_phase === "not_started"
                                        ? "Not started"
                                        : row.clock_phase === "first_half"
                                          ? "First half"
                                          : row.clock_phase === "halftime"
                                            ? "Half-time"
                                            : row.clock_phase === "second_half"
                                              ? "Second half"
                                              : "Full-time"
                                    }
                                  </span>
                                </div>
                              </div>
                            )}
                            {section === "matches" && row.clock_phase === "completed" && (
                              <span>Match completed</span>
                            )}

                            {section === "registrations" && row.status === "Pending" && (
                              <>
                                <button
                                  type="button"
                                  className="primary-button"
                                  onClick={() => reviewRegistration(row, "Approved")}
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  className="danger-link"
                                  onClick={() => reviewRegistration(row, "Rejected")}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => beginEdit(row)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="danger-link"
                              onClick={() => deleteRow(row)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
        }

      </section >
    </div >
  );
}