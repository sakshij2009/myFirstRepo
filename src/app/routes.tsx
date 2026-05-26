import { createBrowserRouter } from "react-router";
import { Layout } from "./Layout";
import { Home } from "./pages/Home";
import { MyShifts } from "./pages/MyShifts";
import { ShiftDetail } from "./pages/ShiftDetail";
import { ClientDetail } from "./pages/ClientDetail";
import { TransportationRoutes } from "./pages/TransportationRoutes";
import { TransportationDetail } from "./pages/TransportationDetail";
import { Availability } from "./pages/Availability";
import { RequestTimeOff } from "./pages/RequestTimeOff";
import { SetRecurringHours } from "./pages/SetRecurringHours";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { TransferShift } from "./pages/TransferShift";
import { StaffIdCard } from "./pages/StaffIdCard";
import { GeoCheckIn } from "./pages/GeoCheckIn";
import { GeoCheckOut } from "./pages/GeoCheckOut";
import { GpsUnavailable } from "./pages/GpsUnavailable";
import { StaffReports } from "./pages/StaffReports";
import { Login } from "./pages/Login";
import { ShiftMedications } from "./pages/ShiftMedications";
import { ShiftTransportations } from "./pages/ShiftTransportations";
import { TransportationShiftDetail } from "./pages/TransportationShiftDetail";
import { VehicleCheck } from "./pages/VehicleCheck";
import { ShiftCompletion } from "./pages/ShiftCompletion";
import { ActiveRouteFlow } from "./pages/ActiveRouteFlow";
import { IntakeForm } from "./pages/IntakeForm";
import { CompleteShift } from "./pages/CompleteShift";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        Component: Home,
      },
      {
        path: "shifts",
        Component: MyShifts,
      },
      {
        path: "shifts/:id",
        Component: ShiftDetail,
      },
      {
        path: "clients/:id",
        Component: ClientDetail,
      },
      {
        path: "routes",
        Component: TransportationRoutes,
      },
      {
        path: "routes/:id",
        Component: TransportationDetail,
      },
      {
        path: "availability",
        Component: Availability,
      },
      {
        path: "availability/request-time-off",
        Component: RequestTimeOff,
      },
      {
        path: "availability/recurring",
        Component: SetRecurringHours,
      },
      {
        path: "notifications",
        Component: Notifications,
      },
      {
        path: "profile",
        Component: Profile,
      },
      {
        path: "shifts/:id/transfer",
        Component: TransferShift,
      },
      {
        path: "profile/id-card",
        Component: StaffIdCard,
      },
      {
        path: "shifts/:id/clock-in",
        Component: GeoCheckIn,
      },
      {
        path: "shifts/:id/clock-out",
        Component: GeoCheckOut,
      },
      {
        path: "gps-unavailable",
        Component: GpsUnavailable,
      },
      {
        path: "shifts/:id/reports",
        Component: StaffReports,
      },
      {
        path: "shifts/:id/medications",
        Component: ShiftMedications,
      },
      {
        path: "shifts/:id/transportations",
        Component: ShiftTransportations,
      },
      {
        path: "shifts/:id/transportation-detail",
        Component: TransportationShiftDetail,
      },
      {
        path: "shifts/:id/vehicle-check",
        Component: VehicleCheck,
      },
      {
        path: "shifts/:id/shift-completion",
        Component: ShiftCompletion,
      },
      {
        path: "shifts/:id/active-route",
        Component: ActiveRouteFlow,
      },
      {
        path: "shifts/:id/intake-form",
        Component: IntakeForm,
      },
      {
        path: "shifts/:id/complete-shift",
        Component: CompleteShift,
      },
    ],
  },
]);