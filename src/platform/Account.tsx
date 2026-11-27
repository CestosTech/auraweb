import { LegalLinks } from "./Legal";
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { command } from "../utils/commandApi";
import { useRemote, friendly } from "./hooks";
import { usePlatform, go } from "./context";
import { Button, Dialog, Field, Notice, Select } from "./ui";
import { LocationDialog } from "./Location";
import { disablePush } from "./Notifications";
import { auraShareUrl } from "./share";
import { Row } from "./model";
export function Account() {
  const { user, logout } = useAuth(),
    { requireLogin, toast, confirm, theme, setTheme } = usePlatform(),
    delivery = useRemote(user ? "/v1/me/delivery" : null),
    preferences = useRemote(user ? "/v1/me/food-preferences" : null),
    auraPoints = useRemote(user ? "/v1/aura-points" : null),
    [edit, setEdit] = useState(false),
    [map, setMap] = useState(false),
    [details, setDetails] = useState<Row>({
      name: "",
      phone: "",
      address: "",
      area: "",
      coords: null,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (delivery.data?.details) setDetails(delivery.data.details);
    else if (user)
      setDetails((d) => ({
        ...d,
        name: user.name || "",
        phone: user.phone || "",
      }));
  }, [delivery.data, user?.uid]);
  const change = async (body: Row) => {
    setBusy(true);
    try {
      await command("/v1/me/food-preferences", body);
      preferences.reload();
      toast("Food preferences updated");
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  const invite = async () => {
    if (!(await requireLogin())) return;
    try {
      const url = await auraShareUrl(new URL("/", location.origin).toString());
      if (navigator.share) await navigator.share({ title: "Join me on Aura", text: "Discover local businesses, services and events with me.", url });
      else { await navigator.clipboard.writeText(url); toast("Invite link copied"); }
    } catch (e) { if ((e as Error)?.name !== "AbortError") setError(friendly(e)); }
  };
  return (
    <section className="a-page narrow">
      <h1>Your account</h1>
      <LegalLinks />
      <section className="a-section a-card">
        <h3>Appearance</h3>
        <p>Choose the look that feels right for you.</p>
        <Select
          label="Theme"
          value={theme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(v) => setTheme(v as "light" | "dark")}
        />
      </section>
      <div className="a-section a-card">
        <h2>{user?.name || "Welcome to Aura"}</h2>
        <p>{user?.email}</p>
        {!user && <Button onClick={() => void requireLogin()}>Sign in</Button>}
      </div>
      {user && (
        <>
          <section className="a-section a-card a-aura-points-card">
            <div className="a-aura-points-head"><span>✦</span><div><small>AURA REWARDS</small><h2>Aura Points</h2></div><strong>{auraPoints.loading ? "…" : Number(auraPoints.data?.balance || 0).toLocaleString()}</strong></div>
            <p>Earn points when your posts are approved, friends visit from your invite, and your orders are fulfilled.</p>
            <div className="a-aura-points-periods"><span>This week <b>{Number(auraPoints.data?.weekPoints || 0)} pts</b></span><span>This month <b>{Number(auraPoints.data?.monthPoints || 0)} pts</b></span></div>
            <div className="a-aura-points-actions"><Button onClick={() => void invite()}>Invite a friend</Button><Button secondary onClick={auraPoints.reload} disabled={auraPoints.loading}>Refresh</Button></div>
            {auraPoints.error && <p className="a-aura-points-error" role="status">{auraPoints.error}</p>}
            {!!auraPoints.data?.recent?.length && <div className="a-aura-points-recent"><h3>Recent earnings</h3>{auraPoints.data.recent.slice(0, 5).map((entry: Row) => <div className="a-aura-points-entry" key={entry.id}><span><b>{({signup:"Welcome to Aura",share_visit:"Friend visited from your link",post:"Post approved",order:"Order fulfilled"} as Record<string,string>)[entry.type] || "Aura activity"}</b><small>{entry.earnedAt ? new Date(Number(entry.earnedAt)).toLocaleDateString() : ""}</small></span><strong>+{Number(entry.points || 0)} pts</strong></div>)}</div>}
          </section>
          <section className="a-section a-card">
            <h3>Ready for your next delivery</h3>
            <p>{details.phone || "Add a delivery phone number"}</p>
            <p>
              {details.address ||
                "Save a delivery address for a quicker checkout."}
            </p>
            <Button secondary onClick={() => setEdit(true)}>
              Edit delivery details
            </Button>
          </section>
          <section className="a-section a-card">
            <h3>Familiar food, wherever you go</h3>
            <p>
              Use your completed food orders to find similar meals at other
              kitchens. Your preferences are private to your account.
            </p>
            <label className="a-row">
              <input
                type="checkbox"
                disabled={busy || preferences.loading}
                checked={preferences.data?.enabled !== false}
                onChange={(e) => void change({ enabled: e.target.checked })}
              />
              Remember my food preferences
            </label>
            <Button
              secondary
              style={{ marginTop: 18 }}
              disabled={busy}
              onClick={async () => {
                if (
                  await confirm(
                    "Forget food preferences?",
                    "Previously learned meals will be cleared. Your order history stays available.",
                    "Forget preferences",
                  )
                )
                  await change({ clear: true });
              }}
            >
              Forget learned preferences
            </Button>
          </section>
        </>
      )}
      <div className="a-stack a-section">
        <Button secondary onClick={() => go("/messages")}>
          Messages
        </Button>
        <Button secondary onClick={() => go("/orders")}>
          Your orders
        </Button>
        <Button secondary onClick={() => go("/portal")}>
          Business workspace
        </Button>
        <Button secondary onClick={() => go("/join")}>
          Join a team
        </Button>
        {user && (
          <Button
            secondary
            onClick={async () => {
              await disablePush();
              logout();
              go("/");
            }}
          >
            Sign out
          </Button>
        )}
      </div>
      <Notice error={error || delivery.error || preferences.error} />
      {edit && (
        <Dialog
          title="Delivery details"
          onClose={() => {
            if (!busy) setEdit(false);
          }}
        >
          <Field label="Full name">
            <input
              maxLength={100}
              value={details.name}
              onChange={(e) => setDetails({ ...details, name: e.target.value })}
            />
          </Field>
          <Field label="Delivery phone">
            <input
              type="tel"
              maxLength={25}
              value={details.phone}
              onChange={(e) =>
                setDetails({ ...details, phone: e.target.value })
              }
            />
          </Field>
          <p>{details.address}</p>
          <Button secondary onClick={() => setMap(true)}>
            Choose address & map pin
          </Button>
          <Notice error={error} />
          <Button
            style={{ marginTop: 20 }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await command("/v1/me/delivery", details);
                delivery.reload();
                setEdit(false);
                toast("Delivery details saved");
              } catch (e) {
                setError(friendly(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Save delivery details
          </Button>
          {map && (
            <LocationDialog
              initial={details}
              onClose={() => setMap(false)}
              onChoose={(v) => {
                setDetails({ ...details, ...v });
                setMap(false);
              }}
            />
          )}
        </Dialog>
      )}
    </section>
  );
}
