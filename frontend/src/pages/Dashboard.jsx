import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import StatCard from '../components/StatCard';
import ModuleCard from '../components/ModuleCard';
import EnergyChart from '../components/EnergyChart';
import AlertsPanel from '../components/AlertsPanel';
import SchedulesPanel from '../components/SchedulesPanel';
import QuickActions from '../components/QuickActions';
import CircularGauge from '../components/CircularGauge';
import AddModuleModal from '../components/AddModuleModal';
import ConfirmModal from '../components/ConfirmModal';
import {
  Zap, Activity, DollarSign, Leaf, TrendingDown,
  Plus, Cpu
} from 'lucide-react';

// ── Electricity rate (configurable) ─────────────────────────
const RATE_PER_KWH = 0.12; // USD per kWh

/**
 * Compute today's total kWh from readings inserted since midnight.
 */
async function fetchTodayKwh() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('readings')
    .select('watts, at')
    .gte('at', todayStart.toISOString());

  if (!data || data.length === 0) return 0;

  // Riemann sum: each reading represents ~4s of energy
  const kWh = data.reduce((sum, r) => sum + r.watts * (4 / 3600 / 1000), 0);
  return parseFloat(kWh.toFixed(3));
}

async function fetchMonthKwh() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('readings')
    .select('watts')
    .gte('at', monthStart.toISOString());

  if (!data || data.length === 0) return 0;
  const kWh = data.reduce((sum, r) => sum + r.watts * (4 / 3600 / 1000), 0);
  return parseFloat(kWh.toFixed(2));
}

async function fetchLastMonthKwh() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  const { data } = await supabase
    .from('readings')
    .select('watts')
    .gte('at', lastMonthStart.toISOString())
    .lt('at', thisMonthStart.toISOString());

  if (!data || data.length === 0) return 0;
  const kWh = data.reduce((sum, r) => sum + r.watts * (4 / 3600 / 1000), 0);
  return parseFloat(kWh.toFixed(2));
}

