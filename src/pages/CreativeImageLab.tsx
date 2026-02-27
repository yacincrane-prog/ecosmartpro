import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Paintbrush, Upload, Loader2, Download, RefreshCw, Pencil, Trash2, Image as ImageIcon,
  Sparkles, LayoutGrid, RectangleVertical, Smartphone, FileText, X, Archive
} from 'lucide-react';

const MESSAGE_TYPES = [
  { value: 'results', label: 'نتائج', icon: '🎯' },
  { value: 'pain', label: 'ألم', icon: '😣' },
  { value: 'logical', label: 'منطقي', icon: '🧠' },
  { value: 'emotional', label: 'عاطفي', icon: '❤️' },
  { value: 'before_after', label: 'قبل/بعد', icon: '🔄' },
  { value: 'strong_offer', label: 'عرض قوي', icon: '🔥' },
];

const ASPECT_RATIOS = [
  { value: '1:1', label: 'مربع 1:1', icon: LayoutGrid },
  { value: '4:5', label: 'عمودي 4:5', icon: RectangleVertical },
  { value: '9:16', label: 'ستوري 9:16', icon: Smartphone },
  { value: 'landing', label: 'Landing Page', icon: FileText },
];

interface ConceptData {
  creative_idea: string;
  headline: string;
  subheadline: string;
  bullet_points: string[];
  cta_text: string;
  text_layout: string;
}

interface Generation {
  id: string;
  product_name: string;
  message_type: string;
  aspect_ratio: string;
  headline: string;
  generated_image_url: string;
  created_at: string;
}

