"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CloudSun,
  Flame,
  Gauge,
  Heart,
  Image as ImageIcon,
  Inbox,
  Layers3,
  LockKeyhole,
  MessageCircle,
  Microscope,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Thermometer,
  UserRound,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";
import type {
  ClayBodyProfile,
  FiringRecord,
  GlazeProfile,
  KilnProfile,
  Post,
  Visibility,
} from "@/lib/domain";
import { getEntitlementDecision } from "@/lib/entitlements";
import { calculateRateOfChange, estimateFiringDuration } from "@/lib/firing-calculator";
import { rankPopularPosts } from "@/lib/feed-ranking";
import { PRODUCT, PRIMARY_NAVIGATION, type PrimaryNavigationItem } from "@/lib/product";
import type { KilnbookWorkspaceSnapshot } from "@/lib/services/kilnbook-repository";
import { formatTemperature } from "@/lib/units";

type View = PrimaryNavigationItem | "Library";

const firingFormSchema = z.object({
  title: z.string().min(3, "Give the firing a clear title."),
  kilnId: z.string().min(1, "Choose a kiln."),
  clayBodyId: z.string().min(1, "Choose at least one clay body."),
  glazeId: z.string().min(1, "Choose at least one glaze."),
  targetTemperatureC: z.coerce.number().min(600).max(1400),
  targetCone: z.string().min(1),
  location: z.enum(["indoors", "semi_enclosed", "outdoors_partially_covered"]),
  humidity: z.coerce.number().min(0).max(100),
  windSpeedKph: z.coerce.number().min(0).max(150),
});

type FiringFormValues = z.infer<typeof firingFormSchema>;
type FiringFormInput = z.input<typeof firingFormSchema>;

const navIcons: Record<PrimaryNavigationItem, typeof BookOpen> = {
  Home: BookOpen,
  Dashboard: BarChart3,
  Firings: Flame,
  Glazes: Layers3,
  "Clay Bodies": Microscope,
  Kilns: Gauge,
  Explore: Search,
  Messages: Inbox,
  Analytics: Activity,
  Profile: UserRound,
  Settings: Settings,
};