export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [modules, setModules] = useState([]);
  const [todayKwh, setTodayKwh] = useState(0);
  const [monthKwh, setMonthKwh] = useState(0);
  const [lastMonthKwh, setLastMonthKwh] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadingModules, setLoadingModules] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ── Derived stats ─────────────────────────────────────────
  const currentW = modules.filter(m => m.desired_state).reduce((s, m) => s + m.watts, 0);
  const estBill = (monthKwh * RATE_PER_KWH).toFixed(2);
  
  // Real calculation for saved percentage
  const now = new Date();
  const daysThisMonth = now.getDate();
  const daysLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  
  let savedPct = 0;
  let moneySaved = '0.00';
  
  if (lastMonthKwh > 0) {
    const dailyAvgThisMonth = monthKwh / daysThisMonth;
    const dailyAvgLastMonth = lastMonthKwh / daysLastMonth;
    
    if (dailyAvgLastMonth > 0) {
      const ratio = dailyAvgThisMonth / dailyAvgLastMonth;
      savedPct = Math.round((1 - ratio) * 100);
    }
    
    const estProratedLastMonth = (lastMonthKwh / daysLastMonth) * daysThisMonth * RATE_PER_KWH;
    const currentCost = monthKwh * RATE_PER_KWH;
    moneySaved = Math.abs(estProratedLastMonth - currentCost).toFixed(2);
  }

  // ── Fetch modules + subscribe Realtime ───────────────────
  async function fetchModules() {
    if (!profile?.id) return;
    let query = supabase.from('modules').select('*, owner:profiles(name)').order('name');
    if (!isAdmin) {
      query = query.eq('owner_id', profile.id);
    }
    const { data } = await query;
    if (data) setModules(data);
    setLoadingModules(false);
  }

  useEffect(() => {
    fetchModules();
    fetchTodayKwh().then(setTodayKwh);
    fetchMonthKwh().then(setMonthKwh);
    fetchLastMonthKwh().then(setLastMonthKwh);

    const channel = supabase
      .channel('modules-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'modules' },
        payload => {
          if (payload.eventType === 'INSERT') {
            fetchModules();
          } else if (payload.eventType === 'UPDATE') {
            setModules(prev =>
              prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
            );
          } else if (payload.eventType === 'DELETE') {
            setModules(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Refresh energy stats when new readings arrive
    const readingsChannel = supabase
      .channel('readings-stats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'readings' },
        () => {
          fetchTodayKwh().then(setTodayKwh);
          fetchMonthKwh().then(setMonthKwh);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(readingsChannel);
    };
  }, [profile?.id]);

  async function handleDeleteConfirm() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    await supabase.from('modules').delete().eq('id', id);
  }

  function handleDelete(id) {
    setConfirmDeleteId(id);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Stat Cards ─────────────────────────────────────── */}
      <section id="stats" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          icon={Zap}
          label="Total Today"
          value={todayKwh.toFixed(3)}
          unit="kWh"
          trend="neutral"
          color="bg-accent/10"
          iconColor="text-accent"
        />
        <StatCard
          icon={Activity}
          label="Current Power"
          value={currentW.toFixed(1)}
          unit="W"
          trend="neutral"
          color="bg-blue-500/10"
          iconColor="text-blue-400"
        />
        <StatCard
          icon={TrendingDown}
          label="Monthly Usage"
          value={monthKwh.toFixed(2)}
          unit="kWh"
          trend="down"
          trendVal="-12%"
          color="bg-purple-500/10"
          iconColor="text-purple-400"
        />
        <StatCard
          icon={DollarSign}
          label="Est. Bill"
          value={`$${estBill}`}
          trend="down"
          trendVal={`-${savedPct}%`}
          color="bg-yellow-500/10"
          iconColor="text-yellow-400"
        />
        <StatCard
          icon={Leaf}
          label="Money Saved"
          value={`$${moneySaved}`}
          trend={savedPct >= 0 ? 'up' : 'down'}
          trendVal={`${savedPct >= 0 ? '+' : ''}${savedPct}%`}
          color={savedPct >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
          iconColor={savedPct >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </section>

      {/* ── Modules + Chart row ─────────────────────────────── */}
      <section id="modules" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Modules grid */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted" />
              <h2 className="section-title mb-0">My Appliances</h2>
              <span className="badge badge-muted">{modules.length}</span>
            </div>
            {isAdmin && (
              <button
                id="add-module-btn"
                onClick={() => setShowAddModal(true)}
                className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Appliance
              </button>
            )}
          </div>

          {loadingModules ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-5 h-40 animate-pulse bg-card" />
              ))}
            </div>
          ) : modules.length === 0 ? (
            <div className="card p-10 flex flex-col items-center justify-center text-muted gap-3">
              <Cpu className="w-10 h-10 opacity-30" />
              <p className="text-sm">No appliances yet</p>
              {isAdmin && (
                <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs py-2 px-4">
                  Register First Appliance
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {modules.map(m => (
                <ModuleCard
                  key={m.id}
                  module={m}
                  isAdmin={isAdmin}
                  currentUserId={profile?.id}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right column: gauge + quick actions */}
        <div className="flex flex-col gap-4">
          {/* Energy saved gauge */}
          <div className="card p-6 flex flex-col items-center gap-4 relative overflow-hidden group">
            {/* Soft background glow */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${savedPct >= 0 ? 'bg-green-500' : 'bg-red-500'} group-hover:opacity-30 transition-opacity`} />
            
            <h2 className="section-title mb-0 self-start">Energy Saved</h2>
            <CircularGauge percent={savedPct} label="vs last month avg" />
            
            <p className="text-muted text-xs text-center mt-2 relative z-10">
              {savedPct >= 0 ? (
                <>You've saved <span className="text-emerald-400 font-semibold">${moneySaved}</span> this month by optimising usage</>
              ) : (
                <>You've spent <span className="text-red-400 font-semibold">${moneySaved}</span> more this month compared to last month</>
              )}
            </p>
          </div>

          {/* Quick actions */}
          <QuickActions modules={modules} />
        </div>
      </section>

      {/* ── Energy Chart ─────────────────────────────────────── */}
      <section id="energy">
        <EnergyChart />
      </section>

      {/* ── Schedules + Alerts ───────────────────────────────── */}
      <section id="schedules" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SchedulesPanel modules={modules} />
        <div id="alerts">
          <AlertsPanel />
        </div>
      </section>

      {/* Add Appliance Modal */}
      {showAddModal && (
        <AddModuleModal
          onClose={() => setShowAddModal(false)}
          onAdded={fetchModules}
        />
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Delete Appliance"
          message="Are you sure you want to delete this appliance? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
