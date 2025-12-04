import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const Terms = () => {
  const { language } = useLanguage();

  const content = {
    ja: {
      title: "利用規約",
      lastUpdated: "最終更新日: 2025年1月1日",
      sections: [
        {
          title: "1. はじめに",
          content: "本利用規約（以下「本規約」）は、jiuFlow（以下「当サービス」）の利用に関する条件を定めるものです。当サービスを利用することにより、本規約に同意したものとみなされます。"
        },
        {
          title: "2. サービスの概要",
          content: "当サービスは、柔術（ブラジリアン柔術）の技術動画、練習記録機能、コミュニティ機能などを提供するプラットフォームです。"
        },
        {
          title: "3. アカウント登録",
          content: "当サービスの一部機能を利用するには、アカウント登録が必要です。ユーザーは以下に同意するものとします：",
          list: [
            "正確かつ最新の情報を提供すること",
            "アカウント情報を安全に管理すること",
            "アカウントの不正使用があった場合は速やかに報告すること",
            "13歳以上であること（13歳未満の方は保護者の同意が必要です）"
          ]
        },
        {
          title: "4. 利用料金",
          content: "当サービスには無料プランと有料プランがあります。有料プランの料金は、加入時に表示される金額に基づきます。料金は予告なく変更される場合がありますが、既存の契約には適用されません。"
        },
        {
          title: "5. 禁止事項",
          content: "ユーザーは以下の行為を行ってはなりません：",
          list: [
            "法律または規則に違反する行為",
            "他のユーザーへの嫌がらせ、脅迫、誹謗中傷",
            "虚偽の情報の投稿",
            "当サービスのセキュリティを侵害する行為",
            "コンテンツの不正なダウンロードまたは配布",
            "商業目的での無断使用",
            "スパムまたは迷惑行為",
            "他者の知的財産権を侵害する行為"
          ]
        },
        {
          title: "6. コンテンツの所有権",
          content: "当サービスが提供するコンテンツ（動画、テキスト、画像など）の著作権は、当サービスまたはそのライセンサーに帰属します。ユーザーは、個人的かつ非商業的な目的でのみコンテンツを利用できます。"
        },
        {
          title: "7. ユーザー生成コンテンツ",
          content: "ユーザーが投稿するコンテンツについて、ユーザーは著作権を保持しますが、当サービスに対して、そのコンテンツを使用、表示、配布する非独占的なライセンスを付与するものとします。ユーザーは、投稿するコンテンツが第三者の権利を侵害しないことを保証する責任があります。"
        },
        {
          title: "8. サービスの変更・終了",
          content: "当サービスは、事前の通知なくサービスの内容を変更、または一時的もしくは永続的にサービスを停止する権利を留保します。重大な変更については、可能な限り事前に通知します。"
        },
        {
          title: "9. 免責事項",
          content: "当サービスは「現状有姿」で提供されます。当サービスは以下について保証しません：",
          list: [
            "サービスが中断なく利用可能であること",
            "サービスにエラーがないこと",
            "コンテンツの正確性または完全性",
            "柔術の練習による怪我や損害"
          ]
        },
        {
          title: "10. 責任の制限",
          content: "法律で許容される最大限の範囲で、当サービスは、直接的、間接的、偶発的、特別、または結果的な損害について責任を負いません。当サービスの責任は、いかなる場合も、ユーザーが過去12ヶ月間に支払った料金を超えないものとします。"
        },
        {
          title: "11. アカウントの停止・削除",
          content: "本規約に違反した場合、当サービスはユーザーのアカウントを警告なく停止または削除する権利を有します。ユーザーは、いつでも自身のアカウントを削除することができます。"
        },
        {
          title: "12. 準拠法・管轄",
          content: "本規約は日本法に準拠し、本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。"
        },
        {
          title: "13. 規約の変更",
          content: "当サービスは、本規約を随時変更する権利を留保します。重大な変更がある場合は、サービス内での通知またはメールでお知らせします。変更後も当サービスを継続して利用することにより、変更後の規約に同意したものとみなされます。"
        },
        {
          title: "14. お問い合わせ",
          content: "本規約に関するご質問がある場合は、お問い合わせページからご連絡ください。"
        }
      ]
    },
    en: {
      title: "Terms of Service",
      lastUpdated: "Last Updated: January 1, 2025",
      sections: [
        {
          title: "1. Introduction",
          content: "These Terms of Service (\"Terms\") govern your use of jiuFlow (\"the Service\"). By using the Service, you agree to be bound by these Terms."
        },
        {
          title: "2. Service Overview",
          content: "The Service is a platform that provides Brazilian Jiu-Jitsu technique videos, practice recording features, community features, and more."
        },
        {
          title: "3. Account Registration",
          content: "Account registration is required to use certain features of the Service. Users agree to:",
          list: [
            "Provide accurate and up-to-date information",
            "Keep account information secure",
            "Report any unauthorized use of your account promptly",
            "Be at least 13 years old (users under 13 require parental consent)"
          ]
        },
        {
          title: "4. Fees",
          content: "The Service offers both free and paid plans. Paid plan fees are based on the amounts displayed at the time of subscription. Fees may change without notice, but changes will not apply to existing contracts."
        },
        {
          title: "5. Prohibited Activities",
          content: "Users must not engage in the following activities:",
          list: [
            "Violating laws or regulations",
            "Harassing, threatening, or defaming other users",
            "Posting false information",
            "Compromising the security of the Service",
            "Unauthorized downloading or distribution of content",
            "Unauthorized commercial use",
            "Spam or nuisance activities",
            "Infringing on others' intellectual property rights"
          ]
        },
        {
          title: "6. Content Ownership",
          content: "Copyright in the content provided by the Service (videos, text, images, etc.) belongs to the Service or its licensors. Users may only use content for personal, non-commercial purposes."
        },
        {
          title: "7. User-Generated Content",
          content: "While users retain copyright in content they post, users grant the Service a non-exclusive license to use, display, and distribute such content. Users are responsible for ensuring that content they post does not infringe on third-party rights."
        },
        {
          title: "8. Service Changes and Termination",
          content: "The Service reserves the right to modify service content or suspend the service temporarily or permanently without prior notice. We will provide advance notice of significant changes whenever possible."
        },
        {
          title: "9. Disclaimer",
          content: "The Service is provided \"as is.\" The Service does not guarantee:",
          list: [
            "That the service will be available without interruption",
            "That the service will be error-free",
            "The accuracy or completeness of content",
            "Against injuries or damages from Jiu-Jitsu practice"
          ]
        },
        {
          title: "10. Limitation of Liability",
          content: "To the maximum extent permitted by law, the Service shall not be liable for any direct, indirect, incidental, special, or consequential damages. The Service's liability shall in no case exceed the fees paid by the user in the past 12 months."
        },
        {
          title: "11. Account Suspension and Deletion",
          content: "If you violate these Terms, the Service has the right to suspend or delete your account without warning. Users may delete their own accounts at any time."
        },
        {
          title: "12. Governing Law and Jurisdiction",
          content: "These Terms shall be governed by Japanese law. Any disputes relating to these Terms shall be subject to the exclusive jurisdiction of the Tokyo District Court as the court of first instance."
        },
        {
          title: "13. Changes to Terms",
          content: "The Service reserves the right to modify these Terms at any time. If there are significant changes, we will notify you through the service or via email. Continued use of the Service after changes constitutes acceptance of the modified Terms."
        },
        {
          title: "14. Contact Us",
          content: "If you have any questions about these Terms, please contact us through our contact page."
        }
      ]
    },
    pt: {
      title: "Termos de Serviço",
      lastUpdated: "Última atualização: 1 de janeiro de 2025",
      sections: [
        {
          title: "1. Introdução",
          content: "Estes Termos de Serviço (\"Termos\") regem o uso do jiuFlow (\"o Serviço\"). Ao usar o Serviço, você concorda em estar vinculado a estes Termos."
        },
        {
          title: "2. Visão Geral do Serviço",
          content: "O Serviço é uma plataforma que oferece vídeos de técnicas de Jiu-Jitsu Brasileiro, recursos de registro de prática, recursos de comunidade e muito mais."
        },
        {
          title: "3. Registro de Conta",
          content: "O registro de conta é necessário para usar certos recursos do Serviço. Os usuários concordam em:",
          list: [
            "Fornecer informações precisas e atualizadas",
            "Manter as informações da conta seguras",
            "Relatar prontamente qualquer uso não autorizado de sua conta",
            "Ter pelo menos 13 anos de idade (usuários menores de 13 anos requerem consentimento dos pais)"
          ]
        },
        {
          title: "4. Taxas",
          content: "O Serviço oferece planos gratuitos e pagos. As taxas dos planos pagos são baseadas nos valores exibidos no momento da assinatura. As taxas podem mudar sem aviso prévio, mas as mudanças não se aplicarão a contratos existentes."
        },
        {
          title: "5. Atividades Proibidas",
          content: "Os usuários não devem se envolver nas seguintes atividades:",
          list: [
            "Violar leis ou regulamentos",
            "Assediar, ameaçar ou difamar outros usuários",
            "Postar informações falsas",
            "Comprometer a segurança do Serviço",
            "Download ou distribuição não autorizada de conteúdo",
            "Uso comercial não autorizado",
            "Spam ou atividades de incômodo",
            "Infringir os direitos de propriedade intelectual de terceiros"
          ]
        },
        {
          title: "6. Propriedade do Conteúdo",
          content: "Os direitos autorais do conteúdo fornecido pelo Serviço (vídeos, texto, imagens, etc.) pertencem ao Serviço ou seus licenciadores. Os usuários podem usar o conteúdo apenas para fins pessoais e não comerciais."
        },
        {
          title: "7. Conteúdo Gerado pelo Usuário",
          content: "Enquanto os usuários mantêm os direitos autorais do conteúdo que postam, os usuários concedem ao Serviço uma licença não exclusiva para usar, exibir e distribuir tal conteúdo. Os usuários são responsáveis por garantir que o conteúdo que postam não infrinja os direitos de terceiros."
        },
        {
          title: "8. Alterações e Encerramento do Serviço",
          content: "O Serviço reserva-se o direito de modificar o conteúdo do serviço ou suspender o serviço temporária ou permanentemente sem aviso prévio. Forneceremos aviso prévio de mudanças significativas sempre que possível."
        },
        {
          title: "9. Isenção de Responsabilidade",
          content: "O Serviço é fornecido \"como está\". O Serviço não garante:",
          list: [
            "Que o serviço estará disponível sem interrupção",
            "Que o serviço estará livre de erros",
            "A precisão ou completude do conteúdo",
            "Contra lesões ou danos da prática de Jiu-Jitsu"
          ]
        },
        {
          title: "10. Limitação de Responsabilidade",
          content: "Na extensão máxima permitida por lei, o Serviço não será responsável por quaisquer danos diretos, indiretos, incidentais, especiais ou consequenciais. A responsabilidade do Serviço não excederá, em nenhum caso, as taxas pagas pelo usuário nos últimos 12 meses."
        },
        {
          title: "11. Suspensão e Exclusão de Conta",
          content: "Se você violar estes Termos, o Serviço tem o direito de suspender ou excluir sua conta sem aviso. Os usuários podem excluir suas próprias contas a qualquer momento."
        },
        {
          title: "12. Lei Aplicável e Jurisdição",
          content: "Estes Termos serão regidos pela lei japonesa. Quaisquer disputas relacionadas a estes Termos estarão sujeitas à jurisdição exclusiva do Tribunal Distrital de Tóquio como tribunal de primeira instância."
        },
        {
          title: "13. Alterações nos Termos",
          content: "O Serviço reserva-se o direito de modificar estes Termos a qualquer momento. Se houver mudanças significativas, notificaremos você através do serviço ou por e-mail. O uso continuado do Serviço após as mudanças constitui aceitação dos Termos modificados."
        },
        {
          title: "14. Contato",
          content: "Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco através da nossa página de contato."
        }
      ]
    }
  };

  const t = content[language as keyof typeof content] || content.en;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
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

export default Terms;
