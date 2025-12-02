import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Profile } from "@/types/admin";
import { Globe, Lock } from "lucide-react";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSubmit: (profile: Profile) => void;
  isLoading: boolean;
}

export const EditProfileDialog = ({
  open,
  onOpenChange,
  profile,
  onSubmit,
  isLoading
}: EditProfileDialogProps) => {
  const [stripeCustomerId, setStripeCustomerId] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (profile) {
      setStripeCustomerId(profile.stripe_customer_id || "");
      setIsPublic(profile.is_public ?? false);
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile) {
      onSubmit({
        ...profile,
        stripe_customer_id: stripeCustomerId,
        is_public: isPublic
      });
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>会員情報編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">メールアドレス</label>
            <Input
              value={profile.email || ''}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Stripe Customer ID</label>
            <Input
              value={stripeCustomerId}
              onChange={(e) => setStripeCustomerId(e.target.value)}
              placeholder="cus_..."
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-green-500" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="font-medium">プロフィール公開</Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? "他のユーザーから見える" : "非公開"}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "更新中..." : "更新"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
