'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { alertsService, Alert } from '@/lib/services/alerts';
import { toast } from 'sonner';

export function AlertTrendsChart() {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertsService.getAll();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to fetch alert trends');
    } finally {
      setLoading(false);
    }
  };

  // Process alerts data into weekly trends
  const processAlertTrends = () => {
    if (alerts.length === 0) return [];

    // Group alerts by week
    const weeklyData: { [key: string]: { [key: string]: number } } = {};
    
    alerts.forEach(alert => {
      const date = new Date(alert.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {};
      }
      
      const alertType = alert.alert_type || 'System';
      weeklyData[weekKey][alertType] = (weeklyData[weekKey][alertType] || 0) + 1;
    });

    // Convert to array format for recharts
    return Object.entries(weeklyData)
      .map(([date, types]) => ({
        date,
        ...types,
      }))
      .slice(-7); // Last 7 weeks
  };

  const data = processAlertTrends();

  if (loading) {
    return (
      <div className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-border/50">
        <div className="mb-6">
          <h3 className="font-semibold text-lg">Alert Trends</h3>
          <p className="text-xs text-muted-foreground mt-1">Loading alert data...</p>
        </div>
        <div className="h-[435px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-border/50">
        <div className="mb-6">
          <h3 className="font-semibold text-lg">Alert Trends</h3>
          <p className="text-xs text-muted-foreground mt-1">Weekly alert distribution over time</p>
        </div>
        <div className="h-[435px] flex flex-col items-center justify-center text-muted-foreground">
          <span className="material-icons text-6xl mb-4">show_chart</span>
          <p>No alert data available</p>
          <p className="text-xs mt-2">Alert trends will appear here once data is available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-lg">Alert Trends</h3>
          <p className="text-xs text-muted-foreground mt-1">Weekly alert distribution from API data</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              chartType === 'bar'
                ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Bar
          </button>
          <button 
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              chartType === 'line'
                ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Line
          </button>
        </div>
      </div>
      
      <div className="h-[435px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="SOS" fill="#ef4444" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Emergency" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Community" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="SOS" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ fill: '#ef4444', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Emergency" 
                stroke="#f59e0b" 
                strokeWidth={3}
                dot={{ fill: '#f59e0b', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Community" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

