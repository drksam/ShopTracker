import React from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import OrdersPage from "@/pages/orders-page";
import OrderDetailPage from "@/pages/order-detail-page";
import LocationPage from "@/pages/location-page";
import LocationsPage from "@/pages/locations-page";
import LocationDisplayPage from "@/pages/location-display-page";
import ShippingPage from "@/pages/shipping-page";
import OverviewPage from "@/pages/overview-page";
import UserManagementPage from "./pages/user-management-page";
import MachineManagementPage from "@/pages/machine-management-page";
import MachinePage from "@/pages/machine-page";
import AuditTrailPage from "@/pages/audit-trail-page";
import SettingsPage from "@/pages/settings-page";
import RfidCardsPage from "@/pages/rfid-cards-page";
import AccessLevelsPage from "@/pages/access-levels-page";
import AccessLogsPage from "@/pages/access-logs-page";
import AlertCenterPage from "@/pages/alert-center-page";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

const AuthenticatedRoutes = () => {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/orders" component={OrdersPage} />
      
      <Route path="/orders/:id">
        {(params) => (
          <ProtectedRoute 
            path={`/orders/${params.id}`}
            component={() => <OrderDetailPage orderId={parseInt(params.id)} />}
          />
        )}
      </Route>
      
      <ProtectedRoute path="/locations" component={LocationsPage} />
      
      {/* Regular location management page (with full layout) */}
      <Route path="/location/:id">
        {(params) => (
          <ProtectedRoute 
            path={`/location/${params.id}`}
            component={() => <LocationPage locationId={parseInt(params.id)} />}
          />
        )}
      </Route>
      
      {/* Mobile-friendly standalone location display page */}
      <Route path="/display/location/:id">
        {(params) => (
          <ProtectedRoute 
            path={`/display/location/${params.id}`}
            component={() => <LocationDisplayPage locationId={parseInt(params.id)} />}
          />
        )}
      </Route>
      
      {/* Mobile-friendly standalone machine display page */}
      <Route path="/display/machine/:id">
        {(params) => (
          <ProtectedRoute 
            path={`/display/machine/${params.id}`}
            component={() => <MachinePage machineId={params.id} />}
          />
        )}
      </Route>
      
      {/* Now enabled - ShippingPage has been created */}
      <ProtectedRoute path="/shipping" component={ShippingPage} />
      <ProtectedRoute path="/overview" component={OverviewPage} />
  <ProtectedRoute path="/users" component={UserManagementPage} />
      <ProtectedRoute path="/machines" component={MachineManagementPage} />
      
      {/* Regular machine detail page */}
      <Route path="/machine/:id">
        {(params) => (
          <ProtectedRoute 
            path={`/machine/${params.id}`}
            component={() => <MachinePage machineId={params.id} />}
          />
        )}
      </Route>
      
      <ProtectedRoute path="/audit" component={AuditTrailPage} />
      {/* Now enabled - SettingsPage has been created */}
      <ProtectedRoute path="/settings" component={SettingsPage} />
      {/* Now enabled - RfidCardsPage has been created */}
      <ProtectedRoute path="/rfid-cards" component={RfidCardsPage} />
      <ProtectedRoute path="/access-levels" component={AccessLevelsPage} />
      <ProtectedRoute path="/access-logs" component={AccessLogsPage} />
  {/* API Config moved into Settings; route removed */}
      <ProtectedRoute path="/alerts" component={AlertCenterPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedRoutes />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