export default function CreativeImageLab() {
  const { user } = useAuth();
  const [tab, setTab] = useState('create');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [messageType, setMessageType] = useState('results');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Generation states
  const [concept, setConcept] = useState<ConceptData | null>(null);
  const [generatingConcept, setGeneratingConcept] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [editingText, setEditingText] = useState(false);

  // Archive
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  useEffect(() => {
    if (user) fetchArchive();
  }, [user]);

  const fetchArchive = async () => {
    setLoadingArchive(true);
    const { data } = await supabase
      .from('creative_generations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setGenerations(data as any);
    setLoadingArchive(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    const urls: string[] = [...imageUrls];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('creative-images').upload(path, file);
      if (error) { toast.error('فشل رفع الصورة'); continue; }
      const { data: urlData } = supabase.storage.from('creative-images').getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    setImageUrls(urls);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const generateConcept = async () => {
    if (!productName.trim()) { toast.error('أدخل اسم المنتج'); return; }
    setGeneratingConcept(true);
    setConcept(null);
    setGeneratedImage(null);
    try {
      const { data, error } = await supabase.functions.invoke('creative-concept', {
        body: { productName, description, messageType, aspectRatio, imageUrls },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setConcept(data);
      toast.success('تم توليد المفهوم الإبداعي');
    } catch (e: any) {
      toast.error(e.message || 'فشل توليد المفهوم');
    }
    setGeneratingConcept(false);
  };

  const generateImage = async () => {
    if (!concept) return;
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('creative-image', {
        body: {
          productName,
          headline: concept.headline,
          subheadline: concept.subheadline,
          bulletPoints: concept.bullet_points,
          ctaText: concept.cta_text,
          creativeIdea: concept.creative_idea,
          aspectRatio,
          imageUrl: imageUrls[0] || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedImage(data.imageUrl);
      toast.success('تم توليد الصورة');

      // Save to archive
      if (user) {
        await supabase.from('creative_generations').insert({
          user_id: user.id,
          product_name: productName,
          product_description: description,
          message_type: messageType,
          aspect_ratio: aspectRatio,
          creative_idea: concept.creative_idea,
          headline: concept.headline,
          subheadline: concept.subheadline,
          bullet_points: concept.bullet_points,
          cta_text: concept.cta_text,
          text_layout: concept.text_layout,
          generated_image_url: data.imageUrl,
          source_images: imageUrls,
        });
        fetchArchive();
      }
    } catch (e: any) {
      toast.error(e.message || 'فشل توليد الصورة');
    }
    setGeneratingImage(false);
  };

  const downloadImage = (dataUrl: string, name: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${name}-creative.png`;
    a.click();
  };

  const deleteGeneration = async (id: string) => {
    await supabase.from('creative_generations').delete().eq('id', id);
    setGenerations(prev => prev.filter(g => g.id !== id));
    toast.success('تم الحذف');
  };

  const resetForm = () => {
    setConcept(null);
    setGeneratedImage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Paintbrush className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold gradient-text">Creative Image Lab</h1>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="create">
            <Sparkles className="h-4 w-4 ml-1" />
            إنشاء جديد
          </TabsTrigger>
          <TabsTrigger value="archive">
            <Archive className="h-4 w-4 ml-1" />
            الأرشيف ({generations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6 mt-4">
          {/* Input Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-primary" />
                بيانات المنتج
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">اسم المنتج *</label>
                  <Input
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="مثال: آلة قهوة كهربائية"
                    className="input-field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">وصف المنتج (اختياري)</label>
                  <Input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="وصف مختصر للمنتج..."
                    className="input-field"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">صور المنتج</label>
                <div className="flex flex-wrap gap-3">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border/50 group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    <span className="text-[10px]">رفع</span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                  />
                </div>
              </div>

              {/* Message Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">نوع الرسالة التسويقية</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {MESSAGE_TYPES.map(mt => (
                    <button
                      key={mt.value}
                      onClick={() => setMessageType(mt.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-xs font-medium ${
                        messageType === mt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      <span className="text-lg">{mt.icon}</span>
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">مقاس الصورة</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map(ar => {
                    const Icon = ar.icon;
                    return (
                      <button
                        key={ar.value}
                        onClick={() => setAspectRatio(ar.value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-sm font-medium ${
                          aspectRatio === ar.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {ar.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={generateConcept}
                disabled={generatingConcept || !productName.trim()}
                className="w-full"
                size="lg"
              >
                {generatingConcept ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    توليد المفهوم الإبداعي
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Concept Result */}
          {concept && (
            <Card className="glass-card border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    المفهوم الإبداعي
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingText(!editingText)}>
                      <Pencil className="h-4 w-4" />
                      {editingText ? 'إنهاء التعديل' : 'تعديل النص'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateConcept} disabled={generatingConcept}>
                      <RefreshCw className="h-4 w-4" />
                      إعادة توليد
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">💡 الفكرة الإبداعية</p>
                    {editingText ? (
                      <Textarea
                        value={concept.creative_idea}
                        onChange={e => setConcept({ ...concept, creative_idea: e.target.value })}
                        className="input-field min-h-[60px]"
                      />
                    ) : (
                      <p className="text-sm text-foreground">{concept.creative_idea}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">📢 العنوان الرئيسي</p>
                      {editingText ? (
                        <Input
                          value={concept.headline}
                          onChange={e => setConcept({ ...concept, headline: e.target.value })}
                          className="input-field"
                        />
                      ) : (
                        <p className="text-sm font-bold text-foreground">{concept.headline}</p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">📝 النص الثانوي</p>
                      {editingText ? (
                        <Input
                          value={concept.subheadline}
                          onChange={e => setConcept({ ...concept, subheadline: e.target.value })}
                          className="input-field"
                        />
                      ) : (
                        <p className="text-sm text-foreground">{concept.subheadline}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">✅ الفوائد</p>
                    <ul className="space-y-1">
                      {concept.bullet_points?.map((bp, i) => (
                        <li key={i} className="text-sm text-foreground flex items-center gap-2">
                          <span className="text-primary">•</span>
                          {editingText ? (
                            <Input
                              value={bp}
                              onChange={e => {
                                const newBps = [...concept.bullet_points];
                                newBps[i] = e.target.value;
                                setConcept({ ...concept, bullet_points: newBps });
                              }}
                              className="input-field"
                            />
                          ) : bp}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                      <p className="text-xs text-muted-foreground mb-1">🔘 CTA</p>
                      {editingText ? (
                        <Input
                          value={concept.cta_text}
                          onChange={e => setConcept({ ...concept, cta_text: e.target.value })}
                          className="input-field"
                        />
                      ) : (
                        <p className="text-sm font-bold text-primary">{concept.cta_text}</p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">📐 توزيع النص</p>
                      <p className="text-sm text-foreground">{concept.text_layout}</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={generateImage}
                  disabled={generatingImage}
                  className="w-full"
                  size="lg"
                >
                  {generatingImage ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      جاري توليد الصورة...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      توليد الصورة الإعلانية
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Generated Image */}
          {generatedImage && (
            <Card className="glass-card border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    الصورة الناتجة
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={generateImage} disabled={generatingImage}>
                      <RefreshCw className="h-4 w-4" />
                      إعادة توليد
                    </Button>
                    <Button size="sm" onClick={() => downloadImage(generatedImage, productName)}>
                      <Download className="h-4 w-4" />
                      تحميل
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <img
                    src={generatedImage}
                    alt="Generated creative"
                    className="max-w-full rounded-lg border border-border/50 shadow-lg"
                    style={{
                      maxHeight: aspectRatio === '9:16' ? '600px' :
                                 aspectRatio === 'landing' ? '700px' : '500px'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive" className="mt-4">
          {loadingArchive ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : generations.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد صور مولّدة بعد. أنشئ أول صورة إعلانية!
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generations.map(gen => (
                <Card key={gen.id} className="glass-card overflow-hidden group">
                  {gen.generated_image_url && (
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={gen.generated_image_url}
                        alt={gen.product_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => downloadImage(gen.generated_image_url, gen.product_name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => deleteGeneration(gen.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{gen.product_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {MESSAGE_TYPES.find(m => m.value === gen.message_type)?.icon}{' '}
                        {MESSAGE_TYPES.find(m => m.value === gen.message_type)?.label}
                      </span>
                      <span className="text-xs text-muted-foreground">• {gen.aspect_ratio}</span>
                    </div>
                    {gen.headline && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{gen.headline}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(gen.created_at).toLocaleDateString('ar-DZ')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