export function KilnbookWorkspace({
  snapshot,
}: {
  snapshot: KilnbookWorkspaceSnapshot;
}) {
  const [view, setView] = useState<View>("Home");
  const [feedTab, setFeedTab] = useState<"Following" | "Popular">(() => {
    if (typeof window === "undefined") return "Following";
    const saved = window.localStorage.getItem("kilnbook.feed-tab");
    return saved === "Following" || saved === "Popular" ? saved : "Following";
  });
  const [firings, setFirings] = useState<FiringRecord[]>(snapshot.firings);
  const [liveReadings, setLiveReadings] = useState(snapshot.firingLogPoints);
  const [selectedFiringId, setSelectedFiringId] = useState(snapshot.firings[0]?.id ?? "");
  const [imageTags, setImageTags] = useState(snapshot.images[1]?.glazeIds ?? []);
  const [query, setQuery] = useState("");

  useEffect(() => {
    window.localStorage.setItem("kilnbook.feed-tab", feedTab);
  }, [feedTab]);

  const selectedFiring = useMemo(
    () => firings.find((firing) => firing.id === selectedFiringId) ?? firings[0],
    [firings, selectedFiringId],
  );

  const ratePoints = useMemo(
    () =>
      calculateRateOfChange(
        liveReadings.filter((point) => point.firingId === selectedFiring?.id),
      ),
    [liveReadings, selectedFiring?.id],
  );

  const estimate = useMemo(
    () =>
      estimateFiringDuration({
        kilnType: selectedFiring?.firingType ?? "electric",
        fuelType: selectedFiring?.firingType === "electric" ? "electric" : "gas",
        kilnVolumeLiters:
          snapshot.kilns.find((kiln) => kiln.id === selectedFiring?.kilnId)
            ?.usableVolumeLiters ?? 262,
        powerKw:
          snapshot.kilns.find((kiln) => kiln.id === selectedFiring?.kilnId)?.powerKw ??
          11.5,
        kilnAgeYears: 6,
        loadFullnessPercentage: selectedFiring?.loadFullnessPercentage ?? 65,
        wareDensity: "medium",
        averageWallThicknessMm: 6,
        targetTemperatureC: selectedFiring?.targetTemperatureC ?? 1222,
        targetCone: selectedFiring?.targetCone ?? "6",
        atmosphere: selectedFiring?.atmosphere ?? "oxidation",
        plannedPreheatHours: 1.5,
        holdMinutes: 20,
        controlledCooling: true,
        startingAmbientC: 22,
        kilnLocation:
          snapshot.firingEnvironmentRecords.find(
            (record) => record.firingId === selectedFiring?.id,
          )?.kilnLocation ?? "indoors",
        humidityPercentage: 64,
        windSpeedKph: 14,
        comparableFirings: firings
          .filter((firing) => firing.id !== selectedFiring?.id && firing.totalHeatingMinutes)
          .map((firing) => ({
            id: firing.id,
            title: firing.title,
            targetTemperatureC: firing.targetTemperatureC,
            loadFullnessPercentage: firing.loadFullnessPercentage,
            atmosphere: firing.atmosphere,
            totalHeatingMinutes: firing.totalHeatingMinutes ?? 0,
            totalCoolingMinutes: firing.totalCoolingMinutes ?? 0,
          })),
      }),
    [firings, selectedFiring, snapshot.firingEnvironmentRecords, snapshot.kilns],
  );

  const handleQuickReading = () => {
    if (!selectedFiring) return;
    const previous = ratePoints.at(-1);
    const elapsedMinutes = previous ? previous.elapsedMinutes + 30 : 30;
    const actualTemperatureC = previous
      ? Math.min(previous.actualTemperatureC + 76, selectedFiring.targetTemperatureC + 8)
      : 90;

    setLiveReadings((points) => [
      ...points,
      {
        id: `log-${selectedFiring.id}-${Date.now()}`,
        firingId: selectedFiring.id,
        timestamp: new Date().toISOString(),
        elapsedMinutes,
        targetTemperatureC: selectedFiring.targetTemperatureC,
        actualTemperatureC,
        atmosphere: selectedFiring.atmosphere,
        notes: "Manual quick reading",
        manual: true,
      },
    ]);
  };

  const handleCreateFiring = (values: FiringFormValues) => {
    const kiln = snapshot.kilns.find((item) => item.id === values.kilnId);
    const newFiring: FiringRecord = {
      id: `firing-${Date.now()}`,
      ownerId: snapshot.viewer.id,
      title: values.title,
      readableNumber: `Firing ${String(firings.length + 40).padStart(3, "0")}`,
      kilnId: values.kilnId,
      kilnNameSnapshot: kiln?.name ?? "Unknown kiln",
      kilnSpecSnapshot: kiln
        ? `${kiln.manufacturer} ${kiln.model}, ${kiln.usableVolumeLiters} L`
        : "Snapshot unavailable",
      firingType: kiln?.kilnType ?? "electric",
      status: "planned",
      visibility: "private",
      plannedStartAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      leadFirer: snapshot.viewer.displayName,
      targetTemperatureC: values.targetTemperatureC,
      targetCone: values.targetCone,
      atmosphere: kiln?.kilnType === "gas" ? "reduction" : "oxidation",
      loadFullnessPercentage: 62,
      notes: `Linked ${values.glazeId} to ${values.clayBodyId}. Environment: ${values.location}, humidity ${values.humidity}%, wind ${values.windSpeedKph} kph.`,
    };
    setFirings((items) => [newFiring, ...items]);
    setSelectedFiringId(newFiring.id);
  };

  return (
    <main className="min-h-screen bg-[var(--kb-bg)] text-[var(--kb-ink)]">
      <div className="kb-shell">
        <Sidebar view={view} onViewChange={setView} />
        <section className="kb-main">
          <Header
            viewerName={snapshot.viewer.displayName}
            view={view}
            query={query}
            onQueryChange={setQuery}
            onCreate={() => setView("Firings")}
          />
          {view === "Home" && (
            <HomeScreen
              feedTab={feedTab}
              onFeedTabChange={setFeedTab}
              posts={feedTab === "Following" ? snapshot.posts : rankPopularPosts(snapshot.posts)}
              firings={firings}
              glazes={snapshot.glazes}
              clayBodies={snapshot.clayBodies}
              onOpenExplore={() => setView("Explore")}
            />
          )}
          {view === "Dashboard" && (
            <DashboardScreen
              firings={firings}
              glazes={snapshot.glazes}
              clayBodies={snapshot.clayBodies}
              selectedFiring={selectedFiring}
              ratePoints={ratePoints}
            />
          )}
          {view === "Firings" && selectedFiring && (
            <FiringsScreen
              firings={firings}
              selectedFiring={selectedFiring}
              kilns={snapshot.kilns}
              glazes={snapshot.glazes}
              clayBodies={snapshot.clayBodies}
              applications={snapshot.glazeApplications}
              ratePoints={ratePoints}
              estimate={estimate}
              imageTags={imageTags}
              onSelectFiring={setSelectedFiringId}
              onQuickReading={handleQuickReading}
              onCreateFiring={handleCreateFiring}
              onTagsChange={setImageTags}
            />
          )}
          {view === "Glazes" && (
            <GlazesScreen
              glazes={snapshot.glazes}
              recipes={snapshot.glazeRecipeVersions}
              applications={snapshot.glazeApplications}
              clayBodies={snapshot.clayBodies}
              firings={firings}
            />
          )}
          {view === "Clay Bodies" && (
            <ClayBodiesScreen
              clayBodies={snapshot.clayBodies}
              glazes={snapshot.glazes}
              applications={snapshot.glazeApplications}
              firings={firings}
            />
          )}
          {view === "Kilns" && (
            <KilnsScreen kilns={snapshot.kilns} firings={firings} />
          )}
          {view === "Explore" && (
            <ExploreScreen
              query={query}
              glazes={snapshot.glazes}
              clayBodies={snapshot.clayBodies}
              posts={snapshot.posts}
              firings={firings}
            />
          )}
          {view === "Messages" && (
            <MessagesScreen conversations={snapshot.conversations} />
          )}
          {view === "Analytics" && (
            <AnalyticsScreen
              plan={snapshot.viewer.subscriptionTier}
              firings={firings}
              glazes={snapshot.glazes}
              clayBodies={snapshot.clayBodies}
            />
          )}
          {view === "Profile" && (
            <ProfileScreen
              viewer={snapshot.viewer}
              posts={snapshot.posts}
              onOpenSettings={() => setView("Settings")}
            />
          )}
          {view === "Settings" && <SettingsScreen plan={snapshot.viewer.subscriptionTier} />}
          {view === "Library" && (
            <LibraryScreen
              glazes={snapshot.glazes}
              clayBodies={snapshot.clayBodies}
              kilns={snapshot.kilns}
              onViewChange={setView}
            />
          )}
        </section>
      </div>
      <MobileNav view={view} onViewChange={setView} />
    </main>
  );
}

