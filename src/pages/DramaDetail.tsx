import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play,
  Star,
  ChevronLeft,
  Lock,
  Clock,
  Eye,
  Share2,
  Heart,
  Maximize,
  Volume2,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';

import { dramasApi, favoritesApi, Drama, Episode } from '@/services/api';
import { useAuth } from '@/hooks/useAuthMySQL';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

const DramaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [drama, setDrama] = useState<Drama | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  /* ------------------ Load drama + episodes ------------------ */
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const dramaRes = await dramasApi.getById(id);
        if (dramaRes.success && dramaRes.data) {
          setDrama(dramaRes.data);
        }

        const epRes = await dramasApi.getEpisodes(id);
        if (epRes.success && epRes.data) {
          setEpisodes(epRes.data);
          setCurrentEpisode(epRes.data[0] || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  /* ------------------ Check favorite ------------------ */
  useEffect(() => {
    if (!id || !user) {
      setIsFavorite(false);
      return;
    }

    const check = async () => {
      try {
        const res = await favoritesApi.check(id);
        if (res.success && res.data) {
          setIsFavorite(res.data.isFavorite);
        }
      } catch (e) {
        console.error(e);
      }
    };

    check();
  }, [id, user]);

  /* ------------------ Toggle favorite ------------------ */
  const toggleFavorite = async () => {
    if (!user || !id) {
      toast({
        title: 'กรุณาเข้าสู่ระบบ',
        variant: 'destructive'
      });
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        const res = await favoritesApi.remove(id);
        if (res.success) {
          setIsFavorite(false);
          toast({ title: 'ลบออกจากรายการโปรดแล้ว' });
        }
      } else {
        const res = await favoritesApi.add(id);
        if (res.success) {
          setIsFavorite(true);
          toast({ title: 'เพิ่มในรายการโปรดแล้ว' });
        }
      }
    } catch (e) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        variant: 'destructive'
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  /* ------------------ Player controls ------------------ */
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.pause() : videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleEpisodeSelect = (ep: Episode) => {
    if (!ep.is_free && !user) return;
    setCurrentEpisode(ep);
    setIsPlaying(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDuration = (m: number) => `${m} นาที`;
  const formatView = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n;

  /* ------------------ Loading ------------------ */
  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <Skeleton className="aspect-video mb-4" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    );
  }

  if (!drama) {
    return <div className="text-center py-20">ไม่พบข้อมูล</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container flex items-center gap-4 p-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ChevronLeft />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">{drama.title}</h1>
        </div>
      </header>

      <main className="container grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
        {/* Player */}
        <div className="lg:col-span-2">
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            {currentEpisode?.video_url ? (
              <video
                ref={videoRef}
                src={currentEpisode.video_url}
                poster={currentEpisode.thumbnail_url || drama.poster_url}
                className="w-full h-full"
                controls
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/50">
                ไม่มีวิดีโอ
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={toggleFavorite}
              disabled={favoriteLoading}
            >
              <Heart
                className={`mr-2 ${isFavorite ? 'fill-amber-500 text-amber-500' : ''}`}
              />
              {isFavorite ? 'ถูกใจแล้ว' : 'ถูกใจ'}
            </Button>

            <Button variant="outline" className="flex-1">
              <Share2 className="mr-2" /> แชร์
            </Button>
          </div>
        </div>

        {/* Episodes */}
        <div>
          <Tabs defaultValue="episodes">
            <TabsList className="w-full">
              <TabsTrigger value="episodes" className="flex-1">
                รายการตอน
              </TabsTrigger>
            </TabsList>

            <TabsContent value="episodes">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {episodes.map(ep => (
                    <div
                      key={ep.id}
                      onClick={() => handleEpisodeSelect(ep)}
                      className="flex gap-3 p-3 rounded-lg cursor-pointer bg-muted hover:bg-muted/70"
                    >
                      <img
                        src={ep.thumbnail_url || drama.poster_url}
                        className="w-24 h-14 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium line-clamp-1">{ep.title}</h4>
                        <div className="text-xs text-muted-foreground flex gap-3">
                          <span>{formatDuration(ep.duration)}</span>
                          <span>{formatView(ep.view_count)}</span>
                        </div>
                        {!ep.is_free && (
                          <Badge variant="outline" className="mt-1">
                            <Lock className="w-3 h-3 mr-1" /> VIP
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default DramaDetail;
