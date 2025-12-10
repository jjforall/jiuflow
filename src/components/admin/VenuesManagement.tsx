import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, MapPin, Users, Phone, Mail, Train, Car } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  name_ja: string | null;
  address: string | null;
  address_ja: string | null;
  city: string | null;
  country: string;
  image_url: string | null;
  capacity: number | null;
  website: string | null;
  access_info: string | null;
  access_info_ja: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  // New fields
  phone: string | null;
  email: string | null;
  parking_info: string | null;
  parking_info_ja: string | null;
  nearest_station: string | null;
  nearest_station_ja: string | null;
  facilities: string[];
  mat_area_sqm: number | null;
  spectator_capacity: number | null;
  rental_cost: string | null;
  rental_cost_ja: string | null;
  notes: string | null;
  notes_ja: string | null;
  created_at: string;
  updated_at: string;
}

type VenueFormData = Omit<Venue, 'id' | 'created_at' | 'updated_at'>;

const emptyVenue: VenueFormData = {
  name: '',
  name_ja: '',
  address: '',
  address_ja: '',
  city: '',
  country: 'JP',
  image_url: '',
  capacity: null,
  website: '',
  access_info: '',
  access_info_ja: '',
  google_maps_url: '',
  latitude: null,
  longitude: null,
  phone: '',
  email: '',
  parking_info: '',
  parking_info_ja: '',
  nearest_station: '',
  nearest_station_ja: '',
  facilities: [],
  mat_area_sqm: null,
  spectator_capacity: null,
  rental_cost: '',
  rental_cost_ja: '',
  notes: '',
  notes_ja: '',
};

const countries = [
  { code: 'JP', name: '日本', flag: '🇯🇵' },
  { code: 'US', name: 'アメリカ', flag: '🇺🇸' },
  { code: 'BR', name: 'ブラジル', flag: '🇧🇷' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'PT', name: 'ポルトガル', flag: '🇵🇹' },
  { code: 'IT', name: 'イタリア', flag: '🇮🇹' },
  { code: 'GB', name: 'イギリス', flag: '🇬🇧' },
  { code: 'PL', name: 'ポーランド', flag: '🇵🇱' },
  { code: 'TH', name: 'タイ', flag: '🇹🇭' },
  { code: 'CN', name: '中国', flag: '🇨🇳' },
  { code: 'KR', name: '韓国', flag: '🇰🇷' },
  { code: 'AU', name: 'オーストラリア', flag: '🇦🇺' },
  { code: 'MY', name: 'マレーシア', flag: '🇲🇾' },
  { code: 'SG', name: 'シンガポール', flag: '🇸🇬' },
  { code: 'TW', name: '台湾', flag: '🇹🇼' },
];

const facilityOptions = [
  { id: 'locker_room', label: '更衣室' },
  { id: 'shower', label: 'シャワー' },
  { id: 'air_conditioning', label: '空調' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'parking', label: '駐車場' },
  { id: 'vending', label: '自動販売機' },
  { id: 'cafeteria', label: '食堂/カフェ' },
  { id: 'first_aid', label: '救護室' },
  { id: 'wheelchair', label: 'バリアフリー' },
  { id: 'spectator_seats', label: '観客席' },
];

