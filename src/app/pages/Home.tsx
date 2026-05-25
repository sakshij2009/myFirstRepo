import { Header } from '../components/Header';
import { TodaysShifts } from '../components/TodaysShifts';
import { QuickStats } from '../components/QuickStats';
import { UpcomingSchedule } from '../components/UpcomingSchedule';

export function Home() {
  return (
    <div className="px-5 pb-8">
      {/* Header */}
      <Header />

      {/* Today's Shifts Section */}
      <div className="mb-8">
        <TodaysShifts />
      </div>

      {/* Quick Stats Strip */}
      <div className="mb-8">
        <QuickStats />
      </div>

      {/* Upcoming Schedule Preview */}
      <UpcomingSchedule />
    </div>
  );
}
