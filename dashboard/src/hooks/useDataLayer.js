import { useEffect, useRef, useState } from 'react';

const REST_POLL_INTERVAL_MS = 15000;
const INITIAL_FALLBACK_DELAY_MS = 2500;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

function normalizeAlerts(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload?.active ?? [];
}

function normalizeUsage(payload) {
  return {
    totalWattsNow: payload?.totalWattsNow ?? 0,
    todayEstimatedKwh: payload?.todayEstimatedKwh ?? 0,
  };
}

export function useDataLayer(wsUrl) {
  const [data, setData] = useState({
    devices: [],
    alerts: [],
    usage: { totalWattsNow: 0, todayEstimatedKwh: 0 },
    isConnected: false,
    hasInitialData: false,
    backendHealthy: true,
  });
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const backoffRef = useRef(1000);
  const fallbackTimeoutRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateFromRest() {
      try {
        const [statusRes, alertsRes, usageRes, healthRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/status`),
          fetch(`${BACKEND_URL}/api/alerts`),
          fetch(`${BACKEND_URL}/api/usage`),
          fetch(`${BACKEND_URL}/api/health`),
        ]);

        if (!statusRes.ok || !alertsRes.ok || !usageRes.ok || !healthRes.ok) {
          throw new Error('One or more REST endpoints returned a non-200 response.');
        }

        const [statusData, alertsData, usageData, healthData] = await Promise.all([
          statusRes.json(),
          alertsRes.json(),
          usageRes.json(),
          healthRes.json(),
        ]);

        if (!isMounted) {
          return;
        }

        setData((prev) => ({
          ...prev,
          devices: statusData.devices ?? [],
          alerts: normalizeAlerts(alertsData),
          usage: normalizeUsage(usageData),
          hasInitialData: true,
          backendHealthy: healthData.status === 'ok' && healthData.simulatorAlive !== false,
        }));
      } catch (err) {
        console.error('Failed to fetch REST dashboard data', err);
        if (!isMounted) {
          return;
        }

        setData((prev) => ({
          ...prev,
          backendHealthy: false,
        }));
      }
    }

    void hydrateFromRest();

    const interval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        void hydrateFromRest();
      }
    }, REST_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!wsUrl) {
      return undefined;
    }

    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        clearTimeout(fallbackTimeoutRef.current);
        setData((prev) => ({
          ...prev,
          isConnected: true,
          backendHealthy: true,
        }));
        backoffRef.current = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          setData((prev) => {
            const nextState = { ...prev };
            
            if (msg.type === 'full-state' || msg.type === 'state-update') {
              nextState.devices = msg.payload;
              nextState.hasInitialData = true;
              nextState.backendHealthy = true;
            } else if (msg.type === 'alert-new') {
              nextState.alerts = [msg.payload, ...prev.alerts.filter((alert) => alert.id !== msg.payload.id)];
            } else if (msg.type === 'alert-resolved') {
              nextState.alerts = prev.alerts.filter((alert) => alert.id !== msg.payload.id);
            }
            
            if (nextState.devices && nextState.devices.length > 0) {
              const totalWatts = nextState.devices.reduce((sum, device) => sum + device.powerDrawWatts, 0);
              nextState.usage = { ...nextState.usage, totalWattsNow: totalWatts };
            }
            
            return nextState;
          });
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onerror = () => {
        setData((prev) => ({ ...prev, isConnected: false }));
      };

      ws.onclose = () => {
        setData((prev) => ({ ...prev, isConnected: false }));
        reconnectTimeoutRef.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 2, 10000);
          connect();
        }, backoffRef.current);
      };
    }

    fallbackTimeoutRef.current = setTimeout(() => {
      setData((prev) => {
        if (prev.hasInitialData) {
          return prev;
        }

        return {
          ...prev,
          backendHealthy: false,
        };
      });
    }, INITIAL_FALLBACK_DELAY_MS);

    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      clearTimeout(fallbackTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [wsUrl]);

  return data;
}
