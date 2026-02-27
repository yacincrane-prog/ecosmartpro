import { useState, useRef, useEffect, useCallback } from 'react';
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
  Sparkles, LayoutGrid, RectangleVertical, Smartphone, FileText, X, Archive,
  Type, Move, Plus, Minus
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
  { value: '1:1', label: 'مربع 1:1', icon: LayoutGrid, width: 1024, height: 1024 },
  { value: '4:5', label: 'عمودي 4:5', icon: RectangleVertical, width: 1024, height: 1280 },
  { value: '9:16', label: 'ستوري 9:16', icon: Smartphone, width: 1024, height: 1792 },
  { value: 'landing', label: 'Landing Page', icon: FileText, width: 1024, height: 3072 },
];

const FONTS = [
  { value: 'Cairo', label: 'Cairo' },
  { value: 'Tajawal', label: 'Tajawal' },
  { value: 'Changa', label: 'Changa' },
];

interface ConceptData {
  creative_idea: string;
  headline: string;
  subheadline: string;
  bullet_points: string[];
  cta_text: string;
  text_layout: string;
}

interface TextElement {
  id: string;
  type: 'headline' | 'subheadline' | 'bullet' | 'cta';
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor: string;
  bgEnabled: boolean;
  bold: boolean;
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

// Load Google Fonts
const loadFont = (font: string) => {
  const id = `font-${font}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font}:wght@400;700&display=swap`;
  document.head.appendChild(link);
};

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

