import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  newPassword: string;
  setNewPassword: (password: string) => void;
  onSubmit: (userId: string, password: string) => void;
  isLoading: boolean;
}

export const PasswordChangeDialog = ({
  open,
  onOpenChange,
  userId,
  newPassword,
  setNewPassword,
  onSubmit,
  isLoading
}: PasswordChangeDialogProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId && newPassword) {
      onSubmit(userId, newPassword);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>パスワード変更</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="新しいパスワード（12文字以上）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                setNewPassword("");
              }}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading || !newPassword}>
              {isLoading ? "変更中..." : "パスワード変更"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};