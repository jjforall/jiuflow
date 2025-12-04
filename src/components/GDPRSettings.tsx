import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Trash2, Loader2, Shield } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GDPRSettingsProps {
  userEmail?: string;
}

export const GDPRSettings = ({ userEmail }: GDPRSettingsProps) => {
  const { language } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const texts = {
    ja: {
      title: 'プライバシー設定',
      description: 'GDPR対応：データのエクスポートとアカウント削除',
      exportTitle: 'データのエクスポート',
      exportDesc: 'あなたのすべてのデータをJSON形式でダウンロードします。',
      exportButton: 'データをエクスポート',
      exporting: 'エクスポート中...',
      exportSuccess: 'データのエクスポートが完了しました',
      exportError: 'エクスポートに失敗しました',
      deleteTitle: 'アカウント削除',
      deleteDesc: 'アカウントとすべてのデータを完全に削除します。この操作は取り消せません。',
      deleteButton: 'アカウントを削除',
      deleteConfirmTitle: 'アカウント削除の確認',
      deleteConfirmDesc: 'この操作は取り消せません。確認のため、メールアドレスを入力してください。',
      emailLabel: 'メールアドレス',
      emailPlaceholder: 'メールアドレスを入力',
      cancel: 'キャンセル',
      confirmDelete: '完全に削除する',
      deleting: '削除中...',
      deleteSuccess: 'アカウントが削除されました',
      deleteError: '削除に失敗しました',
      emailMismatch: 'メールアドレスが一致しません',
    },
    en: {
      title: 'Privacy Settings',
      description: 'GDPR Compliance: Export your data or delete your account',
      exportTitle: 'Export Your Data',
      exportDesc: 'Download all your data in JSON format.',
      exportButton: 'Export Data',
      exporting: 'Exporting...',
      exportSuccess: 'Data export completed',
      exportError: 'Export failed',
      deleteTitle: 'Delete Account',
      deleteDesc: 'Permanently delete your account and all associated data. This action cannot be undone.',
      deleteButton: 'Delete Account',
      deleteConfirmTitle: 'Confirm Account Deletion',
      deleteConfirmDesc: 'This action cannot be undone. Please enter your email address to confirm.',
      emailLabel: 'Email Address',
      emailPlaceholder: 'Enter your email',
      cancel: 'Cancel',
      confirmDelete: 'Delete Permanently',
      deleting: 'Deleting...',
      deleteSuccess: 'Account deleted',
      deleteError: 'Deletion failed',
      emailMismatch: 'Email does not match',
    },
    pt: {
      title: 'Configurações de Privacidade',
      description: 'Conformidade GDPR: Exporte seus dados ou exclua sua conta',
      exportTitle: 'Exportar Seus Dados',
      exportDesc: 'Baixe todos os seus dados em formato JSON.',
      exportButton: 'Exportar Dados',
      exporting: 'Exportando...',
      exportSuccess: 'Exportação de dados concluída',
      exportError: 'Falha na exportação',
      deleteTitle: 'Excluir Conta',
      deleteDesc: 'Exclua permanentemente sua conta e todos os dados associados. Esta ação não pode ser desfeita.',
      deleteButton: 'Excluir Conta',
      deleteConfirmTitle: 'Confirmar Exclusão da Conta',
      deleteConfirmDesc: 'Esta ação não pode ser desfeita. Por favor, digite seu email para confirmar.',
      emailLabel: 'Endereço de Email',
      emailPlaceholder: 'Digite seu email',
      cancel: 'Cancelar',
      confirmDelete: 'Excluir Permanentemente',
      deleting: 'Excluindo...',
      deleteSuccess: 'Conta excluída',
      deleteError: 'Falha na exclusão',
      emailMismatch: 'Email não corresponde',
    },
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data');
      
      if (error) throw error;

      // Create and download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t.exportSuccess);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t.exportError);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmEmail !== userEmail) {
      toast.error(t.emailMismatch);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('request-account-deletion');
      
      if (error) throw error;

      toast.success(t.deleteSuccess);
      
      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t.deleteError);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Data Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg">
          <div className="space-y-1">
            <h4 className="font-medium">{t.exportTitle}</h4>
            <p className="text-sm text-muted-foreground">{t.exportDesc}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={isExporting}
            className="flex-shrink-0"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.exporting}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t.exportButton}
              </>
            )}
          </Button>
        </div>

        {/* Delete Account Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
          <div className="space-y-1">
            <h4 className="font-medium text-destructive">{t.deleteTitle}</h4>
            <p className="text-sm text-muted-foreground">{t.deleteDesc}</p>
          </div>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-shrink-0">
                <Trash2 className="mr-2 h-4 w-4" />
                {t.deleteButton}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.deleteConfirmDesc}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Label htmlFor="confirm-email">{t.emailLabel}</Label>
                <Input
                  id="confirm-email"
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className="mt-2"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmEmail('')}>
                  {t.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmEmail !== userEmail}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.deleting}
                    </>
                  ) : (
                    t.confirmDelete
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default GDPRSettings;
