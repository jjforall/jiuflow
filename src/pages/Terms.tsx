import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";

const Terms = () => {
  const { language } = useLanguage();
  const seoTitle = language === 'ja' ? '利用規約 | JiuFlow' : 'Terms of Service | JiuFlow';
  const seoDescription = language === 'ja' ? 'JiuFlowの利用規約。サービス利用に関する条件を説明します。' : 'JiuFlow Terms of Service.';

  const content = {
    ja: {
      title: "利用規約",
      lastUpdated: "最終更新日: 2025年12月8日",
      sections: [
        {
          title: "1. はじめに",
          content: "本利用規約（以下「本規約」）は、jiuFlow（以下「当社」または「当サービス」）の利用に関する条件を定めるものです。ユーザーは、当サービスを利用することにより、本規約のすべての条項に同意したものとみなされます。"
        },
        {
          title: "2. サービスの概要",
          content: "当サービスは、ブラジリアン柔術を中心とした技術動画の配信、練習記録の管理、およびユーザーコミュニティ機能を提供するプラットフォームです。当サービスは医療的助言や、専門的な指導員の直接指導に代わるものではありません。"
        },
        {
          title: "3. アカウント登録",
          content: "当サービスの一部機能を利用するには、アカウント登録が必要です。ユーザーは以下を誓約するものとします。",
          list: [
            "正確かつ最新の情報を提供すること",
            "アカウント情報（パスワード等）を自己の責任で厳重に管理すること",
            "アカウントの不正使用が疑われる場合は速やかに当社に報告すること",
            "未成年者である場合は、親権者等の法定代理人の同意を得て登録すること",
            "反社会的勢力の排除：ユーザーは、現在および将来にわたり、暴力団、暴力団員、その他これらに準ずる者（以下「反社会的勢力」）に該当しないことを表明し、保証するものとします。"
          ]
        },
        {
          title: "4. 利用料金と支払い",
          content: "プランと料金：当サービスには無料プランと有料プランがあります。有料プランの利用料金および支払時期は、別途サービス内または公式サイト上に表示する通りとします。",
          list: [
            "自動更新：有料プランは、期間満了日までに所定の解約手続きが行われない限り、同一の条件で自動的に更新されるものとします。",
            "返金規定：法令に定める場合を除き、既にお支払いいただいた利用料金の返金（日割り計算を含む）は一切行いません。",
            "料金の変更：当社は、利用料金を変更する権利を有します。変更については事前に通知し、変更後も利用を継続した場合は、変更後の料金に同意したものとみなします。"
          ]
        },
        {
          title: "5. 禁止事項",
          content: "ユーザーは以下の行為を行ってはなりません。",
          list: [
            "法令、裁判所の判決、決定または命令、または法的拘束力のある行政措置に違反する行為",
            "公序良俗に反する行為",
            "他のユーザーに対する嫌がらせ、脅迫、誹謗中傷、差別的発言",
            "道場、ジム、特定の流派に対する根拠のない批判や営業妨害行為",
            "当社または第三者の知的財産権、肖像権、プライバシー権、名誉、その他の権利を侵害する行為",
            "コンテンツの不正なダウンロード、複製、配布、転載",
            "商業目的での無断使用（当社の許可を得た場合を除く）",
            "当サービスのサーバーやネットワークシステムに支障を与える行為（BOTの使用等）"
          ]
        },
        {
          title: "6. コンテンツの権利",
          content: "当サービスが提供するすべてのコンテンツ（動画、テキスト、画像、ロゴ、プログラム等）の著作権は、当社または正当な権利を有するライセンサーに帰属します。ユーザーは、本規約で認められる範囲（個人的かつ非商業的な視聴等）を超えてこれらを利用することはできません。"
        },
        {
          title: "7. ユーザー投稿コンテンツ（UGC）",
          content: "ユーザーが投稿したコンテンツ（動画、コメント、練習記録等）の著作権はユーザーに留保されます。",
          list: [
            "ユーザーは、投稿したコンテンツについて、当社に対し、サービスの運営、改善、宣伝広告などを目的として、世界的、非独占的、無償、サブライセンス可能かつ譲渡可能な使用権（複製、上映、公衆送信、展示、頒布、翻訳、翻案等を含む）を付与するものとします。",
            "ユーザーは、当社および当社が指定する第三者に対して、著作者人格権を行使しないことに同意するものとします。",
            "ユーザーは、投稿コンテンツが第三者の権利（肖像権、プライバシー権、著作権等）を侵害していないことを保証するものとします。特に、他者が映り込んでいる動画や、所属する道場の撮影許可が得られていない動画の投稿は禁止します。"
          ]
        },
        {
          title: "8. サービスの変更・停止・終了",
          content: "当社は、事前の通知なくサービスの内容を変更し、または以下のいずれかに該当する場合、サービスの提供を一時的もしくは永続的に停止・終了することができるものとします。",
          list: [
            "システムの保守点検または更新を行う場合",
            "地震、火災、停電などの不可抗力によりサービスの提供が困難となった場合",
            "その他、当社が困難と判断した場合"
          ]
        },
        {
          title: "9. 免責事項（重要）",
          content: "身体的リスク：当サービスで紹介される技術やトレーニングの実践は、ユーザー自身の責任において行ってください。当社は、当サービスの利用に起因してユーザーまたは第三者に生じた怪我、事故、身体的・精神的損害、物的損害について、一切の責任を負いません。練習の際は、十分な準備運動を行い、安全に配慮し、必要であれば医師や専門の指導者のアドバイスを受けてください。",
          list: [
            "サービスの現状有姿：当サービスは「現状有姿」で提供され、その正確性、完全性、有用性、特定目的への適合性について保証するものではありません。"
          ]
        },
        {
          title: "10. 損害賠償と責任の制限",
          content: "ユーザーは、本規約に違反して当社に損害を与えた場合、その損害を賠償する責任を負います。",
          list: [
            "当社は、当社の債務不履行または不法行為によりユーザーに損害が生じた場合、当社に故意または重過失がある場合を除き、ユーザーが被った直接かつ通常の損害に限り、過去12ヶ月間にユーザーが当社に支払った利用料金の合計額を上限として賠償責任を負うものとします。",
            "前項の規定は、ユーザーが消費者契約法上の消費者に該当する場合にのみ適用され、それ以外の場合、当社は一切の責任を負わないものとします。"
          ]
        },
        {
          title: "11. アカウントの利用停止・削除",
          content: "当社は、ユーザーが本規約に違反した場合、または不適切と判断した場合、事前の通知なくアカウントを停止または削除することができます。"
        },
        {
          title: "12. 準拠法・管轄",
          content: "本規約は日本法に準拠し、本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。"
        },
        {
          title: "13. 規約の変更",
          content: "当社は、必要と判断した場合には、ユーザーの承諾を得ることなく本規約を変更することができるものとします。変更後の規約は、当サービス上に表示された時点から効力を生じるものとします。"
        },
        {
          title: "14. お問い合わせ",
          content: "本規約に関するご質問は、お問い合わせフォームよりご連絡ください。"
        }
      ]
    },
    en: {
      title: "Terms of Service",
      lastUpdated: "Last Updated: December 8, 2025",
      sections: [
        {
          title: "1. Introduction",
          content: "These Terms of Service (\"Terms\") govern your use of jiuFlow (\"the Company\" or \"the Service\"). By using the Service, you are deemed to have agreed to all provisions of these Terms."
        },
        {
          title: "2. Service Overview",
          content: "The Service is a platform that provides Brazilian Jiu-Jitsu technique video streaming, practice record management, and user community features. The Service is not a substitute for medical advice or direct instruction from professional instructors."
        },
        {
          title: "3. Account Registration",
          content: "Account registration is required to use certain features of the Service. Users pledge the following:",
          list: [
            "To provide accurate and up-to-date information",
            "To strictly manage account information (passwords, etc.) at their own responsibility",
            "To promptly report to the Company if unauthorized use of the account is suspected",
            "If a minor, to register with the consent of a legal representative such as a parent",
            "Exclusion of Anti-Social Forces: Users represent and warrant that they do not currently and will not in the future fall under organized crime groups, members of organized crime groups, or any similar entities (\"anti-social forces\")."
          ]
        },
        {
          title: "4. Fees and Payment",
          content: "Plans and Fees: The Service offers both free and paid plans. Fees and payment timing for paid plans shall be as displayed within the Service or on the official website.",
          list: [
            "Auto-renewal: Paid plans will automatically renew under the same conditions unless the prescribed cancellation procedures are completed before the expiration date.",
            "Refund Policy: Except as required by law, no refunds (including prorated amounts) will be provided for fees already paid.",
            "Fee Changes: The Company reserves the right to change fees. Changes will be notified in advance, and continued use after changes constitutes acceptance of the new fees."
          ]
        },
        {
          title: "5. Prohibited Activities",
          content: "Users must not engage in the following activities:",
          list: [
            "Acts that violate laws, court judgments, decisions or orders, or legally binding administrative measures",
            "Acts contrary to public order and morals",
            "Harassment, threats, defamation, or discriminatory remarks against other users",
            "Unfounded criticism or business interference against dojos, gyms, or specific schools",
            "Acts that infringe on the intellectual property rights, portrait rights, privacy rights, honor, or other rights of the Company or third parties",
            "Unauthorized downloading, copying, distribution, or republication of content",
            "Unauthorized commercial use (except with permission from the Company)",
            "Acts that interfere with the Service's servers or network systems (such as using BOTs)"
          ]
        },
        {
          title: "6. Content Rights",
          content: "Copyright in all content provided by the Service (videos, text, images, logos, programs, etc.) belongs to the Company or licensors with legitimate rights. Users may not use these beyond the scope permitted by these Terms (such as personal and non-commercial viewing)."
        },
        {
          title: "7. User-Generated Content (UGC)",
          content: "Copyright in content posted by users (videos, comments, practice records, etc.) is retained by the users.",
          list: [
            "Users grant the Company a worldwide, non-exclusive, free, sublicensable, and transferable right to use (including reproduction, screening, public transmission, display, distribution, translation, adaptation, etc.) the posted content for the purpose of operating, improving, and advertising the Service.",
            "Users agree not to exercise moral rights against the Company and third parties designated by the Company.",
            "Users warrant that the posted content does not infringe on the rights of third parties (portrait rights, privacy rights, copyrights, etc.). In particular, posting videos that include other people or videos filmed without permission from the dojo you belong to is prohibited."
          ]
        },
        {
          title: "8. Service Changes, Suspension, and Termination",
          content: "The Company may change the content of the Service without prior notice, and may temporarily or permanently suspend or terminate the Service if any of the following applies:",
          list: [
            "When performing system maintenance or updates",
            "When service provision becomes difficult due to force majeure such as earthquakes, fires, or power outages",
            "Other cases where the Company determines it to be difficult"
          ]
        },
        {
          title: "9. Disclaimer (Important)",
          content: "Physical Risks: Please practice techniques and training introduced in the Service at your own responsibility. The Company assumes no responsibility for any injuries, accidents, physical or mental damages, or property damages that occur to users or third parties as a result of using the Service. When practicing, please warm up sufficiently, pay attention to safety, and seek advice from a doctor or professional instructor if necessary.",
          list: [
            "Service As-Is: The Service is provided \"as is\" and does not guarantee its accuracy, completeness, usefulness, or fitness for a particular purpose."
          ]
        },
        {
          title: "10. Damages and Limitation of Liability",
          content: "Users shall be liable for damages if they cause damage to the Company in violation of these Terms.",
          list: [
            "If the Company's breach of contract or tort causes damage to users, the Company shall be liable for compensation only for direct and ordinary damages suffered by users, up to the total amount of fees paid by the user to the Company in the past 12 months, unless the Company was intentional or grossly negligent.",
            "The preceding paragraph applies only when the user falls under a consumer under the Consumer Contract Act; otherwise, the Company assumes no liability."
          ]
        },
        {
          title: "11. Account Suspension and Deletion",
          content: "The Company may suspend or delete accounts without prior notice if users violate these Terms or are deemed inappropriate."
        },
        {
          title: "12. Governing Law and Jurisdiction",
          content: "These Terms shall be governed by Japanese law. Any disputes relating to these Terms shall be subject to the exclusive jurisdiction of the Tokyo District Court as the court of first instance."
        },
        {
          title: "13. Changes to Terms",
          content: "The Company may change these Terms without obtaining user consent if deemed necessary. The revised Terms shall take effect from the time they are displayed on the Service."
        },
        {
          title: "14. Contact Us",
          content: "If you have any questions about these Terms, please contact us through our contact form."
        }
      ]
    },
    pt: {
      title: "Termos de Serviço",
      lastUpdated: "Última atualização: 8 de dezembro de 2025",
      sections: [
        {
          title: "1. Introdução",
          content: "Estes Termos de Serviço (\"Termos\") regem o uso do jiuFlow (\"a Empresa\" ou \"o Serviço\"). Ao usar o Serviço, considera-se que você concordou com todas as disposições destes Termos."
        },
        {
          title: "2. Visão Geral do Serviço",
          content: "O Serviço é uma plataforma que fornece streaming de vídeos de técnicas de Jiu-Jitsu Brasileiro, gerenciamento de registros de prática e recursos de comunidade de usuários. O Serviço não substitui aconselhamento médico ou instrução direta de instrutores profissionais."
        },
        {
          title: "3. Registro de Conta",
          content: "O registro de conta é necessário para usar certos recursos do Serviço. Os usuários se comprometem com o seguinte:",
          list: [
            "Fornecer informações precisas e atualizadas",
            "Gerenciar rigorosamente as informações da conta (senhas, etc.) sob sua própria responsabilidade",
            "Relatar prontamente à Empresa se houver suspeita de uso não autorizado da conta",
            "Se menor de idade, registrar-se com o consentimento de um representante legal, como um pai",
            "Exclusão de Forças Antissociais: Os usuários declaram e garantem que não pertencem atualmente e não pertencerão no futuro a grupos criminosos organizados, membros de grupos criminosos organizados ou quaisquer entidades similares (\"forças antissociais\")."
          ]
        },
        {
          title: "4. Taxas e Pagamento",
          content: "Planos e Taxas: O Serviço oferece planos gratuitos e pagos. As taxas e o momento do pagamento para planos pagos serão conforme exibido no Serviço ou no site oficial.",
          list: [
            "Renovação automática: Os planos pagos serão renovados automaticamente nas mesmas condições, a menos que os procedimentos de cancelamento prescritos sejam concluídos antes da data de expiração.",
            "Política de reembolso: Exceto conforme exigido por lei, nenhum reembolso (incluindo valores proporcionais) será fornecido para taxas já pagas.",
            "Alterações de taxas: A Empresa reserva-se o direito de alterar as taxas. As alterações serão notificadas com antecedência, e o uso continuado após as alterações constitui aceitação das novas taxas."
          ]
        },
        {
          title: "5. Atividades Proibidas",
          content: "Os usuários não devem se envolver nas seguintes atividades:",
          list: [
            "Atos que violem leis, sentenças judiciais, decisões ou ordens, ou medidas administrativas legalmente vinculativas",
            "Atos contrários à ordem pública e aos bons costumes",
            "Assédio, ameaças, difamação ou comentários discriminatórios contra outros usuários",
            "Críticas infundadas ou interferência nos negócios contra academias, ginásios ou escolas específicas",
            "Atos que infrinjam direitos de propriedade intelectual, direitos de imagem, direitos de privacidade, honra ou outros direitos da Empresa ou terceiros",
            "Download, cópia, distribuição ou republicação não autorizada de conteúdo",
            "Uso comercial não autorizado (exceto com permissão da Empresa)",
            "Atos que interfiram nos servidores ou sistemas de rede do Serviço (como uso de BOTs)"
          ]
        },
        {
          title: "6. Direitos de Conteúdo",
          content: "Os direitos autorais de todo o conteúdo fornecido pelo Serviço (vídeos, texto, imagens, logotipos, programas, etc.) pertencem à Empresa ou licenciadores com direitos legítimos. Os usuários não podem usar estes além do escopo permitido por estes Termos (como visualização pessoal e não comercial)."
        },
        {
          title: "7. Conteúdo Gerado pelo Usuário (UGC)",
          content: "Os direitos autorais do conteúdo postado pelos usuários (vídeos, comentários, registros de prática, etc.) são retidos pelos usuários.",
          list: [
            "Os usuários concedem à Empresa um direito mundial, não exclusivo, gratuito, sublicenciável e transferível de usar (incluindo reprodução, exibição, transmissão pública, exposição, distribuição, tradução, adaptação, etc.) o conteúdo postado para fins de operação, melhoria e publicidade do Serviço.",
            "Os usuários concordam em não exercer direitos morais contra a Empresa e terceiros designados pela Empresa.",
            "Os usuários garantem que o conteúdo postado não infringe os direitos de terceiros (direitos de imagem, direitos de privacidade, direitos autorais, etc.). Em particular, é proibido postar vídeos que incluam outras pessoas ou vídeos filmados sem permissão da academia à qual você pertence."
          ]
        },
        {
          title: "8. Alterações, Suspensão e Encerramento do Serviço",
          content: "A Empresa pode alterar o conteúdo do Serviço sem aviso prévio e pode suspender ou encerrar temporária ou permanentemente o Serviço se qualquer um dos seguintes se aplicar:",
          list: [
            "Ao realizar manutenção ou atualizações do sistema",
            "Quando a prestação do serviço se tornar difícil devido a força maior, como terremotos, incêndios ou quedas de energia",
            "Outros casos em que a Empresa determinar ser difícil"
          ]
        },
        {
          title: "9. Isenção de Responsabilidade (Importante)",
          content: "Riscos Físicos: Por favor, pratique técnicas e treinamentos apresentados no Serviço sob sua própria responsabilidade. A Empresa não assume responsabilidade por quaisquer lesões, acidentes, danos físicos ou mentais, ou danos materiais que ocorram a usuários ou terceiros como resultado do uso do Serviço. Ao praticar, faça aquecimento suficiente, preste atenção à segurança e procure orientação de um médico ou instrutor profissional, se necessário.",
          list: [
            "Serviço \"Como Está\": O Serviço é fornecido \"como está\" e não garante sua precisão, completude, utilidade ou adequação a um propósito específico."
          ]
        },
        {
          title: "10. Danos e Limitação de Responsabilidade",
          content: "Os usuários serão responsáveis por danos se causarem danos à Empresa em violação destes Termos.",
          list: [
            "Se a violação contratual ou ato ilícito da Empresa causar danos aos usuários, a Empresa será responsável por compensação apenas por danos diretos e ordinários sofridos pelos usuários, até o valor total das taxas pagas pelo usuário à Empresa nos últimos 12 meses, a menos que a Empresa tenha sido intencional ou gravemente negligente.",
            "O parágrafo anterior se aplica apenas quando o usuário se enquadra como consumidor sob a Lei de Contratos de Consumo; caso contrário, a Empresa não assume nenhuma responsabilidade."
          ]
        },
        {
          title: "11. Suspensão e Exclusão de Conta",
          content: "A Empresa pode suspender ou excluir contas sem aviso prévio se os usuários violarem estes Termos ou forem considerados inadequados."
        },
        {
          title: "12. Lei Aplicável e Jurisdição",
          content: "Estes Termos serão regidos pela lei japonesa. Quaisquer disputas relacionadas a estes Termos estarão sujeitas à jurisdição exclusiva do Tribunal Distrital de Tóquio como tribunal de primeira instância."
        },
        {
          title: "13. Alterações nos Termos",
          content: "A Empresa pode alterar estes Termos sem obter o consentimento do usuário, se considerado necessário. Os Termos revisados entrarão em vigor a partir do momento em que forem exibidos no Serviço."
        },
        {
          title: "14. Contato",
          content: "Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco através do nosso formulário de contato."
        }
      ]
    }
  };

  const t = content[language as keyof typeof content] || content.en;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={seoTitle} description={seoDescription} canonicalUrl="https://jiuflow.lovableproject.com/terms" noindex={true} />
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

export default Terms;
