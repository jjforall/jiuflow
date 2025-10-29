import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Upload, Trash2 } from "lucide-react";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: string;
  video_url: string | null;
  display_order: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    category: "pull" as "pull" | "control" | "submission",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    // Check authentication
    const isAuth = sessionStorage.getItem("admin_authenticated");
    if (!isAuth) {
      navigate("/admin");
      return;
    }

    loadTechniques();
  }, [navigate]);

  const loadTechniques = async () => {
    const { data, error } = await supabase
      .from("techniques")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        title: "Error loading techniques",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setTechniques(data || []);
  };

  const handleVideoUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("technique-videos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("technique-videos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Video upload error:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setUploadingVideo(true);

    try {
      let videoUrl = null;

      if (videoFile) {
        videoUrl = await handleVideoUpload(videoFile);
        if (!videoUrl) {
          throw new Error("Failed to upload video");
        }
      }

      const { error } = await supabase.from("techniques").insert({
        ...formData,
        video_url: videoUrl,
        display_order: techniques.length,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Technique added successfully",
      });

      // Reset form
      setFormData({
        name: "",
        name_ja: "",
        name_pt: "",
        description: "",
        description_ja: "",
        description_pt: "",
        category: "pull",
      });
      setVideoFile(null);

      loadTechniques();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadingVideo(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this technique?")) return;

    const { error } = await supabase.from("techniques").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Technique deleted successfully",
    });

    loadTechniques();
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-light">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>

          {/* Add Technique Form */}
          <div className="border border-border p-8 mb-12">
            <h2 className="text-2xl font-light mb-6">Add New Technique</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">Name (EN)</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Name (JA)</label>
                  <Input
                    value={formData.name_ja}
                    onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Name (PT)</label>
                  <Input
                    value={formData.name_pt}
                    onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">Description (EN)</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Description (JA)</label>
                  <Textarea
                    value={formData.description_ja}
                    onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Description (PT)</label>
                  <Textarea
                    value={formData.description_pt}
                    onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pull">Pull</SelectItem>
                    <SelectItem value="control">Control</SelectItem>
                    <SelectItem value="submission">Submission</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm mb-2">Video File</label>
                <div className="border border-border p-4 rounded">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full"
                  />
                  {uploadingVideo && (
                    <p className="text-sm text-muted-foreground mt-2">Uploading video...</p>
                  )}
                </div>
              </div>

              <Button type="submit" size="lg" disabled={isLoading}>
                <Upload className="w-4 h-4 mr-2" />
                {isLoading ? "Adding..." : "Add Technique"}
              </Button>
            </form>
          </div>

          {/* Techniques List */}
          <div>
            <h2 className="text-2xl font-light mb-6">Existing Techniques</h2>

            <div className="grid gap-4">
              {techniques.map((technique) => (
                <div key={technique.id} className="border border-border p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-light mb-2">{technique.name}</h3>
                      <p className="text-sm text-muted-foreground mb-1">{technique.name_ja}</p>
                      <p className="text-sm text-muted-foreground mb-2">{technique.name_pt}</p>
                      <span className="inline-block px-3 py-1 text-xs border border-border">
                        {technique.category}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(technique.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
