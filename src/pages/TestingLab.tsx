import { useEffect, useState, useRef } from 'react';
import { useTestLabStore } from '@/store/useTestLabStore';
import { TestProduct, SCORE_CRITERIA, calculateTotalScore, getScoreLabel, getScoreLabelInfo } from '@/types/testProduct';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, RotateCcw, Image, Link, Video, DollarSign, FlaskConical, Star, X, ExternalLink, Upload, Loader2, Bot } from 'lucide-react';
import AIChatDrawer from '@/components/AIChatDrawer';

export default function TestingLab() {
  const { products, loading, fetchTestProducts, addTestProduct, trashProduct, restoreProduct, deleteProductPermanently, addCompetitor, deleteCompetitor, saveScore } = useTestLabStore();

  useEffect(() => { fetchTestProducts(); }, []);

  const [tab, setTab] = useState('active');
  const activeProducts = products.filter((p) => p.status === 'active');
  const trashedProducts = products.filter((p) => p.status === 'trashed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold gradient-text">Product Testing Lab</h1>
        </div>
        <AddProductDialog onAdd={addTestProduct} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="active">المنتجات ({activeProducts.length})</TabsTrigger>
          <TabsTrigger value="trash">سلة المهملات ({trashedProducts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeProducts.length === 0 ? (
            <Card className="glass-card"><CardContent className="py-12 text-center text-muted-foreground">لا توجد منتجات بعد. أضف منتجًا جديدًا للبدء.</CardContent></Card>
          ) : (
            activeProducts.map((p) => (
              <ProductCard key={p.id} product={p} onTrash={trashProduct} onAddCompetitor={addCompetitor} onDeleteCompetitor={deleteCompetitor} onSaveScore={saveScore} />
            ))
          )}
        </TabsContent>

        <TabsContent value="trash" className="space-y-4 mt-4">
          {trashedProducts.length === 0 ? (
            <Card className="glass-card"><CardContent className="py-12 text-center text-muted-foreground">سلة المهملات فارغة</CardContent></Card>
          ) : (
            trashedProducts.map((p) => (
              <TrashCard key={p.id} product={p} onRestore={restoreProduct} onDelete={deleteProductPermanently} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddProductDialog({ onAdd }: { onAdd: (name: string, desc: string, img: string) => Promise<string | null> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('test-product-images').upload(path, file);
    if (error) { setUploading(false); return; }
    const { data } = supabase.storage.from('test-product-images').getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    await onAdd(name.trim(), desc.trim(), imageUrl);
    setName(''); setDesc(''); setImageUrl('');
    setSubmitting(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 ml-2" />إضافة منتج</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>إضافة منتج جديد للاختبار</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">اسم المنتج *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حزام ظهر طبي" className="input-field" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">وصف قصير</label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف مختصر للمنتج..." className="input-field" rows={3} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">صورة المنتج</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {imageUrl ? (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setImageUrl('')} className="absolute top-2 left-2 bg-background/80 rounded-full p-1"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
                {uploading ? 'جاري الرفع...' : 'رفع صورة'}
              </Button>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={!name.trim() || submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            إضافة المنتج
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductCard({ product, onTrash, onAddCompetitor, onDeleteCompetitor, onSaveScore }: {
  product: TestProduct;
  onTrash: (id: string) => void;
  onAddCompetitor: (id: string, c: any) => void;
  onDeleteCompetitor: (id: string) => void;
  onSaveScore: (id: string, s: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalScore = product.score ? calculateTotalScore(product.score) : null;
  const label = totalScore !== null ? getScoreLabelInfo(getScoreLabel(totalScore)) : null;
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const productContext = {
    productName: product.name,
    description: product.description,
    imageUrl: product.imageUrl || null,
    competitors: product.competitors.map(c => ({ websiteUrl: c.websiteUrl, videoUrl: c.videoUrl, sellingPrice: c.sellingPrice })),
    score: product.score ? {
      solvesProblem: product.score.solvesProblem,
      wowFactor: product.score.wowFactor,
      hasVideos: product.score.hasVideos,
      smallNoVariants: product.score.smallNoVariants,
      sellingNow: product.score.sellingNow,
      totalScore,
      label: label?.text,
    } : null,
  };

  const initialAIMessage = product.imageUrl 
    ? `انظر لصورة هذا المنتج "${product.name}" وحلله بصرياً، ابحث عنه وأعطني معلومات ونصائح مختصرة حوله.`
    : `حلل هذا المنتج باختصار: ${product.name}`;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.name} className="w-14 h-14 rounded-lg object-cover border border-border/50" />
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{product.name}</CardTitle>
            {product.description && <p className="text-sm text-muted-foreground mt-1 truncate">{product.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            {label && (
              <div className="text-left">
                <div className="text-2xl font-bold text-foreground">{totalScore}</div>
                <div className={`text-xs font-medium ${label.color}`}>{label.text}</div>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onTrash(product.id); }}>
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 border-t border-border/50 pt-4">
          {/* AI Score Card */}
          {totalScore !== null && label && (
            <div className={`rounded-xl p-4 border ${totalScore >= 70 ? 'border-profit/30 bg-profit/5' : totalScore >= 45 ? 'border-warning/30 bg-warning/5' : 'border-destructive/30 bg-destructive/5'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  AI Product Score
                </span>
                <div className="text-right">
                  <span className="text-3xl font-bold">{totalScore}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              </div>
              <p className={`text-sm font-medium ${label.color}`}>{label.text}</p>
            </div>
          )}

          {/* Discuss with AI */}
          <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10" onClick={() => setAiDrawerOpen(true)}>
            <Bot className="h-4 w-4" />
            ناقش هذا المنتج مع الذكاء الاصطناعي
          </Button>

          {/* Competitors */}
          <CompetitorsSection product={product} onAdd={onAddCompetitor} onDelete={onDeleteCompetitor} />

          {/* Scoring */}
          <ScoringSection product={product} onSave={onSaveScore} />
        </CardContent>
      )}

      <AIChatDrawer
        open={aiDrawerOpen}
        onOpenChange={setAiDrawerOpen}
        initialContext={productContext}
        initialMessage={initialAIMessage}
        initialImageUrl={product.imageUrl || undefined}
        contextType="product"
        contextId={product.id}
      />
    </Card>
  );
}

function CompetitorsSection({ product, onAdd, onDelete }: { product: TestProduct; onAdd: (id: string, c: any) => void; onDelete: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [vidUrl, setVidUrl] = useState('');
  const [price, setPrice] = useState('');

  const handleAdd = () => {
    onAdd(product.id, { websiteUrl: webUrl, videoUrl: vidUrl, sellingPrice: Number(price) || 0 });
    setWebUrl(''); setVidUrl(''); setPrice(''); setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-primary" />المنافسون ({product.competitors.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4 ml-1" />إضافة
        </Button>
      </div>

      {adding && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 mb-3">
          <Input value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="رابط موقع المنافس" className="input-field text-sm" />
          <Input value={vidUrl} onChange={(e) => setVidUrl(e.target.value)} placeholder="رابط فيديو الإعلان" className="input-field text-sm" />
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="سعر البيع" className="input-field text-sm" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>حفظ</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>إلغاء</Button>
          </div>
        </div>
      )}

      {product.competitors.length > 0 && (
        <div className="space-y-2">
          {product.competitors.map((c, i) => (
            <div key={c.id} className="bg-muted/20 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="text-muted-foreground font-medium">#{i + 1}</span>
                {c.websiteUrl && (
                  <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <Link className="h-3 w-3" />الموقع
                  </a>
                )}
                {c.videoUrl && (
                  <a href={c.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <Video className="h-3 w-3" />الفيديو
                  </a>
                )}
                {c.sellingPrice > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3" />{c.sellingPrice}
                  </span>
                )}
              </div>
              <button onClick={() => onDelete(c.id)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoringSection({ product, onSave }: { product: TestProduct; onSave: (id: string, s: any) => void }) {
  const [scores, setScores] = useState(() => ({
    solvesProblem: product.score?.solvesProblem ?? 0,
    wowFactor: product.score?.wowFactor ?? 0,
    hasVideos: product.score?.hasVideos ?? 0,
    smallNoVariants: product.score?.smallNoVariants ?? 0,
    sellingNow: product.score?.sellingNow ?? 0,
  }));
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState('');

  const tempScore = {
    id: '', testProductId: product.id,
    ...scores,
  };
  const total = calculateTotalScore(tempScore);
  const label = getScoreLabelInfo(getScoreLabel(total));

  const handleAIScore = async () => {
    setAiLoading(true);
    setAiReasoning('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-auto-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          productName: product.name,
          description: product.description,
          imageUrl: product.imageUrl || null,
          competitors: product.competitors.map(c => ({
            websiteUrl: c.websiteUrl,
            videoUrl: c.videoUrl,
            sellingPrice: c.sellingPrice,
          })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'خطأ' }));
        throw new Error(err.error || 'فشل التقييم');
      }

      const result = await resp.json();
      setScores({
        solvesProblem: result.solvesProblem,
        wowFactor: result.wowFactor,
        hasVideos: result.hasVideos,
        smallNoVariants: result.smallNoVariants,
        sellingNow: result.sellingNow,
      });
      if (result.reasoning) setAiReasoning(result.reasoning);
    } catch (e: any) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />تقييم المنتج
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{total}</span>
          <span className={`text-sm font-medium ${label.color}`}>{label.text}</span>
        </div>
      </div>

      {/* AI Auto Score Button */}
      <Button
        variant="outline"
        className="w-full mb-4 gap-2 border-primary/30 text-primary hover:bg-primary/10"
        onClick={handleAIScore}
        disabled={aiLoading}
      >
        {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
        {aiLoading ? 'الذكاء الاصطناعي يحلل المنتج...' : 'تقييم تلقائي بالذكاء الاصطناعي'}
      </Button>

      {aiReasoning && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
          <span className="font-medium text-primary">رأي الذكاء الاصطناعي:</span> {aiReasoning}
        </div>
      )}

      <div className="space-y-4">
        {SCORE_CRITERIA.map((c) => (
          <div key={c.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-medium text-foreground w-8 text-left">{scores[c.key]}/5</span>
            </div>
            <Slider
              value={[scores[c.key]]}
              onValueChange={([v]) => setScores((s) => ({ ...s, [c.key]: v }))}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground/50 px-1">
              <span>0</span>
              <span>وزن: {c.weight}%</span>
              <span>5</span>
            </div>
          </div>
        ))}
      </div>

      <Button className="w-full mt-4" onClick={() => onSave(product.id, scores)}>
        حفظ التقييم
      </Button>
    </div>
  );
}

function TrashCard({ product, onRestore, onDelete }: { product: TestProduct; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <Card className="glass-card opacity-70">
      <CardContent className="py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {product.imageUrl && <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-xs text-muted-foreground">{product.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onRestore(product.id)}>
            <RotateCcw className="h-4 w-4 ml-1" />استرجاع
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 ml-1" />حذف نهائي</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حذف نهائي</AlertDialogTitle>
                <AlertDialogDescription>هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(product.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
