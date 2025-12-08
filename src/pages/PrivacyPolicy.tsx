import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  const { language } = useLanguage();

  const content = {
    ja: {
      title: "プライバシーポリシー",
      lastUpdated: "最終更新日: 2025年12月8日",
      sections: [
        {
          title: "1. はじめに",
          content: "jiuFlow（以下「当サービス」または「当社」）は、お客様の個人情報の重要性を認識し、その保護を徹底するために、以下の通りプライバシーポリシー（以下「本ポリシー」）を定めます。当社は、日本の「個人情報の保護に関する法律（平成15年法律第57号）」およびその他の関連法令を遵守し、お客様の安心・安全なサービス利用をサポートします。"
        },
        {
          title: "2. 収集する情報",
          content: "当サービスは、以下の情報を適法かつ公正な手段により取得します。",
          subsections: [
            {
              subtitle: "ユーザーから提供される情報",
              list: [
                "アカウント情報：ユーザー名、メールアドレス、パスワード、プロフィール画像、所属道場、帯色など。",
                "要配慮個人情報（健康・身体情報）：練習記録機能においてユーザーが任意で入力する、体重、怪我の状態、身体的な特徴などの情報（これらはユーザーの明示的な同意に基づいて取得します）。",
                "決済情報：クレジットカード情報等の決済情報は、当サービスが提携する決済代行会社（Stripe, Apple, Google等）が直接取得・管理し、当社はこれらの完全な情報を保持しません。",
                "お問い合わせ情報：サポート対応時のやり取りの内容。"
              ]
            },
            {
              subtitle: "サービス利用時に自動的に収集される情報",
              list: [
                "端末情報・ログ情報：IPアドレス、デバイスの種類、OSのバージョン、ブラウザの種類、アクセス日時、サービス内の操作履歴（動画の視聴履歴、「いいね」等のアクション）。",
                "Cookieおよび識別子：Cookie、Device ID、Advertising IDなど。"
              ]
            }
          ]
        },
        {
          title: "3. 利用目的",
          content: "当社は、取得した個人情報を以下の目的で利用します。",
          list: [
            "当サービスの提供、維持、保護および改善のため",
            "ユーザー登録の受付、本人確認、利用料金の計算・請求のため",
            "練習記録や視聴履歴に基づいた、おすすめの動画やトレーニングメニューの提案（パーソナライズ）のため",
            "当サービスに関するご案内、お問い合わせ等への対応のため",
            "当サービスの規約、ポリシー等に違反する行為に対する対応のため（不正利用の防止）",
            "当サービスの利用状況の分析およびマーケティングのため",
            "個人を識別できない形式に加工した統計データを作成するため"
          ]
        },
        {
          title: "4. 第三者への提供",
          content: "当社は、以下の場合を除き、お客様の同意なく第三者に個人情報を提供しません。",
          list: [
            "法令に基づく場合",
            "人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき（例：練習中の事故等による緊急搬送時など）。",
            "業務委託：利用目的の達成に必要な範囲内において、個人情報の取り扱いの全部または一部を委託する場合（サーバー管理会社、決済代行会社など）。この場合、当社は委託先に対して必要かつ適切な監督を行います。"
          ]
        },
        {
          title: "5. 情報収集モジュール・外部送信",
          content: "当サービスでは、サービスの利用状況分析や広告配信のために、以下の第三者が提供する情報収集モジュールを利用しています。これに伴い、ユーザーの利用情報が各提供者に送信される場合があります。",
          list: [
            "Google Analytics (Google LLC)：送信される情報 - サイト/アプリの閲覧履歴、端末情報など。利用目的 - アクセス解析、サービス改善"
          ]
        },
        {
          title: "6. 安全管理措置",
          content: "当社は、個人情報の漏洩、滅失またはき損の防止その他の個人情報の安全管理のために、必要かつ適切な措置（通信のSSL暗号化、アクセス制限の実施等）を講じます。"
        },
        {
          title: "7. ユーザーの権利（保有個人データの開示等）",
          content: "ユーザーは、当社が保有する自身の個人情報について、以下の権利を有します。",
          list: [
            "利用目的の通知、開示、訂正、追加または削除、利用の停止、消去および第三者への提供の停止"
          ],
          note: "これらの請求を行いたい場合は、第11条のお問い合わせ窓口までご連絡ください。ご本人確認の上、法令に従い合理的な期間内に対応いたします。また、アプリ内の設定画面からも、一部の情報の確認・修正・削除が可能です。"
        },
        {
          title: "8. データの保持期間",
          content: "当社は、利用目的の達成に必要な期間、または法令で定められた期間、個人情報を保持します。ユーザーが退会（アカウント削除）の手続きを行った場合、30日以内にバックアップを含む全ての個人情報を適切に削除または匿名化処理します。ただし、法的義務の履行や紛争解決のために必要な場合はこの限りではありません。"
        },
        {
          title: "9. 未成年者のプライバシー",
          content: "当サービスは、未成年者が利用する場合、親権者などの法定代理人の同意を得ることを推奨しています。特に13歳未満のお子様が利用される場合、保護者の方によるアカウント管理をお願いしております。"
        },
        {
          title: "10. プライバシーポリシーの変更",
          content: "当社は、本ポリシーの内容を適宜見直し、その改善に努めます。本ポリシーを変更する場合、変更後の内容を当サービス上またはメール等の適切な方法で通知します。"
        },
        {
          title: "11. 事業者情報・お問い合わせ",
          content: "本ポリシーに関するご質問、苦情のお申し出、その他個人情報の取り扱いに関するお問い合わせは、お問い合わせフォームよりご連絡ください。"
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last Updated: December 8, 2025",
      sections: [
        {
          title: "1. Introduction",
          content: "jiuFlow (\"the Service\" or \"the Company\") recognizes the importance of your personal information and establishes this Privacy Policy (\"Policy\") to ensure its thorough protection. We comply with Japan's \"Act on the Protection of Personal Information (Act No. 57 of 2003)\" and other relevant laws and regulations to support your safe and secure use of our Service."
        },
        {
          title: "2. Information We Collect",
          content: "The Service collects the following information through lawful and fair means.",
          subsections: [
            {
              subtitle: "Information Provided by Users",
              list: [
                "Account Information: Username, email address, password, profile picture, affiliated dojo, belt rank, etc.",
                "Sensitive Personal Information (Health/Physical Information): Information such as weight, injury status, and physical characteristics that users voluntarily enter in the practice record feature (this is collected based on the user's explicit consent).",
                "Payment Information: Payment information such as credit card details is directly collected and managed by our partner payment processors (Stripe, Apple, Google, etc.), and we do not retain complete information.",
                "Inquiry Information: Content of exchanges during support correspondence."
              ]
            },
            {
              subtitle: "Information Automatically Collected During Service Use",
              list: [
                "Device/Log Information: IP address, device type, OS version, browser type, access date/time, operation history within the service (video viewing history, actions such as 'likes').",
                "Cookies and Identifiers: Cookies, Device ID, Advertising ID, etc."
              ]
            }
          ]
        },
        {
          title: "3. Purpose of Use",
          content: "We use the collected personal information for the following purposes:",
          list: [
            "To provide, maintain, protect, and improve the Service",
            "To accept user registration, verify identity, and calculate/bill usage fees",
            "To suggest recommended videos and training menus based on practice records and viewing history (personalization)",
            "To respond to inquiries and provide information about the Service",
            "To respond to violations of our terms, policies, etc. (fraud prevention)",
            "To analyze Service usage and conduct marketing",
            "To create statistical data processed into a form that cannot identify individuals"
          ]
        },
        {
          title: "4. Disclosure to Third Parties",
          content: "We will not provide personal information to third parties without your consent, except in the following cases:",
          list: [
            "When required by law",
            "When necessary for the protection of human life, body, or property, and it is difficult to obtain the consent of the person (e.g., emergency transport due to accidents during practice).",
            "Outsourcing: When outsourcing all or part of the handling of personal information within the scope necessary to achieve the purpose of use (server management companies, payment processors, etc.). In this case, we will exercise necessary and appropriate supervision over the contractor."
          ]
        },
        {
          title: "5. Information Collection Modules / External Transmission",
          content: "The Service uses information collection modules provided by the following third parties for analyzing service usage and delivering advertisements. User usage information may be transmitted to each provider accordingly.",
          list: [
            "Google Analytics (Google LLC): Information transmitted - Site/app browsing history, device information, etc. Purpose - Access analysis, service improvement"
          ]
        },
        {
          title: "6. Security Measures",
          content: "We take necessary and appropriate measures (SSL encryption of communications, implementation of access restrictions, etc.) to prevent leakage, loss, or damage of personal information and for other security management of personal information."
        },
        {
          title: "7. User Rights (Disclosure of Retained Personal Data)",
          content: "Users have the following rights regarding their personal information held by us:",
          list: [
            "Notification of purpose of use, disclosure, correction, addition or deletion, suspension of use, erasure, and suspension of provision to third parties"
          ],
          note: "If you wish to make these requests, please contact us through the inquiry desk in Section 11. After verifying your identity, we will respond within a reasonable period in accordance with the law. You can also confirm, modify, or delete some information through the settings screen within the app."
        },
        {
          title: "8. Data Retention Period",
          content: "We retain personal information for the period necessary to achieve the purpose of use or for the period required by law. When a user completes the withdrawal (account deletion) procedure, all personal information including backups will be appropriately deleted or anonymized within 30 days. However, this does not apply when necessary for the fulfillment of legal obligations or dispute resolution."
        },
        {
          title: "9. Privacy of Minors",
          content: "The Service recommends that when minors use the service, they obtain consent from a legal representative such as a parent. In particular, when children under 13 use the service, we ask that account management be handled by a guardian."
        },
        {
          title: "10. Changes to Privacy Policy",
          content: "We will review and endeavor to improve the content of this Policy as appropriate. If we change this Policy, we will notify you of the changes through the Service or by email or other appropriate means."
        },
        {
          title: "11. Business Information / Contact Us",
          content: "For questions about this Policy, complaints, or other inquiries regarding the handling of personal information, please contact us through our contact form."
        }
      ]
    },
    pt: {
      title: "Política de Privacidade",
      lastUpdated: "Última atualização: 8 de dezembro de 2025",
      sections: [
        {
          title: "1. Introdução",
          content: "jiuFlow (\"o Serviço\" ou \"a Empresa\") reconhece a importância das suas informações pessoais e estabelece esta Política de Privacidade (\"Política\") para garantir sua proteção completa. Cumprimos a \"Lei de Proteção de Informações Pessoais do Japão (Lei nº 57 de 2003)\" e outras leis e regulamentos relevantes para apoiar seu uso seguro e protegido do nosso Serviço."
        },
        {
          title: "2. Informações que Coletamos",
          content: "O Serviço coleta as seguintes informações através de meios lícitos e justos.",
          subsections: [
            {
              subtitle: "Informações Fornecidas pelos Usuários",
              list: [
                "Informações da Conta: Nome de usuário, endereço de e-mail, senha, foto de perfil, academia afiliada, graduação de faixa, etc.",
                "Informações Pessoais Sensíveis (Saúde/Físicas): Informações como peso, estado de lesões e características físicas que os usuários inserem voluntariamente no recurso de registro de prática (coletadas com base no consentimento explícito do usuário).",
                "Informações de Pagamento: Informações de pagamento como dados de cartão de crédito são coletadas e gerenciadas diretamente por nossos processadores de pagamento parceiros (Stripe, Apple, Google, etc.), e não retemos informações completas.",
                "Informações de Consulta: Conteúdo das trocas durante correspondência de suporte."
              ]
            },
            {
              subtitle: "Informações Coletadas Automaticamente Durante o Uso do Serviço",
              list: [
                "Informações de Dispositivo/Log: Endereço IP, tipo de dispositivo, versão do SO, tipo de navegador, data/hora de acesso, histórico de operações dentro do serviço (histórico de visualização de vídeos, ações como 'curtidas').",
                "Cookies e Identificadores: Cookies, ID do Dispositivo, ID de Publicidade, etc."
              ]
            }
          ]
        },
        {
          title: "3. Finalidade de Uso",
          content: "Usamos as informações pessoais coletadas para os seguintes fins:",
          list: [
            "Para fornecer, manter, proteger e melhorar o Serviço",
            "Para aceitar registro de usuário, verificar identidade e calcular/cobrar taxas de uso",
            "Para sugerir vídeos recomendados e menus de treinamento com base em registros de prática e histórico de visualização (personalização)",
            "Para responder a consultas e fornecer informações sobre o Serviço",
            "Para responder a violações de nossos termos, políticas, etc. (prevenção de fraudes)",
            "Para analisar o uso do Serviço e conduzir marketing",
            "Para criar dados estatísticos processados em uma forma que não pode identificar indivíduos"
          ]
        },
        {
          title: "4. Divulgação a Terceiros",
          content: "Não forneceremos informações pessoais a terceiros sem seu consentimento, exceto nos seguintes casos:",
          list: [
            "Quando exigido por lei",
            "Quando necessário para a proteção da vida, corpo ou propriedade humana, e é difícil obter o consentimento da pessoa (por exemplo, transporte de emergência devido a acidentes durante a prática).",
            "Terceirização: Ao terceirizar todo ou parte do tratamento de informações pessoais dentro do escopo necessário para alcançar o propósito de uso (empresas de gerenciamento de servidores, processadores de pagamento, etc.). Neste caso, exerceremos supervisão necessária e apropriada sobre o contratado."
          ]
        },
        {
          title: "5. Módulos de Coleta de Informações / Transmissão Externa",
          content: "O Serviço usa módulos de coleta de informações fornecidos pelos seguintes terceiros para analisar o uso do serviço e entregar anúncios. As informações de uso do usuário podem ser transmitidas a cada provedor de acordo.",
          list: [
            "Google Analytics (Google LLC): Informações transmitidas - Histórico de navegação do site/aplicativo, informações do dispositivo, etc. Finalidade - Análise de acesso, melhoria do serviço"
          ]
        },
        {
          title: "6. Medidas de Segurança",
          content: "Tomamos medidas necessárias e apropriadas (criptografia SSL de comunicações, implementação de restrições de acesso, etc.) para prevenir vazamento, perda ou dano de informações pessoais e para outro gerenciamento de segurança de informações pessoais."
        },
        {
          title: "7. Direitos do Usuário (Divulgação de Dados Pessoais Retidos)",
          content: "Os usuários têm os seguintes direitos em relação às suas informações pessoais mantidas por nós:",
          list: [
            "Notificação da finalidade de uso, divulgação, correção, adição ou exclusão, suspensão de uso, eliminação e suspensão de fornecimento a terceiros"
          ],
          note: "Se você deseja fazer essas solicitações, entre em contato conosco através do balcão de atendimento na Seção 11. Após verificar sua identidade, responderemos dentro de um período razoável de acordo com a lei. Você também pode confirmar, modificar ou excluir algumas informações através da tela de configurações dentro do aplicativo."
        },
        {
          title: "8. Período de Retenção de Dados",
          content: "Retemos informações pessoais pelo período necessário para alcançar o propósito de uso ou pelo período exigido por lei. Quando um usuário conclui o procedimento de retirada (exclusão de conta), todas as informações pessoais, incluindo backups, serão apropriadamente excluídas ou anonimizadas dentro de 30 dias. No entanto, isso não se aplica quando necessário para o cumprimento de obrigações legais ou resolução de disputas."
        },
        {
          title: "9. Privacidade de Menores",
          content: "O Serviço recomenda que quando menores usam o serviço, eles obtenham consentimento de um representante legal, como um pai. Em particular, quando crianças menores de 13 anos usam o serviço, pedimos que o gerenciamento da conta seja feito por um responsável."
        },
        {
          title: "10. Alterações na Política de Privacidade",
          content: "Revisaremos e nos esforçaremos para melhorar o conteúdo desta Política conforme apropriado. Se alterarmos esta Política, notificaremos você das alterações através do Serviço ou por e-mail ou outros meios apropriados."
        },
        {
          title: "11. Informações Empresariais / Contato",
          content: "Para perguntas sobre esta Política, reclamações ou outras consultas sobre o tratamento de informações pessoais, entre em contato conosco através do nosso formulário de contato."
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
              
              {section.subsections && section.subsections.map((sub, subIdx) => (
                <div key={subIdx} className="ml-4 space-y-2">
                  <h3 className="font-medium text-foreground">{sub.subtitle}</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    {sub.list.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
              
              {section.list && (
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  {section.list.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
              
              {section.note && (
                <p className="text-muted-foreground leading-relaxed text-sm mt-2 ml-4 border-l-2 border-muted pl-4">
                  {section.note}
                </p>
              )}
            </section>
          ))}
          
          <div className="mt-8 pt-8 border-t border-border">
            <Link 
              to="/contact" 
              className="text-primary hover:underline"
            >
              {language === "ja" ? "お問い合わせフォームはこちら" : language === "pt" ? "Formulário de contato aqui" : "Contact form here"}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
