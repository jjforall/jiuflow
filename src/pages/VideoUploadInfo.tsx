import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Video, TrendingUp, DollarSign, Award, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

const VideoUploadInfo = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const content = {
    ja: {
      title: "動画投稿について",
      subtitle: "JiuFlowで動画を投稿して、柔術コミュニティに貢献しましょう",
      uploadButton: "動画を投稿する",
      backButton: "マイページに戻る",
      sections: {
        types: {
          title: "投稿できる動画の種類",
          items: [
            {
              icon: Video,
              title: "試合動画",
              description: "トーナメントやスパーリングの動画を共有して、他のメンバーと学び合いましょう。"
            },
            {
              icon: Award,
              title: "テクニック動画",
              description: "得意な技や練習方法を紹介してください。優れた動画は教材として使用させていただく場合があります。"
            },
            {
              icon: TrendingUp,
              title: "その他の動画",
              description: "トレーニング風景、イベントレポート、柔術に関する様々なコンテンツを投稿できます。"
            }
          ]
        },
        revenue: {
          title: "収益還元について",
          description: "投稿した動画の再生数に応じて収益をお返しします。",
          details: [
            "動画の再生数に基づいて収益を計算",
            "月次でポイントとして還元",
            "ポイントは現金や特典と交換可能"
          ],
          important: {
            title: "重要なお知らせ",
            content: "収益還元を受けるには、JiuFlowの有料会員登録が必要です。無料アカウントでも動画投稿は可能ですが、収益還元の対象外となります。"
          }
        },
        usage: {
          title: "テクニック動画の利用について",
          description: "投稿いただいたテクニック動画の中から、特に優れた内容については、JiuFlowの公式教材として使用させていただく場合があります。",
          details: [
            "使用する場合は事前にご連絡いたします",
            "クレジット表示と追加報酬をお支払いします",
            "投稿者の許可なく使用することはありません"
          ]
        },
        howto: {
          title: "動画投稿の流れ",
          steps: [
            "マイページの「動画をアップロード」ボタンをクリック",
            "動画の種類、タイトル、説明を入力",
            "動画ファイルとサムネイル画像をアップロード",
            "投稿完了後、マイページで確認できます"
          ]
        }
      }
    },
    en: {
      title: "About Video Upload",
      subtitle: "Upload videos to JiuFlow and contribute to the jiu-jitsu community",
      uploadButton: "Upload Video",
      backButton: "Back to My Page",
      sections: {
        types: {
          title: "Types of Videos You Can Upload",
          items: [
            {
              icon: Video,
              title: "Match Videos",
              description: "Share tournament or sparring videos and learn together with other members."
            },
            {
              icon: Award,
              title: "Technique Videos",
              description: "Showcase your favorite techniques or training methods. Excellent videos may be used as teaching materials."
            },
            {
              icon: TrendingUp,
              title: "Other Videos",
              description: "Upload training footage, event reports, and various jiu-jitsu related content."
            }
          ]
        },
        revenue: {
          title: "Revenue Sharing",
          description: "Earn revenue based on the views of your uploaded videos.",
          details: [
            "Revenue calculated based on video views",
            "Distributed as points monthly",
            "Points can be exchanged for cash or benefits"
          ],
          important: {
            title: "Important Notice",
            content: "JiuFlow paid membership is required to receive revenue sharing. Free accounts can upload videos but are not eligible for revenue sharing."
          }
        },
        usage: {
          title: "Use of Technique Videos",
          description: "Outstanding technique videos may be used as official JiuFlow teaching materials.",
          details: [
            "We will contact you beforehand if we wish to use your video",
            "Credit attribution and additional compensation provided",
            "Never used without uploader's permission"
          ]
        },
        howto: {
          title: "Video Upload Process",
          steps: [
            "Click 'Upload Video' button on My Page",
            "Enter video type, title, and description",
            "Upload video file and thumbnail image",
            "View your uploaded videos on My Page after completion"
          ]
        }
      }
    },
    pt: {
      title: "Sobre Upload de Vídeos",
      subtitle: "Faça upload de vídeos no JiuFlow e contribua para a comunidade de jiu-jitsu",
      uploadButton: "Enviar Vídeo",
      backButton: "Voltar para Minha Página",
      sections: {
        types: {
          title: "Tipos de Vídeos que Você Pode Enviar",
          items: [
            {
              icon: Video,
              title: "Vídeos de Lutas",
              description: "Compartilhe vídeos de torneios ou treinos e aprenda junto com outros membros."
            },
            {
              icon: Award,
              title: "Vídeos de Técnicas",
              description: "Mostre suas técnicas favoritas ou métodos de treino. Vídeos excelentes podem ser usados como materiais de ensino."
            },
            {
              icon: TrendingUp,
              title: "Outros Vídeos",
              description: "Envie filmagens de treino, relatórios de eventos e vários conteúdos relacionados ao jiu-jitsu."
            }
          ]
        },
        revenue: {
          title: "Compartilhamento de Receita",
          description: "Ganhe receita com base nas visualizações dos seus vídeos enviados.",
          details: [
            "Receita calculada com base nas visualizações de vídeos",
            "Distribuída como pontos mensalmente",
            "Pontos podem ser trocados por dinheiro ou benefícios"
          ],
          important: {
            title: "Aviso Importante",
            content: "É necessária a assinatura paga do JiuFlow para receber o compartilhamento de receita. Contas gratuitas podem enviar vídeos, mas não são elegíveis para o compartilhamento de receita."
          }
        },
        usage: {
          title: "Uso de Vídeos de Técnicas",
          description: "Vídeos de técnicas excepcionais podem ser usados como materiais de ensino oficiais do JiuFlow.",
          details: [
            "Entraremos em contato antes se desejarmos usar seu vídeo",
            "Atribuição de crédito e compensação adicional fornecida",
            "Nunca usado sem permissão do uploader"
          ]
        },
        howto: {
          title: "Processo de Upload de Vídeo",
          steps: [
            "Clique no botão 'Enviar Vídeo' na Minha Página",
            "Digite o tipo de vídeo, título e descrição",
            "Envie o arquivo de vídeo e imagem de miniatura",
            "Visualize seus vídeos enviados na Minha Página após a conclusão"
          ]
        }
      }
    }
  };

  const t = content[language as keyof typeof content];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">
              {t.title}
            </h1>
            <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto">
              {t.subtitle}
            </p>
            <div className="flex gap-4 justify-center mt-8">
              <Button size="lg" onClick={() => navigate("/mypage")}>
                <Upload className="w-4 h-4 mr-2" />
                {t.uploadButton}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/mypage")}>
                {t.backButton}
              </Button>
            </div>
          </div>

          {/* Video Types */}
          <div className="mb-16 animate-fade-up">
            <h2 className="text-3xl font-light mb-8 text-center">
              {t.sections.types.title}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {t.sections.types.items.map((item, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-primary/10 rounded-full">
                        <item.icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="font-light">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Revenue Sharing */}
          <div className="mb-16 animate-fade-up">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-light">
                  <DollarSign className="w-6 h-6 text-primary" />
                  {t.sections.revenue.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg">{t.sections.revenue.description}</p>
                <ul className="space-y-2">
                  {t.sections.revenue.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                        {t.sections.revenue.important.title}
                      </h4>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {t.sections.revenue.important.content}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Technique Video Usage */}
          <div className="mb-16 animate-fade-up">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-light">
                  <Award className="w-6 h-6" />
                  {t.sections.usage.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{t.sections.usage.description}</p>
                <ul className="space-y-2">
                  {t.sections.usage.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* How to Upload */}
          <div className="animate-fade-up">
            <h2 className="text-3xl font-light mb-8 text-center">
              {t.sections.howto.title}
            </h2>
            <Card>
              <CardContent className="pt-6">
                <ol className="space-y-4">
                  {t.sections.howto.steps.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <p>{step}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center animate-fade-up">
            <Button size="lg" onClick={() => navigate("/mypage")}>
              <Upload className="w-4 h-4 mr-2" />
              {t.uploadButton}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VideoUploadInfo;
