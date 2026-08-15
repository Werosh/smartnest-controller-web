import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import EnergyChart from '../components/EnergyChart';
import CircularGauge from '../components/CircularGauge';
import StatCard from '../components/StatCard';
import { Zap, Activity, DollarSign, Leaf, TrendingDown, BarChart2 } from 'lucide-react';

const RATE_PER_KWH = 0.12;

async function fetchTodayKwh() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('readings')
    .select('watts, at')
    .gte('at', todayStart.toISOString());

  if (!data || data.length === 0) return 0;
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

export default function Energy() {
  const [todayKwh, setTodayKwh] = useState(0);
  const [monthKwh, setMonthKwh] = useState(0);
  const [currentW, setCurrentW] = useState(0);

  const savedPct = 18;
  const estBill = (monthKwh * RATE_PER_KWH).toFixed(2);
  const moneySaved = (monthKwh * RATE_PER_KWH * (savedPct / 100)).toFixed(2);

  useEffect(() => {
    fetchTodayKwh().then(setTodayKwh);
    fetchMonthKwh().then(setMonthKwh);

    // Initial current wattage fetch
    supabase.from('modules').select('watts').eq('desired_state', true).then(({ data }) => {
      if (data) setCurrentW(data.reduce((s, m) => s + m.watts, 0));
    });

    const channel = supabase
      .channel('energy-page-modules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modules' }, () => {
        supabase.from('modules').select('watts').eq('desired_state', true).then(({ data }) => {
          if (data) setCurrentW(data.reduce((s, m) => s + m.watts, 0));
        });
      })
      .subscribe();

    const readingsChannel = supabase
      .channel('energy-page-readings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, () => {
        fetchTodayKwh().then(setTodayKwh);
        fetchMonthKwh().then(setMonthKwh);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(readingsChannel);
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-6 h-6 text-muted" />
        <h2 className="text-xl font-semibold text-text">Energy Analytics</h2>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
          trend="up"
          trendVal={`+${savedPct}%`}
          color="bg-emerald-500/10"
          iconColor="text-emerald-400"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <EnergyChart />
        </div>

        <div className="card p-6 flex flex-col items-center justify-center gap-4">
          <h2 className="section-title mb-0 self-start">Energy Saved</h2>
          <CircularGauge percent={savedPct} label="vs last month" />
          <p className="text-muted text-xs text-center mt-2">
            You've saved <span className="text-accent font-semibold">${moneySaved}</span> this month
            by optimising usage. Keep up the good work!
          </p>
        </div>
      </section>
    </div>
  );
}
