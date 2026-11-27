import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { command } from "../utils/commandApi";
import { useRemote, friendly } from "./hooks";
import { usePlatform, go } from "./context";
import { Row, label, imageOf } from "./model";
import {
  Button,
  Dialog,
  Field,
  Select,
  Photo,
  Notice,
  Busy,
  Empty,
} from "./ui";
import { Gallery } from "./Gallery";
import { MediaEditor, DateTimeField } from "./EditorFields";
import { LocationDialog } from "./Location";
const contentAgreement = { accepted: true, version: "2026-11-24" };
const publishingRules = "Share useful, accurate information. No offensive or hateful content, harassment, political content or campaigning, sexual content or nudity, alcohol-related content (including promotion or sales), illegal activity, scams or spam. This applies to text, images, videos, links and replies. Only upload material you have permission to share. Violations may be rejected or removed.";
const date = (n: number) =>
  new Date(n).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
export function Social({
  events = true,
  id,
}: {
  events?: boolean;
  id?: string;
}) {
  const { user } = useAuth(),
    { requireLogin } = usePlatform(),
    base = events ? "/v1/events" : "/v1/community",
    [tab, setTab] = useState("Explore"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [editing, setEditing] = useState(false),
    [filterOpen, setFilterOpen] = useState(false),
    [extra, setExtra] = useState<Row[]>([]),
    [next, setNext] = useState<string | null>(null),
    [paging, setPaging] = useState(false),
    [pageError, setPageError] = useState<string | null>(null),
    feed = useRemote(
      tab === "Mine"
        ? base + "/mine"
        : tab === "Agenda"
          ? "/v1/events/agenda"
          : base,
      undefined,
      30000,
      ["Mine", "Agenda"].includes(tab),
    ),
    saved = useRemote(user ? "/v1/social/saved" : null);
  useEffect(() => {
    setExtra([]);
    setNext(feed.data?.nextCursor ?? null);
  }, [feed.data, tab]);
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {}
  }, [tab]);
  if (id) return <SocialDetail key={id} events={events} id={id} />;
  const categories = [
    ...new Set<string>(
      (feed.data?.items || [])
        .map((r: Row) => r.category || "")
        .filter(Boolean),
    ),
  ];
  const rows = [...(feed.data?.items || []), ...extra].filter(
    (r: Row) =>
      (!category || r.category === category) &&
      (!query ||
        `${r.title} ${r.description || ""} ${r.venue || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (tab !== "Saved" ||
        saved.data?.items?.some(
          (s: Row) =>
            s.kind === (events ? "event" : "community") && s.id === r.id,
        )),
  );
  return (
    <section className="a-page">
      <div className="a-row between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="a-tabs" style={{ margin: 0, flex: 1 }}>
          {["Explore", "Saved", ...(events ? ["Agenda"] : []), "Mine"].map(
            (t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={async () => {
                  if (t !== "Explore" && !(await requireLogin())) return;
                  setTab(t);
                }}
              >
                {t === "Mine" ? (events ? "My events" : "My posts") : t}
              </button>
            ),
          )}
        </div>
        <button
          className="a-icon"
          aria-label={events ? "Create event" : "Create post"}
          title={events ? "Create event" : "Create post"}
          style={{ flexShrink: 0, background: "#17231c", color: "#fff" }}
          onClick={async () => {
            if (await requireLogin()) setEditing(true);
          }}
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="a-catalog-top">
        <div className="a-search">
          <Search size={20} />
          <input
            aria-label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              events ? "Events and venues" : "Community conversations"
            }
          />
        </div>
        <button
          className="a-icon"
          aria-label="Filter by category"
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal size={21} />
          {category && <span className="a-count">•</span>}
        </button>
      </div>
      {categories.length > 0 && (
        <div className="a-chips">
          <button
            className={!category ? "active" : ""}
            onClick={() => setCategory("")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {label(c)}
            </button>
          ))}
        </div>
      )}
      <Notice error={feed.error} retry={feed.reload} />
      {feed.loading ? (
        <Busy />
      ) : rows.length ? (
        <div className="a-grid">
          {rows.map((r: Row) => (
            <button
              key={r.id || r.eventId}
              className="a-product a-social-card"
              onClick={() =>
                go(
                  "/" +
                    (events ? "events" : "community") +
                    "/" +
                    (r.id || r.eventId),
                )
              }
            >
              <div className="a-product-media">
                <Photo src={imageOf(r)} alt={r.title} />
              </div>
              <div className="a-product-body">
                <h3>{r.title}</h3>
                <small>
                  {events
                    ? date(r.startsAt)
                    : r.category || r.organizerName || ""}
                  {r.status && r.status !== "approved"
                    ? " · " + label(r.status)
                    : ""}
                </small>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          title={
            events ? "Your next good plan is coming" : "Start a conversation"
          }
        >
          <p>Try another category or check back soon.</p>
        </Empty>
      )}
      <Notice error={pageError} />
      {next && ["Explore", "Saved"].includes(tab) && (
        <Button
          secondary
          disabled={paging}
          onClick={async () => {
            setPaging(true);
            try {
              const page = await command(
                base + "?after=" + encodeURIComponent(next),
                undefined,
                undefined,
                false,
              );
              setExtra((old) => [...old, ...page.items]);
              setNext(page.nextCursor ?? null);
            } catch (e) {
              setPageError(friendly(e));
            } finally {
              setPaging(false);
            }
          }}
        >
          {paging ? "Loading..." : "Load more"}
        </Button>
      )}
      {filterOpen && (
        <Dialog title="Category" onClose={() => setFilterOpen(false)}>
          <div className="a-chips" style={{ flexWrap: "wrap", padding: 0 }}>
            <button
              className={!category ? "active" : ""}
              onClick={() => {
                setCategory("");
                setFilterOpen(false);
              }}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => {
                  setCategory(c);
                  setFilterOpen(false);
                }}
              >
                {label(c)}
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {editing && (
        <SocialEditor
          events={events}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setTab("Mine");
            feed.reload();
          }}
        />
      )}
    </section>
  );
}
function SocialDetail({ events, id }: { events: boolean; id: string }) {
  const { user } = useAuth(),
    { requireLogin, toast, confirm } = usePlatform(),
    base = events ? "/v1/events" : "/v1/community",
    detail = useRemote(`${base}/${id}`, undefined, 15000, !!user),
    state = useRemote(user ? `${base}/${id}/state` : null, undefined, 15000),
    comments = useRemote(
      detail.data?.item.status === "approved" ? `${base}/${id}/comments` : null,
      undefined,
      15000,
      false,
    ),
    [editing, setEditing] = useState(false),
    [register, setRegister] = useState(false),
    [text, setText] = useState(""),
    [replyAgreement, setReplyAgreement] = useState(false),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [attendees, setAttendees] = useState<Row[] | null>(null),
    [discussion, setDiscussion] = useState(false),
    [reportReason, setReportReason] = useState("");
  const op = useRef<{ key: string; text: string } | null>(null),
    r = detail.data?.item,
    own = !!user && r?.ownerUid === user.uid;
  const act = async (action: string, body: Row, key?: string) => {
    if (!(await requireLogin())) return;
    setBusy(true);
    try {
      await command(`${base}/${id}/${action}`, body, key);
      detail.reload();
      state.reload();
      comments.reload();
      if (action === "comments") {
        setText("");
        op.current = null;
      }
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  if (!r)
    return (
      <section className="a-page">
        <Busy />
        <Notice error={detail.error} retry={detail.reload} />
      </section>
    );
  return (
    <section className="a-page narrow">
      <button
        className="a-icon a-back-btn"
        aria-label={`Back to ${events ? "Events" : "Community"}`}
        onClick={() => go("/" + (events ? "events" : "community"))}
      >
        <ArrowLeft size={20} />
      </button>
      <Gallery item={r} />
      <h1>{r.title}</h1>
      <p>By {r.organizerName}</p>
      {events && (
        <div className="a-card a-event-meta">
          <div className="a-meta-row">
            <Calendar size={17} />
            <div>
              <strong>{date(r.startsAt)}</strong>
              <small>
                Until {date(r.endsAt)} · {r.timeZone}
              </small>
            </div>
          </div>
          {r.venue && (
            <div className="a-meta-row">
              <MapPin size={17} />
              <span>{r.venue}</span>
            </div>
          )}
          {r.capacity && (
            <div className="a-meta-row">
              <Users size={17} />
              <span>
                {r.registrationCount} / {r.capacity} registrations
              </span>
            </div>
          )}
        </div>
      )}
      <p style={{ whiteSpace: "pre-wrap" }}>{r.description}</p>
      {r.status !== "approved" && (
        <p className="a-warning">
          {label(r.status)} {r.reviewReason}
        </p>
      )}
      <div
        className="a-row"
        style={{ gap: 12, flexWrap: "wrap", marginTop: 14 }}
      >
        <Button
          secondary
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({ title: r.title, url: location.href });
              else {
                await navigator.clipboard.writeText(location.href);
                toast("Link copied");
              }
            } catch {}
          }}
        >
          Share
        </Button>
        {own && (
          <>
            <Button secondary onClick={() => setEditing(true)}>
              Edit details
            </Button>
            {events && (
              <Button
                secondary
                onClick={async () => {
                  try {
                    setAttendees(
                      (await command(`${base}/${id}/registrations`)).items,
                    );
                  } catch (e) {
                    setError(friendly(e));
                  }
                }}
              >
                Attendees
              </Button>
            )}
            <Button
              secondary
              danger
              disabled={busy || r.status === "cancelled"}
              onClick={async () => {
                if (
                  await confirm(
                    events ? "Cancel event?" : "Remove post?",
                    "This removes it from discovery. Event subscribers will be notified.",
                    "Confirm",
                  )
                )
                  await act("cancel", { expectedVersion: r.version });
              }}
            >
              {events ? "Cancel event" : "Remove post"}
            </Button>
          </>
        )}
        {r.status === "approved" && (
          <>
            <Button
              secondary
              disabled={busy}
              onClick={() => act("save", { saved: !state.data?.saved })}
            >
              {state.data?.saved ? "Saved" : "Save"}
            </Button>
            <Button
              secondary
              disabled={busy}
              onClick={() => act("like", { liked: !state.data?.liked })}
            >
              ♥ {r.likes || 0}
            </Button>
            {!own && (
              <Button
                secondary
                disabled={busy}
                onClick={() =>
                  act("follow", { following: !state.data?.following })
                }
              >
                {state.data?.following ? "Following" : "Follow organiser"}
              </Button>
            )}
          </>
        )}
        {r.eventId && (
          <a className="a-button secondary" href={"/events/" + r.eventId}>
            See the linked event
          </a>
        )}
      </div>
      <Notice error={error} />
      {events && r.status === "approved" && (
        <div className="a-section a-card">
          {state.data?.registration?.status === "registered" ? (
            <>
              <h3>You are registered</h3>
              <p>Reference: {state.data.registration.id}</p>
              <Button
                secondary
                disabled={busy}
                onClick={() => act("cancel-registration", {})}
              >
                Cancel registration
              </Button>
            </>
          ) : r.registrationMode === "form" ? (
            <Button
              onClick={async () => {
                if (await requireLogin()) setRegister(true);
              }}
            >
              Register for this event
            </Button>
          ) : r.registrationMode === "external" ? (
            <a
              href={r.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="a-button"
            >
              Open registration ↗
            </a>
          ) : (
            <h3>How to register</h3>
          )}
          <p style={{ whiteSpace: "pre-wrap" }}>{r.registrationInstructions}</p>
          <p>
            Registration does not verify a payment or guarantee paid admission.
          </p>
          {r.coords && (
            <div className="a-row" style={{ flexWrap: "wrap" }}>
              <a
                className="a-button secondary"
                href={`https://www.google.com/maps/dir/?api=1&destination=${r.coords.lat},${r.coords.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Directions
              </a>
            </div>
          )}
        </div>
      )}
      {r.status === "approved" && (
        <section className="a-section">
          <h2>{events ? "Questions & conversation" : "Replies"}</h2>
          {(comments.data?.items || []).map((c: Row) => (
            <article className="a-list-card" key={c.id}>
              <strong>{c.name}</strong>
              <p>{c.text}</p>
              <small>{date(c.at)}</small>
            </article>
          ))}
          <Field label="Add to the conversation">
            <textarea
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <details className="a-rules-toggle">
            <summary>Community guidelines</summary>
            <p>{publishingRules}</p>
          </details>
          <label className="a-check-row">
            <input
              type="checkbox"
              checked={replyAgreement}
              onChange={(e) => setReplyAgreement(e.target.checked)}
            />
            <span>
              I accept the{" "}
              <a href="/terms" target="_blank" rel="noreferrer">
                Terms &amp; Guidelines
              </a>
              .
            </span>
          </label>
          <Button
            disabled={busy || !text.trim() || !replyAgreement}
            onClick={() => {
              if (op.current?.text !== text)
                op.current = { key: crypto.randomUUID(), text };
              void act("comments", { text, contentAgreement }, op.current.key);
            }}
          >
            Post reply
          </Button>
          <div className="a-report-box">
            <Field label="Report a concern">
              <textarea
                maxLength={1000}
                value={reportReason}
                placeholder="What should our moderation team review?"
                onChange={(e) => setReportReason(e.target.value)}
              />
            </Field>
            <Button
              secondary
              disabled={busy || reportReason.trim().length < 5}
              onClick={() => act("report", { reason: reportReason })}
            >
              Send report
            </Button>
          </div>
        </section>
      )}
      {discussion && (
        <SocialEditor
          events={false}
          eventId={id}
          onClose={() => setDiscussion(false)}
          onSaved={() => {
            setDiscussion(false);
            go("/community");
          }}
        />
      )}
      {editing && (
        <SocialEditor
          events={events}
          item={r}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            detail.reload();
          }}
        />
      )}
      {register && (
        <Registration
          event={r}
          onClose={() => setRegister(false)}
          onSaved={() => {
            setRegister(false);
            state.reload();
            detail.reload();
          }}
        />
      )}
      {attendees && (
        <Dialog title="Attendees" onClose={() => setAttendees(null)}>
          {attendees.map((a) => (
            <div className="a-list-card" key={a.uid}>
              <strong>
                {a.id} · {a.status}
              </strong>
              <p>{Object.values(a.answers).join(" · ")}</p>
            </div>
          ))}
        </Dialog>
      )}
    </section>
  );
}
function Registration({
  event,
  onClose,
  onSaved,
}: {
  event: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [answers, setAnswers] = useState<Row>({}),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState<string | null>(null),
    pending = useRef<Row | null>(null),
    key = useRef(crypto.randomUUID());
  return (
    <Dialog
      title="Register for this event"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <h3>{event.title}</h3>
      <p>
        Your answers are shared with the organiser. This form does not collect
        payment.
      </p>
      <fieldset disabled={busy || uncertain}>
        {event.fields.map((f: Row) => (
          <div key={f.id}>
            {f.type === "choice" ? (
              <Select
                label={f.label + (f.required ? " *" : "")}
                value={answers[f.id] || ""}
                options={f.options}
                onChange={(v) => setAnswers({ ...answers, [f.id]: v })}
              />
            ) : (
              <Field label={f.label + (f.required ? " *" : "")}>
                <input
                  type={
                    f.type === "checkbox"
                      ? "checkbox"
                      : f.type === "email"
                        ? "email"
                        : f.type === "phone"
                          ? "tel"
                          : "text"
                  }
                  required={f.required}
                  maxLength={1000}
                  checked={f.type === "checkbox" ? !!answers[f.id] : undefined}
                  value={
                    f.type !== "checkbox" ? answers[f.id] || "" : undefined
                  }
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      [f.id]:
                        f.type === "checkbox"
                          ? e.target.checked
                          : e.target.value,
                    })
                  }
                />
              </Field>
            )}
          </div>
        ))}
      </fieldset>
      <Notice error={error} />
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          pending.current ??= { answers };
          setUncertain(true);
          try {
            await command(
              "/v1/events/" + event.id + "/register",
              pending.current,
              key.current,
            );
            onSaved();
          } catch (e: any) {
            setError(friendly(e));
            if (e.status && e.status < 500) {
              pending.current = null;
              setUncertain(false);
              key.current = crypto.randomUUID();
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Registering..."
          : uncertain
            ? "Retry confirmation"
            : "Confirm registration"}
      </Button>
    </Dialog>
  );
}

