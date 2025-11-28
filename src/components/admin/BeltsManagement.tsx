import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BeltBadge } from "@/components/ui/belt-badge";
import { toast } from "sonner";
import { Trash2, Edit2, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BeltRecord {
  userId: string;
  userName: string;
  belt: string;
  date: string;
  instructor: string;
  index: number;
}

interface InstructorStats {
  name: string;
  count: number;
}

export const BeltsManagement = () => {
  const [belts, setBelts] = useState<BeltRecord[]>([]);
  const [instructors, setInstructors] = useState<InstructorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBelt, setEditingBelt] = useState<BeltRecord | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  useEffect(() => {
    loadBeltsData();
  }, []);

  const loadBeltsData = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, display_name, belt_history');

      if (error) throw error;

      const beltRecords: BeltRecord[] = [];
      const instructorMap = new Map<string, number>();

      profiles?.forEach((profile) => {
        if (profile.belt_history && Array.isArray(profile.belt_history)) {
          (profile.belt_history as any[]).forEach((belt, index) => {
            if (belt.belt) {
              beltRecords.push({
                userId: profile.id,
                userName: profile.display_name || 'Unknown',
                belt: belt.belt,
                date: belt.date || '',
                instructor: belt.instructor || '',
                index,
              });

              if (belt.instructor) {
                instructorMap.set(
                  belt.instructor,
                  (instructorMap.get(belt.instructor) || 0) + 1
                );
              }
            }
          });
        }
      });

      setBelts(beltRecords.sort((a, b) => b.date.localeCompare(a.date)));

      const instructorStats = Array.from(instructorMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      setInstructors(instructorStats);
    } catch (error) {
      console.error('Error loading belts data:', error);
      toast.error('Failed to load belts data');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (belt: BeltRecord) => {
    setEditingBelt(belt);
    setEditValues({
      belt: belt.belt,
      date: belt.date,
      instructor: belt.instructor,
    });
  };

  const cancelEditing = () => {
    setEditingBelt(null);
    setEditValues({});
  };

  const saveBelt = async () => {
    if (!editingBelt) return;

    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('belt_history')
        .eq('id', editingBelt.userId)
        .single();

      if (fetchError) throw fetchError;

      const beltHistory = [...(profile.belt_history as any[] || [])];
      beltHistory[editingBelt.index] = {
        belt: editValues.belt,
        date: editValues.date,
        instructor: editValues.instructor,
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ belt_history: beltHistory })
        .eq('id', editingBelt.userId);

      if (updateError) throw updateError;

      toast.success('Belt record updated');
      setEditingBelt(null);
      setEditValues({});
      loadBeltsData();
    } catch (error) {
      console.error('Error updating belt:', error);
      toast.error('Failed to update belt record');
    }
  };

  const deleteBelt = async (belt: BeltRecord) => {
    if (!confirm('Are you sure you want to delete this belt record?')) return;

    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('belt_history')
        .eq('id', belt.userId)
        .single();

      if (fetchError) throw fetchError;

      const beltHistory = (profile.belt_history as any[] || []).filter(
        (_, index) => index !== belt.index
      );

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ belt_history: beltHistory })
        .eq('id', belt.userId);

      if (updateError) throw updateError;

      toast.success('Belt record deleted');
      loadBeltsData();
    } catch (error) {
      console.error('Error deleting belt:', error);
      toast.error('Failed to delete belt record');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>帯の履歴管理</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ユーザー</TableHead>
                      <TableHead>帯</TableHead>
                      <TableHead>取得月</TableHead>
                      <TableHead>授与者</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {belts.map((belt, idx) => (
                      <TableRow key={`${belt.userId}-${idx}`}>
                        <TableCell>{belt.userName}</TableCell>
                        <TableCell>
                          {editingBelt?.userId === belt.userId && editingBelt?.index === belt.index ? (
                            <Input
                              value={editValues.belt}
                              onChange={(e) => setEditValues({ ...editValues, belt: e.target.value })}
                              className="w-32"
                            />
                          ) : (
                            <BeltBadge belt={belt.belt} />
                          )}
                        </TableCell>
                        <TableCell>
                          {editingBelt?.userId === belt.userId && editingBelt?.index === belt.index ? (
                            <Input
                              value={editValues.date}
                              onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                              className="w-32"
                            />
                          ) : (
                            belt.date
                          )}
                        </TableCell>
                        <TableCell>
                          {editingBelt?.userId === belt.userId && editingBelt?.index === belt.index ? (
                            <Input
                              value={editValues.instructor}
                              onChange={(e) => setEditValues({ ...editValues, instructor: e.target.value })}
                              className="w-40"
                            />
                          ) : (
                            belt.instructor
                          )}
                        </TableCell>
                        <TableCell>
                          {editingBelt?.userId === belt.userId && editingBelt?.index === belt.index ? (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveBelt}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEditing(belt)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteBelt(belt)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>授与者統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {instructors.map((instructor, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="font-medium">{instructor.name}</span>
                  <span className="text-muted-foreground">{instructor.count}回</span>
                </div>
              ))}
              {instructors.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">データなし</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