export function VenuesManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [formData, setFormData] = useState<VenueFormData>(emptyVenue);

  const { data: venues, isLoading } = useQuery({
    queryKey: ['admin-venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Venue[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: VenueFormData) => {
      const { error } = await supabase.from('venues').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
      toast.success('施設を作成しました');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('エラーが発生しました: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VenueFormData }) => {
      const { error } = await supabase.from('venues').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
      toast.success('施設を更新しました');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('エラーが発生しました: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('venues').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
      toast.success('施設を削除しました');
    },
    onError: (error) => {
      toast.error('エラーが発生しました: ' + error.message);
    }
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVenue(null);
    setFormData(emptyVenue);
  };

  const handleOpenCreate = () => {
    setFormData(emptyVenue);
    setEditingVenue(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (venue: Venue) => {
    setEditingVenue(venue);
    setFormData({
      name: venue.name,
      name_ja: venue.name_ja || '',
      address: venue.address || '',
      address_ja: venue.address_ja || '',
      city: venue.city || '',
      country: venue.country,
      image_url: venue.image_url || '',
      capacity: venue.capacity,
      website: venue.website || '',
      access_info: venue.access_info || '',
      access_info_ja: venue.access_info_ja || '',
      google_maps_url: venue.google_maps_url || '',
      latitude: venue.latitude,
      longitude: venue.longitude,
      phone: venue.phone || '',
      email: venue.email || '',
      parking_info: venue.parking_info || '',
      parking_info_ja: venue.parking_info_ja || '',
      nearest_station: venue.nearest_station || '',
      nearest_station_ja: venue.nearest_station_ja || '',
      facilities: Array.isArray(venue.facilities) ? venue.facilities : [],
      mat_area_sqm: venue.mat_area_sqm,
      spectator_capacity: venue.spectator_capacity,
      rental_cost: venue.rental_cost || '',
      rental_cost_ja: venue.rental_cost_ja || '',
      notes: venue.notes || '',
      notes_ja: venue.notes_ja || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.country) {
      toast.error('必須項目を入力してください');
      return;
    }

    const submitData: VenueFormData = {
      ...formData,
      name_ja: formData.name_ja || null,
      address: formData.address || null,
      address_ja: formData.address_ja || null,
      city: formData.city || null,
      image_url: formData.image_url || null,
      capacity: formData.capacity || null,
      website: formData.website || null,
      access_info: formData.access_info || null,
      access_info_ja: formData.access_info_ja || null,
      google_maps_url: formData.google_maps_url || null,
      latitude: formData.latitude || null,
      longitude: formData.longitude || null,
      phone: formData.phone || null,
      email: formData.email || null,
      parking_info: formData.parking_info || null,
      parking_info_ja: formData.parking_info_ja || null,
      nearest_station: formData.nearest_station || null,
      nearest_station_ja: formData.nearest_station_ja || null,
      facilities: formData.facilities,
      mat_area_sqm: formData.mat_area_sqm || null,
      spectator_capacity: formData.spectator_capacity || null,
      rental_cost: formData.rental_cost || null,
      rental_cost_ja: formData.rental_cost_ja || null,
      notes: formData.notes || null,
      notes_ja: formData.notes_ja || null,
    };

    if (editingVenue) {
      updateMutation.mutate({ id: editingVenue.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleFacilityChange = (facilityId: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, facilities: [...formData.facilities, facilityId] });
    } else {
      setFormData({ ...formData, facilities: formData.facilities.filter(f => f !== facilityId) });
    }
  };

  const filteredVenues = venues?.filter(v => {
    const matchesSearch = 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.name_ja?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = countryFilter === "all" || v.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  const getCountryFlag = (code: string) => {
    const country = countries.find(c => c.code === code);
    return country?.flag || '🌍';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">施設管理</h2>
          <p className="text-muted-foreground">大会会場・施設の管理</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="施設名・都市で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="国で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての国</SelectItem>
            {countries.map(c => (
              <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filteredVenues?.length || 0} 件</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>施設名</TableHead>
                <TableHead className="hidden sm:table-cell">都市</TableHead>
                <TableHead>国</TableHead>
                <TableHead className="hidden md:table-cell">収容人数</TableHead>
                <TableHead className="hidden lg:table-cell">連絡先</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVenues?.map((venue) => (
                <TableRow key={venue.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {venue.image_url ? (
                        <img 
                          src={venue.image_url} 
                          alt={venue.name} 
                          className="w-12 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{venue.name_ja || venue.name}</p>
                        {venue.name_ja && (
                          <p className="text-xs text-muted-foreground">{venue.name}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm hidden sm:table-cell">
                    {venue.city || '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-lg">{getCountryFlag(venue.country)}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {venue.capacity ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3" />
                        {venue.capacity.toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {venue.phone && <Phone className="h-3 w-3" />}
                      {venue.email && <Mail className="h-3 w-3" />}
                      {!venue.phone && !venue.email && '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(venue)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('この施設を削除しますか？')) {
                            deleteMutation.mutate(venue.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVenue ? '施設を編集' : '新規施設を作成'}
            </DialogTitle>
          </DialogHeader>

          <Accordion type="multiple" defaultValue={["basic", "location"]} className="w-full">
            {/* 基本情報 */}
            <AccordionItem value="basic">
              <AccordionTrigger>基本情報</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>施設名 (英語) *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Tokyo Dome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>施設名 (日本語)</Label>
                    <Input
                      value={formData.name_ja || ''}
                      onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                      placeholder="東京ドーム"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>都市</Label>
                    <Input
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Tokyo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>国 *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>画像URL</Label>
                  <Input
                    value={formData.image_url || ''}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>ウェブサイト</Label>
                  <Input
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.tokyo-dome.co.jp"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 所在地・アクセス */}
            <AccordionItem value="location">
              <AccordionTrigger>所在地・アクセス</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>住所 (英語)</Label>
                    <Input
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="1-3-61 Koraku, Bunkyo-ku"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>住所 (日本語)</Label>
                    <Input
                      value={formData.address_ja || ''}
                      onChange={(e) => setFormData({ ...formData, address_ja: e.target.value })}
                      placeholder="文京区後楽1-3-61"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Train className="h-4 w-4" />最寄り駅 (英語)</Label>
                    <Input
                      value={formData.nearest_station || ''}
                      onChange={(e) => setFormData({ ...formData, nearest_station: e.target.value })}
                      placeholder="Suidobashi Station (5 min walk)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Train className="h-4 w-4" />最寄り駅 (日本語)</Label>
                    <Input
                      value={formData.nearest_station_ja || ''}
                      onChange={(e) => setFormData({ ...formData, nearest_station_ja: e.target.value })}
                      placeholder="水道橋駅 (徒歩5分)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Car className="h-4 w-4" />駐車場情報 (英語)</Label>
                    <Textarea
                      value={formData.parking_info || ''}
                      onChange={(e) => setFormData({ ...formData, parking_info: e.target.value })}
                      placeholder="400 spaces, ¥1000/day"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Car className="h-4 w-4" />駐車場情報 (日本語)</Label>
                    <Textarea
                      value={formData.parking_info_ja || ''}
                      onChange={(e) => setFormData({ ...formData, parking_info_ja: e.target.value })}
                      placeholder="400台収容、1日1000円"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>アクセス情報 (英語)</Label>
                  <Textarea
                    value={formData.access_info || ''}
                    onChange={(e) => setFormData({ ...formData, access_info: e.target.value })}
                    placeholder="5 min walk from Suidobashi Station"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>アクセス情報 (日本語)</Label>
                  <Textarea
                    value={formData.access_info_ja || ''}
                    onChange={(e) => setFormData({ ...formData, access_info_ja: e.target.value })}
                    placeholder="水道橋駅より徒歩5分"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Google Maps URL</Label>
                  <Input
                    value={formData.google_maps_url || ''}
                    onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                    placeholder="https://maps.google.com/..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>緯度</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.latitude || ''}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="35.7056"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>経度</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.longitude || ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="139.7518"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 連絡先 */}
            <AccordionItem value="contact">
              <AccordionTrigger>連絡先</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Phone className="h-4 w-4" />電話番号</Label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="03-1234-5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />メールアドレス</Label>
                    <Input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@venue.com"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* キャパシティ・設備 */}
            <AccordionItem value="facilities">
              <AccordionTrigger>キャパシティ・設備</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>総収容人数</Label>
                    <Input
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>観客席数</Label>
                    <Input
                      type="number"
                      value={formData.spectator_capacity || ''}
                      onChange={(e) => setFormData({ ...formData, spectator_capacity: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="3000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>マット面積 (㎡)</Label>
                    <Input
                      type="number"
                      value={formData.mat_area_sqm || ''}
                      onChange={(e) => setFormData({ ...formData, mat_area_sqm: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>設備</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                    {facilityOptions.map((facility) => (
                      <div key={facility.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={facility.id}
                          checked={formData.facilities.includes(facility.id)}
                          onCheckedChange={(checked) => handleFacilityChange(facility.id, !!checked)}
                        />
                        <label htmlFor={facility.id} className="text-sm cursor-pointer">
                          {facility.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* レンタル情報 */}
            <AccordionItem value="rental">
              <AccordionTrigger>レンタル情報</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>レンタル料金 (英語)</Label>
                    <Textarea
                      value={formData.rental_cost || ''}
                      onChange={(e) => setFormData({ ...formData, rental_cost: e.target.value })}
                      placeholder="¥100,000/day (weekday), ¥150,000/day (weekend)"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>レンタル料金 (日本語)</Label>
                    <Textarea
                      value={formData.rental_cost_ja || ''}
                      onChange={(e) => setFormData({ ...formData, rental_cost_ja: e.target.value })}
                      placeholder="平日10万円/日、休日15万円/日"
                      rows={2}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 備考 */}
            <AccordionItem value="notes">
              <AccordionTrigger>備考</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>備考 (英語)</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>備考 (日本語)</Label>
                    <Textarea
                      value={formData.notes_ja || ''}
                      onChange={(e) => setFormData({ ...formData, notes_ja: e.target.value })}
                      placeholder="その他の注意事項..."
                      rows={3}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseDialog}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingVenue ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
