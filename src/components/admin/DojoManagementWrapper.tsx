import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Calendar, Users, UserCheck, ClipboardList, BarChart3, UserPlus, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DojoClassesManagement from "./DojoClassesManagement";
import DojoMembersManagement from "./DojoMembersManagement";
import DojoCheckInScanner from "./DojoCheckInScanner";
import DojoBookingsManagement from "./DojoBookingsManagement";
import DojoAttendanceReport from "./DojoAttendanceReport";
import DojoTrialBookingsManagement from "./DojoTrialBookingsManagement";
import DojoMembershipPlansManagement from "./DojoMembershipPlansManagement";

interface DojoOption {
  id: string;
  name: string;
  name_ja: string | null;
}

interface DojoManagementWrapperProps {
  defaultTab?: "classes" | "members" | "check-in" | "bookings" | "reports" | "trial" | "plans";
}

export default function DojoManagementWrapper({ defaultTab = "classes" }: DojoManagementWrapperProps) {
  const [selectedDojoId, setSelectedDojoId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const { data: dojos, isLoading: dojosLoading } = useQuery({
    queryKey: ["admin-dojos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojos")
        .select("id, name, name_ja")
        .order("name");

      if (error) throw error;
      return data as DojoOption[];
    },
  });

  // Auto-select first dojo if available
  if (dojos && dojos.length > 0 && !selectedDojoId) {
    setSelectedDojoId(dojos[0].id);
  }

  if (dojosLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dojos || dojos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            道場管理（hacomono風）
          </CardTitle>
          <CardDescription>
            クラス管理、会員管理、入退館管理を行います
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>道場が登録されていません</p>
            <p className="text-sm mt-2">まず道場を登録してください</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              道場管理（hacomono風）
            </CardTitle>
            <CardDescription className="mt-1">
              クラス管理、会員管理、入退館管理を行います
            </CardDescription>
          </div>
          <Select value={selectedDojoId} onValueChange={setSelectedDojoId}>
            <SelectTrigger className="w-full md:w-72">
              <SelectValue placeholder="道場を選択" />
            </SelectTrigger>
            <SelectContent>
              {dojos.map((dojo) => (
                <SelectItem key={dojo.id} value={dojo.id}>
                  {dojo.name_ja || dojo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedDojoId ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>道場を選択してください</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-6">
              <TabsTrigger value="classes" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">クラス</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">会員</span>
              </TabsTrigger>
              <TabsTrigger value="check-in" className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">入退館</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-1">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">予約</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">レポート</span>
              </TabsTrigger>
              <TabsTrigger value="trial" className="flex items-center gap-1">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">体験</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">プラン</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="classes">
              <DojoClassesManagement dojoId={selectedDojoId} />
            </TabsContent>

            <TabsContent value="members">
              <DojoMembersManagement dojoId={selectedDojoId} />
            </TabsContent>

            <TabsContent value="check-in">
              <DojoCheckInScanner dojoId={selectedDojoId} />
            </TabsContent>

            <TabsContent value="bookings">
              <DojoBookingsManagement dojoId={selectedDojoId} />
            </TabsContent>

            <TabsContent value="reports">
              <DojoAttendanceReport dojoId={selectedDojoId} />
            </TabsContent>

            <TabsContent value="trial">
              <DojoTrialBookingsManagement dojoId={selectedDojoId} />
            </TabsContent>

            <TabsContent value="plans">
              <DojoMembershipPlansManagement dojoId={selectedDojoId} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
