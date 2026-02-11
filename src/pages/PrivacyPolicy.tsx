import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  const { language } = useLanguage();
  const seoTitle = language === 'ja' ? 'プライバシーポリシー | JiuFlow' : 'Privacy Policy | JiuFlow';
  const seoDescription = language === 'ja' 
    ? 'JiuFlowのプライバシーポリシー。個人情報の取り扱いについて説明します。'
    : 'JiuFlow Privacy Policy. Learn how we handle your personal information.';

  const content = {
    ja: {
      title: "プライバシーポリシー",
      lastUpdated: "最終更新日: 2025年12月8日",
      sections: [
        {
          title: "1. はじめに",
          content: "jiuFlow（以下「当サービス」または「当社」）は、お客様のプライバシーを尊重し、その保護に全力で取り組みます。本プライバシーポリシー（以下「本ポリシー」）は、当社が収集する個人情報の種類、使用方法、共有範囲、およびお客様の権利について説明するものです。当社は、日本の「個人情報の保護に関する法律」および「EU一般データ保護規則（GDPR）」を含む適用法令を遵守します。なお、GDPRの適用範囲において、当サービスは個人データの「管理者（Controller）」となります。"
        },
        {
          title: "2. 収集する情報",
          content: "当サービスは、以下の情報を適法かつ公正な手段により取得します。",
          subsections: [
            {
              subtitle: "お客様から提供される情報",
              list: [
                "アカウント情報：氏名、メールアドレス、ユーザー名、パスワード、プロフィール画像、所属道場、帯色など。",
                "健康・身体情報（センシティブ情報）：練習記録機能においてユーザーが任意で入力する体重、怪我の履歴、身体的特徴など。これらはGDPR上の「特段の配慮を要する個人データ」に該当するため、お客様の明示的な同意に基づいてのみ処理されます。",
                "決済情報：決済代行会社（Stripe等）が直接処理し、当社は完全なクレジットカード情報を保持しません。",
                "ユーザー生成コンテンツ：アップロードした動画、コミュニティへの投稿、コメント、メッセージなど。",
                "ソーシャル情報：他のユーザーやアスリートへのフォロー状況、グループ参加状況。",
                "大会参加情報：トーナメントへの登録情報、階級、参加ステータス。",
                "ポイント・紹介情報：獲得ポイント履歴、紹介コード、紹介実績。",
                "商品購入情報：ショップでの注文情報、配送先住所、購入履歴（Printful連携）。",
                "投げ銭・動画購入情報：クリエイターへの投げ銭履歴、有料動画の購入履歴。"
              ]
            },
            {
              subtitle: "自動的に収集される情報",
              list: [
                "端末・利用データ：IPアドレス、ブラウザの種類、OS、アクセス日時、サービス内の操作ログ（動画視聴履歴など）、Cookie、デバイスID。"
              ]
            }
          ]
        },
        {
          title: "3. 利用目的",
          content: "当社は、取得した個人情報を以下の目的で利用します。",
          list: [
            "サービスの提供、本人確認、課金管理のため",
            "ユーザーごとの練習記録の管理および分析機能の提供のため",
            "おすすめ動画の提案など、ユーザー体験のパーソナライズのため",
            "サービスの改善、新機能の開発、利用動向の分析のため",
            "カスタマーサポートおよびお問い合わせ対応のため",
            "不正利用の防止、セキュリティ確保のため"
          ]
        },
        {
          title: "4. データの処理の法的根拠（GDPR対応）",
          content: "当社は、GDPRが適用されるお客様の個人データを、以下のいずれかの法的根拠に基づいて処理します。",
          list: [
            "契約の履行：サービスの利用規約に基づき、サービスを提供するために必要な場合（アカウント管理、課金など）。",
            "同意：お客様が特定の目的（健康データの記録、ニュースレターの受信など）のために処理に同意した場合。同意はいつでも撤回可能です。",
            "正当な利益：当社のサービスを改善し、セキュリティを確保し、マーケティングを行うという当社の正当な利益のために必要な場合（ただし、お客様の利益や基本的権利が優先される場合を除く）。",
            "法的義務：法令遵守のために必要な場合。"
          ]
        },
        {
          title: "5. 第三者への共有",
          content: "当社は、以下の場合を除き、個人データを第三者と共有しません。",
          list: [
            "サービス提供業者：ホスティングプロバイダー（AWS等）、分析ツール提供者（Google Analytics等）、決済代行会社など、当社の指示に従ってデータを処理する委託先。",
            "法的要請：法令、裁判所の命令、または政府機関の要請に応じる必要がある場合。",
            "事業譲渡：合併、買収、資産売却等に伴う場合。"
          ]
        },
        {
          title: "6. 情報収集モジュール",
          content: "当サービスでは、Google Analyticsなどの第三者ツールを使用しています。これらはCookie等を使用して利用データを収集します。",
          list: [
            "Google Analyticsのオプトアウト：https://tools.google.com/dlpage/gaoptout"
          ]
        },
        {
          title: "7. データの保持期間",
          content: "当社は、利用目的の達成に必要な期間、または法令で定められた期間、データを保持します。アカウントが削除された場合、または同意が撤回された場合、当社は合理的な期間内（原則30日以内）にデータを削除または匿名化します。ただし、法的義務の履行や紛争解決のために必要な場合はこの限りではありません。"
        },
        {
          title: "8. 国際データ移転（GDPR対応）",
          content: "当サービスは日本に拠点を置いています。そのため、EEA（欧州経済領域）または英国にお住まいのお客様のデータは、日本へ移転され、処理されます。日本は、欧州委員会により十分なデータ保護水準を有しているとの認定（十分性認定）を受けています。これにより、お客様のデータはEU域内と同様の基準で保護されます。"
        },
        {
          title: "9. お客様の権利（GDPR・日本法共通）",
          content: "お客様は、当社が保有する個人データに関して以下の権利を有します。",
          list: [
            "アクセス権：自身のデータおよびその処理状況を確認する権利",
            "訂正権：不正確なデータを修正させる権利",
            "消去権（忘れられる権利）：データを削除させる権利",
            "処理の制限権：データの利用を一時的に停止させる権利",
            "データポータビリティ権：データを構造化された形式で受け取る権利",
            "異議申立権：特定の処理（ダイレクトマーケティング等）に異議を唱える権利",
            "同意の撤回権：いつでも同意を撤回する権利（撤回前の処理の適法性には影響しません）"
          ],
          note: "これらの権利を行使したい場合は、下記のお問い合わせ窓口までご連絡ください。"
        },
        {
          title: "10. 未成年者のプライバシー",
          content: "当サービスは、16歳未満（または各国の法令で定める年齢）の未成年者の個人データを、保護者の同意なしに意図的に収集しません。"
        },
        {
          title: "11. プライバシーポリシーの変更",
          content: "本ポリシーの内容は変更されることがあります。重要な変更がある場合は、サービス内またはメールにて通知します。"
        },
        {
          title: "12. お問い合わせ・データ管理者",
          content: "本ポリシーやデータ処理に関するご質問は、お問い合わせフォームよりご連絡ください。EEA域内にお住まいの方で、現地の監督機関に苦情を申し立てたい場合は、居住国のデータ保護当局にご連絡ください。"
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last Updated: December 8, 2025",
      sections: [
        {
          title: "1. Introduction",
          content: "jiuFlow (\"the Service\" or \"the Company\") respects your privacy and is committed to protecting it. This Privacy Policy (\"Policy\") explains the types of personal information we collect, how we use it, with whom we share it, and your rights. We comply with applicable laws including Japan's \"Act on the Protection of Personal Information\" and the \"EU General Data Protection Regulation (GDPR)\". Where GDPR applies, the Service acts as the \"Controller\" of personal data."
        },
        {
          title: "2. Information We Collect",
          content: "The Service collects the following information through lawful and fair means.",
          subsections: [
            {
              subtitle: "Information You Provide",
              list: [
                "Account Information: Name, email address, username, password, profile picture, affiliated dojo, belt rank, etc.",
                "Health/Physical Information (Sensitive Data): Weight, injury history, physical characteristics, etc. that users voluntarily enter in the practice record feature. As \"special category personal data\" under GDPR, these are processed only with your explicit consent.",
                "Payment Information: Processed directly by payment processors (Stripe, etc.); we do not retain complete credit card information.",
                "User-Generated Content: Uploaded videos, community posts, comments, messages, etc.",
                "Social Information: Follow status of other users and athletes, group membership.",
                "Tournament Participation Information: Tournament registration information, weight class, participation status.",
                "Points/Referral Information: Points history, referral codes, referral results.",
                "Product Purchase Information: Shop order information, shipping addresses, purchase history (Printful integration).",
                "Tips/Video Purchase Information: Tip history to creators, paid video purchase history."
              ]
            },
            {
              subtitle: "Automatically Collected Information",
              list: [
                "Device/Usage Data: IP address, browser type, OS, access date/time, operation logs within the service (video viewing history, etc.), Cookies, Device ID."
              ]
            }
          ]
        },
        {
          title: "3. Purpose of Use",
          content: "We use collected personal information for the following purposes:",
          list: [
            "To provide services, verify identity, and manage billing",
            "To provide practice record management and analysis features for each user",
            "To personalize user experience, such as recommending videos",
            "To improve services, develop new features, and analyze usage trends",
            "To provide customer support and respond to inquiries",
            "To prevent fraud and ensure security"
          ]
        },
        {
          title: "4. Legal Basis for Processing (GDPR Compliance)",
          content: "We process personal data of customers subject to GDPR based on the following legal bases:",
          list: [
            "Contract Performance: When necessary to provide services under the Terms of Service (account management, billing, etc.).",
            "Consent: When you have consented to processing for specific purposes (health data recording, newsletter, etc.). Consent can be withdrawn at any time.",
            "Legitimate Interest: When necessary for our legitimate interests in improving services, ensuring security, and marketing (unless your interests or fundamental rights take precedence).",
            "Legal Obligation: When necessary for legal compliance."
          ]
        },
        {
          title: "5. Sharing with Third Parties",
          content: "We do not share personal data with third parties except in the following cases:",
          list: [
            "Service Providers: Hosting providers (AWS, etc.), analytics tool providers (Google Analytics, etc.), payment processors, and other contractors that process data on our behalf.",
            "Legal Requests: When required to comply with laws, court orders, or government agency requests.",
            "Business Transfers: In connection with mergers, acquisitions, or asset sales."
          ]
        },
        {
          title: "6. Information Collection Modules",
          content: "The Service uses third-party tools such as Google Analytics. These use Cookies and similar technologies to collect usage data.",
          list: [
            "Google Analytics Opt-out: https://tools.google.com/dlpage/gaoptout"
          ]
        },
        {
          title: "7. Data Retention Period",
          content: "We retain data for the period necessary to achieve the purpose of use or as required by law. When an account is deleted or consent is withdrawn, we will delete or anonymize the data within a reasonable period (generally within 30 days). However, this does not apply when necessary for legal compliance or dispute resolution."
        },
        {
          title: "8. International Data Transfers (GDPR Compliance)",
          content: "The Service is based in Japan. Therefore, data of customers residing in the EEA (European Economic Area) or UK will be transferred to and processed in Japan. Japan has received an adequacy decision from the European Commission, meaning your data is protected to the same standard as within the EU."
        },
        {
          title: "9. Your Rights (GDPR & Japanese Law)",
          content: "You have the following rights regarding personal data we hold:",
          list: [
            "Right of Access: The right to confirm your data and its processing status",
            "Right to Rectification: The right to have inaccurate data corrected",
            "Right to Erasure (Right to be Forgotten): The right to have data deleted",
            "Right to Restriction of Processing: The right to temporarily suspend data use",
            "Right to Data Portability: The right to receive data in a structured format",
            "Right to Object: The right to object to certain processing (direct marketing, etc.)",
            "Right to Withdraw Consent: The right to withdraw consent at any time (does not affect the lawfulness of processing before withdrawal)"
          ],
          note: "To exercise these rights, please contact us through the inquiry form below."
        },
        {
          title: "10. Privacy of Minors",
          content: "The Service does not intentionally collect personal data from minors under 16 (or the age specified by local law) without parental consent."
        },
        {
          title: "11. Changes to Privacy Policy",
          content: "This Policy may change. For significant changes, we will notify you through the Service or by email."
        },
        {
          title: "12. Contact / Data Controller",
          content: "For questions about this Policy or data processing, please contact us through our contact form. For EEA residents who wish to file a complaint with a local supervisory authority, please contact the data protection authority in your country of residence."
        }
      ]
    },
    pt: {
      title: "Política de Privacidade",
      lastUpdated: "Última atualização: 8 de dezembro de 2025",
      sections: [
        {
          title: "1. Introdução",
          content: "jiuFlow (\"o Serviço\" ou \"a Empresa\") respeita sua privacidade e está comprometida em protegê-la. Esta Política de Privacidade (\"Política\") explica os tipos de informações pessoais que coletamos, como as usamos, com quem as compartilhamos e seus direitos. Cumprimos as leis aplicáveis, incluindo a \"Lei de Proteção de Informações Pessoais\" do Japão e o \"Regulamento Geral de Proteção de Dados da UE (GDPR)\". Onde o GDPR se aplica, o Serviço atua como \"Controlador\" de dados pessoais."
        },
        {
          title: "2. Informações que Coletamos",
          content: "O Serviço coleta as seguintes informações através de meios lícitos e justos.",
          subsections: [
            {
              subtitle: "Informações que Você Fornece",
              list: [
                "Informações da Conta: Nome, endereço de e-mail, nome de usuário, senha, foto de perfil, academia afiliada, graduação de faixa, etc.",
                "Informações de Saúde/Físicas (Dados Sensíveis): Peso, histórico de lesões, características físicas, etc. que os usuários inserem voluntariamente no recurso de registro de prática. Como \"dados pessoais de categoria especial\" sob o GDPR, estes são processados apenas com seu consentimento explícito.",
                "Informações de Pagamento: Processadas diretamente por processadores de pagamento (Stripe, etc.); não retemos informações completas de cartão de crédito.",
                "Conteúdo Gerado pelo Usuário: Vídeos enviados, postagens na comunidade, comentários, mensagens, etc.",
                "Informações Sociais: Status de seguir outros usuários e atletas, participação em grupos.",
                "Informações de Participação em Torneios: Informações de registro em torneios, categoria de peso, status de participação.",
                "Informações de Pontos/Indicação: Histórico de pontos, códigos de indicação, resultados de indicação.",
                "Informações de Compra de Produtos: Informações de pedidos na loja, endereços de entrega, histórico de compras (integração Printful).",
                "Informações de Gorjetas/Compra de Vídeos: Histórico de gorjetas para criadores, histórico de compras de vídeos pagos."
              ]
            },
            {
              subtitle: "Informações Coletadas Automaticamente",
              list: [
                "Dados de Dispositivo/Uso: Endereço IP, tipo de navegador, SO, data/hora de acesso, logs de operação dentro do serviço (histórico de visualização de vídeos, etc.), Cookies, ID do Dispositivo."
              ]
            }
          ]
        },
        {
          title: "3. Finalidade de Uso",
          content: "Usamos as informações pessoais coletadas para os seguintes fins:",
          list: [
            "Para fornecer serviços, verificar identidade e gerenciar cobrança",
            "Para fornecer recursos de gerenciamento e análise de registros de prática para cada usuário",
            "Para personalizar a experiência do usuário, como recomendar vídeos",
            "Para melhorar serviços, desenvolver novos recursos e analisar tendências de uso",
            "Para fornecer suporte ao cliente e responder a consultas",
            "Para prevenir fraudes e garantir segurança"
          ]
        },
        {
          title: "4. Base Legal para Processamento (Conformidade GDPR)",
          content: "Processamos dados pessoais de clientes sujeitos ao GDPR com base nas seguintes bases legais:",
          list: [
            "Execução de Contrato: Quando necessário para fornecer serviços sob os Termos de Serviço (gerenciamento de conta, cobrança, etc.).",
            "Consentimento: Quando você consentiu com o processamento para fins específicos (registro de dados de saúde, newsletter, etc.). O consentimento pode ser retirado a qualquer momento.",
            "Interesse Legítimo: Quando necessário para nossos interesses legítimos em melhorar serviços, garantir segurança e marketing (a menos que seus interesses ou direitos fundamentais prevaleçam).",
            "Obrigação Legal: Quando necessário para conformidade legal."
          ]
        },
        {
          title: "5. Compartilhamento com Terceiros",
          content: "Não compartilhamos dados pessoais com terceiros, exceto nos seguintes casos:",
          list: [
            "Provedores de Serviço: Provedores de hospedagem (AWS, etc.), provedores de ferramentas de análise (Google Analytics, etc.), processadores de pagamento e outros contratados que processam dados em nosso nome.",
            "Solicitações Legais: Quando necessário para cumprir leis, ordens judiciais ou solicitações de agências governamentais.",
            "Transferências Comerciais: Em conexão com fusões, aquisições ou vendas de ativos."
          ]
        },
        {
          title: "6. Módulos de Coleta de Informações",
          content: "O Serviço usa ferramentas de terceiros como o Google Analytics. Estas usam Cookies e tecnologias similares para coletar dados de uso.",
          list: [
            "Opt-out do Google Analytics: https://tools.google.com/dlpage/gaoptout"
          ]
        },
        {
          title: "7. Período de Retenção de Dados",
          content: "Retemos dados pelo período necessário para alcançar a finalidade de uso ou conforme exigido por lei. Quando uma conta é excluída ou o consentimento é retirado, excluiremos ou anonimizaremos os dados dentro de um período razoável (geralmente dentro de 30 dias). No entanto, isso não se aplica quando necessário para conformidade legal ou resolução de disputas."
        },
        {
          title: "8. Transferências Internacionais de Dados (Conformidade GDPR)",
          content: "O Serviço está sediado no Japão. Portanto, os dados de clientes residentes no EEE (Espaço Econômico Europeu) ou Reino Unido serão transferidos e processados no Japão. O Japão recebeu uma decisão de adequação da Comissão Europeia, o que significa que seus dados são protegidos com o mesmo padrão que dentro da UE."
        },
        {
          title: "9. Seus Direitos (GDPR e Lei Japonesa)",
          content: "Você tem os seguintes direitos em relação aos dados pessoais que mantemos:",
          list: [
            "Direito de Acesso: O direito de confirmar seus dados e seu status de processamento",
            "Direito de Retificação: O direito de ter dados imprecisos corrigidos",
            "Direito de Apagamento (Direito ao Esquecimento): O direito de ter dados excluídos",
            "Direito à Restrição de Processamento: O direito de suspender temporariamente o uso de dados",
            "Direito à Portabilidade de Dados: O direito de receber dados em formato estruturado",
            "Direito de Oposição: O direito de se opor a certos processamentos (marketing direto, etc.)",
            "Direito de Retirar Consentimento: O direito de retirar o consentimento a qualquer momento (não afeta a legalidade do processamento antes da retirada)"
          ],
          note: "Para exercer esses direitos, entre em contato conosco através do formulário de consulta abaixo."
        },
        {
          title: "10. Privacidade de Menores",
          content: "O Serviço não coleta intencionalmente dados pessoais de menores de 16 anos (ou a idade especificada pela lei local) sem consentimento dos pais."
        },
        {
          title: "11. Alterações na Política de Privacidade",
          content: "Esta Política pode mudar. Para mudanças significativas, notificaremos você através do Serviço ou por e-mail."
        },
        {
          title: "12. Contato / Controlador de Dados",
          content: "Para perguntas sobre esta Política ou processamento de dados, entre em contato conosco através do nosso formulário de contato. Para residentes do EEE que desejam registrar uma reclamação junto a uma autoridade supervisora local, entre em contato com a autoridade de proteção de dados em seu país de residência."
        }
      ]
    }
  };

  const currentContent = content[language as keyof typeof content] || content.en;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={seoTitle} description={seoDescription} canonicalUrl="https://jiuflow.art/privacy" noindex={true} />
      <Navigation />
      <main className="container max-w-4xl mx-auto px-4 pt-24 md:pt-28 pb-8 md:pb-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{currentContent.title}</h1>
        <p className="text-muted-foreground mb-8">{currentContent.lastUpdated}</p>

        <div className="space-y-8">
          {currentContent.sections.map((section, index) => (
            <section key={index} className="space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold">{section.title}</h2>
              <p className="text-foreground/90 leading-relaxed">{section.content}</p>
              
              {section.subsections && section.subsections.map((subsection, subIndex) => (
                <div key={subIndex} className="ml-4 space-y-2">
                  <h3 className="font-medium text-foreground">{subsection.subtitle}</h3>
                  <ul className="list-disc list-inside space-y-2 text-foreground/80">
                    {subsection.list.map((item, itemIndex) => (
                      <li key={itemIndex} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              ))}

              {section.list && (
                <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
                  {section.list.map((item, itemIndex) => (
                    <li key={itemIndex} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              )}

              {section.note && (
                <p className="text-sm text-muted-foreground italic mt-2 ml-4">{section.note}</p>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link 
            to="/contact" 
            className="text-primary hover:underline"
          >
            {language === "ja" ? "お問い合わせフォームへ →" : language === "pt" ? "Ir para o formulário de contato →" : "Go to contact form →"}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