function Sidebar({
  view,
  onViewChange,
}: {
  view: View;
  onViewChange: (view: View) => void;
}) {
  return (
    <aside className="kb-sidebar" aria-label="Primary navigation">
      <div className="kb-brand">
        <div className="kb-brand-mark">K</div>
        <div>
          <strong>{PRODUCT.name}</strong>
          <span>Studio process library</span>
        </div>
      </div>
      <nav className="kb-nav">
        {PRIMARY_NAVIGATION.map((item) => {
          const Icon = navIcons[item];
          return (
            <button
              key={item}
              type="button"
              className={view === item ? "active" : ""}
              onClick={() => onViewChange(item)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{item}</span>
            </button>
          );
        })}
      </nav>
      <div className="kb-sidebar-card">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>Private recipes stay server-protected by policy, not hidden UI.</span>
      </div>
    </aside>
  );
}

function Header({
  viewerName,
  view,
  query,
  onQueryChange,
  onCreate,
}: {
  viewerName: string;
  view: View;
  query: string;
  onQueryChange: (query: string) => void;
  onCreate: () => void;
}) {
  return (
    <header className="kb-header">
      <div>
        <p className="kb-kicker">Workspace</p>
        <h1>{view === "Library" ? "Library" : view}</h1>
      </div>
      <label className="kb-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Search Kilnbook</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search firings, glazes, clay bodies"
        />
      </label>
      <div className="kb-header-actions">
        <button type="button" className="kb-icon-button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button type="button" className="kb-primary-button" onClick={onCreate}>
          <Plus size={18} />
          <span>Add</span>
        </button>
        <div className="kb-account-chip">
          <span>{viewerName}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}

function HomeScreen({
  feedTab,
  onFeedTabChange,
  posts,
  firings,
  glazes,
  clayBodies,
  onOpenExplore,
}: {
  feedTab: "Following" | "Popular";
  onFeedTabChange: (tab: "Following" | "Popular") => void;
  posts: Post[];
  firings: FiringRecord[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  onOpenExplore: () => void;
}) {
  return (
    <div className="kb-grid-two">
      <section className="kb-panel kb-feed-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Home feed</p>
            <h2>Ceramic process from people you follow</h2>
          </div>
          <div className="kb-segmented" role="tablist" aria-label="Feed tabs">
            {(["Following", "Popular"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={feedTab === tab}
                type="button"
                className={feedTab === tab ? "active" : ""}
                onClick={() => onFeedTabChange(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <PostComposer glazes={glazes} clayBodies={clayBodies} firings={firings} />
        <div className="kb-feed-list">
          {posts.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Your Following feed is quiet"
              body="Follow ceramic artists or switch to Popular to see recent shared firing results."
              actionLabel="Explore artists"
              onAction={onOpenExplore}
            />
          ) : (
            posts.map((post) => (
              <FeedCard
                key={post.id}
                post={post}
                firing={firings.find((item) => item.id === post.linkedFiringId)}
                glaze={glazes.find((item) => item.id === post.linkedGlazeId)}
                clayBody={clayBodies.find((item) => item.id === post.linkedClayBodyId)}
              />
            ))
          )}
        </div>
      </section>
      <aside className="kb-stack">
        <MarketingLandingPreview />
        <AuthOnboardingPreview />
      </aside>
    </div>
  );
}

function PostComposer({
  glazes,
  clayBodies,
  firings,
}: {
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  firings: FiringRecord[];
}) {
  return (
    <form className="kb-composer">
      <label>
        <span className="sr-only">Post text</span>
        <textarea
          placeholder="Share a firing note, kiln-opening result, or glaze observation"
          rows={3}
        />
      </label>
      <div className="kb-composer-row">
        <button type="button" className="kb-quiet-button">
          <ImageIcon size={17} />
          <span>Images</span>
        </button>
        <select aria-label="Link firing" defaultValue={firings[0]?.id}>
          {firings.map((firing) => (
            <option key={firing.id} value={firing.id}>
              {firing.readableNumber}
            </option>
          ))}
        </select>
        <select aria-label="Link glaze" defaultValue={glazes[0]?.id}>
          {glazes.map((glaze) => (
            <option key={glaze.id} value={glaze.id}>
              {glaze.name}
            </option>
          ))}
        </select>
        <select aria-label="Link clay body" defaultValue={clayBodies[0]?.id}>
          {clayBodies.map((clay) => (
            <option key={clay.id} value={clay.id}>
              {clay.name}
            </option>
          ))}
        </select>
        <button type="button" className="kb-primary-button">
          <Send size={17} />
          <span>Publish</span>
        </button>
      </div>
    </form>
  );
}

function FeedCard({
  post,
  firing,
  glaze,
  clayBody,
}: {
  post: Post;
  firing?: FiringRecord;
  glaze?: GlazeProfile;
  clayBody?: ClayBodyProfile;
}) {
  return (
    <article className="kb-feed-card">
      <div className="kb-feed-author">
        <div className="kb-avatar">{post.authorName.slice(0, 1)}</div>
        <div>
          <strong>{post.authorName}</strong>
          <span>@{post.authorUsername} · {relativeDate(post.createdAt)}</span>
        </div>
        <VisibilityPill visibility={post.visibility} />
      </div>
      <p>{post.body}</p>
      <div className="kb-image-strip" aria-label="Post images">
        <div className="kb-ceramic-photo dark" />
        <div className="kb-ceramic-photo pale" />
      </div>
      {firing && (
        <div className="kb-record-preview">
          <Flame size={18} aria-hidden="true" />
          <div>
            <strong>{firing.readableNumber}: {firing.title}</strong>
            <span>
              {firing.kilnNameSnapshot} · Cone {firing.targetCone} · {formatTemperature(firing.targetTemperatureC, "c")}
            </span>
          </div>
        </div>
      )}
      <div className="kb-chip-row">
        {post.structuredTagLabels.map((tag) => (
          <span className="kb-chip" key={tag}>{tag}</span>
        ))}
        {glaze && <span className="kb-chip">{glaze.surface}</span>}
        {clayBody && <span className="kb-chip">{clayBody.bodyType}</span>}
      </div>
      <div className="kb-feed-actions">
        <button type="button" aria-pressed={post.viewerLiked}>
          <Heart size={17} fill={post.viewerLiked ? "currentColor" : "none"} />
          <span>{post.likes}</span>
        </button>
        <button type="button">
          <MessageCircle size={17} />
          <span>{post.comments}</span>
        </button>
        <button type="button">
          <BookOpen size={17} />
          <span>Save</span>
        </button>
      </div>
    </article>
  );
}

function DashboardScreen({
  firings,
  glazes,
  clayBodies,
  selectedFiring,
  ratePoints,
}: {
  firings: FiringRecord[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  selectedFiring?: FiringRecord;
  ratePoints: ReturnType<typeof calculateRateOfChange>;
}) {
  const completed = firings.filter((firing) => firing.status === "completed");
  const kilnHours = completed.reduce(
    (total, firing) => total + (firing.totalHeatingMinutes ?? 0) / 60,
    0,
  );
  const successAverage =
    completed.reduce((total, firing) => total + (firing.successRating ?? 0), 0) /
    Math.max(completed.length, 1);

  return (
    <div className="kb-stack">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Last 90 days</p>
            <h2>Firing and process dashboard</h2>
          </div>
          <select aria-label="Dashboard timeframe" defaultValue="90">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div className="kb-metrics">
          <MetricCard label="Total firings" value={String(firings.length)} detail="3 completed, 1 planned" icon={Flame} />
          <MetricCard label="Kiln hours" value={kilnHours.toFixed(1)} detail="Heating time recorded" icon={Gauge} />
          <MetricCard label="Successful results" value={`${Math.round(successAverage)}%`} detail="Based on rated applications" icon={CheckCircle2} />
          <MetricCard label="Glaze tests" value={String(glazes.length + 5)} detail={`${clayBodies.length} clay bodies represented`} icon={Layers3} />
        </div>
      </section>
      <section className="kb-grid-two equal">
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Actual curve · {selectedFiring?.readableNumber}</h3>
            <span>Manual readings</span>
          </div>
          <div className="kb-chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ratePoints}>
                <CartesianGrid strokeDasharray="4 6" stroke="#ddd5ca" />
                <XAxis dataKey="elapsedMinutes" tickFormatter={(value) => `${value / 60}h`} />
                <YAxis tickFormatter={(value) => `${value}C`} />
                <Tooltip formatter={(value) => [`${value}C`, "Temperature"]} />
                <Line type="monotone" dataKey="actualTemperatureC" stroke="#8f4f3a" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="targetTemperatureC" stroke="#315d67" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Firings by atmosphere</h3>
            <span>Clear unit labels</span>
          </div>
          <div className="kb-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={atmosphereData(firings)}>
                <CartesianGrid strokeDasharray="4 6" stroke="#ddd5ca" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#315d67" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

function FiringsScreen({
  firings,
  selectedFiring,
  kilns,
  glazes,
  clayBodies,
  applications,
  ratePoints,
  estimate,
  imageTags,
  onSelectFiring,
  onQuickReading,
  onCreateFiring,
  onTagsChange,
}: {
  firings: FiringRecord[];
  selectedFiring: FiringRecord;
  kilns: KilnProfile[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  applications: { firingId: string; glazeId: string; clayBodyId: string | null; resultRating?: number; resultStatus: string }[];
  ratePoints: ReturnType<typeof calculateRateOfChange>;
  estimate: ReturnType<typeof estimateFiringDuration>;
  imageTags: string[];
  onSelectFiring: (id: string) => void;
  onQuickReading: () => void;
  onCreateFiring: (values: FiringFormValues) => void;
  onTagsChange: (tags: string[]) => void;
}) {
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Firing journal</p>
            <h2>Records, live firing, schedule, and results</h2>
          </div>
          <button type="button" className="kb-primary-button" onClick={onQuickReading}>
            <Thermometer size={18} />
            <span>Quick reading</span>
          </button>
        </div>
        <div className="kb-firing-layout">
          <div className="kb-list">
            {firings.map((firing) => (
              <button
                key={firing.id}
                type="button"
                className={selectedFiring.id === firing.id ? "active" : ""}
                onClick={() => onSelectFiring(firing.id)}
              >
                <strong>{firing.readableNumber}</strong>
                <span>{firing.title}</span>
                <small>{firing.status.replaceAll("_", " ")} · Cone {firing.targetCone}</small>
              </button>
            ))}
          </div>
          <div className="kb-detail">
            <div className="kb-detail-head">
              <div>
                <h3>{selectedFiring.title}</h3>
                <span>{selectedFiring.kilnNameSnapshot} · {selectedFiring.kilnSpecSnapshot}</span>
              </div>
              <VisibilityPill visibility={selectedFiring.visibility} />
            </div>
            <div className="kb-metrics compact">
              <MetricCard label="Target" value={formatTemperature(selectedFiring.targetTemperatureC, "c")} detail={`Cone ${selectedFiring.targetCone}`} icon={Thermometer} />
              <MetricCard label="Atmosphere" value={selectedFiring.atmosphere.replaceAll("_", " ")} detail={selectedFiring.firingType} icon={CloudSun} />
              <MetricCard label="Load" value={`${selectedFiring.loadFullnessPercentage}%`} detail="Estimated fullness" icon={ClipboardList} />
            </div>
            <LiveFiringPanel
              selectedFiring={selectedFiring}
              ratePoints={ratePoints}
              estimate={estimate}
              onQuickReading={onQuickReading}
            />
            <ScheduleEditor ratePoints={ratePoints} />
            <ResultPanel
              applications={applications.filter((app) => app.firingId === selectedFiring.id)}
              glazes={glazes}
              clayBodies={clayBodies}
              imageTags={imageTags}
              onTagsChange={onTagsChange}
            />
          </div>
        </div>
      </section>
      <aside className="kb-stack">
        <CreateFiringForm kilns={kilns} glazes={glazes} clayBodies={clayBodies} onSubmit={onCreateFiring} />
        <FiringComparison firings={firings} />
      </aside>
    </div>
  );
}

function LiveFiringPanel({
  selectedFiring,
  ratePoints,
  estimate,
  onQuickReading,
}: {
  selectedFiring: FiringRecord;
  ratePoints: ReturnType<typeof calculateRateOfChange>;
  estimate: ReturnType<typeof estimateFiringDuration>;
  onQuickReading: () => void;
}) {
  const latest = ratePoints.at(-1);
  return (
    <section className="kb-live-panel">
      <div>
        <p className="kb-kicker">Live firing mode</p>
        <h3>{latest ? formatTemperature(latest.actualTemperatureC, "c") : "No readings"}</h3>
        <span>
          Target {formatTemperature(selectedFiring.targetTemperatureC, "c")} · Rate{" "}
          {latest?.rateCPerHour ? `${latest.rateCPerHour} C/hr` : "pending"}
        </span>
      </div>
      <div className="kb-live-actions">
        <button type="button" onClick={onQuickReading}>
          <Thermometer size={19} />
          <span>Add reading</span>
        </button>
        <button type="button">
          <ClipboardList size={19} />
          <span>Note</span>
        </button>
        <button type="button">
          <Wind size={19} />
          <span>Atmosphere</span>
        </button>
        <button type="button">
          <Camera size={19} />
          <span>Photo</span>
        </button>
      </div>
      <p className="kb-safety-note">
        Advisory range {estimate.totalHoursRange[0]}-{estimate.totalHoursRange[1]} hours. Manual readings are not kiln-control data; follow kiln manufacturer and studio safety procedures.
      </p>
    </section>
  );
}

function ScheduleEditor({
  ratePoints,
}: {
  ratePoints: ReturnType<typeof calculateRateOfChange>;
}) {
  return (
    <section className="kb-subpanel">
      <div className="kb-section-title compact">
        <h3>Schedule editor</h3>
        <div className="kb-segmented small" role="tablist" aria-label="Schedule editor modes">
          <button type="button" className="active">Graph</button>
          <button type="button">Table</button>
          <button type="button">Segments</button>
        </div>
      </div>
      <div className="kb-chart short">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={ratePoints}>
            <defs>
              <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8f4f3a" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#8f4f3a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 6" stroke="#ddd5ca" />
            <XAxis dataKey="elapsedMinutes" tickFormatter={(value) => `${value / 60}h`} />
            <YAxis tickFormatter={(value) => `${value}C`} />
            <Tooltip />
            <Area type="monotone" dataKey="actualTemperatureC" stroke="#8f4f3a" fill="url(#curveFill)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="kb-log-table" role="table" aria-label="Firing log readings">
        <div role="row">
          <span role="columnheader">Elapsed</span>
          <span role="columnheader">Actual</span>
          <span role="columnheader">Rate</span>
          <span role="columnheader">Atmosphere</span>
        </div>
        {ratePoints.slice(-4).map((point) => (
          <div role="row" key={point.id}>
            <span role="cell">{point.elapsedMinutes} min</span>
            <span role="cell">{formatTemperature(point.actualTemperatureC, "c")}</span>
            <span role="cell">{point.rateCPerHour ? `${point.rateCPerHour} C/hr` : "first point"}</span>
            <span role="cell">{point.atmosphere?.replaceAll("_", " ") ?? "not set"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultPanel({
  applications,
  glazes,
  clayBodies,
  imageTags,
  onTagsChange,
}: {
  applications: { glazeId: string; clayBodyId: string | null; resultRating?: number; resultStatus: string }[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  imageTags: string[];
  onTagsChange: (tags: string[]) => void;
}) {
  const suggestedTags = glazes.slice(0, 3);
  return (
    <section className="kb-subpanel">
      <div className="kb-section-title compact">
        <h3>Completed results and image tags</h3>
        <button type="button" className="kb-quiet-button">
          <Camera size={17} />
          <span>Upload</span>
        </button>
      </div>
      <div className="kb-result-grid">
        {applications.map((application) => {
          const glaze = glazes.find((item) => item.id === application.glazeId);
          const clay = clayBodies.find((item) => item.id === application.clayBodyId);
          return (
            <div className="kb-result-card" key={`${application.glazeId}-${application.clayBodyId}`}>
              <div className="kb-ceramic-photo small" />
              <strong>{glaze?.name ?? "Unknown glaze"}</strong>
              <span>{clay?.name ?? "Unknown clay body"} · {application.resultStatus.replaceAll("_", " ")}</span>
              <small>{application.resultRating ?? "Not rated"} result score</small>
            </div>
          );
        })}
      </div>
      <div className="kb-tag-workflow">
        <div>
          <p className="kb-kicker">Image-level structured tags</p>
          <div className="kb-chip-row">
            {imageTags.map((tag) => {
              const glaze = glazes.find((item) => item.id === tag);
              return (
                <button
                  type="button"
                  className="kb-chip removable"
                  key={tag}
                  onClick={() => onTagsChange(imageTags.filter((item) => item !== tag))}
                >
                  {glaze?.name ?? tag}
                </button>
              );
            })}
          </div>
        </div>
        <div className="kb-chip-row">
          {suggestedTags.map((glaze) => (
            <button
              type="button"
              className="kb-chip action"
              key={glaze.id}
              onClick={() =>
                onTagsChange(imageTags.includes(glaze.id) ? imageTags : [...imageTags, glaze.id])
              }
            >
              Add {glaze.name}
            </button>
          ))}
          <button type="button" className="kb-chip action">Copy previous</button>
          <button type="button" className="kb-chip action">Apply to all</button>
        </div>
      </div>
    </section>
  );
}

function CreateFiringForm({
  kilns,
  glazes,
  clayBodies,
  onSubmit,
}: {
  kilns: KilnProfile[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  onSubmit: (values: FiringFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FiringFormInput, unknown, FiringFormValues>({
    resolver: zodResolver(firingFormSchema),
    defaultValues: {
      title: "Cone 6 liner test",
      kilnId: kilns[0]?.id,
      clayBodyId: clayBodies[0]?.id,
      glazeId: glazes[0]?.id,
      targetTemperatureC: 1222,
      targetCone: "6",
      location: "indoors",
      humidity: 58,
      windSpeedKph: 0,
    },
  });

  return (
    <section className="kb-panel">
      <div className="kb-section-title compact">
        <h3>Create firing</h3>
        <span>Phase 1 form</span>
      </div>
      <form className="kb-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          <span>Title</span>
          <input {...register("title")} />
          {errors.title && <small>{errors.title.message}</small>}
        </label>
        <label>
          <span>Kiln</span>
          <select {...register("kilnId")}>
            {kilns.map((kiln) => (
              <option key={kiln.id} value={kiln.id}>{kiln.name}</option>
            ))}
          </select>
        </label>
        <div className="kb-form-grid">
          <label>
            <span>Glaze</span>
            <select {...register("glazeId")}>
              {glazes.map((glaze) => (
                <option key={glaze.id} value={glaze.id}>{glaze.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Clay body</span>
            <select {...register("clayBodyId")}>
              {clayBodies.map((clay) => (
                <option key={clay.id} value={clay.id}>{clay.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Target C</span>
            <input type="number" {...register("targetTemperatureC")} />
          </label>
          <label>
            <span>Cone</span>
            <input {...register("targetCone")} />
          </label>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Location</span>
            <select {...register("location")}>
              <option value="indoors">Indoors</option>
              <option value="semi_enclosed">Semi-enclosed</option>
              <option value="outdoors_partially_covered">Outdoors covered</option>
            </select>
          </label>
          <label>
            <span>Humidity</span>
            <input type="number" {...register("humidity")} />
          </label>
        </div>
        <label>
          <span>Wind speed kph</span>
          <input type="number" {...register("windSpeedKph")} />
        </label>
        <button type="submit" className="kb-primary-button full">
          <Plus size={17} />
          <span>Plan firing</span>
        </button>
      </form>
    </section>
  );
}

function FiringComparison({ firings }: { firings: FiringRecord[] }) {
  return (
    <section className="kb-panel">
      <div className="kb-section-title compact">
        <h3>Firing comparison</h3>
        <span>2 to 5 firings</span>
      </div>
      <div className="kb-comparison-list">
        {firings.slice(0, 3).map((firing) => (
          <div key={firing.id}>
            <strong>{firing.readableNumber}</strong>
            <span>{formatTemperature(firing.targetTemperatureC, "c")} · {firing.atmosphere.replaceAll("_", " ")}</span>
            <progress value={firing.successRating ?? 60} max={100} aria-label={`${firing.readableNumber} result score`} />
          </div>
        ))}
      </div>
    </section>
  );
}

function GlazesScreen({
  glazes,
  recipes,
  applications,
  clayBodies,
  firings,
}: {
  glazes: GlazeProfile[];
  recipes: { glazeId: string; versionNumber: number; visibility: Visibility; changeSummary: string; ingredients: { materialName: string; percentage: number; role: string }[] }[];
  applications: { glazeId: string; clayBodyId: string | null; firingId: string; resultRating?: number }[];
  clayBodies: ClayBodyProfile[];
  firings: FiringRecord[];
}) {
  const glaze = glazes[0];
  const glazeRecipes = recipes.filter((recipe) => recipe.glazeId === glaze.id);
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Glaze library</p>
            <h2>Canonical glaze profiles and recipe versions</h2>
          </div>
          <button type="button" className="kb-primary-button">
            <Plus size={18} />
            <span>New glaze</span>
          </button>
        </div>
        <div className="kb-library-grid">
          {glazes.map((item) => (
            <LibraryCard
              key={item.id}
              title={item.name}
              eyebrow={item.glazeType}
              detail={`${item.coneRange} · ${item.surface}`}
              color={item.heroImageColor}
            />
          ))}
        </div>
      </section>
      <aside className="kb-stack">
        <section className="kb-panel">
          <div className="kb-section-title compact">
            <h3>{glaze.name}</h3>
            <VisibilityPill visibility={glaze.recipeVisibility} />
          </div>
          <div className="kb-hero-swatch" style={{ background: glaze.heroImageColor }} />
          <p>{glaze.description}</p>
          <div className="kb-chip-row">
            {glaze.colorFamily.map((color) => (
              <span className="kb-chip" key={color}>{color}</span>
            ))}
          </div>
        </section>
        <section className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Recipe editor</h3>
            <span>Historical versions</span>
          </div>
          {glazeRecipes.map((recipe) => (
            <div className="kb-version-row" key={`${recipe.glazeId}-${recipe.versionNumber}`}>
              <strong>Version {recipe.versionNumber}</strong>
              <span>{recipe.changeSummary}</span>
              <small>{recipe.ingredients.filter((ingredient) => ingredient.role === "base").length} base ingredients · {recipe.visibility}</small>
            </div>
          ))}
        </section>
        <section className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Connected results</h3>
            <span>Automatic relationships</span>
          </div>
          {applications.filter((app) => app.glazeId === glaze.id).map((app) => {
            const clay = clayBodies.find((item) => item.id === app.clayBodyId);
            const firing = firings.find((item) => item.id === app.firingId);
            return (
              <div className="kb-linked-row" key={`${app.firingId}-${app.clayBodyId}`}>
                <span>{clay?.name ?? "Unknown clay body"}</span>
                <strong>{firing?.readableNumber}</strong>
                <small>{app.resultRating ?? "Unrated"} score</small>
              </div>
            );
          })}
        </section>
      </aside>
    </div>
  );
}

function ClayBodiesScreen({
  clayBodies,
  glazes,
  applications,
  firings,
}: {
  clayBodies: ClayBodyProfile[];
  glazes: GlazeProfile[];
  applications: { glazeId: string; clayBodyId: string | null; firingId: string; resultRating?: number }[];
  firings: FiringRecord[];
}) {
  const clay = clayBodies[0];
  const related = applications.filter((application) => application.clayBodyId === clay.id);
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Clay-body library</p>
            <h2>First-class clay records across firings and glaze results</h2>
          </div>
          <button type="button" className="kb-primary-button">
            <Plus size={18} />
            <span>New clay body</span>
          </button>
        </div>
        <div className="kb-library-grid">
          {clayBodies.map((item) => (
            <LibraryCard
              key={item.id}
              title={item.name}
              eyebrow={item.bodyType}
              detail={`${item.coneRange} · ${item.firedColor}`}
              color={item.imageColor}
            />
          ))}
        </div>
      </section>
      <aside className="kb-panel">
        <div className="kb-section-title compact">
          <h3>{clay.name}</h3>
          <VisibilityPill visibility={clay.profileVisibility} />
        </div>
        <div className="kb-clay-profile">
          <div className="kb-hero-swatch" style={{ background: clay.imageColor }} />
          <div className="kb-spec-list">
            <span>Texture <strong>{clay.texture}</strong></span>
            <span>Shrinkage <strong>{clay.shrinkagePercentage}%</strong></span>
            <span>Absorption <strong>{clay.absorptionPercentage}%</strong></span>
            <span>Cone <strong>{clay.coneRange}</strong></span>
          </div>
        </div>
        <h4>Glaze performance</h4>
        {related.map((application) => {
          const glaze = glazes.find((item) => item.id === application.glazeId);
          const firing = firings.find((item) => item.id === application.firingId);
          return (
            <div className="kb-linked-row" key={`${application.glazeId}-${application.firingId}`}>
              <span>{glaze?.name}</span>
              <strong>{application.resultRating ?? "Unrated"}</strong>
              <small>{firing?.readableNumber}</small>
            </div>
          );
        })}
      </aside>
    </div>
  );
}

function KilnsScreen({
  kilns,
  firings,
}: {
  kilns: KilnProfile[];
  firings: FiringRecord[];
}) {
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Kiln profiles</p>
            <h2>Canonical kiln records with historical firing snapshots</h2>
          </div>
          <button type="button" className="kb-primary-button">
            <Plus size={18} />
            <span>New kiln</span>
          </button>
        </div>
        <div className="kb-library-grid">
          {kilns.map((kiln) => (
            <LibraryCard
              key={kiln.id}
              title={kiln.name}
              eyebrow={kiln.kilnType}
              detail={`${kiln.usableVolumeLiters} L · ${kiln.recommendedConeRange}`}
              color={kiln.kilnType === "electric" ? "#315d67" : "#8f4f3a"}
            />
          ))}
        </div>
      </section>
      <aside className="kb-stack">
        {kilns.slice(0, 2).map((kiln) => (
          <section className="kb-panel" key={kiln.id}>
            <div className="kb-section-title compact">
              <h3>{kiln.name}</h3>
              <span>{kiln.active ? "Active" : "Retired"}</span>
            </div>
            <div className="kb-spec-list">
              <span>Controller <strong>{kiln.controllerType}</strong></span>
              <span>Maximum <strong>{formatTemperature(kiln.maxTemperatureC, "c")}</strong></span>
              <span>Location <strong>{kiln.defaultLocation.replaceAll("_", " ")}</strong></span>
              <span>Firings <strong>{firings.filter((firing) => firing.kilnId === kiln.id).length}</strong></span>
            </div>
            <div className="kb-maintenance-row">
              <CheckCircle2 size={18} />
              <span>Thermocouple calibration recorded after latest cone check</span>
            </div>
          </section>
        ))}
      </aside>
    </div>
  );
}

function ExploreScreen({
  query,
  glazes,
  clayBodies,
  posts,
  firings,
}: {
  query: string;
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  posts: Post[];
  firings: FiringRecord[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGlazes = glazes.filter(
    (glaze) =>
      !normalizedQuery ||
      glaze.name.toLowerCase().includes(normalizedQuery) ||
      glaze.surface.toLowerCase().includes(normalizedQuery),
  );

  return (
    <div className="kb-stack">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Explore</p>
            <h2>Shared glaze and clay-body results from authorized records</h2>
          </div>
          <div className="kb-chip-row">
            <span className="kb-chip">Cone</span>
            <span className="kb-chip">Atmosphere</span>
            <span className="kb-chip">Clay body</span>
            <span className="kb-chip">Application</span>
          </div>
        </div>
        <div className="kb-explore-grid">
          {visibleGlazes.map((glaze) => (
            <article className="kb-public-card" key={glaze.id}>
              <div className="kb-hero-swatch" style={{ background: glaze.heroImageColor }} />
              <h3>{glaze.name}</h3>
              <p>{glaze.description}</p>
              <div className="kb-chip-row">
                <span className="kb-chip">{glaze.coneRange}</span>
                <span className="kb-chip">{glaze.recipeVisibility} recipe</span>
              </div>
            </article>
          ))}
          {clayBodies.map((clay) => (
            <article className="kb-public-card" key={clay.id}>
              <div className="kb-hero-swatch" style={{ background: clay.imageColor }} />
              <h3>{clay.name}</h3>
              <p>{clay.notes}</p>
              <div className="kb-chip-row">
                <span className="kb-chip">{clay.bodyType}</span>
                <span className="kb-chip">{clay.coneRange}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="kb-grid-two equal">
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Public glaze result</h3>
            <span>{posts.length} community posts</span>
          </div>
          <FeedCard post={posts[1] ?? posts[0]} firing={firings[2]} glaze={glazes[2]} />
        </div>
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Public clay-body page</h3>
            <span>Filtered authorized results</span>
          </div>
          <div className="kb-spec-list">
            <span>Glazes used <strong>{glazes.length}</strong></span>
            <span>Firings linked <strong>{firings.filter((firing) => firing.visibility !== "private").length}</strong></span>
            <span>Atmospheres <strong>oxidation, reduction, soda</strong></span>
            <span>Private recipes <strong>redacted</strong></span>
          </div>
        </div>
      </section>
    </div>
  );
}

function MessagesScreen({
  conversations,
}: {
  conversations: { id: string; participantName: string; participantUsername: string; unreadCount: number; lastMessage: string; updatedAt: string; linkedRecordLabel?: string }[];
}) {
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Messages</p>
            <h2>Studio conversations with ceramic record links</h2>
          </div>
        </div>
        <div className="kb-message-list">
          {conversations.map((conversation) => (
            <button type="button" key={conversation.id} className="kb-message-row">
              <div className="kb-avatar">{conversation.participantName.slice(0, 1)}</div>
              <div>
                <strong>{conversation.participantName}</strong>
                <span>{conversation.lastMessage}</span>
                {conversation.linkedRecordLabel && <small>{conversation.linkedRecordLabel}</small>}
              </div>
              {conversation.unreadCount > 0 && <b>{conversation.unreadCount}</b>}
            </button>
          ))}
        </div>
      </section>
      <aside className="kb-panel kb-conversation">
        <div className="kb-section-title compact">
          <h3>Jules Navarro</h3>
          <span>Typing indicators and realtime updates use scoped subscriptions.</span>
        </div>
        <div className="kb-bubble received">Can you send the curve from the top thermocouple before the next soda load?</div>
        <div className="kb-bubble sent">Yes. I tagged the wind gusts and damper notes on Firing 042 so the comparison is readable.</div>
        <div className="kb-bubble received">Perfect. I will link it to the celadon test thread.</div>
        <form className="kb-message-compose">
          <input aria-label="Message" placeholder="Message Jules" />
          <button type="button" className="kb-primary-button">
            <Send size={17} />
            <span>Send</span>
          </button>
        </form>
      </aside>
    </div>
  );
}

function AnalyticsScreen({
  plan,
  firings,
  glazes,
  clayBodies,
}: {
  plan: "free" | "professional" | "studio";
  firings: FiringRecord[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
}) {
  const advanced = getEntitlementDecision(plan, "advanced_firing_analytics");
  return (
    <div className="kb-stack">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Analytics</p>
            <h2>Understand patterns without overstating causation</h2>
          </div>
          <EntitlementBadge allowed={advanced.allowed} label={advanced.allowed ? "Professional" : "Preview"} />
        </div>
        <div className="kb-metrics">
          <MetricCard label="Average cooling" value="16.8 h" detail="Cone 6-10 completed firings" icon={CloudSun} />
          <MetricCard label="Glaze fit checks" value={String(glazes.length + clayBodies.length)} detail="Clay/glaze combinations" icon={Microscope} />
          <MetricCard label="Consistency" value="86" detail={advanced.allowed ? "Saved dashboard" : "Professional preview"} icon={Activity} />
        </div>
      </section>
      <section className="kb-grid-two equal">
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Environmental correlation summary</h3>
            <span>{advanced.reason}</span>
          </div>
          <p className="kb-correlation">
            Pinholing appeared more frequently in firings with shorter holds. The app does not claim the hold length caused the defect.
          </p>
        </div>
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Cost and energy trend</h3>
            <span>{firings.length} firings available</span>
          </div>
          <div className="kb-chart short">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: "F041", cost: 18 },
                { name: "F042", cost: 44 },
                { name: "F017", cost: 51 },
              ]}>
                <CartesianGrid strokeDasharray="4 6" stroke="#ddd5ca" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip />
                <Bar dataKey="cost" fill="#8f4f3a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileScreen({
  viewer,
  posts,
  onOpenSettings,
}: {
  viewer: { displayName: string; username: string; biography: string; specialties: string[]; profileVisibility: Visibility; subscriptionTier: string; locationLabel?: string };
  posts: Post[];
  onOpenSettings: () => void;
}) {
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-profile-head">
          <div className="kb-avatar large">{viewer.displayName.slice(0, 1)}</div>
          <div>
            <p className="kb-kicker">Public profile</p>
            <h2>{viewer.displayName}</h2>
            <span>@{viewer.username} · {viewer.locationLabel}</span>
          </div>
          <VisibilityPill visibility={viewer.profileVisibility} />
        </div>
        <p>{viewer.biography}</p>
        <div className="kb-chip-row">
          {viewer.specialties.map((specialty) => (
            <span className="kb-chip" key={specialty}>{specialty}</span>
          ))}
        </div>
        <button type="button" className="kb-primary-button" onClick={onOpenSettings}>
          <Settings size={18} />
          <span>Edit settings</span>
        </button>
      </section>
      <aside className="kb-panel">
        <div className="kb-section-title compact">
          <h3>Recent posts</h3>
          <span>{posts.length} linked records</span>
        </div>
        {posts.map((post) => (
          <div className="kb-linked-row" key={post.id}>
            <span>{post.body.slice(0, 58)}...</span>
            <strong>{post.likes}</strong>
            <small>likes</small>
          </div>
        ))}
      </aside>
    </div>
  );
}

function SettingsScreen({ plan }: { plan: "free" | "professional" | "studio" }) {
  const messaging = getEntitlementDecision(plan, "limited_messaging");
  const privateHistory = getEntitlementDecision(plan, "private_recipe_history");
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Account settings</p>
            <h2>Authentication, units, privacy, and notifications</h2>
          </div>
        </div>
        <div className="kb-settings-list">
          <SettingRow title="Email and password" body="Enabled through Supabase Auth with password reset." />
          <SettingRow title="Magic link and Google" body="Configured in Supabase providers, with secure session handling." />
          <SettingRow title="Preferred units" body="Celsius, grams, liters, and kph stored as normalized presentation preferences." />
          <SettingRow title="Profile visibility" body="Public profile, private email, configurable notification preferences." />
        </div>
      </section>
      <aside className="kb-panel">
        <div className="kb-section-title compact">
          <h3>Subscription</h3>
          <EntitlementBadge allowed label={plan} />
        </div>
        <div className="kb-settings-list">
          <SettingRow title="Monthly conversation requests" body={`${messaging.limit ?? "Unlimited"} new requests available on this plan.`} />
          <SettingRow title="Recipe version history" body={privateHistory.allowed ? "Private recipe history is active." : privateHistory.reason} />
          <SettingRow title="Exports" body="Basic CSV and JSON backup included; PDF reports are professional." />
        </div>
      </aside>
    </div>
  );
}

function LibraryScreen({
  glazes,
  clayBodies,
  kilns,
  onViewChange,
}: {
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  kilns: KilnProfile[];
  onViewChange: (view: View) => void;
}) {
  return (
    <section className="kb-panel">
      <div className="kb-section-title">
        <div>
          <p className="kb-kicker">Mobile library</p>
          <h2>Glazes, clay bodies, and kilns</h2>
        </div>
      </div>
      <div className="kb-library-grid">
        <button type="button" onClick={() => onViewChange("Glazes")}>
          <LibraryCard title="Glazes" eyebrow={`${glazes.length} profiles`} detail="Recipes and results" color="#9bb4bd" />
        </button>
        <button type="button" onClick={() => onViewChange("Clay Bodies")}>
          <LibraryCard title="Clay Bodies" eyebrow={`${clayBodies.length} profiles`} detail="Fit and fired color" color="#b9855f" />
        </button>
        <button type="button" onClick={() => onViewChange("Kilns")}>
          <LibraryCard title="Kilns" eyebrow={`${kilns.length} profiles`} detail="Specs and maintenance" color="#315d67" />
        </button>
      </div>
    </section>
  );
}

function MarketingLandingPreview() {
  return (
    <section className="kb-panel kb-landing-preview">
      <p className="kb-kicker">Public landing page</p>
      <h2>{PRODUCT.name}</h2>
      <p>{PRODUCT.description}</p>
      <div className="kb-product-shot" aria-label="Product screenshot mockup">
        <div className="kb-shot-sidebar" />
        <div className="kb-shot-main">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="kb-chip-row">
        <span className="kb-chip">Firing journal</span>
        <span className="kb-chip">Glaze results</span>
        <span className="kb-chip">Private recipes</span>
      </div>
    </section>
  );
}

function AuthOnboardingPreview() {
  return (
    <section className="kb-panel">
      <p className="kb-kicker">Onboarding</p>
      <h3>Studio setup checklist</h3>
      <div className="kb-checklist">
        <span><CheckCircle2 size={17} /> Profile and username</span>
        <span><CheckCircle2 size={17} /> Preferred units</span>
        <span><CheckCircle2 size={17} /> First kiln</span>
        <span><CheckCircle2 size={17} /> First glaze and clay body</span>
      </div>
      <div className="kb-auth-tabs">
        <button type="button" className="active">Sign in</button>
        <button type="button">Sign up</button>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="kb-metric-card">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function LibraryCard({
  title,
  eyebrow,
  detail,
  color,
}: {
  title: string;
  eyebrow: string;
  detail: string;
  color: string;
}) {
  return (
    <article className="kb-library-card">
      <div className="kb-library-swatch" style={{ background: color }} />
      <span>{eyebrow}</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </article>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="kb-empty-state">
      <Icon size={28} />
      <strong>{title}</strong>
      <p>{body}</p>
      <button type="button" className="kb-primary-button" onClick={onAction}>
        <Search size={17} />
        <span>{actionLabel}</span>
      </button>
    </div>
  );
}

function VisibilityPill({ visibility }: { visibility: Visibility }) {
  const Icon = visibility === "private" ? LockKeyhole : visibility === "public" ? Sparkles : ShieldCheck;
  return (
    <span className={`kb-visibility ${visibility}`}>
      <Icon size={14} />
      {visibility === "studio" ? "studio only" : visibility}
    </span>
  );
}

function EntitlementBadge({ allowed, label }: { allowed: boolean; label: string }) {
  return (
    <span className={allowed ? "kb-entitlement allowed" : "kb-entitlement preview"}>
      {allowed ? <CheckCircle2 size={14} /> : <LockKeyhole size={14} />}
      {label}
    </span>
  );
}

function SettingRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="kb-setting-row">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function MobileNav({
  view,
  onViewChange,
}: {
  view: View;
  onViewChange: (view: View) => void;
}) {
  const items: Array<{ label: string; view: View; icon: LucideIcon }> = [
    { label: "Home", view: "Home", icon: BookOpen },
    { label: "Firings", view: "Firings", icon: Flame },
    { label: "Add", view: "Firings", icon: Plus },
    { label: "Library", view: "Library", icon: Layers3 },
    { label: "Profile", view: "Profile", icon: UserRound },
  ];
  return (
    <nav className="kb-mobile-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            type="button"
            key={item.label}
            className={view === item.view ? "active" : ""}
            onClick={() => onViewChange(item.view)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function atmosphereData(firings: FiringRecord[]) {
  const counts = firings.reduce<Record<string, number>>((acc, firing) => {
    const key = firing.atmosphere.replaceAll("_", " ");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

function relativeDate(value: string): string {
  const diffHours = Math.max((Date.now() - new Date(value).getTime()) / 3_600_000, 0);
  if (diffHours < 24) return `${Math.max(Math.round(diffHours), 1)}h`;
  return `${Math.round(diffHours / 24)}d`;
}