  const [concept, setConcept] = useState<ConceptData | null>(null);
  const [generatingConcept, setGeneratingConcept] = useState(false);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);

  // Text overlay state
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState('Cairo');
  const [dragging, setDragging] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  useEffect(() => {
    FONTS.forEach(f => loadFont(f.value));
  }, []);

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

  const getDimensions = () => ASPECT_RATIOS.find(a => a.value === aspectRatio) || ASPECT_RATIOS[0];

  const generateConcept = async () => {
    if (!productName.trim()) { toast.error('أدخل اسم المنتج'); return; }
    setGeneratingConcept(true);
    setConcept(null);
    setBaseImage(null);
    setTextElements([]);
    try {
      const { data, error } = await supabase.functions.invoke('creative-concept', {
        body: { productName, description, messageType, aspectRatio, imageUrls },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setConcept(data);
      buildTextElements(data);
      toast.success('تم توليد المفهوم الإبداعي');
    } catch (e: any) {
      toast.error(e.message || 'فشل توليد المفهوم');
    }
    setGeneratingConcept(false);
  };

  const buildTextElements = (c: ConceptData) => {
    const els: TextElement[] = [];
    els.push({
      id: 'headline',
      type: 'headline',
      text: c.headline,
      x: 50, y: 10,
      fontSize: 42,
      fontFamily: selectedFont,
      color: '#FFFFFF',
      bgColor: 'rgba(0,0,0,0.6)',
      bgEnabled: true,
      bold: true,
    });
    els.push({
      id: 'subheadline',
      type: 'subheadline',
      text: c.subheadline,
      x: 50, y: 22,
      fontSize: 28,
      fontFamily: selectedFont,
      color: '#FFFFFF',
      bgColor: 'rgba(0,0,0,0.4)',
      bgEnabled: true,
      bold: false,
    });
    c.bullet_points?.forEach((bp, i) => {
      els.push({
        id: `bullet-${i}`,
        type: 'bullet',
        text: `• ${bp}`,
        x: 50, y: 40 + i * 8,
        fontSize: 22,
        fontFamily: selectedFont,
        color: '#FFFFFF',
        bgColor: 'rgba(0,0,0,0.3)',
        bgEnabled: true,
        bold: false,
      });
    });
    els.push({
      id: 'cta',
      type: 'cta',
      text: c.cta_text,
      x: 50, y: 88,
      fontSize: 32,
      fontFamily: selectedFont,
      color: '#FFFFFF',
      bgColor: '#e63946',
      bgEnabled: true,
      bold: true,
    });
    setTextElements(els);
  };

  const generateImage = async () => {
    if (!concept) return;
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('creative-image', {
        body: {
          productName,
          creativeIdea: concept.creative_idea,
          aspectRatio,
          imageUrl: imageUrls[0] || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBaseImage(data.imageUrl);
      setImageDimensions({ w: data.requestedWidth, h: data.requestedHeight });
      toast.success('تم توليد الصورة — أضف النصوص وصدّر');
    } catch (e: any) {
      toast.error(e.message || 'فشل توليد الصورة');
    }
    setGeneratingImage(false);
  };

  const updateElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const selectedElement = textElements.find(el => el.id === selectedElementId);

  // Drag handling
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(id);
    setSelectedElementId(id);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    updateElement(dragging, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Export final image with canvas
  const exportImage = async () => {
    if (!baseImage) return;
    const dims = getDimensions();
    const canvas = document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d')!;

    // Draw base image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = baseImage;
    });
    ctx.drawImage(img, 0, 0, dims.width, dims.height);

    // Draw text elements
    for (const el of textElements) {
      const posX = (el.x / 100) * dims.width;
      const posY = (el.y / 100) * dims.height;
      const scaledFontSize = el.fontSize * (dims.width / 1024);

      ctx.font = `${el.bold ? 'bold ' : ''}${scaledFontSize}px "${el.fontFamily}", sans-serif`;
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Wrap text
      const maxWidth = dims.width * 0.85;
      const lines = wrapText(ctx, el.text, maxWidth);
      const lineHeight = scaledFontSize * 1.4;
      const totalHeight = lines.length * lineHeight;

      // Draw background
      if (el.bgEnabled) {
        const maxLineWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
        const padding = scaledFontSize * 0.4;
        
        if (el.type === 'cta') {
          const rx = 12;
          const bgX = posX - maxLineWidth / 2 - padding;
          const bgY = posY - totalHeight / 2 - padding;
          const bgW = maxLineWidth + padding * 2;
          const bgH = totalHeight + padding * 2;
          ctx.fillStyle = el.bgColor;
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgW, bgH, rx);
          ctx.fill();
        } else {
          ctx.fillStyle = el.bgColor;
          const bgX = posX - maxLineWidth / 2 - padding;
          const bgY = posY - totalHeight / 2 - padding;
          ctx.fillRect(bgX, bgY, maxLineWidth + padding * 2, totalHeight + padding * 2);
        }
      }

      // Draw text
      ctx.fillStyle = el.color;
      lines.forEach((line, i) => {
        const ly = posY - totalHeight / 2 + lineHeight / 2 + i * lineHeight;
        ctx.fillText(line, posX, ly);
      });
    }

    const dataUrl = canvas.toDataURL('image/png');

    // Save to archive
    if (user) {
      await supabase.from('creative_generations').insert({
        user_id: user.id,
        product_name: productName,
        product_description: description,
        message_type: messageType,
        aspect_ratio: aspectRatio,
        creative_idea: concept?.creative_idea || '',
        headline: concept?.headline || '',
        subheadline: concept?.subheadline || '',
        bullet_points: concept?.bullet_points || [],
        cta_text: concept?.cta_text || '',
        text_layout: concept?.text_layout || '',
        generated_image_url: dataUrl,
        source_images: imageUrls,
      });
      fetchArchive();
    }

    // Download
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${productName}-creative-${dims.width}x${dims.height}.png`;
    a.click();
    toast.success(`تم التصدير: ${dims.width}×${dims.height}`);
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const downloadArchiveImage = (dataUrl: string, name: string) => {
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
    setBaseImage(null);
    setTextElements([]);
    setImageDimensions(null);
  };

  const dims = getDimensions();

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
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
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
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-sm font-medium ${
                          aspectRatio === ar.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{ar.label}</span>
                        <span className="text-[10px] text-muted-foreground">{ar.width}×{ar.height}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={generateConcept} disabled={generatingConcept || !productName.trim()} className="w-full" size="lg">
                {generatingConcept ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> جاري التوليد...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> توليد المفهوم الإبداعي</>
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
                    <Button variant="outline" size="sm" onClick={generateConcept} disabled={generatingConcept}>
                      <RefreshCw className="h-4 w-4" /> إعادة توليد
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">💡 الفكرة</p>
                    <p className="text-sm text-foreground">{concept.creative_idea}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">📢 العنوان</p>
                      <p className="text-sm font-bold text-foreground">{concept.headline}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">📝 الثانوي</p>
                      <p className="text-sm text-foreground">{concept.subheadline}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">✅ الفوائد</p>
                    <ul className="space-y-1">
                      {concept.bullet_points?.map((bp, i) => (
                        <li key={i} className="text-sm text-foreground">• {bp}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <p className="text-xs text-muted-foreground mb-1">🔘 CTA</p>
                    <p className="text-sm font-bold text-primary">{concept.cta_text}</p>
                  </div>
                </div>

                <Button onClick={generateImage} disabled={generatingImage} className="w-full" size="lg">
                  {generatingImage ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> جاري توليد الصورة الأساسية...</>
                  ) : (
                    <><ImageIcon className="h-5 w-5" /> توليد الصورة (بدون نص)</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Canvas Editor */}
          {baseImage && (
            <Card className="glass-card border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg flex-wrap gap-2">
                  <span className="flex items-center gap-2">
                    <Type className="h-5 w-5 text-primary" />
                    محرر النصوص
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={generateImage} disabled={generatingImage}>
                      <RefreshCw className="h-4 w-4" /> صورة جديدة
                    </Button>
                    <Button size="sm" onClick={exportImage}>
                      <Download className="h-4 w-4" /> تصدير ({dims.width}×{dims.height})
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {imageDimensions && (
                  <p className="text-xs text-muted-foreground text-center">
                    الأبعاد المطلوبة: {imageDimensions.w} × {imageDimensions.h} بكسل
                  </p>
                )}

                {/* Text controls */}
                {selectedElement && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-3">
                    <p className="text-xs font-medium text-foreground">تعديل: {selectedElement.type === 'headline' ? 'العنوان' : selectedElement.type === 'subheadline' ? 'النص الثانوي' : selectedElement.type === 'cta' ? 'CTA' : 'نقطة'}</p>
                    <Textarea
                      value={selectedElement.text}
                      onChange={e => updateElement(selectedElement.id, { text: e.target.value })}
                      className="input-field min-h-[40px] text-right"
                      dir="rtl"
                    />
                    <div className="flex flex-wrap gap-2 items-center">
                      <Select value={selectedElement.fontFamily} onValueChange={v => updateElement(selectedElement.id, { fontFamily: v })}>
                        <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FONTS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateElement(selectedElement.id, { fontSize: Math.max(12, selectedElement.fontSize - 2) })}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs w-8 text-center">{selectedElement.fontSize}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateElement(selectedElement.id, { fontSize: selectedElement.fontSize + 2 })}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <input
                        type="color"
                        value={selectedElement.color}
                        onChange={e => updateElement(selectedElement.id, { color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                        title="لون النص"
                      />
                      <Button
                        variant={selectedElement.bold ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs font-bold"
                        onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })}
                      >
                        B
                      </Button>
                      <Button
                        variant={selectedElement.bgEnabled ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => updateElement(selectedElement.id, { bgEnabled: !selectedElement.bgEnabled })}
                      >
                        خلفية
                      </Button>
                    </div>
                  </div>
                )}

                {/* Canvas preview */}
                <div
                  ref={canvasContainerRef}
                  className="relative mx-auto border border-border/50 rounded-lg overflow-hidden select-none"
                  style={{
                    width: '100%',
                    maxWidth: '500px',
                    aspectRatio: `${dims.width} / ${dims.height}`,
                    maxHeight: aspectRatio === 'landing' ? '600px' : undefined,
                    overflowY: aspectRatio === 'landing' ? 'auto' : undefined,
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <img
                    src={baseImage}
                    alt="Base"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {/* Text overlays */}
                  {textElements.map(el => (
                    <div
                      key={el.id}
                      className={`absolute cursor-move transition-shadow ${selectedElementId === el.id ? 'ring-2 ring-primary' : ''}`}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontFamily: `"${el.fontFamily}", sans-serif`,
                        fontSize: `${el.fontSize * 0.5}px`,
                        fontWeight: el.bold ? 'bold' : 'normal',
                        color: el.color,
                        direction: 'rtl',
                        textAlign: 'center',
                        backgroundColor: el.bgEnabled ? el.bgColor : 'transparent',
                        padding: el.bgEnabled ? '4px 12px' : '0',
                        borderRadius: el.type === 'cta' ? '8px' : '4px',
                        maxWidth: '85%',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        zIndex: selectedElementId === el.id ? 50 : 10,
                        userSelect: 'none',
                        touchAction: 'none',
                      }}
                      onPointerDown={e => handlePointerDown(el.id, e)}
                      onClick={() => setSelectedElementId(el.id)}
                    >
                      {el.text}
                    </div>
                  ))}
                </div>

                {/* Element list */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">العناصر (اضغط لتحديد، اسحب لتحريك):</p>
                  <div className="flex flex-wrap gap-1">
                    {textElements.map(el => (
                      <button
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          selectedElementId === el.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {el.type === 'headline' ? '📢 عنوان' : el.type === 'subheadline' ? '📝 ثانوي' : el.type === 'cta' ? '🔘 CTA' : `• نقطة ${el.id.split('-')[1] ? +el.id.split('-')[1] + 1 : ''}`}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive" className="mt-4">
          {loadingArchive ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
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
                      <img src={gen.generated_image_url} alt={gen.product_name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button size="icon" variant="secondary" onClick={() => downloadArchiveImage(gen.generated_image_url, gen.product_name)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => deleteGeneration(gen.id)}>
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
                    {gen.headline && <p className="text-xs text-muted-foreground mt-1 truncate">{gen.headline}</p>}
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
