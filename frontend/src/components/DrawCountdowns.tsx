import { useState, useEffect } from 'react';

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

export function DrawCountdowns() {
  const [hourlyTime, setHourlyTime] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });
  const [dailyTime, setDailyTime] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });
  const [weeklyTime, setWeeklyTime] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });
  const [monthlyTime, setMonthlyTime] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const utcNow = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      );

      // Hourly: Next hour at :00
      const nextHour = new Date(now);
      nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
      const hourlyMs = nextHour.getTime() - utcNow;
      
      // Daily: Next midnight UTC
      const nextDay = new Date(now);
      nextDay.setUTCDate(now.getUTCDate() + 1);
      nextDay.setUTCHours(0, 0, 0, 0);
      const dailyMs = nextDay.getTime() - utcNow;
      
      // Weekly: Next Sunday midnight UTC
      const nextWeek = new Date(now);
      const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
      nextWeek.setUTCDate(now.getUTCDate() + daysUntilSunday);
      nextWeek.setUTCHours(0, 0, 0, 0);
      const weeklyMs = nextWeek.getTime() - utcNow;
      
      // Monthly: Next 1st of month midnight UTC
      const nextMonth = new Date(now);
      if (now.getUTCDate() === 1 && now.getUTCHours() === 0) {
        nextMonth.setUTCMonth(now.getUTCMonth() + 1, 1);
      } else {
        nextMonth.setUTCMonth(now.getUTCMonth() + 1, 1);
      }
      nextMonth.setUTCHours(0, 0, 0, 0);
      const monthlyMs = nextMonth.getTime() - utcNow;

      const msToTime = (ms: number): TimeLeft => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return { hours, minutes, seconds };
      };

      setHourlyTime(msToTime(hourlyMs));
      setDailyTime(msToTime(dailyMs));
      setWeeklyTime(msToTime(weeklyMs));
      setMonthlyTime(msToTime(monthlyMs));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (time: TimeLeft): string => {
    const h = String(time.hours).padStart(2, '0');
    const m = String(time.minutes).padStart(2, '0');
    const s = String(time.seconds).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">⏰ Next Draws</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hourly Draw */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-300 font-semibold">🕐 Hourly Draw</span>
            <span className="text-xs text-purple-400">1% of yield</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            {formatTime(hourlyTime)}
          </div>
        </div>

        {/* Daily Draw */}
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-300 font-semibold">☀️ Daily Draw</span>
            <span className="text-xs text-blue-400">5% of yield</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            {formatTime(dailyTime)}
          </div>
        </div>

        {/* Weekly Draw */}
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-300 font-semibold">📅 Weekly Draw</span>
            <span className="text-xs text-green-400">20% of yield</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            {formatTime(weeklyTime)}
          </div>
        </div>

        {/* Monthly Draw */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-300 font-semibold">🎊 Monthly Draw</span>
            <span className="text-xs text-yellow-400">50% of yield</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            {formatTime(monthlyTime)}
          </div>
        </div>
      </div>
    </div>
  );
}
