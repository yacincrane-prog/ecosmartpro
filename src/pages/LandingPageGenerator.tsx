import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Eye, Edit3, RefreshCw, Image as ImageIcon, Rocket, Brain, LayoutTemplate, Palette, Wand2 } from "lucide-react";
import { useLandingGenerator, LandingProject, LandingSection, StageStatus } from "@/hooks/useLandingGenerator";

const stageLabels: Record<string, { label: string; icon: any }> = {
  strategy: { label: "الاستراتيجية", icon: Brain },
  structure: { label: "الهيكل", icon: LayoutTemplate },
  images: { label: "الصور", icon: Palette },
  assembly: { label: "المعاينة", icon: Eye },
};

function StageIndicator({ stage, status }: { stage: string; status: StageStatus }) {
  const info = stageLabels[stage];
  const Icon = info?.icon || Clock;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
        status === "completed" ? "bg-primary/20 border-primary text-primary" :
        status === "in_progress" ? "bg-primary/10 border-primary/50 text-primary animate-pulse" :
        status === "failed" ? "bg-destructive/20 border-destructive text-destructive" :
        "bg-muted border-border text-muted-foreground"
      }`}>
        {status === "completed" ? <CheckCircle2 className="h-5 w-5" /> :
         status === "in_progress" ? <Loader2 className="h-5 w-5 animate-spin" /> :
         status === "failed" ? <XCircle className="h-5 w-5" /> :
         <Icon className="h-5 w-5" />}
      </div>
      <span className="text-xs text-muted-foreground">{info?.label}</span>
    </div>
  );
}

export default function LandingPageGenerator() {
  const {
    strategy, setStrategy,
    sections,
    stageStatus,
    runStrategy,
    runStructure,
    generateSectionImage,
    runAllImages,
    updateSection,
    updateStage,
  } = useLandingGenerator();

  const [activeTab, setActiveTab] = useState("input");
  const [project, setProject] = useState<LandingProject>({
    productName: "",
    description: "",
    targetAudience: "",
    price: "",
    marketCountry: "الجزائر",
    desiredTone: "",
    imageUrls: [],
  });
  const [imageInput, setImageInput] = useState("");
  const [editingStrategy, setEditingStrategy] = useState(false);
  const [editedStrategy, setEditedStrategy] = useState("");

  const handleAddImage = () => {
    if (imageInput.trim()) {
      setProject(p => ({ ...p, imageUrls: [...p.imageUrls, imageInput.trim()] }));
      setImageInput("");
    }
  };

  const handleRunStrategy = async () => {
    if (!project.productName) { toast.error("أدخل اسم المنتج"); return; }
    try {
      const result = await runStrategy(project);
      setActiveTab("strategy");
    } catch {}
  };

  const handleRunStructure = async () => {
    if (!strategy) return;
    try {
      await runStructure(project, strategy);
      setActiveTab("structure");
    } catch {}
  };

  const handleRunImages = async () => {
    updateStage("images", "in_progress");
    setActiveTab("images");
    await runAllImages(project.productName, project.imageUrls[0]);
  };

  const handleSaveStrategy = () => {
    try {
      const parsed = JSON.parse(editedStrategy);
      setStrategy(parsed);
      setEditingStrategy(false);
      toast.success("تم تحديث الاستراتيجية");
    } catch {
      toast.error("JSON غير صالح");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            مولّد صفحات الهبوط
          </h1>
          <p className="text-sm text-muted-foreground mt-1">نظام ذكي متعدد المراحل لبناء صفحات هبوط احترافية</p>
        </div>
      </div>

      {/* Stage Progress */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {Object.entries(stageLabels).map(([key], i, arr) => (
              <div key={key} className="flex items-center">
                <StageIndicator stage={key} status={stageStatus[key]} />
                {i < arr.length - 1 && <div className={`h-0.5 w-12 mx-2 ${stageStatus[key] === "completed" ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="input">الإدخال</TabsTrigger>
          <TabsTrigger value="strategy" disabled={!strategy}>الاستراتيجية</TabsTrigger>
          <TabsTrigger value="structure" disabled={sections.length === 0}>الهيكل</TabsTrigger>
          <TabsTrigger value="images" disabled={sections.length === 0}>الصور</TabsTrigger>
          <TabsTrigger value="preview" disabled={sections.length === 0}>المعاينة</TabsTrigger>
        </TabsList>

        {/* INPUT TAB */}
        <TabsContent value="input">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> بيانات المنتج</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">اسم المنتج *</label>
                  <Input className="input-field" value={project.productName} onChange={e => setProject(p => ({ ...p, productName: e.target.value }))} placeholder="مثال: حذاء رياضي" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">السعر</label>
                  <Input className="input-field" value={project.price} onChange={e => setProject(p => ({ ...p, price: e.target.value }))} placeholder="مثال: 4500 دج" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">الجمهور المستهدف</label>
                  <Input className="input-field" value={project.targetAudience} onChange={e => setProject(p => ({ ...p, targetAudience: e.target.value }))} placeholder="مثال: شباب 18-35 سنة" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">البلد</label>
                  <Input className="input-field" value={project.marketCountry} onChange={e => setProject(p => ({ ...p, marketCountry: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">وصف المنتج</label>
                <Textarea className="input-field" rows={3} value={project.description} onChange={e => setProject(p => ({ ...p, description: e.target.value }))} placeholder="صف المنتج بإيجاز..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">النبرة المطلوبة (اختياري)</label>
                <Input className="input-field" value={project.desiredTone} onChange={e => setProject(p => ({ ...p, desiredTone: e.target.value }))} placeholder="مثال: عاطفية، رسمية، عصرية" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">روابط صور المنتج</label>
                <div className="flex gap-2">
                  <Input className="input-field flex-1" value={imageInput} onChange={e => setImageInput(e.target.value)} placeholder="https://..." onKeyDown={e => e.key === "Enter" && handleAddImage()} />
                  <Button variant="outline" onClick={handleAddImage}>إضافة</Button>
                </div>
                {project.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.imageUrls.map((url, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setProject(p => ({ ...p, imageUrls: p.imageUrls.filter((_, j) => j !== i) }))}>
                        صورة {i + 1} ✕
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button className="w-full" size="lg" onClick={handleRunStrategy} disabled={stageStatus.strategy === "in_progress"}>
                {stageStatus.strategy === "in_progress" ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Brain className="h-4 w-4 ml-2" />}
                تحليل استراتيجي بالذكاء الاصطناعي
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STRATEGY TAB */}
        <TabsContent value="strategy">
          {strategy && (
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> نتيجة التحليل الاستراتيجي</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingStrategy(!editingStrategy); setEditedStrategy(JSON.stringify(strategy, null, 2)); }}>
                    <Edit3 className="h-4 w-4 ml-1" /> تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRunStrategy}>
                    <RefreshCw className="h-4 w-4 ml-1" /> إعادة
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingStrategy ? (
                  <div className="space-y-3">
                    <Textarea dir="ltr" className="input-field font-mono text-sm" rows={12} value={editedStrategy} onChange={e => setEditedStrategy(e.target.value)} />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveStrategy}>حفظ</Button>
                      <Button variant="outline" onClick={() => setEditingStrategy(false)}>إلغاء</Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { k: "target_persona", l: "الشخصية المستهدفة" },
                      { k: "core_problem", l: "المشكلة الأساسية" },
                      { k: "emotional_trigger", l: "المحفز العاطفي" },
                      { k: "unique_mechanism", l: "الآلية الفريدة" },
                      { k: "angle", l: "الزاوية التسويقية" },
                      { k: "main_promise", l: "الوعد الرئيسي" },
                      { k: "offer_structure", l: "هيكل العرض" },
                    ].map(({ k, l }) => (
                      <div key={k} className="bg-muted/30 rounded-lg p-3">
                        <span className="text-xs text-primary font-semibold">{l}</span>
                        <p className="text-sm mt-1">{(strategy as any)[k]}</p>
                      </div>
                    ))}
                    <div className="md:col-span-2 bg-muted/30 rounded-lg p-3">
                      <span className="text-xs text-primary font-semibold">الهوكات</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {strategy.hooks?.map((h, i) => <Badge key={i} variant="secondary">{h}</Badge>)}
                      </div>
                    </div>
                  </div>
                )}
                <Button className="w-full mt-4" onClick={handleRunStructure} disabled={stageStatus.structure === "in_progress"}>
                  {stageStatus.structure === "in_progress" ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <LayoutTemplate className="h-4 w-4 ml-2" />}
                  بناء هيكل الصفحة
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* STRUCTURE TAB */}
        <TabsContent value="structure">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5 text-primary" /> هيكل صفحة الهبوط</CardTitle>
              <Button variant="outline" size="sm" onClick={handleRunStructure}><RefreshCw className="h-4 w-4 ml-1" /> إعادة</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.map((sec, i) => (
                <SectionCard key={i} index={i} section={sec} onUpdate={updateSection} onRegenImage={() => generateSectionImage(i, project.productName, project.imageUrls[0])} />
              ))}
              <Button className="w-full" onClick={handleRunImages} disabled={stageStatus.images === "in_progress"}>
                {stageStatus.images === "in_progress" ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Palette className="h-4 w-4 ml-2" />}
                توليد جميع الصور
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMAGES TAB */}
        <TabsContent value="images">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> صور الأقسام</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sections.map((sec, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg overflow-hidden">
                    <div className="aspect-video bg-muted/50 flex items-center justify-center relative">
                      {sec.image_status === "generating" && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                      {sec.image_status === "failed" && <XCircle className="h-8 w-8 text-destructive" />}
                      {sec.image_status === "done" && sec.image_url && (
                        <img src={sec.image_url} alt={sec.type} className="w-full h-full object-cover" loading="lazy" />
                      )}
                      {sec.image_status === "pending" && <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{sec.type}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => generateSectionImage(i, project.productName, project.imageUrls[0])}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" onClick={() => { updateStage("assembly", "completed"); setActiveTab("preview"); }}>
                <Eye className="h-4 w-4 ml-2" /> معاينة الصفحة
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREVIEW TAB */}
        <TabsContent value="preview">
          <LandingPreview sections={sections} productName={project.productName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* Section Card for Structure Tab */
function SectionCard({ index, section, onUpdate, onRegenImage }: { index: number; section: LandingSection; onUpdate: (i: number, u: Partial<LandingSection>) => void; onRegenImage: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary">{index + 1}</Badge>
          <Badge>{section.type}</Badge>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}><Edit3 className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={onRegenImage}><ImageIcon className="h-3 w-3" /></Button>
        </div>
      </div>
      {editing ? (
        <div className="space-y-2 mt-2">
          <Input className="input-field text-sm" value={section.headline} onChange={e => onUpdate(index, { headline: e.target.value })} placeholder="العنوان" />
          <Textarea className="input-field text-sm" rows={2} value={section.body_text} onChange={e => onUpdate(index, { body_text: e.target.value })} placeholder="النص" />
          <Input className="input-field text-sm" value={section.cta_text} onChange={e => onUpdate(index, { cta_text: e.target.value })} placeholder="CTA" />
          <Button size="sm" onClick={() => setEditing(false)}>حفظ</Button>
        </div>
      ) : (
        <div className="space-y-1 text-sm">
          {section.headline && <p className="font-semibold">{section.headline}</p>}
          {section.body_text && <p className="text-muted-foreground">{section.body_text}</p>}
          {section.cta_text && <Badge variant="secondary" className="mt-1">{section.cta_text}</Badge>}
          <p className="text-xs text-muted-foreground mt-1">🎯 {section.goal}</p>
        </div>
      )}
    </div>
  );
}

/* Landing Page Preview */
function LandingPreview({ sections, productName }: { sections: LandingSection[]; productName: string }) {
  return (
    <div className="space-y-0 max-w-3xl mx-auto">
      <div className="bg-muted/20 rounded-t-xl p-3 text-center">
        <p className="text-xs text-muted-foreground">معاينة صفحة الهبوط — {productName}</p>
      </div>
      <div className="bg-background border border-border rounded-b-xl overflow-hidden">
        {sections.map((sec, i) => (
          <div key={i} className={`relative ${i > 0 ? "border-t border-border/30" : ""}`}>
            {sec.image_url && (
              <div className="relative">
                <img src={sec.image_url} alt={sec.type} className="w-full object-cover max-h-96" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                <div className="absolute bottom-0 right-0 left-0 p-6 text-right">
                  {sec.headline && <h2 className="text-2xl md:text-3xl font-bold mb-2">{sec.headline}</h2>}
                  {sec.body_text && <p className="text-sm md:text-base text-foreground/80 max-w-xl">{sec.body_text}</p>}
                  {sec.cta_text && (
                    <Button className="mt-4" size="lg">{sec.cta_text}</Button>
                  )}
                </div>
              </div>
            )}
            {!sec.image_url && (
              <div className="p-8 md:p-12 text-center">
                {sec.headline && <h2 className="text-xl md:text-2xl font-bold mb-3">{sec.headline}</h2>}
                {sec.body_text && <p className="text-muted-foreground max-w-lg mx-auto">{sec.body_text}</p>}
                {sec.cta_text && (
                  <Button className="mt-4" size="lg">{sec.cta_text}</Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
