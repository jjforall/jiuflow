import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const PrivacyPolicy = () => {
  const { language } = useLanguage();

  const content = {
    ja: {
      title: "プライバシーポリシー",
      lastUpdated: "最終更新日: 2025年1月1日",
      sections: [
        {
          title: "1. はじめに",
          content: "jiuFlow（以下「当サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めています。本プライバシーポリシーは、当サービスがどのように個人情報を収集、使用、保護するかを説明します。"
        },
        {
          title: "2. 収集する情報",
          content: "当サービスは以下の情報を収集することがあります：",
          list: [
            "アカウント情報（メールアドレス、ユーザー名、プロフィール情報）",
            "利用情報（閲覧履歴、練習記録、動画視聴履歴）",
            "技術情報（IPアドレス、ブラウザ情報、デバイス情報）",
            "決済情報（サブスクリプション管理のため）"
          ]
        },
        {
          title: "3. 情報の利用目的",
          content: "収集した情報は以下の目的で利用します：",
          list: [
            "サービスの提供および改善",
            "ユーザーサポートの提供",
            "パーソナライズされたコンテンツの提供",
            "セキュリティの確保と不正利用の防止",
            "法的義務の遵守"
          ]
        },
        {
          title: "4. 情報の共有",
          content: "当サービスは、以下の場合を除き、個人情報を第三者と共有しません：",
          list: [
            "ユーザーの同意がある場合",
            "法的義務を遵守するために必要な場合",
            "サービス提供に必要な業務委託先との共有（決済処理など）"
          ]
        },
        {
          title: "5. データの保護",
          content: "当サービスは、個人情報を保護するために適切な技術的・組織的措置を講じています。これには、データの暗号化、アクセス制御、定期的なセキュリティ監査が含まれます。"
        },
        {
          title: "6. Cookieの使用",
          content: "当サービスは、ユーザー体験の向上とサービス分析のためにCookieを使用します。ユーザーはブラウザの設定でCookieを無効にすることができますが、一部の機能が利用できなくなる場合があります。"
        },
        {
          title: "7. ユーザーの権利（GDPR対応）",
          content: "ユーザーは以下の権利を有します：",
          list: [
            "アクセス権：保有する個人情報へのアクセス",
            "訂正権：不正確な個人情報の訂正",
            "削除権：個人情報の削除（忘れられる権利）",
            "データポータビリティ権：個人情報のエクスポート",
            "異議申立権：特定の処理に対する異議申し立て"
          ]
        },
        {
          title: "8. データの保持期間",
          content: "個人情報は、サービス提供に必要な期間、または法的義務を遵守するために必要な期間保持されます。アカウント削除後、個人情報は30日以内に完全に削除されます。"
        },
        {
          title: "9. 未成年者のプライバシー",
          content: "当サービスは、13歳未満の子どもから意図的に個人情報を収集しません。13歳未満のお子様の情報が収集されたことが判明した場合は、速やかに削除します。"
        },
        {
          title: "10. ポリシーの変更",
          content: "本プライバシーポリシーは、必要に応じて更新されることがあります。重要な変更がある場合は、サービス内での通知またはメールでお知らせします。"
        },
        {
          title: "11. お問い合わせ",
          content: "プライバシーに関するご質問やご要望がある場合は、お問い合わせページからご連絡ください。"
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last Updated: January 1, 2025",
      sections: [
        {
          title: "1. Introduction",
          content: "jiuFlow (\"the Service\") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and protect your personal information."
        },
        {
          title: "2. Information We Collect",
          content: "We may collect the following information:",
          list: [
            "Account information (email address, username, profile information)",
            "Usage information (browsing history, practice records, video viewing history)",
            "Technical information (IP address, browser information, device information)",
            "Payment information (for subscription management)"
          ]
        },
        {
          title: "3. How We Use Information",
          content: "We use collected information for the following purposes:",
          list: [
            "Providing and improving our services",
            "Providing user support",
            "Delivering personalized content",
            "Ensuring security and preventing fraud",
            "Complying with legal obligations"
          ]
        },
        {
          title: "4. Information Sharing",
          content: "We do not share personal information with third parties except in the following cases:",
          list: [
            "With your consent",
            "When required to comply with legal obligations",
            "With service providers necessary for service delivery (e.g., payment processing)"
          ]
        },
        {
          title: "5. Data Protection",
          content: "We implement appropriate technical and organizational measures to protect your personal information. This includes data encryption, access controls, and regular security audits."
        },
        {
          title: "6. Cookie Usage",
          content: "We use cookies to improve user experience and analyze our services. You can disable cookies in your browser settings, but some features may become unavailable."
        },
        {
          title: "7. Your Rights (GDPR Compliance)",
          content: "You have the following rights:",
          list: [
            "Right of Access: Access to your personal information",
            "Right to Rectification: Correction of inaccurate personal information",
            "Right to Erasure: Deletion of personal information (right to be forgotten)",
            "Right to Data Portability: Export of your personal information",
            "Right to Object: Object to certain processing"
          ]
        },
        {
          title: "8. Data Retention",
          content: "Personal information is retained for as long as necessary to provide the service or comply with legal obligations. After account deletion, personal information is completely deleted within 30 days."
        },
        {
          title: "9. Children's Privacy",
          content: "We do not intentionally collect personal information from children under 13. If we become aware that information from a child under 13 has been collected, we will promptly delete it."
        },
        {
          title: "10. Policy Changes",
          content: "This Privacy Policy may be updated as necessary. If there are significant changes, we will notify you through the service or via email."
        },
        {
          title: "11. Contact Us",
          content: "If you have any questions or requests regarding privacy, please contact us through our contact page."
        }
      ]
    },
    pt: {
      title: "Política de Privacidade",
      lastUpdated: "Última atualização: 1 de janeiro de 2025",
      sections: [
        {
          title: "1. Introdução",
          content: "jiuFlow (\"o Serviço\") respeita sua privacidade e está comprometido em proteger suas informações pessoais. Esta Política de Privacidade explica como coletamos, usamos e protegemos suas informações pessoais."
        },
        {
          title: "2. Informações que Coletamos",
          content: "Podemos coletar as seguintes informações:",
          list: [
            "Informações da conta (endereço de e-mail, nome de usuário, informações do perfil)",
            "Informações de uso (histórico de navegação, registros de prática, histórico de visualização de vídeos)",
            "Informações técnicas (endereço IP, informações do navegador, informações do dispositivo)",
            "Informações de pagamento (para gerenciamento de assinatura)"
          ]
        },
        {
          title: "3. Como Usamos as Informações",
          content: "Usamos as informações coletadas para os seguintes propósitos:",
          list: [
            "Fornecer e melhorar nossos serviços",
            "Fornecer suporte ao usuário",
            "Entregar conteúdo personalizado",
            "Garantir segurança e prevenir fraudes",
            "Cumprir obrigações legais"
          ]
        },
        {
          title: "4. Compartilhamento de Informações",
          content: "Não compartilhamos informações pessoais com terceiros, exceto nos seguintes casos:",
          list: [
            "Com seu consentimento",
            "Quando necessário para cumprir obrigações legais",
            "Com provedores de serviços necessários para a entrega do serviço (por exemplo, processamento de pagamentos)"
          ]
        },
        {
          title: "5. Proteção de Dados",
          content: "Implementamos medidas técnicas e organizacionais apropriadas para proteger suas informações pessoais. Isso inclui criptografia de dados, controles de acesso e auditorias de segurança regulares."
        },
        {
          title: "6. Uso de Cookies",
          content: "Usamos cookies para melhorar a experiência do usuário e analisar nossos serviços. Você pode desativar os cookies nas configurações do seu navegador, mas alguns recursos podem ficar indisponíveis."
        },
        {
          title: "7. Seus Direitos (Conformidade GDPR)",
          content: "Você tem os seguintes direitos:",
          list: [
            "Direito de Acesso: Acesso às suas informações pessoais",
            "Direito de Retificação: Correção de informações pessoais imprecisas",
            "Direito ao Esquecimento: Exclusão de informações pessoais",
            "Direito à Portabilidade: Exportação de suas informações pessoais",
            "Direito de Oposição: Oposição a certos processamentos"
          ]
        },
        {
          title: "8. Retenção de Dados",
          content: "As informações pessoais são retidas pelo tempo necessário para fornecer o serviço ou cumprir obrigações legais. Após a exclusão da conta, as informações pessoais são completamente excluídas em até 30 dias."
        },
        {
          title: "9. Privacidade de Menores",
          content: "Não coletamos intencionalmente informações pessoais de crianças menores de 13 anos. Se tomarmos conhecimento de que informações de uma criança menor de 13 anos foram coletadas, nós as excluiremos prontamente."
        },
        {
          title: "10. Alterações na Política",
          content: "Esta Política de Privacidade pode ser atualizada conforme necessário. Se houver mudanças significativas, notificaremos você através do serviço ou por e-mail."
        },
        {
          title: "11. Contato",
          content: "Se você tiver dúvidas ou solicitações sobre privacidade, entre em contato conosco através da nossa página de contato."
        }
      ]
    }
  };

  const t = content[language as keyof typeof content] || content.en;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-12 max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-light mb-2">{t.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t.lastUpdated}</p>

        <div className="space-y-8">
          {t.sections.map((section, index) => (
            <section key={index} className="space-y-3">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{section.content}</p>
              {section.list && (
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  {section.list.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