function SocialEditor({
  events,
  item,
  eventId,
  onClose,
  onSaved,
}: {
  events: boolean;
  item?: Row;
  eventId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<Row>({
      title: "",
      description: "",
      category: events ? "Community" : "Question",
      images: [],
      videoUrl: null,
      videoPosition: null,
      startsAt: Date.now() + 86400000,
      endsAt: Date.now() + 93600000,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      venue: "",
      neighborhood: "",
      coords: null,
      registrationMode: "form",
      registrationUrl: "",
      registrationInstructions: "",
      capacity: null,
      fields: [
        {
          id: "name",
          label: "Your name",
          type: "text",
          required: true,
          options: [],
        },
        {
          id: "email",
          label: "Email address",
          type: "email",
          required: true,
          options: [],
        },
      ],
      ...item,
    }),
    [acceptedRules, setAcceptedRules] = useState(false),
    [location, setLocation] = useState(false),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState<string | null>(null),
    key = useRef(crypto.randomUUID()),
    pending = useRef<Row | null>(null);
  const patch = (p: Row) => setData((d) => ({ ...d, ...p })),
    changeField = (id: string, p: Row) =>
      patch({
        fields: data.fields.map((f: Row) => (f.id === id ? { ...f, ...p } : f)),
      });
  return (
    <Dialog
      title={
        events
          ? item
            ? "Edit event"
            : "Create an event"
          : "Share with your community"
      }
      onClose={() => {
        if (!busy && !uploading) onClose();
      }}
      wide
    >
      <p>
        Reviewed before it appears publicly. Changes to a published page are
        reviewed again.
      </p>
      <fieldset disabled={busy || uncertain}>
        <Field label="Title">
          <input
            maxLength={120}
            value={data.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={5}
            maxLength={6000}
            value={data.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Field>
        <Select
          label="Category"
          value={data.category}
          options={
            events
              ? [
                  "Community",
                  "Music",
                  
                  "Business",
                  "Workshop",
                  "Sports",
                  "Arts",
                  "Education",
                  "Faith",
                ]
              : [
                  "Question",
                  "Local tip",
                  "Good find",
                  "Activity",
                  "Event discussion",
                ]
          }
          onChange={(category) => patch({ category })}
        />
        <MediaEditor
          scope="/v1/social"
          value={data}
          onChange={patch}
          onBusy={setUploading}
        />
        {events && (
          <>
            <div className="a-two">
              <DateTimeField
                label="Starts"
                value={data.startsAt}
                onChange={(startsAt) => patch({ startsAt })}
              />
              <DateTimeField
                label="Ends"
                value={data.endsAt}
                onChange={(endsAt) => patch({ endsAt })}
              />
            </div>
            <p>Time zone: {data.timeZone}</p>
            <Field label="Venue or online joining instructions">
              <input
                maxLength={250}
                value={data.venue}
                onChange={(e) => patch({ venue: e.target.value })}
              />
            </Field>
            <Button secondary onClick={() => setLocation(true)}>
              Add / change venue map pin
            </Button>
            <Select
              label="Registration method"
              value={data.registrationMode}
              options={[
                { value: "form", label: "Register in Aura" },
                { value: "external", label: "External registration link" },
                {
                  value: "instructions",
                  label: "Show registration instructions",
                },
              ]}
              onChange={(registrationMode) => patch({ registrationMode })}
            />
            {data.registrationMode === "external" && (
              <Field label="HTTPS registration link">
                <input
                  type="url"
                  maxLength={2048}
                  value={data.registrationUrl}
                  onChange={(e) => patch({ registrationUrl: e.target.value })}
                />
              </Field>
            )}
            <Field label="Registration and admission instructions">
              <textarea
                maxLength={2000}
                value={data.registrationInstructions}
                onChange={(e) =>
                  patch({ registrationInstructions: e.target.value })
                }
              />
            </Field>
            <Field label="Capacity (optional)">
              <input
                type="number"
                min={1}
                value={data.capacity ?? ""}
                onChange={(e) =>
                  patch({
                    capacity:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            {data.registrationMode === "form" && (
              <section className="a-card a-form-section">
                <div className="a-row between" style={{ gap: 10 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Registration form</h3>
                    <small className="a-muted">
                      Basic contact &amp; attendance only. Locked after first
                      registration.
                    </small>
                  </div>
                </div>
                <fieldset disabled={data.registrationCount > 0}>
                  {data.fields.map((f: Row, idx: number) => (
                    <div
                      className="a-question-card"
                      key={f.id}
                    >
                      <div className="a-row between" style={{ marginBottom: 6 }}>
                        <small className="a-muted">Question {idx + 1}</small>
                        <button
                          type="button"
                          className="a-text-link"
                          onClick={() =>
                            patch({
                              fields: data.fields.filter(
                                (p: Row) => p.id !== f.id,
                              ),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                      <Field label="Question">
                        <input
                          maxLength={100}
                          value={f.label}
                          onChange={(e) =>
                            changeField(f.id, { label: e.target.value })
                          }
                        />
                      </Field>
                      <Select
                        label="Answer type"
                        value={f.type}
                        options={[
                          "text",
                          "email",
                          "phone",
                          "choice",
                          "checkbox",
                        ]}
                        onChange={(type) => changeField(f.id, { type })}
                      />
                      {f.type === "choice" && (
                        <Field label="Choices, separated by commas">
                          <input
                            value={f.options.join(",")}
                            onChange={(e) =>
                              changeField(f.id, {
                                options: e.target.value
                                  .split(",")
                                  .map((v) => v.trim()),
                              })
                            }
                          />
                        </Field>
                      )}
                      <label className="a-check-row" style={{ marginBottom: 0 }}>
                        <input
                          type="checkbox"
                          checked={f.required}
                          onChange={(e) =>
                            changeField(f.id, { required: e.target.checked })
                          }
                        />
                        <span>Required</span>
                      </label>
                    </div>
                  ))}
                  <Button
                    secondary
                    disabled={data.fields.length >= 15}
                    onClick={() =>
                      patch({
                        fields: [
                          ...data.fields,
                          {
                            id: crypto.randomUUID(),
                            label: "",
                            type: "text",
                            required: false,
                            options: [],
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={16} />
                    Add question
                  </Button>
                </fieldset>
              </section>
            )}
          </>
        )}
      </fieldset>
      <Notice error={error} />
      <section className="a-report-box" style={{ marginTop: 18 }}>
        <details className="a-rules-toggle" style={{ marginTop: 0 }}>
          <summary>Community guidelines</summary>
          <p>{publishingRules}</p>
        </details>
        <label className="a-check-row">
          <input
            type="checkbox"
            checked={acceptedRules}
            disabled={busy || uncertain}
            onChange={(e) => setAcceptedRules(e.target.checked)}
          />
          <span>
            I accept the{" "}
            <a href="/terms" target="_blank" rel="noreferrer">
              Terms &amp; Guidelines
            </a>
            .
          </span>
        </label>
        <Button
          style={{ width: "100%" }}
          disabled={busy || uploading || !acceptedRules}
        onClick={async () => {
          setBusy(true);
          if (!acceptedRules) { setBusy(false); return; }
          pending.current ??= {
            ...data,
            contentAgreement,
            ...(item ? { expectedVersion: item.version } : {}),
            ...(!events ? { eventId: eventId || item?.eventId || null } : {}),
          };
          setUncertain(true);
          try {
            await command(
              "/v1/" +
                (events ? "events" : "community") +
                (item ? "/" + item.id : ""),
              pending.current,
              key.current,
            );
            onSaved();
          } catch (e: any) {
            setError(friendly(e));
            if (e.status && e.status < 500) {
              pending.current = null;
              setUncertain(false);
              key.current = crypto.randomUUID();
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Submitting..."
          : uncertain
            ? "Retry submission confirmation"
            : "Submit for approval"}
        </Button>
      </section>
      {location && (
        <LocationDialog
          title="Event venue"
          initial={data}
          onClose={() => setLocation(false)}
          onChoose={(v) => {
            patch({ venue: v.address, neighborhood: v.area, coords: v.coords });
            setLocation(false);
          }}
        />
      )}
    </Dialog>
  );
}
export function SocialModeration({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("events"),
    [filter, setFilter] = useState("pending"),
    [selected, setSelected] = useState<Row | null>(null),
    [action, setAction] = useState("approve"),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    remote = useRemote("/v1/admin/social/" + tab);
  const pending = useRef<{ body: Row; key: string } | null>(null);
  return (
    <Dialog title="Events & Community moderation" onClose={onClose} wide>
      <div className="a-tabs">
        {["events", "community", "reports"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => {
              setTab(t);
              setSelected(null);
            }}
          >
            {label(t)}
          </button>
        ))}
      </div>
      {tab !== "reports" && (
        <Select
          label="Status"
          value={filter}
          options={[
            "",
            "pending",
            "approved",
            "changes_requested",
            "rejected",
            "suspended",
            "cancelled",
          ]}
          onChange={setFilter}
        />
      )}
      <Notice error={error || remote.error} retry={remote.reload} />
      {remote.loading ? (
        <Busy />
      ) : (
        (remote.data?.items || [])
          .filter(
            (r: Row) => tab === "reports" || !filter || r.status === filter,
          )
          .map((r: Row) => (
            <div key={r.id} className="a-list-card">
              <h3>{r.title || r.reason}</h3>
              <p>
                {r.organizerName || r.targetId} · {label(r.status)}
              </p>
              {tab === "reports" ? (
                <>
                  <Button
                    secondary
                    onClick={() =>
                      window.open(
                        "/" +
                          (r.kind === "event" ? "events" : "community") +
                          "/" +
                          r.targetId,
                        "_blank",
                        "noopener",
                      )
                    }
                  >
                    View reported page
                  </Button>
                  <Button
                    secondary
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await command(
                          "/v1/admin/social/reports/" + r.id + "/resolve",
                          {},
                        );
                        remote.reload();
                      } catch (e) {
                        setError(friendly(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Mark reviewed
                  </Button>
                </>
              ) : (
                <Button
                  secondary
                  onClick={() => {
                    setSelected(r);
                    setReason("");
                    setAction("approve");
                    pending.current = null;
                  }}
                >
                  Review submission
                </Button>
              )}
            </div>
          ))
      )}
      {selected && (
        <Dialog
          title="Review submission"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
          wide
        >
          <Gallery item={selected} />
          <h2>{selected.title}</h2>
          <p>{selected.description}</p>
          {tab === "events" && (
            <>
              <p>
                {date(selected.startsAt)} to {date(selected.endsAt)}
              </p>
              <p>{selected.venue}</p>
              <p>{selected.registrationInstructions}</p>
              {selected.registrationUrl && (
                <a
                  href={selected.registrationUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Review registration link ↗
                </a>
              )}
              <h3>Form questions</h3>
              {(selected.fields || []).map((f: Row) => (
                <p key={f.id}>
                  {f.label} · {f.type}
                  {f.required ? " · required" : ""}
                </p>
              ))}
            </>
          )}
          <Select
            label="Decision"
            disabled={busy}
            value={action}
            options={["approve", "request_changes", "reject", "suspend"]}
            onChange={(v) => {
              setAction(v);
              pending.current = null;
            }}
          />
          <aside className="a-list-card"><strong>Publishing rules review</strong><p>{publishingRules}</p><small>{selected.policyAcceptance ? `Policy ${selected.policyAcceptance.version} accepted on ${date(selected.policyAcceptance.acceptedAt)}` : selected.qaOnly ? 'System-generated QA sample' : 'No recorded acceptance — request a new submission.'}</small></aside>
          <Field label="Reason">
            <textarea
              maxLength={1000}
              value={reason}
              disabled={busy}
              onChange={(e) => {
                setReason(e.target.value);
                pending.current = null;
              }}
            />
          </Field>
          <Notice error={error} />
          <Button
            disabled={
              busy || (action !== "approve" && reason.trim().length < 5)
            }
            onClick={async () => {
              setBusy(true);
              pending.current ??= {
                body: { action, reason, expectedVersion: selected.version },
                key: crypto.randomUUID(),
              };
              try {
                await command(
                  `/v1/admin/social/${tab}/${selected.id}/review`,
                  pending.current.body,
                  pending.current.key,
                );
                setSelected(null);
                remote.reload();
              } catch (e) {
                setError(friendly(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Save review & notify author
          </Button>
        </Dialog>
      )}
    </Dialog>
  );
}
