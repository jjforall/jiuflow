import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Profile } from "@/types/admin";

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile) {
      onSubmit(profile);
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
              value={profile.stripe_customer_id || ''}
              onChange={(e) => {
                if (profile) {
                  profile.stripe_customer_id = e.target.value;
                }
              }}
              placeholder="cus_..."
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