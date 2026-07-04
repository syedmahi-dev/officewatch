import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { Fan, Grid, Lightbulb } from 'lucide-react';

const ROOM_NAMES = {
  drawing: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2',
};

function FanIcon({ isOn, isConnected }) {
  const iconRef = useRef(null);
  const tweenRef = useRef(null);

  useEffect(() => {
    if (!tweenRef.current && iconRef.current) {
      tweenRef.current = gsap.to(iconRef.current, {
        rotation: 360,
        repeat: -1,
        duration: 2,
        ease: 'none',
        paused: true,
      });
    }

    if (isOn && isConnected) {
      tweenRef.current?.play();
    } else {
      tweenRef.current?.pause();
    }
  }, [isOn, isConnected]);

  return (
    <div ref={iconRef} className="flex h-5 w-5 items-center justify-center origin-center">
      <Fan className={`h-full w-full transition-colors duration-300 ${isOn ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-cyan-400/60'}`} />
    </div>
  );
}

function LightIcon({ isOn, isConnected }) {
  const glowRef = useRef(null);

  useEffect(() => {
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: isOn && isConnected ? 1 : 0,
        scale: isOn && isConnected ? 1.18 : 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [isOn, isConnected]);

  return (
    <div className="relative flex h-5 w-5 items-center justify-center">
      <div
        ref={glowRef}
        className="absolute inset-0 rounded-full bg-[rgba(250,204,21,0.35)] blur-md"
      />
      <Lightbulb className={`relative z-10 h-full w-full transition-colors duration-300 ${isOn ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-amber-400/60'}`} />
    </div>
  );
}

function DeviceCard({ device, isConnected }) {
  const isOn = device.status === 'on';
  const deviceLabel = device.id.split('-').slice(1).join(' ');
  const isFan = device.type === 'fan';

  return (
    <article
      className={`group rounded-2xl border p-4 transition-all duration-300 ${
        isOn
          ? isFan
            ? 'border-cyan-500/45 bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 shadow-[0_4px_20px_rgba(34,211,238,0.12)]'
            : 'border-amber-500/45 bg-gradient-to-b from-amber-500/15 to-amber-500/5 shadow-[0_4px_20px_rgba(251,191,36,0.12)]'
          : isFan
            ? 'border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/35 hover:bg-cyan-500/10'
            : 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/35 hover:bg-amber-500/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-105 ${
              isOn
                ? isFan
                  ? 'border-cyan-400/40 bg-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                  : 'border-amber-400/40 bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                : isFan
                  ? 'border-cyan-500/25 bg-cyan-500/10'
                  : 'border-amber-500/25 bg-amber-500/10'
            }`}
          >
            {isFan ? (
              <FanIcon isOn={isOn} isConnected={isConnected} />
            ) : (
              <LightIcon isOn={isOn} isConnected={isConnected} />
            )}
          </div>

          <div>
            <p className="text-sm font-medium capitalize text-[var(--text-primary)]">
              {deviceLabel}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {isFan ? 'Ceiling fan' : 'Lighting circuit'}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-300 ${
            isOn
              ? isFan
                ? 'border border-cyan-400/40 bg-cyan-400/20 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'border border-amber-400/40 bg-amber-400/20 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
              : 'border border-zinc-700/60 bg-zinc-900/80 text-zinc-400'
          }`}
        >
          {isOn ? 'On' : 'Off'}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-numeric text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          {isOn ? device.powerDrawWatts : 0} W
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {isConnected ? (isOn ? 'Drawing power' : 'Standing by') : 'Awaiting sync'}
        </p>
      </div>
    </article>
  );
}

export function DeviceStatusPanel({ devices, isConnected }) {
  const roomSummaries = useMemo(() => {
    const grouped = {};

    devices.forEach((device) => {
      if (!grouped[device.room]) {
        grouped[device.room] = [];
      }

      grouped[device.room].push(device);
    });

    Object.keys(grouped).forEach((room) => {
      grouped[room].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'fan' ? -1 : 1;
        }

        return a.id.localeCompare(b.id);
      });
    });

    return Object.keys(ROOM_NAMES)
      .map((roomId) => {
        const roomDevices = grouped[roomId] || [];
        const activeCount = roomDevices.filter((device) => device.status === 'on').length;
        const roomPower = roomDevices.reduce((sum, device) => sum + device.powerDrawWatts, 0);

        return {
          roomId,
          roomName: ROOM_NAMES[roomId],
          devices: roomDevices,
          activeCount,
          roomPower,
        };
      })
      .filter((room) => room.devices.length > 0);
  }, [devices]);

  const activeDeviceCount = devices.filter((device) => device.status === 'on').length;

  return (
    <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Device map</p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-500/15 px-3 py-1.5 text-sm font-medium text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <Grid className="h-4 w-4" />
          {activeDeviceCount} live circuits
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {roomSummaries.map((room) => (
          <section
            key={room.roomId}
            className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4"
          >
            <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {room.roomName}
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)]">
                  {room.devices.length} total
                </span>
                <span className="rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--accent-strong)] shadow-[0_0_12px_rgba(0,255,136,0.2)]">
                  {room.roomPower} W live
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {room.devices.map((device) => (
                <DeviceCard key={device.id} device={device} isConnected={isConnected} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
