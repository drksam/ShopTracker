import React from "react";
import { MachineAlerts } from "@/components/api/machine-alerts";
import { NotificationsFeed } from "@/components/api/notifications-feed";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Clock, Bell } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function AlertCenterPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Alert Center</h1>
        {isAdmin && (
          <Link href="/settings">
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Manage API Settings
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-primary" />
              Machine Alerts
            </CardTitle>
            <CardDescription>
              Monitor and respond to alerts from MachineMonitor and ShopTracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MachineAlerts />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Review recent alerts and help requests</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationsFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}